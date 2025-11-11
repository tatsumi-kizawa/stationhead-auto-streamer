# Phase 1: 基盤構築（要調査フェーズ含む）

**ステータス**: 🟡 進行中
**開始日**: 2025-11-11
**目標完了日**: TBD

## 概要
プロジェクトの基盤を構築し、技術的な調査を行うフェーズです。

## 主要目標
- [x] プロジェクトの初期設定
- [ ] 技術スタックの最終決定
- [ ] Stationhead Web UIの理解
- [ ] ブラウザ自動化の基本実装
- [ ] 認証方式の決定

## タスク一覧

### 1. プロジェクト初期設定 ✅
**ステータス**: 🟢 完了
**担当**: -
**完了日**: 2025-11-11

#### サブタスク
- [x] Claude Code設定ファイル作成（`.claude/settings.json`）
- [x] MCP設定（Serena、Playwright）
- [x] カスタムエージェント作成
- [x] カスタムコマンド作成
- [x] CLAUDE.md作成
- [x] requirement.md作成
- [x] .gitignore作成

### 2. プロジェクトセットアップ ✅
**ステータス**: 🟢 完了
**優先度**: 高
**完了日**: 2025-11-11

#### サブタスク
- [x] package.json作成
- [x] TypeScript設定（tsconfig.json）
- [x] ESLint・Prettier設定
- [x] ディレクトリ構造作成（src/、tests/、data/、logs/）
- [x] 環境変数テンプレート（.env.example）
- [x] README.md作成
- [x] 基本的な依存パッケージのインストール

#### 成果物
- `package.json` - プロジェクト設定（450パッケージインストール済み、0脆弱性）
- `tsconfig.json` - TypeScript設定（strictモード有効）
- `.eslintrc.json` - ESLint設定
- `.prettierrc` - Prettier設定
- `jest.config.js` - Jest設定
- `src/index.ts` - メインエントリーポイント
- `src/logger/logger.ts` - Winstonロガー設定
- `src/config/config.ts` - 環境変数ベース設定管理
- `src/types/index.ts` - 共通型定義
- `.env.example` - 環境変数テンプレート
- `README.md` - プロジェクトドキュメント
- ディレクトリ構造: `src/`, `tests/`, `data/`, `logs/`, `screenshots/`

#### 必要な依存パッケージ
```json
{
  "dependencies": {
    "playwright": "^1.40.0",
    "@slack/webhook": "^7.0.0",
    "winston": "^3.11.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.10.0",
    "eslint": "^8.55.0",
    "prettier": "^3.1.0",
    "ts-node": "^10.9.2"
  }
}
```

### 3. 技術スタックの最終決定
**ステータス**: ⚪ 未着手
**優先度**: 高

#### 検討事項
- [ ] スケジューラー方式の決定（node-cron vs OS標準）
- [ ] データ管理方式の決定（SQLite vs JSON）
- [ ] ログライブラリの決定（winston vs pino）
- [ ] システム常駐方式 vs 定期起動方式

#### 成果物
- [ ] `docs/technical-decisions.md` - 技術選定の記録

### 4. Stationhead Web UI構造調査 🔍
**ステータス**: ⚪ 未着手
**優先度**: 最高
**推奨エージェント**: `@browser-automation`
**推奨コマンド**: `/investigate-stationhead`

#### 調査項目
- [ ] Stationhead URLの特定
- [ ] ログインページの構造とセレクタ
- [ ] Spotify連携フロー
- [ ] 配信設定画面の要素
- [ ] プレイリスト選択UI
- [ ] 配信開始/終了ボタン
- [ ] プレイリスト再生状態の表示
- [ ] ネットワークリクエストの監視
- [ ] APIエンドポイントの有無

#### 調査方法
1. Playwright MCPを使用してページにアクセス
2. スクリーンショット取得
3. DOM構造の確認
4. セレクタの特定（data-testid、id、class等）
5. ネットワークタブの監視
6. Console出力の確認

#### 成果物
- [ ] `docs/stationhead-ui-investigation.md` - 調査結果レポート
- [ ] `screenshots/` - UI のスクリーンショット
- [ ] `docs/api-endpoints.md` - 発見されたAPIエンドポイント（あれば）

### 5. 認証方式の調査と実装方針決定 🔍
**ステータス**: ⚪ 未着手
**優先度**: 最高
**推奨エージェント**: `@browser-automation`

#### 調査項目
- [ ] Stationheadのログイン方式（メール/パスワード、OAuth等）
- [ ] 2段階認証の有無と方式
- [ ] Spotify認証フロー
- [ ] セッションの永続化方法
- [ ] 認証トークンの保存場所（Cookie、LocalStorage等）
- [ ] トークンの有効期限

#### 実装方針検討
- [ ] セッション保存方法の決定
- [ ] 認証情報の安全な保管方法
- [ ] トークンリフレッシュの仕組み
- [ ] 2段階認証への対応策

#### 成果物
- [ ] `docs/authentication-strategy.md` - 認証方式の調査結果と実装方針

### 6. ブラウザ自動化の基本実装
**ステータス**: ⚪ 未着手
**優先度**: 高
**推奨エージェント**: `@browser-automation`
**依存**: タスク4完了後

#### サブタスク
- [ ] Playwrightの基本設定
- [ ] ブラウザ起動/終了の実装
- [ ] ログイン処理の実装
- [ ] Spotify連携の実装
- [ ] 配信開始の実装
- [ ] プレイリスト選択の実装
- [ ] 配信終了の実装
- [ ] エラーハンドリングの実装
- [ ] スクリーンショット取得機能

#### 成果物
- [ ] `src/browser/browser.ts` - ブラウザ管理
- [ ] `src/browser/auth.ts` - 認証処理
- [ ] `src/browser/stream.ts` - 配信操作
- [ ] `src/browser/playlist.ts` - プレイリスト操作
- [ ] `tests/browser/` - ブラウザ自動化のテスト

### 7. プレイリスト終了検知の方法調査 🔍
**ステータス**: ⚪ 未着手
**優先度**: 中
**推奨エージェント**: `@browser-automation`
**依存**: タスク6完了後

#### 調査項目
- [ ] プレイリスト再生状態の表示要素
- [ ] 再生終了時のDOM変化
- [ ] JavaScriptイベントの監視
- [ ] Spotify APIの利用可否
- [ ] 再生時間からの計算可否

#### 実装方針検討
- [ ] 終了検知の主要方法の決定
- [ ] フォールバック方法の決定
- [ ] 検知精度の向上策

#### 成果物
- [ ] `docs/playlist-end-detection.md` - プレイリスト終了検知方式
- [ ] `src/browser/playlist-detector.ts` - 終了検知実装（プロトタイプ）

## ブロッカー・課題

### 現在のブロッカー
なし

### 技術的課題
1. **Stationhead UIへのアクセス**: 実際のStationhead URLとUI構造が不明
2. **2段階認証**: 対応方法が未確定
3. **プレイリスト終了検知**: 信頼性の高い検知方法が未確定

### リスク
- Stationheadの利用規約違反の可能性
- UI変更による自動化の破綻
- 認証トークンの有効期限切れ

## 次のフェーズへの移行条件
- [ ] 全ての「優先度: 最高」タスクが完了
- [ ] ブラウザ自動化の基本動作確認
- [ ] 認証方式の実装方針確定
- [ ] 技術スタックの最終決定

## メモ・議論
- Playwright MCPを活用することで、UI調査が効率化される見込み
- Serena MCPによるコード品質向上も期待

## 更新履歴
- 2025-11-11: Phase 1開始、プロジェクト初期設定完了
