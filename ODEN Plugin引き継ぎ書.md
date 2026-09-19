## プロジェクト引き継ぎ書：Obsidian ODEN Plugin

**1. プロジェクト概要**

* **プロジェクト名**: Obsidian ODEN Plugin (Organizer for Deepening & Evolving Notes)
  * 「ODEN」は **O**rganizer for **D**eepening & **E**volving **N**otes の頭文字。おでんの「具材を長く煮込むほど味が染みる」イメージとかけている。
* **目的**: 時間経過した放置メモ（過去の具材）と現在の思考をAIで掛け合わせ、新しいアイディア（出汁）を熟成・抽出するObsidian用拡張機能の開発。
* **ターゲット**: Obsidianで日常的にメモを取るが、過去のメモを活用しきれず埋もれさせている知識労働者・クリエイター。

**2. コアコンセプト・差別化要因**

* **競合（Smart Connections等）との違い**: 単なる「テキスト類似度検索」ではなく、「放置時間（熟成度）× 類似度」を軸に過去メモを自動で掘り起こす。
* **コア体験**: プッシュ型の「食べごろ通知」と、ワンクリックでのAIアイディア合成（出汁抽出）。

**3. 主要機能要件**

| 機能名 | 概要 | 詳細仕様 |
| --- | --- | --- |
| **熟成サイドバー** | 関連思考の自動浮上 | アクティブノートと相性の良い放置メモ（更新30日以上前）を優先表示 |
| **食べごろ通知** | プッシュ型見直し提案 | アプリ起動時などに「熟成完了」したメモの見直しを自動提示 |
| **出汁ブレンド** | AIによるアイディア統合 | 2つ以上のノートを選択し、AIが共通点や掛け合わせ企画を末尾に自動生成 |
| **ローカル/API切替** | プライバシー配慮 | OpenAI API（高精度）とOllama/Local Embedding（完全ローカル）の選択制 |

**4. 想定技術スタック**

* **言語/フレームワーク**: TypeScript (Obsidian API)
* **データ処理**: Web Worker（ノート数増大時のUIフリーズ防止）
* **ベクトル検索/Embedding**:
* クラウド: OpenAI `text-embedding-3-small`
* ローカル: Ollama (`nomic-embed-text`等) / Transformers.js


* **データ保存**: プラグイン設定用JSON (`.obsidian/plugins/obsidian-oden/data.json`)

**5. 着手予定タスク（ロードマップ）**

* [x] **Phase 1 (MVP)**: Obsidian APIを用いた基本ボイラープレートの作成と、OpenAI APIによる簡易Embedding＆サイドバー表示
* [x] **Phase 2**: 「放置日数×類似度」のフィルタリングロジック実装と「出汁ブレンド」生成コマンドの追加
* [x] **Phase 3**: Ollama等を利用した完全ローカル環境対応およびUIデザイン（煮込みステータス表現）の刷新

---

**6. 実装完了報告（2026-08-30時点）**

Phase 1〜3、および当初表になかった「食べごろ通知」まで実装・実機動作確認済み。使い方・設定手順・トラブルシューティングの詳細は [README.md](README.md) を参照。

*実装した機能*

| 機能 | 状態 | 備考 |
| --- | --- | --- |
| 熟成サイドバー（🍢熟成鍋） | 実装済み | 放置日数としきい値の比率で「コトコト煮込み中／味がしみ込み中／食べごろ」の3段階表示＋進捗バー |
| 食べごろ通知 | 実装済み | 起動時、画面中央のモーダルで一覧表示。クリックでノートを開ける。読み取り専用・課金なし。設定でON/OFF可 |
| 出汁ブレンド | 実装済み | ファイルエクスプローラーで2件以上選択→右クリックで手動生成。**元ノートは一切変更せず、新規ノートとして保存**（誤上書き対策） |
| Embeddingプロバイダ切替 | 実装済み | OpenAI / ローカル(Ollama, `nomic-embed-text`)。プロバイダ・モデルを切替えても互換性のないベクトルは自動的に区別され、次回再インデックスで対象分のみ再計算 |
| 出汁ブレンド用プロバイダ切替 | 実装済み | OpenAI / Claude(Anthropic)。モデル名は両方とも自由入力欄（既定値: `gpt-4o-mini` / `claude-haiku-4-5-20251001`） |

*当初計画からの変更点*

* データ処理のWeb Worker化、Transformers.js対応は未着手（Ollamaのみでローカル対応は達成できたため優先度を下げた）
* **自動出汁ブレンド機能を一度実装したが削除した**：「食べごろ」ノート同士を起動時に自動でAIブレンドする機能を試作・動作確認までしたが、「機能過多で結局使わない」という判断により削除。出汁ブレンドは手動発動のみに統一。設計・実装自体は動作確認済みなので、必要になれば会話ログから再現可能

*動作確認したVault*

* `C:\ODEN Plugin`（開発用）
* `C:\AUL Local Folder Index`
* `C:\AUL Knowledge Output Hub`（実データでの類似度・出汁ブレンド動作確認に使用）

*運用上の既知の注意点*

* Windows版Obsidianはウィンドウを閉じてもタスクトレイに常駐することがあり、`main.js`更新後に「閉じて開き直す」だけでは古いコードが残ることがある。確実に反映させるには**パソコンを再起動**するか、Obsidianプロセスを完全終了させる
* Obsidianでノートを開くと、内容が同じでも改行コード（CRLF→LF）が正規化され「更新日時」だけ変わることがある（ODENの書き込みではなくObsidian自体の挙動）

*未着手・保留中*

* ~~Obsidian公式コミュニティプラグインへの申請~~ → 2026-09-19、公式ディレクトリに公開完了（詳細は「7. 公式ディレクトリ申請の進捗」参照）

---

**7. 公式ディレクトリ申請の進捗（2026-09-18時点）**

申請作業に着手。以下は完了・進行中の内容。

* GitHubリポジトリ公開：https://github.com/AUL-DoX/obsidian-O.D.E.N （オーナー: AUL-DoXアカウント）
* プラグインIDを`obsidian-oden`→`oden`にリネーム（Obsidianの命名規則で`id`に"obsidian"を含められないため）
* 申請プロセスは以前のGitHub直接PR方式から、**community.obsidian.md経由のWeb申請**に変わっている。Obsidianアカウントでのサインイン・GitHub連携が必要（ユーザー本人のみ実行可能）
* 審査で指摘された項目と対応：
  * `manifest.json`の`name`に`&`等の特殊文字・全大文字表記は不可 → `ODEN`→`Oden`に変更
  * `description`は英語かつ半角句読点で終わる必要あり → 英語に書き換え
  * READMEに英語セクションが必須 → 冒頭に追加
  * リリース資産のGitHubアーティファクト認証が推奨 → `.github/workflows/release.yml`を追加し、タグpushで自動ビルド・`actions/attest-build-provenance`による署名・リリース作成を全自動化（`git tag X.X.X && git push origin X.X.X`だけで完結）
* **注意**: community.obsidian.md側のスキャン結果はバージョン番号ごとにキャッシュされる。同じバージョン番号のまま再提出しても再スキャンされないため、修正のたびにpatchバージョンを上げる必要がある（0.1.0→0.1.5まで進行）
* 審査（自動チェック＋人間によるレビュー）には**数日〜数週間単位の待ち時間がある**。2026-09-03に初回申請、2026-09-18時点でようやく`0.1.4`が自動スキャンされ結果が返ってきた（約2週間）
* 2026-09-18時点で`0.1.5`のスキャンがキューに入った状態。次回はこの結果を確認するところから再開

**🎉 2026-09-19：公式ディレクトリ公開達成**

* `0.1.5`のスキャン完了後、community.obsidian.md上でプラグインが**「ドラフト」から「公開」状態に移行**し、Obsidian本体の「コミュニティプラグイン」検索から見つけて「オブシディアンに追加」でインストールできる状態になった
* 公開ページ：community.obsidian.md上の「おでん」エントリ（概要／スコアカード／アップデートタブあり）。公開直後の時点で既に5ダウンロードを確認
* ステータス：「健康」＝素晴らしい（緑）、「レビュー」＝注意（オレンジ、審査は完全クリアではなくまだ経過観察中の可能性あり）。次回はスコアカードタブの詳細を確認するとよい
* 申請開始（2026-09-03）から公開（2026-09-19）まで、実働は数回のやり取りだが実時間としては**約2週間半**かかった。うち大半は人間によるレビュー待ち時間
* 申請中に判明した実務上の学び：
  * スキャン結果はバージョン番号でキャッシュされる。修正のたびにpatchバージョンを上げないと再スキャンされない
  * `manifest.json`の`name`は「全大文字不可」「`&`等の特殊文字不可（ハイフン・+・括弧は可）」「'obsidian'を含む単語不可」「他プラグイン・テーマと重複不可」「"Plugin"という単語を含められない」
  * `description`は英語必須・半角句読点(`.` `!` `?`)で終わる必要がある
  * READMEにも英語セクションが必須（ディレクトリが英語圏中心のため）
  * リリース資産（`main.js`/`styles.css`/`manifest.json`）にGitHubのアーティファクト認証（`actions/attest-build-provenance`）を付けることが推奨される。`.github/workflows/release.yml`を用意し、`git tag X.X.X && git push origin X.X.X`だけで自動ビルド・署名・リリース作成が完結するようにした

**2026-09-19：`0.1.5`が審査で不合格（コード品質チェック）**

`0.1.5`は「食べごろ通知」実装当初の課題（アーティファクト認証・命名規則）は解決していたが、**`eslint-plugin-obsidianmd`（公式ESLintルールセット）による静的解析**で15件のエラー・44件の警告が新たに検出され不合格に。対応内容：

* ローカルに`eslint` + `eslint-plugin-obsidianmd`（`recommended`設定）を導入（`eslint.config.mjs`）。以後、申請前に`npx eslint main.ts src/*.ts`で同じチェックをローカル再現できる
* 主なエラーの原因と対処
  * `Workspace.revealLeaf`が`minAppVersion`（1.4.0）より新しいAPI（1.7.2以降）だった → `await`を付けて使用し、`minAppVersion`を`1.7.2`に引き上げ
  * floating promise（`void`演算子で明示的に無視、またはawait追加）
  * `requestUrl`のレスポンスJSON（`any`型）への安全でないアクセス → OpenAI/Anthropic/Ollama各レスポンスの型定義を追加
  * コマンドIDにプラグインID(`oden-`)を含めていた → Obsidianが自動で名前空間化するため不要、削除
  * `createEl("div"/"span", ...)` → `createDiv`/`createSpan`に統一（推奨ヘルパー）
  * UIテキストのsentence case違反多数 → ESLintの提案通りに一括修正
  * `builtin-modules`パッケージ（未使用のビルド時devDependency）が指摘された → 削除
* CI（GitHub Actions）側でも、ボイラープレート由来の未使用devDependency（`@typescript-eslint/eslint-plugin`/`parser` v6系）が新しい`eslint` v10系と依存関係競合を起こしビルド失敗 → 削除して解消。**今後Actions上でのみ発覚する問題を防ぐため、ローカルでも`npm ci`（`install`ではなく）で動作確認する習慣が必要**
* 残課題：`PluginSettingTab`の新しい宣言型設定API（`getSettingDefinitions()`、Obsidian 1.13.0以降）への移行は警告止まりのため今回は見送り。将来的に対応する場合はAPI仕様の再調査が必要
* `0.1.6`として再提出

**🎉 2026-09-19：`0.1.6`審査完了、ステータス「満足」に改善**

* community.obsidian.mdのレビュー欄が「完了」（緑）に変化。リリースのアーティファクト認証も両方「パス」
* 公開ページのステータスが「健康：素晴らしい」「レビュー：注意」→**「レビュー：満足」**に改善
* 以後の運用：コードを変更したら `npm run build` → `npx eslint main.ts src/*.ts` でエラーなしを確認 → バージョンを上げて `git tag X.X.X && git push origin X.X.X`（GitHub Actionsが自動でビルド・署名・リリースまで実行） → community.obsidian.mdの「新刊がないか確認してください」で再スキャン、という流れが確立できた

**重要：community.obsidian.mdの審査「完了」＝Obsidian本体で検索できる、ではない**

* `obsidianmd/obsidian-releases`リポジトリは**Pull Requestを受け付けなくなっている**（PR機能自体が無効化されており、APIで叩くと404）。以前あった「GitHubに直接PRを送る」申請方法は完全に過去のものになっている
* 実際にObsidian本体が読み込む`community-plugins.json`は、community.obsidian.md側のDBから**Botによる自動ミラー同期（約1時間おきに`chore: Mirror community plugins and themes`というコミットで反映）**によって更新される仕組み
* そのため、community.obsidian.mdのダッシュボードで審査が「完了」「満足」になっても、**Obsidianアプリ内の「コミュニティプラグイン」検索に実際に出てくるまでには、次の自動同期（最大1時間程度）を待つ必要がある**
* `0.1.6`の審査完了を確認したのが2026-09-19昼前後。Obsidian内検索での反映確認は後日改めて実施

**🎉 2026-09-19：Obsidian本体での検索・インストールを確認**

* 本家`obsidianmd/obsidian-releases`の`community-plugins.json`に`"id": "oden"`のエントリが実際に反映され、Obsidianアプリ内の「コミュニティプラグイン」検索で「Oden」「oden」（大文字・小文字問わず）でヒットし、インストールできる状態を確認
* `author`フィールドは`manifest.json`の`"AUL"`ではなく、GitHub組織名由来と思われる`"aul-dox"`（小文字）として登録されている
* `description`末尾に "This plugin has not been manually reviewed by Obsidian staff." という注記が自動付与されている。これは自動チェック（ESLint等）は通過したが、Obsidianスタッフによる目視レビューはまだ、という意味の標準的な注意書き。検索・インストールには支障なし
* READMEのインストール手順も、申請中を前提にした手動インストール手順から「コミュニティプラグイン検索からインストール」を第一手順とする内容に更新済み（旧手順は開発者向けとして残置）
* ここまでで、企画書（Phase1〜3）→ 実装 → 実機テスト → GitHub公開 → Obsidian公式ディレクトリ申請 → 公開、の一連の流れが完了