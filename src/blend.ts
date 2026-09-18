import { requestUrl, TFile, App, normalizePath } from "obsidian";
import { OdenSettings } from "./types";

const OPENAI_CHAT_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const ANTHROPIC_MESSAGES_ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

const SYSTEM_PROMPT = `あなたは「ODEN」という、放置されたメモ同士を掛け合わせて新しいアイディアを抽出するアシスタントです。
与えられた複数のノートを読み、以下の構成でMarkdownを出力してください。前置きや余計な説明は不要です。

## 共通点
（各ノートに共通するテーマ・視点を箇条書きで）

## 掛け合わせ企画
（ノート同士を掛け合わせることで生まれる新しいアイディア・企画・問いを2〜4個、それぞれ見出しと2〜3文の説明付きで）

## 次の一歩
（この出汁を活かすための具体的な次アクションを1〜2個）`;

export interface BlendSourceNote {
	file: TFile;
	content: string;
}

interface OpenAIChatResponse {
	choices?: { message?: { content?: string } }[];
}

interface AnthropicMessagesResponse {
	content?: { text?: string }[];
}

/** ブレンド生成を行うChatプロバイダのインターフェース */
export interface ChatProvider {
	generate(userContent: string): Promise<string>;
}

class OpenAIChatProvider implements ChatProvider {
	constructor(private settings: OdenSettings) {}

	async generate(userContent: string): Promise<string> {
		if (!this.settings.openaiApiKey) {
			throw new Error(
				"OpenAI APIキーが設定されていません。設定画面から入力してください。"
			);
		}

		const res = await requestUrl({
			url: OPENAI_CHAT_ENDPOINT,
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.settings.openaiApiKey}`,
			},
			body: JSON.stringify({
				model: this.settings.openaiChatModel,
				messages: [
					{ role: "system", content: SYSTEM_PROMPT },
					{ role: "user", content: userContent },
				],
				temperature: 0.7,
			}),
			throw: false,
		});

		if (res.status < 200 || res.status >= 300) {
			throw new Error(`OpenAI Chat APIエラー (status ${res.status}): ${res.text}`);
		}

		const json = res.json as OpenAIChatResponse;
		const text = json.choices?.[0]?.message?.content;
		if (typeof text !== "string" || !text.trim()) {
			throw new Error("OpenAI Chat APIのレスポンス形式が不正です。");
		}
		return text.trim();
	}
}

class ClaudeChatProvider implements ChatProvider {
	constructor(private settings: OdenSettings) {}

	async generate(userContent: string): Promise<string> {
		if (!this.settings.claudeApiKey) {
			throw new Error(
				"Anthropic APIキーが設定されていません。設定画面から入力してください。"
			);
		}

		const res = await requestUrl({
			url: ANTHROPIC_MESSAGES_ENDPOINT,
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": this.settings.claudeApiKey,
				"anthropic-version": ANTHROPIC_VERSION,
			},
			body: JSON.stringify({
				model: this.settings.claudeModel,
				max_tokens: 2048,
				system: SYSTEM_PROMPT,
				messages: [{ role: "user", content: userContent }],
			}),
			throw: false,
		});

		if (res.status < 200 || res.status >= 300) {
			throw new Error(`Anthropic APIエラー (status ${res.status}): ${res.text}`);
		}

		const json = res.json as AnthropicMessagesResponse;
		const text = json.content?.[0]?.text;
		if (typeof text !== "string" || !text.trim()) {
			throw new Error("Anthropic APIのレスポンス形式が不正です。");
		}
		return text.trim();
	}
}

export function getChatProvider(settings: OdenSettings): ChatProvider {
	return settings.chatProvider === "claude"
		? new ClaudeChatProvider(settings)
		: new OpenAIChatProvider(settings);
}

/**
 * 複数ノートの内容をLLMに渡し、「共通点」と「掛け合わせ企画」を生成する。
 */
export class OdenBlender {
	constructor(private settings: OdenSettings) {}

	async blend(notes: BlendSourceNote[]): Promise<string> {
		if (notes.length < 2) {
			throw new Error("出汁ブレンドには2つ以上のノートを選択してください。");
		}

		const userContent = notes
			.map((n, i) => `### ノート${i + 1}: ${n.file.basename}\n\n${n.content.slice(0, 6000)}`)
			.join("\n\n---\n\n");

		const provider = getChatProvider(this.settings);
		return await provider.generate(userContent);
	}
}

/** ブレンド結果を新規ノートとして保存し、そのファイルを返す */
export async function createBlendNote(
	app: App,
	notes: BlendSourceNote[],
	blendMarkdown: string
): Promise<TFile> {
	const folder = notes[0].file.parent?.path ?? "";
	const titles = notes.map((n) => n.file.basename).join(" × ");
	const timestamp = window.moment().format("YYYYMMDDHHmmss");
	const safeTitle = `出汁 - ${titles}`.slice(0, 100);
	const path = normalizePath(
		folder ? `${folder}/${safeTitle} ${timestamp}.md` : `${safeTitle} ${timestamp}.md`
	);

	const sourceLinks = notes.map((n) => `- [[${n.file.basename}]]`).join("\n");
	const body = `# 出汁: ${titles}\n\n> [!info] 元ノート\n${sourceLinks}\n\n${blendMarkdown}\n`;

	return await app.vault.create(path, body);
}
