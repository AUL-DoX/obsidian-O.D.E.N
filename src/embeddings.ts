import { requestUrl } from "obsidian";
import { OdenSettings } from "./types";

/**
 * テキストからEmbeddingベクトルを取得するプロバイダのインターフェース。
 * Phase 1はOpenAI実装のみ。Phase 3でローカル(Ollama/Transformers.js)実装を追加予定。
 */
export interface EmbeddingProvider {
	embed(text: string): Promise<number[]>;
}

interface OpenAIEmbeddingResponse {
	data?: { embedding?: number[] }[];
}

interface OllamaEmbeddingResponse {
	embedding?: number[];
}

const OPENAI_ENDPOINT = "https://api.openai.com/v1/embeddings";

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
	constructor(private settings: OdenSettings) {}

	async embed(text: string): Promise<number[]> {
		if (!this.settings.openaiApiKey) {
			throw new Error(
				"OpenAI APIキーが設定されていません。設定画面から入力してください。"
			);
		}

		const res = await requestUrl({
			url: OPENAI_ENDPOINT,
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.settings.openaiApiKey}`,
			},
			body: JSON.stringify({
				model: this.settings.openaiModel,
				// APIの入力上限に配慮し、長文は先頭部分のみを使う（MVP簡易対応）
				input: text.slice(0, 8000),
			}),
			throw: false,
		});

		if (res.status < 200 || res.status >= 300) {
			throw new Error(
				`OpenAI Embedding APIエラー (status ${res.status}): ${res.text}`
			);
		}

		const json = res.json as OpenAIEmbeddingResponse;
		const vector = json.data?.[0]?.embedding;
		if (!Array.isArray(vector)) {
			throw new Error("OpenAI Embedding APIのレスポンス形式が不正です。");
		}
		return vector;
	}
}

const OLLAMA_EMBED_PATH = "/api/embeddings";

export class OllamaEmbeddingProvider implements EmbeddingProvider {
	constructor(private settings: OdenSettings) {}

	async embed(text: string): Promise<number[]> {
		const baseUrl = this.settings.ollamaBaseUrl.replace(/\/+$/, "");
		if (!baseUrl) {
			throw new Error("OllamaのベースURLが設定されていません。");
		}

		const res = await requestUrl({
			url: `${baseUrl}${OLLAMA_EMBED_PATH}`,
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				model: this.settings.ollamaEmbedModel,
				// MVP簡易対応: 長文は先頭部分のみ
				prompt: text.slice(0, 8000),
			}),
			throw: false,
		});

		if (res.status < 200 || res.status >= 300) {
			throw new Error(
				`Ollama Embedding APIエラー (status ${res.status}): ${res.text}。Ollamaが起動しており、モデル「${this.settings.ollamaEmbedModel}」がpull済みか確認してください。`
			);
		}

		const json = res.json as OllamaEmbeddingResponse;
		const vector = json.embedding;
		if (!Array.isArray(vector)) {
			throw new Error("Ollama Embedding APIのレスポンス形式が不正です。");
		}
		return vector;
	}
}

export function getEmbeddingProvider(settings: OdenSettings): EmbeddingProvider {
	if (settings.embeddingProvider === "local") {
		return new OllamaEmbeddingProvider(settings);
	}
	return new OpenAIEmbeddingProvider(settings);
}

/**
 * 現在有効なEmbeddingプロバイダ＋モデルを一意に表す識別子。
 * プロバイダやモデルを切り替えるとベクトル空間の互換性がなくなるため、
 * キャッシュの再計算判定にこの値を使う。
 */
export function getActiveModelKey(settings: OdenSettings): string {
	return settings.embeddingProvider === "local"
		? `local:${settings.ollamaEmbedModel}`
		: `openai:${settings.openaiModel}`;
}

/** コサイン類似度を計算する */
export function cosineSimilarity(a: number[], b: number[]): number {
	if (a.length !== b.length || a.length === 0) return 0;
	let dot = 0;
	let normA = 0;
	let normB = 0;
	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i];
		normA += a[i] * a[i];
		normB += b[i] * b[i];
	}
	if (normA === 0 || normB === 0) return 0;
	return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
