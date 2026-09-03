import { App, TFile, Notice } from "obsidian";
import { EmbeddingRecord, OdenSettings, RelatedNoteSuggestion } from "./types";
import { EmbeddingProvider, cosineSimilarity, getActiveModelKey } from "./embeddings";
import { getRipenessInfo } from "./ripeness";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Vault内ノートのEmbeddingキャッシュを管理し、
 * 「放置日数 × 類似度」で関連ノートを算出するコアロジック。
 */
export class OdenIndexer {
	constructor(
		private app: App,
		private getSettings: () => OdenSettings,
		private getProvider: () => EmbeddingProvider,
		/** path -> EmbeddingRecord。plugin.ts側でdata.jsonと同期される参照を渡す */
		private embeddings: Record<string, EmbeddingRecord>,
		private onChange: () => void
	) {}

	getSettingsSnapshot(): OdenSettings {
		return this.getSettings();
	}

	private isExcluded(path: string): boolean {
		const excluded = this.getSettings().excludedFolders;
		return excluded.some((folder) => folder && path.startsWith(folder));
	}

	/** Vault内の全Markdownノートを対象にEmbeddingを再計算する（未変更ノートはスキップ） */
	async reindexVault(force = false): Promise<{ updated: number; skipped: number; failed: number }> {
		const settings = this.getSettings();
		const provider = this.getProvider();
		const modelKey = getActiveModelKey(settings);
		const files = this.app.vault.getMarkdownFiles();

		let updated = 0;
		let skipped = 0;
		let failed = 0;

		for (const file of files) {
			if (this.isExcluded(file.path)) {
				skipped++;
				continue;
			}
			const existing = this.embeddings[file.path];
			const upToDate =
				!force &&
				existing &&
				existing.mtime === file.stat.mtime &&
				existing.model === modelKey;

			if (upToDate) {
				skipped++;
				continue;
			}

			try {
				const content = await this.app.vault.cachedRead(file);
				if (!content.trim()) {
					skipped++;
					continue;
				}
				const vector = await provider.embed(content);
				this.embeddings[file.path] = {
					path: file.path,
					mtime: file.stat.mtime,
					vector,
					model: modelKey,
				};
				updated++;
			} catch (e) {
				console.error(`[ODEN] Embedding計算に失敗: ${file.path}`, e);
				failed++;
			}
		}

		// Vaultから削除されたノートのキャッシュを掃除
		const existingPaths = new Set(files.map((f) => f.path));
		for (const path of Object.keys(this.embeddings)) {
			if (!existingPaths.has(path)) {
				delete this.embeddings[path];
			}
		}

		this.onChange();

		if (failed > 0) {
			new Notice(`ODEN: ${failed}件のノートでEmbedding計算に失敗しました。`);
		}

		return { updated, skipped, failed };
	}

	/** 1ファイル分だけEmbeddingを更新する（編集時などの軽量更新用） */
	async indexFile(file: TFile): Promise<void> {
		if (this.isExcluded(file.path)) return;
		const settings = this.getSettings();
		const provider = this.getProvider();
		const modelKey = getActiveModelKey(settings);

		const existing = this.embeddings[file.path];
		if (existing && existing.mtime === file.stat.mtime && existing.model === modelKey) {
			return;
		}

		try {
			const content = await this.app.vault.cachedRead(file);
			if (!content.trim()) return;
			const vector = await provider.embed(content);
			this.embeddings[file.path] = {
				path: file.path,
				mtime: file.stat.mtime,
				vector,
				model: modelKey,
			};
			this.onChange();
		} catch (e) {
			console.error(`[ODEN] Embedding計算に失敗: ${file.path}`, e);
		}
	}

	/**
	 * アクティブノートに対して「放置日数がしきい値以上」かつ類似度が高いノートを
	 * 類似度降順で返す（＝熟成サイドバー表示用）。
	 */
	getRelatedStaleNotes(activeFile: TFile): RelatedNoteSuggestion[] {
		const settings = this.getSettings();
		const modelKey = getActiveModelKey(settings);
		const activeRecord = this.embeddings[activeFile.path];
		if (!activeRecord || activeRecord.model !== modelKey) return [];

		const now = Date.now();
		const results: RelatedNoteSuggestion[] = [];

		for (const record of Object.values(this.embeddings)) {
			if (record.path === activeFile.path) continue;
			// プロバイダ/モデルが異なるベクトルはベクトル空間が違うため比較対象から除外
			if (record.model !== modelKey) continue;

			const staleDays = (now - record.mtime) / MS_PER_DAY;
			if (staleDays < settings.staleDaysThreshold) continue;

			const similarity = cosineSimilarity(activeRecord.vector, record.vector);
			const file = this.app.vault.getAbstractFileByPath(record.path);
			if (!(file instanceof TFile)) continue;

			results.push({
				path: record.path,
				title: file.basename,
				similarity,
				staleDays: Math.floor(staleDays),
			});
		}

		results.sort((a, b) => b.similarity - a.similarity);
		return results.slice(0, settings.maxSuggestions);
	}

	/**
	 * 類似度に関係なく、単に「放置日数がしきい値の2倍以上（＝食べごろ）」に達した
	 * インデックス済みノートを一覧で返す（食べごろ通知用）。
	 * 既存キャッシュを読むだけで新規API呼び出しは発生しない。
	 */
	getReadyNotes(): { path: string; title: string; staleDays: number }[] {
		const settings = this.getSettings();
		const modelKey = getActiveModelKey(settings);
		const now = Date.now();
		const results: { path: string; title: string; staleDays: number }[] = [];

		for (const record of Object.values(this.embeddings)) {
			if (record.model !== modelKey) continue;

			const staleDays = (now - record.mtime) / MS_PER_DAY;
			const ripeness = getRipenessInfo(staleDays, settings.staleDaysThreshold);
			if (ripeness.tier !== "ready") continue;

			const file = this.app.vault.getAbstractFileByPath(record.path);
			if (!(file instanceof TFile)) continue;

			results.push({ path: record.path, title: file.basename, staleDays: Math.floor(staleDays) });
		}

		results.sort((a, b) => b.staleDays - a.staleDays);
		return results;
	}
}
