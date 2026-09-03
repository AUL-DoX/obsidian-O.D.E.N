import { App, Modal } from "obsidian";

export interface ReadyNoteItem {
	path: string;
	title: string;
	staleDays: number;
}

/**
 * 「食べごろ」ノートを画面中央のモーダルで提示する。
 * クリックでそのノートを開いて閉じる。読み取り専用・書き込みは一切行わない。
 */
export class ReadyNotesModal extends Modal {
	constructor(app: App, private notes: ReadyNoteItem[], private onOpenNote: (path: string) => void) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.addClass("oden-ready-modal");

		contentEl.createEl("h2", { text: "🔥 食べごろのメモがあります" });
		contentEl.createEl("p", {
			cls: "oden-ready-modal-subtitle",
			text: `${this.notes.length}件のメモが熟成しきっています。見直してみませんか？`,
		});

		const list = contentEl.createEl("div", { cls: "oden-ready-modal-list" });
		for (const note of this.notes) {
			const item = list.createEl("div", { cls: "oden-ready-modal-item" });
			const link = item.createEl("a", { cls: "oden-ready-modal-title", text: note.title });
			link.addEventListener("click", (evt) => {
				evt.preventDefault();
				this.onOpenNote(note.path);
				this.close();
			});
			item.createEl("span", {
				cls: "oden-ready-modal-days",
				text: `放置 ${note.staleDays}日`,
			});
		}

		const footer = contentEl.createEl("div", { cls: "oden-ready-modal-footer" });
		const closeButton = footer.createEl("button", { text: "閉じる" });
		closeButton.addEventListener("click", () => this.close());
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
