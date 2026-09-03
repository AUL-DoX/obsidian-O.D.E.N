# Oden

**Organizer for Deepening & Evolving Notes**

Oden helps you rediscover notes you left dormant, blending them with your current thinking via AI to extract fresh ideas — like a pot of oden that tastes better the longer its ingredients simmer together.

- **Aging-pot sidebar**: surfaces dormant notes (untouched for a while) that are relevant to the note you're currently viewing, ranked by how "well-simmered" (stale-days × similarity) they are
- **Blend**: select two or more notes and let AI extract common threads and combined ideas into a brand-new note (your originals are never modified)
- **"Ready to eat" notification**: an optional startup modal that surfaces notes which have fully matured, so you remember to revisit them
- **Choice of providers**: OpenAI or local Ollama for embeddings (similarity search), OpenAI or Claude (Anthropic) for blend generation

See below for detailed Japanese documentation (使い方・設定手順・トラブルシューティング).

---

放置メモ（過去の具材）と現在の思考をAIで掛け合わせ、新しいアイディア（出汁）を熟成・抽出するObsidian用プラグインです。

## できること

| 機能 | 概要 |
| --- | --- |
| 🍢 熟成鍋（サイドバー） | アクティブノートと相性の良い放置メモ（更新から一定日数以上）を、煮込み具合（コトコト煮込み中→味がしみ込み中→食べごろ）として表示 |
| 🔥 食べごろ通知 | Obsidian起動時に「食べごろ」に達したノートがあれば中央モーダルで通知。既存キャッシュを読むだけで課金・書き込みは発生しない。設定でON/OFF可能。クリックでそのノートを開ける |
| 出汁ブレンド | ファイルエクスプローラーで2件以上のノートを選択して右クリック →「出汁ブレンドを生成」。AIが共通点と掛け合わせ企画を新規ノートとして生成 |
| Embeddingプロバイダ切替 | OpenAI API（高精度・クラウド）／ Ollama（完全ローカル・無料）を選択可能 |
| 出汁ブレンド用プロバイダ切替 | OpenAI ／ Claude (Anthropic) を選択可能 |

## インストール（開発版・手動）

まだObsidian公式ディレクトリには申請していません。手動インストールが必要です。

1. このリポジトリで `npm install` → `npm run build` を実行し、`main.js` / `manifest.json` / `styles.css` を生成
2. 対象のVaultの `.obsidian/plugins/oden/` フォルダにこの3ファイルをコピー
3. Obsidianの設定 →「コミュニティプラグイン」→ 制限モードなら「制限モードを終了する」
4. 「インストールされたプラグイン」一覧の更新ボタン（🔄）を押す
5. 一覧に出てきた「ODEN」のトグルをON

## 初期設定

1. 設定 →「ODEN」を開く
2. **Embeddingプロバイダ**を選択
   - OpenAI：APIキーとモデル名（既定 `text-embedding-3-small`）を入力
   - ローカル（Ollama）：Ollamaを起動し `ollama pull nomic-embed-text` 等でモデルを取得済みにしてから、ベースURL（既定 `http://localhost:11434`）とモデル名を設定。「接続テスト」ボタンで疎通確認可能
3. **出汁ブレンド用プロバイダ**を選択
   - OpenAI：APIキーとモデル名（既定 `gpt-4o-mini`）
   - Claude：Anthropic APIキーとモデル名（既定 `claude-haiku-4-5-20251001`）
   - どちらのモデル名欄も自由入力。用途・コストに応じて `gpt-4o` や `claude-sonnet-5` 等に変更可能
4. **放置日数のしきい値**（既定30日）：この日数以上更新されていないノートが「熟成済み」として候補に上がる
   - しきい値〜1.33倍：🍢 コトコト煮込み中
   - 1.33倍〜2倍：🍲 味がしみ込み中
   - 2倍以上：🔥 食べごろ！
   - （例：しきい値30日なら、30〜40日=煮込み中／40〜60日=味しみ中／60日以上=食べごろ）
5. コマンドパレット（`Ctrl+P`）から「ODEN: Vaultを再インデックス」を実行してEmbeddingを計算

## 使い方

- リボンの🍢アイコン、またはコマンドパレットの「ODEN: 熟成サイドバーを開く」でサイドバーを表示
- ノートを開くと、そのノートと相性の良い放置メモが熟成鍋に並ぶ
- 出汁ブレンドしたいノートをファイルエクスプローラーで複数選択 → 右クリック →「出汁ブレンドを生成」
- 生成結果は元ノートを変更せず、新規ノートとして同フォルダに保存される

## 注意点

- Embeddingは編集の度に自動実行されない（コスト配慮）。ノートを追加・大幅編集したら手動で「Vaultを再インデックス」を実行する
- Embeddingプロバイダやモデルを切り替えると、それまでのキャッシュとはベクトル空間が異なるため、次回の再インデックスで該当ノートが再計算される
- APIキーは `data.json` にプレーンテキストで保存される（暗号化なし）
- Vault内のノート件数が多い場合、「除外フォルダ」設定でインデックス対象を絞ると初回のAPI課金・処理時間を抑えられる

## トラブルシューティング

### プラグインを更新（`main.js`を差し替え）したのに動作が変わらない

**まずはパソコン自体を再起動してください。** これでほぼ解決します。

原因：Windows版Obsidianはウィンドウを閉じてもタスクトレイに常駐したままのことがあり、「閉じて開き直す」だけだと古いプラグインコードがメモリに残り続けます。パソコンを再起動すれば、常駐していたプロセスも含めて確実に終了します。

（開発者向けの代替手段：コマンドパレットで「Reload app without saving」を実行するか、タスクトレイのObsidianアイコンを右クリックして「Quit」を選んでから起動し直す）

### 「熟成した関連メモが見つかりませんでした」と出る

- 「ODEN: Vaultを再インデックス」を実行済みか確認
- 比較対象になるノートが、放置日数のしきい値を超えているか確認（新規ノートは更新日時が「今」なのでしきい値以上放置されるまで候補に出ない）

### 出汁ブレンド／Embeddingでエラーが出る

- APIキーが正しく入力されているか確認
- Ollama使用時は `ollama list` でモデルがpull済みか確認し、Ollamaアプリが起動しているか確認

## ロードマップ

- [x] Phase 1: ボイラープレート・OpenAI Embedding・熟成サイドバー
- [x] Phase 2: 熟成度フィルタリング・出汁ブレンド生成
- [x] Phase 3: ローカルEmbedding(Ollama)対応・UIの煮込みステータス表現刷新
- [ ] Obsidian公式コミュニティプラグインへの申請（動作確認が固まってから判断）
