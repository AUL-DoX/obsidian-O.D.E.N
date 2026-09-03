import { App, PluginSettingTab, Setting } from "obsidian";
import type OdenPlugin from "../main";

export class OdenSettingTab extends PluginSettingTab {
	plugin: OdenPlugin;

	constructor(app: App, plugin: OdenPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Embeddingプロバイダ")
			.setDesc(
				"熟成サイドバーの類似度計算に使うEmbeddingを選択します。プロバイダ/モデルを切り替えると、次回の再インデックスで対象ノート全件を計算し直します（ベクトル空間の互換性がないため）。"
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOption("openai", "OpenAI API")
					.addOption("local", "ローカル（Ollama）")
					.setValue(this.plugin.settings.embeddingProvider)
					.onChange(async (value) => {
						this.plugin.settings.embeddingProvider = value as "openai" | "local";
						await this.plugin.saveSettings();
						this.display();
					})
			);

		if (this.plugin.settings.embeddingProvider === "openai") {
			new Setting(containerEl)
				.setName("OpenAI APIキー")
				.setDesc("OpenAIのAPIキーを入力してください。ローカルには暗号化されず保存されます。")
				.addText((text) =>
					text
						.setPlaceholder("sk-...")
						.setValue(this.plugin.settings.openaiApiKey)
						.onChange(async (value) => {
							this.plugin.settings.openaiApiKey = value.trim();
							await this.plugin.saveSettings();
						})
				);

			new Setting(containerEl)
				.setName("OpenAI Embeddingモデル")
				.setDesc("例: text-embedding-3-small")
				.addText((text) =>
					text
						.setValue(this.plugin.settings.openaiModel)
						.onChange(async (value) => {
							this.plugin.settings.openaiModel = value.trim();
							await this.plugin.saveSettings();
						})
				);
		} else {
			new Setting(containerEl)
				.setName("Ollama ベースURL")
				.setDesc("Ollamaを起動しているエンドポイント。例: http://localhost:11434")
				.addText((text) =>
					text
						.setValue(this.plugin.settings.ollamaBaseUrl)
						.onChange(async (value) => {
							this.plugin.settings.ollamaBaseUrl = value.trim();
							await this.plugin.saveSettings();
						})
				);

			new Setting(containerEl)
				.setName("Ollama Embeddingモデル")
				.setDesc(
					"事前に `ollama pull nomic-embed-text` 等でモデルを取得しておいてください。"
				)
				.addText((text) =>
					text
						.setValue(this.plugin.settings.ollamaEmbedModel)
						.onChange(async (value) => {
							this.plugin.settings.ollamaEmbedModel = value.trim();
							await this.plugin.saveSettings();
						})
				);

			new Setting(containerEl)
				.setName("Ollama接続テスト")
				.setDesc("短いテキストでEmbeddingを試し、接続とモデルの状態を確認します。")
				.addButton((button) =>
					button.setButtonText("接続テスト").onClick(async () => {
						button.setDisabled(true);
						button.setButtonText("確認中...");
						await this.plugin.testOllamaConnection();
						button.setDisabled(false);
						button.setButtonText("接続テスト");
					})
				);
		}

		new Setting(containerEl).setName("出汁ブレンド（アイディア生成）").setHeading();

		new Setting(containerEl)
			.setName("ブレンド用プロバイダ")
			.setDesc("出汁ブレンド生成に使うAIを選択します（Embeddingとは別設定です）。")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("openai", "OpenAI")
					.addOption("claude", "Claude (Anthropic)")
					.setValue(this.plugin.settings.chatProvider)
					.onChange(async (value) => {
						this.plugin.settings.chatProvider = value as "openai" | "claude";
						await this.plugin.saveSettings();
						this.display();
					})
			);

		if (this.plugin.settings.chatProvider === "openai") {
			new Setting(containerEl)
				.setName("OpenAI Chatモデル")
				.setDesc("例: gpt-4o-mini / gpt-4o")
				.addText((text) =>
					text
						.setValue(this.plugin.settings.openaiChatModel)
						.onChange(async (value) => {
							this.plugin.settings.openaiChatModel = value.trim();
							await this.plugin.saveSettings();
						})
				);
		} else {
			new Setting(containerEl)
				.setName("Anthropic APIキー")
				.setDesc("ClaudeのAPIキーを入力してください。ローカルには暗号化されず保存されます。")
				.addText((text) =>
					text
						.setPlaceholder("sk-ant-...")
						.setValue(this.plugin.settings.claudeApiKey)
						.onChange(async (value) => {
							this.plugin.settings.claudeApiKey = value.trim();
							await this.plugin.saveSettings();
						})
				);

			new Setting(containerEl)
				.setName("Claudeモデル")
				.setDesc("例: claude-haiku-4-5-20251001 / claude-sonnet-5 / claude-opus-5")
				.addText((text) =>
					text
						.setValue(this.plugin.settings.claudeModel)
						.onChange(async (value) => {
							this.plugin.settings.claudeModel = value.trim();
							await this.plugin.saveSettings();
						})
				);
		}

		new Setting(containerEl).setName("熟成サイドバー").setHeading();

		new Setting(containerEl)
			.setName("放置日数のしきい値")
			.setDesc("この日数以上更新されていないノートを「熟成済み」として候補に含めます。")
			.addSlider((slider) =>
				slider
					.setLimits(1, 180, 1)
					.setValue(this.plugin.settings.staleDaysThreshold)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.staleDaysThreshold = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("表示件数の上限")
			.setDesc("サイドバーに表示する候補の最大数。")
			.addSlider((slider) =>
				slider
					.setLimits(1, 20, 1)
					.setValue(this.plugin.settings.maxSuggestions)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.maxSuggestions = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("食べごろ通知")
			.setDesc(
				"Obsidian起動時に「食べごろ」に達したノートがあればNoticeで知らせます。既存キャッシュを読むだけで、新規のAPI課金やノートへの書き込みは発生しません。"
			)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.notifyOnReady).onChange(async (value) => {
					this.plugin.settings.notifyOnReady = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("除外フォルダ")
			.setDesc("インデックス対象から除外するフォルダをカンマ区切りで指定（前方一致）。例: Templates/,Archive/")
			.addTextArea((text) =>
				text
					.setValue(this.plugin.settings.excludedFolders.join(","))
					.onChange(async (value) => {
						this.plugin.settings.excludedFolders = value
							.split(",")
							.map((s) => s.trim())
							.filter((s) => s.length > 0);
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Vaultを再インデックス")
			.setDesc("全ノートのEmbeddingを計算します（変更のないノートはスキップされます）。API利用料が発生する場合があります。")
			.addButton((button) =>
				button.setButtonText("再インデックス実行").onClick(async () => {
					button.setDisabled(true);
					button.setButtonText("実行中...");
					await this.plugin.reindexVault();
					button.setDisabled(false);
					button.setButtonText("再インデックス実行");
				})
			);
	}
}
