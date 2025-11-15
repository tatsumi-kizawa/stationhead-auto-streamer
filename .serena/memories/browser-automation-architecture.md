# Browser Automation Architecture

## 概要
このプロジェクトでは、Stationheadの配信自動化のために2つの異なるブラウザ自動化アプローチを実装している。

## アプローチ1: Playwright Chromium + Stealth Plugin（完全自動）

### ファイル
- `scripts/test-go-on-air.ts`
- `scripts/test-playlist-only.ts`

### 技術スタック
```typescript
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(StealthPlugin());
```

### ブラウザ設定
```typescript
const browser = await chromium.launch({
  headless: false,
  slowMo: 500,
  args: [
    '--autoplay-policy=no-user-gesture-required',
    '--disable-blink-features=AutomationControlled',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--enable-features=WebRTCPipeWireCapturer',
  ],
});

const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  permissions: ['microphone'],
  extraHTTPHeaders: {
    'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
  },
});
```

### 特徴
- **長所**:
  - Stealth Pluginによる自動化検出回避
  - reCAPTCHA検出・手動解決フロー対応
  - 完全自動実行（人手不要）
  - CI/CDへの組み込みが容易
  - 一貫した動作環境

- **短所**:
  - Spotify Web Playback SDKが完全にサポートされない可能性
  - "Spotify player failed to initialize"エラーが発生する場合あり
  - フェイクデバイスの使用（実際のマイクではない）

### 用途
- 開発・テスト環境
- 検証・デバッグ
- ログインからSpotify連携までの動作確認

## アプローチ2: System Chrome + Persistent Profile（本番運用想定）

### ファイル
- `scripts/test-system-chrome.ts` - 現在の実装
- `scripts/test-system-chrome-v2.ts` - ブラウザオプション最小化版（対策3）

### 技術スタック
```typescript
import { chromium } from 'playwright';
```

### ブラウザ設定
```typescript
const chromeProfilePath = path.join(__dirname, '../.chrome-profile');

const context = await chromium.launchPersistentContext(chromeProfilePath, {
  channel: 'chrome', // システムにインストールされた実際のChromeを使用
  headless: false,
  slowMo: 500,
  viewport: { width: 1920, height: 1080 },
  permissions: ['microphone'],
  args: [
    '--autoplay-policy=no-user-gesture-required',
    '--disable-blink-features=AutomationControlled',
    // フェイクデバイスは削除（実際のデバイスを使用）
  ],
});
```

### 特徴
- **長所**:
  - ✅ セッション永続化成功（ログイン・Spotify連携が保持される）
  - ✅ 実際のユーザー環境に近い
  - ✅ 実際のマイク/スピーカーデバイスにアクセス可能
  - ✅ 2回目以降の実行で手動操作不要

- **短所**:
  - システムChromeのバージョンに依存
  - CI/CDへの組み込みが困難
  - ⚠️ 現在: Spotify Web Playback SDKが自動化検出により初期化拒否

### セッション永続化の仕組み
- `.chrome-profile/` ディレクトリにブラウザプロファイルを保存
- `chromium.launchPersistentContext()` を使用
- Cookie、LocalStorage、SessionStorageなどが永続化
- Stationheadログイン状態、Spotify連携状態が保持される

### 実装状況（2025-11-14時点）
- ✅ セッション永続化成功
- ✅ Go On Airフロー全体の自動化成功
- ⏳ Spotify player初期化エラー対応中（自動化検出回避のための調整）

## 主要機能の実装パターン

### 1. Go On Air フロー（`runGoOnAirFlow`）
```typescript
// 番組名入力
const showNameInput = page.locator('input[maxlength="30"]').first();
await showNameInput.fill(SHOW_NAME);

// Nextボタンクリック
const nextButton = page.locator('button:has-text("Next")').first();
await nextButton.click({ force: true });

// マイク許可
await context.grantPermissions(['microphone'], {
  origin: 'https://www.stationhead.com',
});

// Spotify連携確認
const addMusicButton = page.locator('button:has-text("Add music")').last();
const hasAddMusic = (await addMusicButton.count()) > 0;
```

### 2. プレイリスト選択（`selectPlaylistAndStartBroadcast`）
```typescript
// Add musicボタンをクリック
await addMusicButton.click({ force: true });

// モーダル内のプレイリスト検索
const searchInput = page.locator('input[placeholder*="Search"]').first();
await searchInput.fill(playlistName);

// プレイリストカードをクリック
const playlistCard = page.locator(`[role="button"]:has-text("${playlistName}")`).first();
await playlistCard.click({ force: true });

// 曲を追加
const addButton = page.locator('button:has-text("Add")').first();
await addButton.click({ force: true });
```

### 3. Spotify Player エラー診断（`checkSpotifyPlayerStatus`）
```typescript
const diagnostics = await page.evaluate(() => {
  return {
    hasAudioContext: typeof AudioContext !== 'undefined',
    hasMediaDevices: typeof navigator.mediaDevices !== 'undefined',
    hasGetUserMedia: typeof navigator.mediaDevices?.getUserMedia !== 'undefined',
    hasSpotifySDK: typeof window.Spotify !== 'undefined',
    hasSpotifyPlayer: typeof window.Spotify?.Player !== 'undefined',
  };
});
```

## セレクタの原則

### 重要：Stationheadは CSS-in-JS を使用
- クラス名は動的に変化する（例: `sc-jqNall hXhDdg` → `sc-jqNall giaLcO`）
- **クラス名単体でのセレクタは絶対に使用しない**

### 優先順位
1. **最優先**: `data-testid`属性（存在する場合）
2. **第2優先**: `aria-label`属性
3. **第3優先**: テキストベースのセレクタ (`button:has-text("Log in")`)
4. **第4優先**: id属性（存在する場合）
5. **第5優先**: 属性セレクタ (`input[maxlength="30"]`, `input[placeholder*="Search"]`)
6. **使用禁止**: クラス名単体

### セレクタ例
```typescript
// ✅ 良い例
page.locator('[aria-label="Log in"]')
page.locator('button:has-text("Log in")').last()
page.locator('input[placeholder="Email"]')
page.locator('input[maxlength="30"]')

// ❌ 悪い例（クラス名は変わるので絶対NG）
page.locator('.sc-jqNall.hXhDdg')
page.locator('button.sc-jqNall.hXhDdg')
```

## 環境変数の取り扱い

### .env ファイルの読み込み
```typescript
import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });
```

### `$`文字を含むパスワードの扱い
```typescript
// .env ファイル内: エスケープが必要
SPOTIFY_PASSWORD="Alle!2025\$t2"

// コードでのパース
function getSpotifyPassword(): string {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/SPOTIFY_PASSWORD="([^"]+)"/);
  if (match && match[1]) {
    return match[1].replace(/\\(.)/g, '$1');
  }
  return process.env.SPOTIFY_PASSWORD || '';
}
```

### 特殊文字パスワード入力
```typescript
// fill()ではなくkeyboard.type()を使用
await passwordField.click(); // フォーカス
await page.keyboard.type(password, { delay: 100 });
```

## 現在の課題と対策

### Spotify Player 初期化エラー（2025-11-14）
**診断結果**:
- すべてのAPI・SDKがサポートされている
- 自動化環境を検出して初期化を拒否している可能性が高い

**試行済み対策**:
1. ✅ Playwright Chromium → エラー
2. ✅ システムChrome + フェイクデバイス削除 → エラー

**次の対策**:
3. ⏳ システムChrome + ブラウザオプション最小化（対策3・実施予定）
   - Playwright機能を最小限にする
   - 通常のChromeブラウザに近い状態で起動
   - 自動化検出を回避

## ディレクトリ構造

```
scripts/
├── test-go-on-air.ts              # アプローチ1（完全自動）
├── test-playlist-only.ts          # プレイリスト選択のみ
├── test-system-chrome.ts          # アプローチ2（現在の実装）
└── test-system-chrome-v2.ts       # アプローチ2（対策3）

src/
├── browser/
│   ├── auth.ts                    # 認証処理（未実装）
│   └── playlist.ts                # プレイリスト操作（一部実装）
└── test-helpers/
    ├── env-helper.ts              # 環境変数パース
    └── stationhead-test-helpers.ts # reCAPTCHA検出等

.chrome-profile/                   # セッション永続化用
screenshots/                       # テスト時スクリーンショット
data/                             # テスト結果JSON
```

## 推奨事項

### 開発・テスト時
- アプローチ1（Playwright Chromium + Stealth Plugin）を使用
- 完全自動化で効率的にテスト

### 本番運用時（Spotify playerエラー解決後）
- アプローチ2（System Chrome + Persistent Profile）を使用
- セッション永続化により手動操作を最小化
- 実際のデバイスを使用して配信の品質を確保

## 次のステップ
- [ ] 対策3（ブラウザオプション最小化）の実装
- [ ] Spotify player初期化エラーの完全解決
- [ ] プレイリストループ再生機能の実装
- [ ] 配信終了の自動化
