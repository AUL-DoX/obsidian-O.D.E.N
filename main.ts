import { Notice, Plugin, TAbstractFile, TFile, WorkspaceLeaf } from "obsidian";
import { DEFAULT_SETTINGS, EmbeddingRecord, OdenData, OdenSettings } from "./src/types";
import { getEmbeddingProvider, OllamaEmbeddingProvider } from "./src/embeddings";
import { OdenIndexer } from "./src/indexer";
import { OdenSidebarView, ODEN_SIDEBAR_VIEW_TYPE } from "./src/sidebar-view";
import { OdenSettingTab } from "./src/settings-tab";
import { OdenBlender, createBlendNote, BlendSourceNote } from "./src/blend";
import { ReadyNotesModal } from "./src/ready-modal";

export default class OdenPlugin extends Plugin {
	settings!: OdenSettings;
	embeddings: Record<string, EmbeddingRecord> = {};
	indexer!: OdenIndexer;

	async onload() {
		await this.loadData_();

		this.indexer = new OdenIndexer(
			this.app,
			() => this.settings,
			() => getEmbeddingProvider(this.settings),
			this.embeddings,
			() => this.saveData_()
		);

		this.registerView(
			ODEN_SIDEBAR_VIEW_TYPE,
			(leaf: WorkspaceLeaf) => new OdenSidebarView(leaf, this.indexer)
		);

		this.addRibbonIcon("soup", "ODEN 熟成サイドバーを開く", () => {
			this.activateSidebar();
		});

		this.addCommand({
			id: "oden-open-sidebar",
			name: "熟成サイドバーを開く",
			callback: () => this.activateSidebar(),
		});

		this.addCommand({
			id: "oden-reindex-vault",
			name: "Vaultを再インデックス",
			callback: () => this.reindexVault(),
		});

		this.addSettingTab(new OdenSettingTab(this.app, this));

		// アクティブノートが切り替わるたびにサイドバーを更新（食べごろ通知の土台）
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				this.refreshSidebarViews();
			})
		);

		// レイアウト確定後に一度だけ、既存インデックスがあればサイドバーを更新
		this.app.workspace.onLayoutReady(() => {
			this.refreshSidebarViews();
			this.notifyReadyNotes();
		});

		// ファイルエクスプローラで複数ノートを選択→右クリックした際に「出汁ブレンド」を追加
		this.registerEvent(
			this.app.workspace.on("files-menu", (menu, files: TAbstractFile[]) => {
				const notes = files.filter((f): f is TFile => f instanceof TFile && f.extension === "md");
				if (notes.length < 2) return;

				menu.addItem((item) => {
					item
						.setTitle(`出汁ブレンドを生成（${notes.length}件）`)
						.setIcon("soup")
						.onClick(() => this.blendNotes(notes));
				});
			})
		);
	}

	onunload() {
		// registerView/registerEvent は Obsidian が自動でクリーンアップする
	}

	async activateSidebar(): Promise<void> {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(ODEN_SIDEBAR_VIEW_TYPE)[0];

		if (!leaf) {
			const rightLeaf = workspace.getRightLeaf(false);
			if (!rightLeaf) return;
			leaf = rightLeaf;
			await leaf.setViewState({ type: ODEN_SIDEBAR_VIEW_TYPE, active: true });
		}

		workspace.revealLeaf(leaf);
	}

	refreshSidebarViews(): void {
		for (const leaf of this.app.workspace.getLeavesOfType(ODEN_SIDEBAR_VIEW_TYPE)) {
			if (leaf.view instanceof OdenSidebarView) {
				leaf.view.refresh();
			}
		}
	}

	/**
	 * 起動時に「食べごろ」ノートがあればNoticeで知らせる。
	 * 既存キャッシュを読むだけで新規API呼び出しは発生せず、ノートへの書き込みも一切行わない。
	 */
	notifyReadyNotes(): void {
		if (!this.settings.notifyOnReady) return;

		const readyNotes = this.indexer.getReadyNotes();
		if (readyNotes.length === 0) return;

		new ReadyNotesModal(this.app, readyNotes, (path) => {
			this.app.workspace.openLinkText(path, "", false);
		}).open();
	}

	async blendNotes(files: TFile[]): Promise<void> {
		const notice = new Notice("ODEN: 出汁ブレンドを生成中...", 0);
		try {
			const notes: BlendSourceNote[] = await Promise.all(
				files.map(async (file) => ({
					file,
					content: await this.app.vault.cachedRead(file),
				}))
			);

			const blender = new OdenBlender(this.settings);
			const blendMarkdown = await blender.blend(notes);
			const newFile = await createBlendNote(this.app, notes, blendMarkdown);

			notice.hide();
			new Notice(`ODEN: 出汁ブレンドを生成しました「${newFile.basename}」`);
			await this.app.workspace.getLeaf(true).openFile(newFile);
		} catch (e) {
			notice.hide();
			console.error("[ODEN] 出汁ブレンド生成に失敗", e);
			new Notice(`ODEN: 出汁ブレンドの生成に失敗しました。${(e as Error).message}`);
		}
	}

	async testOllamaConnection(): Promise<void> {
		try {
			const provider = new OllamaEmbeddingProvider(this.settings);
			const vector = await provider.embed("ODEN接続テスト");
			new Notice(`ODEN: Ollama接続OK（次元数: ${vector.length}）`);
		} catch (e) {
			console.error("[ODEN] Ollama接続テストに失敗", e);
			new Notice(`ODEN: Ollama接続テストに失敗しました。${(e as Error).message}`);
		}
	}

	async reindexVault(): Promise<void> {
		new Notice("ODEN: Vaultの再インデックスを開始します...");
		const result = await this.indexer.reindexVault();
		new Notice(
			`ODEN: 完了（更新 ${result.updated}件 / スキップ ${result.skipped}件 / 失敗 ${result.failed}件）`
		);
		this.refreshSidebarViews();
	}

	// --- データ永続化 ---

	private async loadData_(): Promise<void> {
		const data = (await this.loadData()) as OdenData | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data?.settings ?? {});
		this.embeddings = data?.embeddings ?? {};
	}

	async saveData_(): Promise<void> {
		const data: OdenData = {
			settings: this.settings,
			embeddings: this.embeddings,
		};
		await this.saveData(data);
	}

	async saveSettings(): Promise<void> {
		await this.saveData_();
	}
}
