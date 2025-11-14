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

1. **作業開始時**:
   - `docs/phases/` の該当フェーズドキュメントを確認
   - タスクの内容、サブタスク、依存関係を把握
   - 該当タスクのステータスを「🟡 進行中」に更新

2. **作業中**:
   - TodoWriteツールで進捗を管理
   - サブタスクを1つ完了するごとにチェックボックスを更新
   - 作業内容をこまめに記録

3. **作業完了時** - **絶対に忘れずに実施**:
   - 該当フェーズドキュメント（`docs/phases/phaseN-xxx.md`）を更新:
     - サブタスクのチェックボックスを全て更新
     - タスクのステータスを「🟢 完了」に変更
     - 完了日を記録（`**完了日**: YYYY-MM-DD`）
     - 成果物を記録（ファイルパスと簡単な説明）
   - 実装した機能の動作確認を実施
   - 必要に応じて調査結果ドキュメント（`docs/`）も更新

4. **フェーズ移行時**:
   - 該当フェーズドキュメントの「次のフェーズへの移行条件」を確認
   - 全ての条件が満たされていることを確認
   - README.mdの「現在のフェーズ」を更新
   - CLAUDE.mdの「開発フェーズ」セクションを更新

### ドキュメント更新チェックリスト
**タスク完了時に必ず確認すること**:

- [ ] `docs/phases/phaseN-xxx.md` のタスクステータスを更新（⚪ → 🟡 → 🟢）
- [ ] サブタスクのチェックボックスを更新（`- [ ]` → `- [x]`）
- [ ] 完了日を記録（`**完了日**: 2025-MM-DD`）
- [ ] 成果物リストを更新（ファイルパスと説明）
- [ ] 重要な発見や注意点を記録
- [ ] 関連する調査ドキュメント（`docs/`）を更新
- [ ] フェーズ移行時は README.md と CLAUDE.md を更新

**ドキュメント更新漏れ防止策**:
- タスク完了時は**必ず** phase ドキュメントを更新してから次のタスクに進む
- 複数のサブタスクがある場合は、1つ完了するごとに更新
- 成果物（ファイルパス）を必ず記録
- 「完了」と言ったら即座にドキュメント更新

### コーディング規約
1. TypeScriptの厳格モードを使用
2. ESLintとPrettierでコード品質を維持
3. すべての関数に型定義を付与
4. エラーハンドリングを必ず実装

### 環境変数の取り扱い
**重要**: .envファイルの読み込みは必ず明示的なパスを指定すること
1. **スクリプトでの.env読み込み**:
   ```typescript
   import * as dotenv from 'dotenv';
   import * as path from 'path';

   // プロジェクトルートの.envファイルを明示的に読み込む
   const envPath = path.join(__dirname, '../.env');
   dotenv.config({ path: envPath });
   ```
2. シェル環境変数が優先されることを避けるため、パスを明示する
3. デバッグ時は読み込まれた環境変数を確認すること

**`$`文字を含むパスワードの扱い**:
- dotenvライブラリは`$`を変数展開として扱うため、.envファイルでは`\$`とエスケープする
- `.env`ファイル内: `SPOTIFY_PASSWORD="Alle!2025\$t2"`
- コードでは直接パースする関数を使用:
  ```typescript
  function getSpotifyPassword(): string {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/SPOTIFY_PASSWORD="([^"]+)"/);
    if (match && match[1]) {
      return match[1].replace(/\\(.)/g, '$1');
    }
    return process.env.SPOTIFY_PASSWORD || '';
  }
  ```

### ブラウザ自動化の原則
**重要**: Stationheadは**CSS-in-JS（styled-components等）を使用しており、クラス名は動的に変化する**
- 例: `sc-jqNall hXhDdg` → `sc-jqNall giaLcO` （ビルドごとに異なる）
- **クラス名単体でのセレクタは絶対に使用しない**

1. **セレクタの優先順位**（Stationhead向け）:
   - **最優先**: `data-testid`属性（存在する場合）
   - **第2優先**: `aria-label`属性
   - **第3優先**: テキストベースのセレクタ (`button:has-text("Log in")`)
   - **第4優先**: id属性（存在する場合）
   - **使用禁止**: クラス名単体 (`button.sc-jqNall.hXhDdg` など)

2. **推奨セレクタ例**:
   ```typescript
   // ✅ 良い例（安定・推奨）
   page.locator('[aria-label="Log in"]')              // aria-label優先
   page.locator('button:has-text("Log in")').last()   // テキスト + 位置指定
   page.locator('input[placeholder="Email"]')         // placeholder属性

   // ❌ 悪い例（クラス名は変わるので絶対NG）
   page.locator('.sc-jqNall.hXhDdg')
   page.locator('button.sc-jqNall.hXhDdg')
   ```

3. **特殊文字を含むパスワード入力**:
   - `fill()`や`type()`では特殊文字（`$`, `!`など）が正しく入力されない場合がある
   - **推奨**: `page.keyboard.type(password, { delay: 100 })` を使用
   - フィールドをクリックしてフォーカスしてから入力する

4. **クリック時の注意点**:
   - `{ force: true }` オプションを使用して確実にクリック
   - 例: `await button.click({ force: true });`

5. 適切な待機処理を実装（ページロード、要素表示）
6. エラー時はスクリーンショットを取得
7. リトライロジックを実装（最大3回）
8. Playwright MCPサーバーを活用してブラウザ操作を効率化

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
│   │   ├── auth.ts       # 認証処理
│   │   └── playlist.ts   # プレイリスト操作
│   ├── test-helpers/     # テスト用共通関数
│   ├── scheduler/        # スケジューラー
│   ├── notification/     # 通知
│   ├── logger/           # ログ
│   ├── ui/               # UI
│   └── config/           # 設定管理
├── scripts/              # テストスクリプト
│   ├── test-go-on-air.ts        # 完全フロー（Spotify連携含む）
│   ├── test-playlist-selection.ts # プレイリスト選択のみ
│   └── archive/          # 開発履歴（削除可能）
├── data/                 # データ保存
│   └── archive/          # 古いテストデータ
├── screenshots/          # スクリーンショット
│   └── archive/          # 古いスクリーンショット
├── logs/                 # ログファイル
├── tests/                # テストコード
├── docs/                 # ドキュメント
└── .claude/              # Claude Code設定
```

## テスト実行とクリーンアップ手順

### テスト実行
```bash
# 初回セットアップ（Spotify連携まで）
npm run test:go-on-air

# プレイリスト選択のみ（既存セッション前提）
npm run test:playlist
```

### テスト完了後のクリーンアップ
```bash
# 1. テスト成果物のクリーンアップ（スクリーンショット、JSONファイル）
npm run clean

# 2. アーカイブも含めて完全削除
npm run clean:all

# 3. コードの整形
npm run format

# 4. リント実行
npm run lint:fix

# 5. 型チェック
npm run typecheck
```

### クリーンアップの内容
- `npm run clean`: `screenshots/*.png`, `data/*.json` を削除
- `npm run clean:all`: 上記 + `archive/` ディレクトリも削除
- `.gitignore`: テスト成果物とarchiveは自動的に除外される

## 開発フェーズ
現在: **Phase 1 - 基盤構築（要調査フェーズ含む）** - **主要機能完了** 🎉

### Phase 1 完了ステータス（2025-11-13時点）

**完了したタスク**:
1. ✅ プロジェクト初期設定（Claude Code、MCP設定）
2. ✅ プロジェクトセットアップ（package.json、tsconfig.json、ESLint、Prettier）
3. ✅ StationheadのWeb UI構造調査（完全）
4. ✅ 認証方式の調査と実装方針決定（storageState、セッション永続化）
5. ✅ ブラウザ自動化の基本実装（ログイン〜配信開始まで完全自動化）
   - Stationheadログイン（セッション永続化対応）
   - Spotify連携（OAuth認証、特殊文字パスワード対応）
   - Go On Airフロー（番組名入力、マイク許可）
   - プレイリスト選択（モーダル操作、曲追加）
   - 配信開始（通知送信、配信ページ遷移）

**保留・次フェーズで実装**:
- ⏳ 技術スタックの最終決定（スケジューラー、データ管理）
- ⏳ プレイリスト終了検知の方法調査
- ⏳ 配信終了の自動化
- ⏳ プレイリストループ再生機能

### 次のステップ（Phase 2へ）:
- スケジュール管理機能の実装
- プレイリストループ再生機能
- 配信終了の自動化
- エラーハンドリングの強化
- Slack通知機能の実装

## 注意事項
- StationheadのUIは変更される可能性があるため、柔軟な設計を心がける
- 2段階認証への対応が必要（セッション永続化を検討）
- プレイリスト終了検知の方法は要調査
- 長時間運用時のメモリリーク対策が必要
- Stationheadの利用規約に抵触しないか確認すること
- **Spotifyログイン**: 特殊文字パスワードは`keyboard.type()`を使用
