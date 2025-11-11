# Stationhead Auto Streamer - Claude Code Project Context

## プロジェクト概要
このプロジェクトは、Stationheadでの配信を自動化するシステムです。

**主な目的:**
- Stationheadへの自動ログイン
- Spotify連携の自動化
- 配信スケジュールの管理
- プレイリストのループ再生
- エラー監視とSlack通知

## 重要なドキュメント
@requirement.md - システムの詳細な要件定義

## 技術スタック（予定）
- **言語**: TypeScript + Node.js
- **ブラウザ自動化**: Playwright
- **スケジューラー**: node-cron または OS標準スケジューラー
- **データ管理**: SQLite または JSON
- **通知**: @slack/webhook
- **ログ管理**: winston または pino

## MCPサーバー
- **Serena MCP**: IDE補助機能
- **Playwright MCP**: ブラウザ自動化操作（@executeautomation/playwright-mcp-server）
- **Chrome DevTools MCP**: Chrome DevTools Protocol経由でブラウザ制御・デバッグ（chrome-devtools-mcp）
  - パフォーマンス分析、ネットワーク監視、スクリーンショット取得
  - Node.js 22+推奨（現在: Node.js 20.19.5で動作）

## 開発ガイドライン

### 作業フローの原則
**重要**: 作業単位ごとに必ず以下のステップを実行すること

1. **作業開始時**: `docs/phases/` の該当フェーズドキュメントを確認
2. **作業中**: タスクの進捗をTodoWriteツールで管理
3. **作業完了時**: 必ず該当フェーズドキュメントを更新
   - サブタスクのチェックボックスを更新
   - タスクのステータスを更新（⚪ 未着手 → 🟡 進行中 → 🟢 完了）
   - 完了日を記録
   - 成果物を記録
4. **フェーズ移行時**: README.mdとCLAUDE.mdの「現在のフェーズ」を更新

**ドキュメント更新漏れ防止策**:
- タスク完了時は必ず phase ドキュメントを更新してから次のタスクに進む
- 複数のサブタスクがある場合は、1つ完了するごとに更新
- 成果物（ファイルパス）を必ず記録

### コーディング規約
1. TypeScriptの厳格モードを使用
2. ESLintとPrettierでコード品質を維持
3. すべての関数に型定義を付与
4. エラーハンドリングを必ず実装

### ブラウザ自動化の原則
1. 安定したセレクタを優先（data-testid > id > class）
2. 適切な待機処理を実装（ページロード、要素表示）
3. エラー時はスクリーンショットを取得
4. リトライロジックを実装（最大3回）
5. Playwright MCPサーバーを活用してブラウザ操作を効率化

### スケジューラーの原則
1. 時間の重複を必ずチェック
2. タイムゾーンを明示的に扱う
3. 実行状態を確実に記録
4. 失敗時の通知を必ず送信

### セキュリティ
1. 認証情報は環境変数または暗号化して保存
2. ログに機密情報を含めない
3. Slack Webhook URLは環境変数で管理

## カスタムエージェント
- `@browser-automation` - ブラウザ自動化専門
- `@scheduler` - スケジュール管理専門
- `@ui-developer` - UI開発専門

## カスタムコマンド
- `/test-browser` - ブラウザ自動化のテスト実行
- `/check-schedule` - スケジュール確認
- `/investigate-stationhead` - Stationhead UI調査

## ディレクトリ構造
```
stationhead-auto-streamer/
├── src/
│   ├── browser/          # ブラウザ自動化
│   ├── scheduler/        # スケジューラー
│   ├── notification/     # 通知
│   ├── logger/           # ログ
│   ├── ui/               # UI
│   └── config/           # 設定管理
├── data/                 # データ保存
├── logs/                 # ログファイル
├── tests/                # テストコード
├── docs/                 # ドキュメント
└── .claude/              # Claude Code設定
```

## 開発フェーズ
現在: **Phase 1 - 基盤構築（要調査フェーズ含む）**

次のステップ:
1. プロジェクトセットアップ（package.json、tsconfig.json等）
2. StationheadのWeb UI構造調査（Playwright MCPを使用）
3. 認証方式の調査と実装方針決定
4. ブラウザ自動化の基本実装

## 注意事項
- StationheadのUIは変更される可能性があるため、柔軟な設計を心がける
- 2段階認証への対応が必要（セッション永続化を検討）
- プレイリスト終了検知の方法は要調査
- 長時間運用時のメモリリーク対策が必要
- Stationheadの利用規約に抵触しないか確認すること
