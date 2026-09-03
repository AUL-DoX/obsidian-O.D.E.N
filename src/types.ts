export interface OdenSettings {
	/** OpenAI API key（ローカルモードでは未使用） */
	openaiApiKey: string;
	/** Embeddingプロバイダ */
	embeddingProvider: "openai" | "local";
	/** OpenAI Embeddingモデル名 */
	openaiModel: string;
	/** Ollamaサーバーのベースエンドポイント */
	ollamaBaseUrl: string;
	/** Ollamaで使うEmbeddingモデル名 */
	ollamaEmbedModel: string;
	/** 出汁ブレンド生成に使うChatプロバイダ */
	chatProvider: "openai" | "claude";
	/** OpenAI Chatモデル名（出汁ブレンド生成用） */
	openaiChatModel: string;
	/** Anthropic APIキー（出汁ブレンド生成用） */
	claudeApiKey: string;
	/** Claudeモデル名（出汁ブレンド生成用） */
	claudeModel: string;
	/** 「放置」とみなす日数のしきい値 */
	staleDaysThreshold: number;
	/** サイドバーに表示する候補の最大件数 */
	maxSuggestions: number;
	/** 除外するフォルダ（前方一致） */
	excludedFolders: string[];
	/** 起動時に「食べごろ」ノートをNoticeで通知するか */
	notifyOnReady: boolean;
}

export const DEFAULT_SETTINGS: OdenSettings = {
	openaiApiKey: "",
	embeddingProvider: "openai",
	openaiModel: "text-embedding-3-small",
	ollamaBaseUrl: "http://localhost:11434",
	ollamaEmbedModel: "nomic-embed-text",
	chatProvider: "openai",
	openaiChatModel: "gpt-4o-mini",
	claudeApiKey: "",
	claudeModel: "claude-haiku-4-5-20251001",
	staleDaysThreshold: 30,
	maxSuggestions: 5,
	excludedFolders: [],
	notifyOnReady: true,
};

/** ノート1件分のEmbeddingキャッシュエントリ */
export interface EmbeddingRecord {
	/** Vault内でのファイルパス（キー） */
	path: string;
	/** 埋め込みベクトル計算時点のファイル更新時刻(ms) */
	mtime: number;
	/** 埋め込みベクトル */
	vector: number[];
	/** 計算に使ったモデル名（モデル変更時の再計算判定に使う） */
	model: string;
}

export interface OdenData {
	settings: OdenSettings;
	embeddings: Record<string, EmbeddingRecord>;
}

/** サイドバーに表示する1候補 */
export interface RelatedNoteSuggestion {
	path: string;
	title: string;
	similarity: number;
	staleDays: number;
}
