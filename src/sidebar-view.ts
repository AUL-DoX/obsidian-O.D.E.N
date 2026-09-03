import { ItemView, WorkspaceLeaf, TFile, Notice } from "obsidian";
import { RelatedNoteSuggestion } from "./types";
import { OdenIndexer } from "./indexer";
import { getRipenessInfo } from "./ripeness";

export const ODEN_SIDEBAR_VIEW_TYPE = "oden-sidebar-view";

/**
 * 熟成サイドバー：アクティブノートと相性の良い放置メモを表示する。
 */
export class OdenSidebarView extends ItemView {
	private indexer: OdenIndexer;

	constructor(leaf: WorkspaceLeaf, indexer: OdenIndexer) {
		super(leaf);
		this.indexer = indexer;
	}

	getViewType(): string {
		return ODEN_SIDEBAR_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "ODEN 熟成サイドバー";
	}

	getIcon(): string {
		return "soup";
	}

	async onOpen(): Promise<void> {
		this.refresh();
	}

	refresh(): void {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass("oden-sidebar");

		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			container.createEl("p", { text: "アクティブなノートがありません。" });
			return;
		}

		const header = container.createEl("div", { cls: "oden-sidebar-header" });
		header.createEl("h4", { text: "🍢 熟成鍋" });
		header.createEl("p", {
			cls: "oden-sidebar-subtitle",
			text: `「${activeFile.basename}」と相性の良い、煮込み中のメモ`,
		});

		const suggestions = this.indexer.getRelatedStaleNotes(activeFile);

		if (suggestions.length === 0) {
			container.createEl("p", {
				cls: "oden-sidebar-empty",
				text: "熟成した関連メモが見つかりませんでした。「ODEN: Vaultを再インデックス」を実行済みか確認してください。",
			});
			return;
		}

		const thresholdDays = this.indexer.getSettingsSnapshot().staleDaysThreshold;
		const list = container.createEl("div", { cls: "oden-suggestion-list" });
		for (const suggestion of suggestions) {
			this.renderSuggestion(list, suggestion, thresholdDays);
		}
	}

	private renderSuggestion(
		parent: HTMLElement,
		suggestion: RelatedNoteSuggestion,
		thresholdDays: number
	): void {
		const ripeness = getRipenessInfo(suggestion.staleDays, thresholdDays);

		const item = parent.createEl("div", { cls: `oden-suggestion-item oden-tier-${ripeness.tier}` });

		const titleRow = item.createEl("div", { cls: "oden-suggestion-title-row" });
		titleRow.createEl("span", { cls: "oden-suggestion-icon", text: ripeness.icon });
		const link = titleRow.createEl("a", {
			cls: "oden-suggestion-title",
			text: suggestion.title,
		});
		link.addEventListener("click", (evt) => {
			evt.preventDefault();
			this.app.workspace.openLinkText(suggestion.path, "", false);
		});

		const statusRow = item.createEl("div", { cls: "oden-status-row" });
		statusRow.createEl("span", { cls: "oden-status-label", text: ripeness.label });
		statusRow.createEl("span", {
			cls: "oden-status-days",
			text: `放置 ${suggestion.staleDays}日`,
		});

		const progressTrack = item.createEl("div", { cls: "oden-progress-track" });
		const progressFill = progressTrack.createEl("div", { cls: "oden-progress-fill" });
		progressFill.style.width = `${Math.round(ripeness.progress * 100)}%`;

		const meta = item.createEl("div", { cls: "oden-suggestion-meta" });
		meta.createEl("span", {
			cls: "oden-badge oden-badge-similarity",
			text: `類似度 ${(suggestion.similarity * 100).toFixed(0)}%`,
		});
	}

	async onClose(): Promise<void> {
		// 特にクリーンアップ不要
	}
}
