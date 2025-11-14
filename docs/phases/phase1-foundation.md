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
**ステータス**: 🟢 完了
**優先度**: 最高
**推奨エージェント**: `@browser-automation`
**推奨コマンド**: `/investigate-stationhead`
**開始日**: 2025-11-11
**完了日**: 2025-11-13
**更新日**: 2025-11-13（プレイリスト選択・配信開始完全自動化達成）

#### 調査項目
- [x] Stationhead URLの特定
  - ログインページ: `https://www.stationhead.com/on/sign-in`
  - ログイン後: `https://www.stationhead.com/on/profile`
  - Go On Airページ: `https://www.stationhead.com/on/go-on-air`
  - Spotifyコールバック: `https://www.stationhead.com/on/spotifyAuthCallback`
- [x] ログインページの構造とセレクタ
  - **重要発見**: CSS-in-JSでクラス名が動的に変化する
  - 安定セレクタ: `aria-label`, `placeholder`, テキストベース
- [x] ログイン自動化の実装
- [x] Go On Airフローの調査（番組名入力、マイク許可、マイクテスト）
  - 番組名入力: `input[maxlength="30"]`で特定
  - マイク許可: `context.grantPermissions(['microphone'])`で対応
  - マイクテスト: Nextボタンでスキップ可能
- [x] Spotify連携フロー（完全自動化成功）
  - **重要発見1**: 「Connect Spotify」はdiv要素（button要素ではない）
  - **重要発見2**: Spotifyログインは複数段階
    - メール入力 → 「次へ」 → 6桁コード画面 → 「パスワードでログイン」 → パスワード入力
  - **重要発見3**: Spotifyの新しい認証方式（6桁コード）への対応が必要
  - マイク許可は `context.grantPermissions()` で対応
  - **完全成功**: `keyboard.type()`で特殊文字パスワードも正常入力、Spotify認証完了
- [x] 配信設定画面の要素（Spotify認証後の画面）
  - プレイリスト選択モーダルの構造を解析
  - 「Add music」ボタンでモーダルを開く
  - 「My playlists」セクションでプレイリスト一覧を表示
- [x] プレイリスト選択UI（2025-11-13完了）
  - プレイリスト名によるプレイリスト選択を実装
  - 「All songs」ボタンで全曲追加
  - 「Close」ボタンでモーダルを閉じる
  - トーストメッセージ「Added playlists...」の確認
- [x] 配信開始ボタンの自動化（2025-11-13完了）
  - 「Send Notification」で通知送信
  - 「Go on air →」ボタン（矢印付き）で配信開始
  - **重要発見**: 画面には2つの「Go on air」ボタンが存在（左パネルと右下）、右下の矢印付きボタンをクリックする必要あり
  - 配信ページ遷移確認: `https://www.stationhead.com/[username]`
  - プレイリスト曲一覧の表示確認
- [ ] プレイリスト再生状態の表示（次フェーズ）
- [ ] Spotifyプレイヤー初期化エラーの対処（既知の課題: Chromiumの制約）
- [ ] APIエンドポイントの有無（調査結果: Web UIベースで十分）

#### 重要な発見
1. **CSS-in-JSによる動的クラス名**:
   - Stationheadはstyled-components等を使用
   - クラス名は実行ごとに変化: `sc-jqNall hXhDdg` → `sc-jqNall giaLcO`
   - **クラス名ベースのセレクタは使用禁止**

2. **安定したセレクタ戦略**:
   - 優先順位: `aria-label` > `placeholder` > テキストベース > id
   - 例: `page.locator('button:has-text("Log in")').last()`
   - div要素でもクリック可能: `page.locator('div:has-text("Connect Spotify")')`

3. **環境変数読み込みの問題**:
   - シェル環境変数が優先される
   - 解決策: `dotenv.config({ path: envPath })` で明示的にパス指定

4. **Spotifyの新しい認証方式（2025-11-12発見）**:
   - メール入力後、6桁のコードがメールに送信される方式に変更
   - 「パスワードでログイン」ボタンで従来のパスワード方式に切り替え可能
   - 自動化では「パスワードでログイン」方式を使用

5. **マイク許可の処理**:
   - ブラウザの許可ダイアログは自動操作不可
   - Playwrightの `context.grantPermissions(['microphone'])` で事前許可

6. **dotenvライブラリの変数展開問題（2025-11-12発見・解決）**:
   - **問題**: `.env`ファイルで`$`文字を含むパスワード（例: `Alle!2025$t2`）が`$t2`部分を変数として扱われ失われる
   - **原因**: dotenvライブラリがデフォルトで変数展開を行う
   - **解決策**:
     - `.env`ファイルで`\$`とエスケープ: `SPOTIFY_PASSWORD="Alle!2025\$t2"`
     - コードで直接パースする関数を実装（`getSpotifyPassword()`）
   - **実装場所**: `scripts/test-go-on-air.ts:12-20`

7. **Spotifyパスワード入力の完全自動化成功（2025-11-12達成）**:
   - `keyboard.type()`で特殊文字を含むパスワードを正しく入力
   - 12文字のパスワード（`$`を含む）が完全に入力されることを確認
   - Spotifyログイン、権限付与、Stationheadへの戻りまで完全自動化

#### 調査方法
1. ✅ Chrome DevTools MCPを使用してページ構造を分析
2. ✅ Playwrightでログインフローを実装
3. ✅ ボタンクリック方法を複数テストして最適解を発見
4. ✅ スクリーンショット取得
5. ✅ Go On Airフロー全体の自動化（ログイン〜Spotify認証まで）
6. ⏳ プレイリスト選択・配信実行UIの調査（次のステップ）

#### 成果物
- [x] `docs/stationhead-ui-investigation.md` - 調査結果レポート（ログイン + Go On Airフロー完了）
- [x] `scripts/test-login.ts` - ログイン自動化スクリプト（動作確認済み）
- [x] `scripts/test-go-on-air.ts` - 完全フロー自動化スクリプト（ログイン〜配信開始）
- [x] `scripts/test-playlist-only.ts` - プレイリスト選択〜配信開始スクリプト（2025-11-13完成）
- [x] `src/browser/auth.ts` - Stationhead認証モジュール
- [x] `src/browser/playlist.ts` - プレイリスト選択モジュール（PlaylistSelectorクラス）
- [x] `scripts/debug-login-button-click.ts` - ボタンクリックデバッグ
- [x] `scripts/analyze-login-button.ts` - ボタン詳細分析
- [x] `data/successful-login-method.json` - 成功したログイン方法の記録
- [x] `data/go-on-air-test-result.json` - Go On Airテスト結果
- [x] `data/playlist-only-test-result.json` - プレイリスト選択〜配信開始テスト結果
- [x] `screenshots/test-login-*.png` - ログインフローのスクリーンショット
- [x] `screenshots/go-on-air-*.png` - Go On Airフローのスクリーンショット
- [x] `screenshots/playlist-only-*.png` - プレイリスト選択〜配信開始のスクリーンショット
- [x] `.env.example` - 環境変数テンプレート（SPOTIFY_EMAIL/PASSWORD追加）

### 5. 認証方式の調査と実装方針決定 ✅
**ステータス**: 🟢 完了
**優先度**: 最高
**推奨エージェント**: `@browser-automation`
**完了日**: 2025-11-13

#### 調査項目
- [x] Stationheadのログイン方式（メール/パスワード、OAuth等）
  - メール/パスワード方式を確認
  - セッション永続化（storageState）による再利用が可能
- [x] 2段階認証の有無と方式
  - 調査時点では2段階認証なし
  - セッション永続化により再認証を回避
- [x] Spotify認証フロー
  - OAuth認証フロー（Stationhead経由）
  - メール → 6桁コード or パスワード方式
  - 自動化では「パスワードでログイン」を使用
- [x] セッションの永続化方法
  - Playwrightの`storageState`機能を使用
  - `data/stationhead-storage.json`に保存
- [x] 認証トークンの保存場所（Cookie、LocalStorage等）
  - Cookieおよびブラウザストレージに保存
  - storageStateで一括管理
- [x] トークンの有効期限
  - 有効期限は長期（数週間〜数ヶ月）
  - 期限切れ時は再ログインフローで対応

#### 実装方針決定
- [x] セッション保存方法の決定
  - Playwrightの`storageState`を使用
  - JSONファイルで永続化
- [x] 認証情報の安全な保管方法
  - 環境変数（.env）で管理
  - 特殊文字パスワード対応（dotenvエスケープ処理）
- [x] トークンリフレッシュの仕組み
  - storageStateの再利用で不要
  - 無効時は自動再認証フローを実行
- [x] 2段階認証への対応策
  - 現状は不要（セッション永続化で対応）
  - 将来的に必要になれば手動認証 + セッション保存で対応

#### 成果物
- [x] `src/browser/auth.ts` - 認証モジュール（StationheadAuthクラス）
- [x] `src/test-helpers/browser-helpers.ts` - ブラウザ起動ヘルパー関数
- [x] `data/stationhead-storage.json` - セッション情報（gitignore対象）
- [x] `.env` - 認証情報管理（STATIONHEAD_EMAIL/PASSWORD, SPOTIFY_EMAIL/PASSWORD）

### 6. ブラウザ自動化の基本実装 ✅
**ステータス**: 🟢 完了
**優先度**: 高
**推奨エージェント**: `@browser-automation`
**依存**: タスク4完了後
**完了日**: 2025-11-13

#### サブタスク
- [x] Playwrightの基本設定
  - TypeScript設定完了
  - playwright.config.ts作成
- [x] ブラウザ起動/終了の実装
  - ヘッドレス/ヘッドありモードの切り替え対応
  - `launchBrowser()`関数実装
- [x] ログイン処理の実装
  - StationheadAuthクラス実装
  - セッション永続化対応
- [x] Spotify連携の実装
  - OAuth認証フロー完全自動化
  - 特殊文字パスワード対応
  - マイク許可の事前付与
- [x] 配信開始の実装
  - Go On Airフロー実装
  - 番組名入力、マイクテストスキップ
- [x] プレイリスト選択の実装
  - PlaylistSelectorクラス実装
  - モーダル操作、プレイリスト検索、曲追加
- [x] 配信終了の実装
  - 基本的な終了処理実装（手動停止）
  - **保留**: 自動終了は次フェーズで実装
- [x] エラーハンドリングの実装
  - try-catchブロックによる基本的なエラー処理
  - エラーメッセージのログ出力
- [x] スクリーンショット取得機能
  - 各ステップでスクリーンショット保存
  - `screenshots/`ディレクトリに保存

#### 成果物
- [x] `src/test-helpers/browser-helpers.ts` - ブラウザ起動ヘルパー
- [x] `src/browser/auth.ts` - StationheadAuthクラス（認証処理）
- [x] `src/browser/playlist.ts` - PlaylistSelectorクラス（プレイリスト操作）
- [x] `scripts/test-go-on-air.ts` - 完全フロー統合テスト
- [x] `scripts/test-playlist-selection.ts` - プレイリスト選択テスト
- [x] **保留**: `src/browser/stream.ts` - 配信操作（次フェーズで実装）
- [x] **保留**: `tests/browser/` - 正式なテストコード（次フェーズで実装）

### 7. システムChrome + Persistent Profile実装 🔍
**ステータス**: 🟡 進行中
**優先度**: 高
**推奨エージェント**: `@browser-automation`
**依存**: タスク6完了後
**開始日**: 2025-11-13
**更新日**: 2025-11-14

#### 目的
Spotify Web Playback SDKの互換性問題を解決するため、システムにインストールされた実際のChromeブラウザを使用し、セッション情報を永続化するアプローチを実装する。

#### サブタスク
- [x] Persistent Profile設定の実装
  - `.chrome-profile/`ディレクトリでセッション管理
  - `chromium.launchPersistentContext()`を使用
- [x] セッション永続化テスト
  - Stationheadログイン状態の永続化 ✅
  - Spotify連携状態の永続化 ✅
- [x] Go On Airフロー全体の自動化
  - 番組名入力 ✅
  - マイク許可・テスト ✅
  - プレイリスト選択 ✅
  - 配信開始 ✅
- [x] Spotify playerエラー診断機能の実装
  - ブラウザ機能サポート状況チェック
  - コンソールエラー収集
  - 詳細診断レポート出力
- [ ] Spotify player初期化エラーの解決（進行中）
  - **現状**: 自動化検出により初期化失敗
  - **診断結果**: 全API・SDKサポート済みだが初期化拒否される
  - **次の対策**: ブラウザオプション最小化（対策3）

#### 重要な発見

**1. セッション永続化の成功** ✅
- Stationheadログイン状態が完全に保持される
- Spotify連携状態が完全に保持される
- 2回目以降の実行で手動操作が不要

**2. Spotify player初期化エラーの詳細診断** ⚠️
```json
診断結果（2025-11-14）:
{
  "エラーメッセージ": "Spotify player failed to initialize, this can sometimes happen if your browser isn't supported.",
  "ブラウザ機能": {
    "AudioContext": "✅ サポート",
    "MediaDevices API": "✅ サポート",
    "getUserMedia": "✅ サポート",
    "Spotify SDK": "✅ 読み込み完了",
    "Spotify.Player": "✅ 存在"
  },
  "コンソールエラー": "なし ✅",
  "結論": "すべてサポートされているが、Spotify SDKが自動化環境を検出して初期化を拒否している可能性が高い"
}
```

**3. 実際のデバイスアクセス確認** ✅
- AirPodsなど実際のマイクデバイスが正常に動作
- マイク入力を検出（テスト時にAirPodsの音を読み取り）

**4. ブラウザオプションの検証**
- フェイクデバイス削除済み（`--use-fake-device-for-media-stream`を削除）
- 現在のオプション:
  ```typescript
  args: [
    '--autoplay-policy=no-user-gesture-required',
    '--disable-blink-features=AutomationControlled',
  ]
  ```

#### 試行済みの対策
1. ✅ Playwright Chromium（完全自動）→ Spotify playerエラー
2. ✅ システムChrome + フェイクデバイス削除 → Spotify playerエラー（現状）
3. ⏳ システムChrome + ブラウザオプション最小化（対策3・次に実施）

#### 成果物
- [x] `scripts/test-system-chrome.ts` - システムChrome + Persistent Profile実装
  - Go On Airフロー全体の自動化
  - Spotify playerエラー診断機能
- [x] `.chrome-profile/` - セッション永続化ディレクトリ
- [x] `screenshots/system-chrome-*.png` - 実行時スクリーンショット
- [x] `data/system-chrome-test-result.json` - テスト結果
- [ ] Spotify player初期化エラーの完全解決（次の対策実施中）

#### 次のステップ
**対策3: ブラウザオプション最小化**
- Playwrightの自動化機能を最小限にする
- 通常のChromeブラウザに近い状態で起動
- 自動化検出を回避する

### 8. プレイリスト終了検知の方法調査 🔍
**ステータス**: ⚪ 未着手
**優先度**: 中
**推奨エージェント**: `@browser-automation`
**依存**: タスク7完了後

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
- [x] 全ての「優先度: 最高」タスクが完了
- [x] ブラウザ自動化の基本動作確認
- [x] 認証方式の実装方針確定
- [ ] 技術スタックの最終決定（スケジューラー、データ管理方式は次フェーズで決定）
- [ ] **Spotify player初期化エラーの解決**（進行中、対策3を実施予定）

**Phase 1の主要機能状態**: 2025-11-14時点
- ✅ Stationheadログイン〜プレイリスト選択〜配信開始までの完全自動化達成
- ✅ セッション永続化（ログイン・Spotify連携）成功
- ⏳ Spotify player初期化エラー対応中（自動化検出回避のための最終調整）
- ⏳ 完全動作確認後、Phase 2へ移行可能

## メモ・議論
- Playwright MCPを活用することで、UI調査が効率化される見込み
- Serena MCPによるコード品質向上も期待

## 更新履歴
- 2025-11-11: Phase 1開始、プロジェクト初期設定完了
- 2025-11-12: Go On Airフロー完全自動化成功、Spotify連携完了
- 2025-11-13: プレイリスト選択・配信開始完全自動化達成、Phase 1主要機能完了
- 2025-11-14: システムChrome + Persistent Profile実装、セッション永続化成功、Spotify playerエラー診断機能追加、対策3準備中
