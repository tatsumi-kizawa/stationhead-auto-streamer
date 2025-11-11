# Stationhead Auto Streamer

Stationheadでの配信を自動化するシステムです。スケジュール管理、自動ログイン、プレイリストのループ再生、エラー通知などの機能を提供します。

## 主な機能

- 🚀 **自動配信**: 指定した日時に自動的に配信を開始・終了
- 📅 **スケジュール管理**: 複数の配信スケジュールを事前登録
- 🔄 **プレイリストループ**: プレイリストが終了したら自動的に再選択して再生
- 🔔 **Slack通知**: エラー発生時や配信開始/終了時にSlackへ通知
- 📊 **ログ管理**: 詳細なログ記録と閲覧機能
- ⏰ **時間重複チェック**: 配信時間の重複を事前に検知

## 必要な環境

- Node.js >= 18.0.0
- npm >= 9.0.0
- Mac または Windows

## インストール

1. リポジトリをクローン
```bash
git clone <repository-url>
cd stationhead-auto-streamer
```

2. 依存パッケージをインストール
```bash
npm install
```

3. Playwrightブラウザをインストール
```bash
npx playwright install chromium
```

4. 環境変数を設定
```bash
cp .env.example .env
# .envファイルを編集して必要な情報を設定
```

## 環境変数の設定

`.env`ファイルに以下の情報を設定してください:

```env
# Stationhead設定
STATIONHEAD_URL=https://stationhead.com
STATIONHEAD_EMAIL=your-email@example.com
STATIONHEAD_PASSWORD=your-password

# Slack通知設定
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SLACK_NOTIFICATIONS_ENABLED=true

# ブラウザ設定
BROWSER_HEADLESS=true  # falseにするとブラウザが表示されます

# ログ設定
LOG_LEVEL=info  # debug, info, warn, error
```

## 使い方

### 開発モード
```bash
npm run dev
```

### ビルド
```bash
npm run build
```

### 本番実行
```bash
npm start
```

### テスト
```bash
npm test
```

### コード品質チェック
```bash
# Lint
npm run lint

# フォーマット
npm run format

# 型チェック
npm run typecheck
```

## プロジェクト構造

```
stationhead-auto-streamer/
├── src/
│   ├── browser/          # ブラウザ自動化
│   ├── scheduler/        # スケジューラー
│   ├── notification/     # 通知
│   ├── logger/           # ログ管理
│   ├── ui/               # ユーザーインターフェース
│   ├── config/           # 設定管理
│   ├── types/            # 型定義
│   └── utils/            # ユーティリティ
├── tests/                # テストコード
├── data/                 # データ保存
├── logs/                 # ログファイル
├── docs/                 # ドキュメント
└── .claude/              # Claude Code設定
```

## ドキュメント

- [要件定義書](./requirement.md)
- [開発フェーズ](./docs/phases/README.md)
- [Phase 1: 基盤構築](./docs/phases/phase1-foundation.md)

## 開発

### カスタムエージェント
```
@browser-automation  # ブラウザ自動化専門
@scheduler           # スケジュール管理専門
@ui-developer        # UI開発専門
```

### カスタムコマンド
```
/investigate-stationhead  # Stationhead UI調査
/test-browser             # ブラウザ自動化テスト
/check-schedule           # スケジュール確認
```

## トラブルシューティング

### ブラウザが起動しない
Playwrightブラウザが正しくインストールされているか確認してください:
```bash
npx playwright install chromium
```

### ログインに失敗する
- `.env`ファイルの認証情報が正しいか確認
- 2段階認証が有効な場合は無効化するか、セッション保存機能を使用

### Slack通知が届かない
- Webhook URLが正しいか確認
- `SLACK_NOTIFICATIONS_ENABLED=true`に設定されているか確認

## ライセンス

MIT

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを開いて変更内容を議論してください。

## サポート

問題が発生した場合は、[GitHub Issues](https://github.com/your-repo/issues)で報告してください。
