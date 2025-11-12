# Stationhead UI調査結果

## 調査日
- 初回調査: 2025-11-11（ログインフロー）
- 追加調査: 2025-11-12（Go On Air フロー）

## 重要な発見

### 1. CSS-in-JSによる動的クラス名
**最重要**: Stationheadは**CSS-in-JS（styled-components等）を使用しており、クラス名は実行ごとに動的に変化する**

**具体例:**
- 同じボタンでも、セッションやビルドによってクラス名が変わる
  - セッション1: `sc-jqNall hXhDdg`
  - セッション2: `sc-jqNall giaLcO`
  - セッション3: `sc-jqNall [その他のハッシュ値]`

**影響:**
- クラス名ベースのセレクタは**完全に使用不可**
- クラス名を含む調査結果は参考程度にとどめ、実装には使用しない

**対策:**
- `aria-label`、テキストベース、`placeholder`など、安定した属性を使用
- 詳細は本ドキュメント「セレクタ戦略」を参照

---

## ログインフロー調査

### URL
- ログインページ: `https://www.stationhead.com/on/sign-in`
- ログイン成功後: `https://www.stationhead.com/on/profile`

### ログイン手順

#### 1. 初期画面
- デフォルトでは電話番号入力フォームが表示される

#### 2. メールログインへ切り替え
**セレクタ:**
```typescript
await page.click('text="Use email instead"');
```
- テキスト: "Use email instead"
- 安定性: ✅ 高（テキストベース）

#### 3. メールアドレス入力
**セレクタ:**
```typescript
await page.locator('input[placeholder="Email"]').fill(email);
```
- `placeholder="Email"` 属性を使用
- 安定性: ✅ 高

#### 4. パスワード入力
**セレクタ:**
```typescript
await page.locator('input[placeholder="Password"]').fill(password);
```
- `placeholder="Password"` 属性を使用
- 安定性: ✅ 高

#### 5. ログインボタンクリック
**重要**: ページには2つの"Log in"ボタンが存在する

| ボタン | 場所 | サイズ | 説明 |
|--------|------|--------|------|
| ボタン1 | ヘッダー右上 | 約65x32px | 小さいボタン |
| ボタン2 | フォーム内 | 約370x48px | 大きい紫色ボタン（メインボタン） |

**正しいセレクタ:**
```typescript
const loginButton = page.locator('button:has-text("Log in")').last();
await loginButton.click({ force: true });
```

**解説:**
- `.last()` で最後のボタン（=フォーム内の大きいボタン）を取得
- `{ force: true }` で確実にクリック
- 安定性: ✅ 高（テキストベース + 位置指定）

**❌ 使用してはいけないセレクタ:**
```typescript
// NG例1: クラス名は変わる
page.locator('button.sc-jqNall.hXhDdg')

// NG例2: XPathも位置が変わる可能性
page.locator('xpath=//button[text()="Log in"]').first()

// NG例3: nth-of-typeも不安定
page.locator('button:nth-of-type(5)')
```

#### 6. ログイン成功の確認
```typescript
// URLの変化を確認
await page.waitForLoadState('networkidle');
const currentUrl = page.url();
// currentUrl === 'https://www.stationhead.com/on/profile' ならログイン成功
```

---

## ログイン後のダッシュボード

### URL
`https://www.stationhead.com/on/profile`

### 主要なボタン・要素

| ボタン名 | 機能 | セレクタ案 |
|---------|------|-----------|
| Go on air | 配信開始 | `button:has-text("Go on air")` |
| Schedule show | 配信スケジュール | `button:has-text("Schedule show")` |
| Profile | プロフィール設定 | `button:has-text("Profile")` |
| Subscription | サブスクリプション | `button:has-text("Subscription")` |
| Downloads | ダウンロード | `button:has-text("Downloads")` |
| Wallet | ウォレット | `button:has-text("Wallet")` |
| Streaming service | 配信サービス連携（Spotify等） | `button:has-text("Streaming service")` |

**注意:**
- これらもテキストベースのセレクタを使用
- `aria-label`が存在する場合は、そちらを優先すべき（今後の調査で確認）

---

## セレクタ戦略（Stationhead向け）

### 優先順位

1. **最優先**: `data-testid` 属性
   ```typescript
   page.locator('[data-testid="login-button"]')
   ```
   - 現状: Stationheadには存在しないことが多い

2. **第2優先**: `aria-label` 属性
   ```typescript
   page.locator('[aria-label="Log in"]')
   ```
   - アクセシビリティ属性として安定

3. **第3優先**: `placeholder` や `name` 属性（input要素）
   ```typescript
   page.locator('input[placeholder="Email"]')
   ```

4. **第4優先**: テキストベースセレクタ
   ```typescript
   page.locator('button:has-text("Log in")').last()
   ```
   - `.first()`, `.last()`, `.nth(index)` で位置を明確化

5. **使用禁止**: クラス名、動的ID
   ```typescript
   // ❌ 絶対にNG
   page.locator('.sc-jqNall.hXhDdg')
   page.locator('#dynamic-id-12345')
   ```

### クリック時のベストプラクティス

```typescript
// 基本形
await page.locator('button:has-text("Log in")').last().click({ force: true });

// より安全な形（存在確認 + エラーハンドリング）
const button = page.locator('button:has-text("Log in")').last();
if (await button.count() > 0) {
  await button.click({ force: true });
} else {
  throw new Error('Login button not found');
}
```

---

## 環境変数の取り扱い

### 問題
シェル環境変数が優先されて、`.env`ファイルが読み込まれないことがある

### 解決策
```typescript
import * as dotenv from 'dotenv';
import * as path from 'path';

// プロジェクトルートの.envファイルを明示的に読み込む
const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });
```

### 実行時の注意
```bash
# シェル環境変数をクリアしてから実行
unset STATIONHEAD_EMAIL STATIONHEAD_PASSWORD
npx tsx scripts/test-login.ts
```

---

## 既知の問題と対策

### 問題1: ログインボタンがクリックできない
**原因:**
- クラス名ベースのセレクタを使用していた
- クラス名が動的に変化するため、セレクタが無効化

**対策:**
- テキストベースセレクタ + `.last()` + `{ force: true }` を使用
- 詳細は「ログインフロー調査 > 5. ログインボタンクリック」参照

### 問題2: .envファイルが読み込まれない
**原因:**
- シェル環境変数が優先される
- `dotenv.config()` のパス指定が不十分

**対策:**
- 明示的にパスを指定: `dotenv.config({ path: envPath })`
- 実行前に `unset` でシェル環境変数をクリア
- 詳細は「環境変数の取り扱い」参照

---

## 今後の調査項目

1. **配信開始フロー**
   - "Go on air" ボタンクリック後の画面
   - 配信タイトル入力フィールド
   - Spotify連携UI

2. **プレイリスト選択**
   - プレイリスト一覧の表示方法
   - プレイリスト選択のセレクタ
   - 検索機能の有無

3. **配信中UI**
   - 配信停止ボタン
   - 現在再生中の曲情報
   - プレイリスト終了の検知方法

4. **Spotify連携**
   - OAuth認証フロー
   - トークン取得・保存方法
   - 再認証の必要性

---

## 参考ファイル

### スクリプト
- `scripts/test-login.ts` - ログインテスト（修正版）
- `scripts/debug-login-button-click.ts` - ボタンクリック方法のデバッグ
- `scripts/analyze-login-button.ts` - ボタン詳細分析

### データ
- `data/successful-login-method.json` - 成功したログイン方法の記録
- `data/button-analysis.json` - ボタン分析結果
- `data/login-test-result.json` - ログインテスト結果

### スクリーンショット
- `screenshots/test-login-*.png` - ログインフローのスクリーンショット
- `screenshots/debug-login-*.png` - デバッグ時のスクリーンショット

---

## まとめ

### ✅ 成功したこと
1. ログイン自動化の実装完了
2. クラス名動的変化問題の特定と解決
3. 安定したセレクタ戦略の確立
4. .env読み込み問題の解決

### ⚠️ 注意点
1. **クラス名は絶対に使用しない**（CSS-in-JSで動的変化）
2. テキストベースセレクタを最優先
3. `.env`ファイルは明示的パス指定で読み込み
4. クリック時は `{ force: true }` オプションを使用

### 📋 次のステップ
1. ~~配信開始フローの調査~~ ✅ 完了（2025-11-12）
2. ~~Spotify連携の調査~~ ✅ 完了（2025-11-12）
3. プレイリスト選択UIの調査
4. 配信実行中UIの調査

---

## Go On Air フロー調査

### URL
- Go On Airページ: `https://www.stationhead.com/on/go-on-air`

### フロー概要
ログイン → Go On Air → 番組名入力 → マイク許可 → マイクテスト → Spotify連携 → (配信開始)

---

### Step 1: Go On Air ページへ遷移
ログイン成功後、直接URLにアクセスする方法が最も確実

```typescript
await page.goto('https://www.stationhead.com/on/go-on-air', {
  waitUntil: 'networkidle',
});
```

---

### Step 2: 番組名入力

**画面表示:**
- "Tell us the name of your show" というプロンプト
- 30文字制限のテキスト入力フィールド

**セレクタ:**
```typescript
// 複数のセレクタを試す（優先順位順）
const possibleSelectors = [
  'input[maxlength="30"]',           // 最も確実
  'input[placeholder*="name"]',      // プレースホルダーに"name"を含む
  'input[placeholder*="show"]',      // プレースホルダーに"show"を含む
  'input[type="text"]',              // 汎用的
];
```

**実装例:**
```typescript
const showNameInput = page.locator('input[maxlength="30"]').first();
await showNameInput.fill('Test Radio Show');
```

**安定性:** ✅ 高（maxlength属性は変わりにくい）

---

### Step 3: Nextボタンクリック

**セレクタ:**
```typescript
const nextButton = page.locator('button:has-text("Next")').first();
await nextButton.click({ force: true });
```

**安定性:** ✅ 高（テキストベース）

---

### Step 4: マイク許可

**ブラウザ許可ダイアログへの対応:**

Playwrightのcontext作成時に事前許可を付与：
```typescript
const context = await browser.newContext({
  permissions: ['microphone'],
});

// または、後から許可を付与
await context.grantPermissions(['microphone'], {
  origin: 'https://www.stationhead.com',
});
```

**重要:**
- ブラウザの許可ダイアログは自動化ツールでは直接操作できない
- 事前にpermissionsを付与する必要がある

**安定性:** ✅ 高（Playwright APIで確実に制御可能）

---

### Step 5: マイクテストページ

**画面表示:**
- "Record yourself speaking to see how your microphone will sound on air."
- マイクソース選択（例: "威定 - AirPods"）
- Recordボタン（赤い丸）

**セレクタ:**
```typescript
// Nextボタンをクリックしてスキップ
const nextButton = page.locator('button:has-text("Next")').first();
await nextButton.click({ force: true });
```

**注意:**
- 実際にマイクテストを実行する必要はない
- Nextボタンで次へ進める

**安定性:** ✅ 高

---

### Step 6: Spotify連携ページ

**画面表示:**
- "Want to play music?"
- "Connect a premium streaming account to play, listen to and share music, while supporting the artists."
- **Connect Apple Music** (赤いボタン)
- **Start free trial** (白いボタン)
- **Connect Spotify** (緑のボタン) ← 選択するボタン

**重要な発見:**
「Connect Spotify」はbutton要素ではなく、div要素（`role="button"`なし）

**セレクタ:**
```typescript
// button要素では見つからないため、より広範なセレクタを使用
const possibleSelectors = [
  'button:has-text("Connect Spotify")',      // 試す価値あり（ダメな場合が多い）
  'div:has-text("Connect Spotify")',         // ✅ これで見つかる
  '[role="button"]:has-text("Connect Spotify")',
  'text="Connect Spotify"',                  // Playwrightの汎用セレクタ
];

// 実装例
const spotifyButton = page.locator('div:has-text("Connect Spotify")').first();
await spotifyButton.click({ force: true });
```

**クリック後の挙動:**
- 新しいタブ（またはポップアップ）でSpotifyの認証ページが開かれる
- URL: `https://accounts.spotify.com/ja/authorize?client_id=...`

**実装例（新しいタブの処理）:**
```typescript
// 新しいタブが開かれることを待つ
const [newPage] = await Promise.all([
  page.context().waitForEvent('page'),
  spotifyButton.click({ force: true }),
]);

await newPage.waitForLoadState('networkidle');
console.log(`Spotify auth URL: ${newPage.url()}`);
```

**安定性:** ⚠️ 中（div要素なので変更される可能性あり）

---

### Step 7: Spotifyログイン

Spotifyボタンクリック後、Spotifyのログインページが表示される（未ログインの場合）

**URL:**
`https://accounts.spotify.com/ja/login?continue=...`

**画面表示:**
- "Spotifyにログイン"
- Google/Facebook/Appleで続行ボタン
- メールアドレスまたはユーザー名の入力フィールド
- 「次へ」ボタン

**ログインフロー:**

#### 7-1. メールアドレス入力
```typescript
const usernameInput = spotifyPage.locator('input[id="login-username"]').first();
await usernameInput.fill(process.env.SPOTIFY_EMAIL || '');
```

**安定性:** ✅ 高（id属性は変わりにくい）

#### 7-2. 「次へ」ボタンクリック
```typescript
const nextButton = spotifyPage.locator('button#login-button').first();
await nextButton.click({ force: true });
```

**重要な発見（2025-11-12）:**
「次へ」ボタンクリック後、6桁のコード入力ページが表示される場合があります。これはSpotifyの新しいログイン方式（メール認証コード）です。

この場合、「パスワードでログイン」ボタンをクリックして従来のパスワード入力方式に切り替える必要があります：

```typescript
// 「パスワードでログイン」ボタンが表示されているか確認
const passwordLoginButton = spotifyPage
  .locator('button:has-text("パスワードでログイン")')
  .first();

if ((await passwordLoginButton.count()) > 0) {
  console.log('Clicking "パスワードでログイン" button...');
  await passwordLoginButton.click({ force: true });
  await spotifyPage.waitForTimeout(2000);
}
```

**安定性:** ⚠️ 中（Spotifyのログイン方式が変更される可能性あり）

#### 7-3. パスワード入力
```typescript
// ページ遷移後にパスワードフィールドが表示される
const passwordInput = spotifyPage.locator('input[id="login-password"]').first();
await passwordInput.fill(process.env.SPOTIFY_PASSWORD || '');
```

**安定性:** ✅ 高（id属性）

#### 7-4. ログインボタンクリック
```typescript
const loginButton = spotifyPage.locator('button#login-button').first();
await loginButton.click({ force: true });
```

**安定性:** ✅ 高

---

### Step 8: Spotify認証ページ（同意する）

ログイン成功後、認証ページに遷移する（初回のみ）

**想定されるセレクタ:**
```typescript
const possibleSelectors = [
  'button:has-text("同意する")',        // 日本語
  'button:has-text("Agree")',          // 英語
  'button:has-text("Accept")',         // 英語
  'button:has-text("承認")',           // 日本語
  'button[id*="auth-accept"]',         // id属性
  'button[data-testid="auth-accept"]', // data-testid
];
```

**重要:**
- 既にStationheadとSpotifyが連携済みの場合、このページはスキップされる
- その場合、Stationheadに自動でリダイレクトされる

**実装例（リダイレクト対応）:**
```typescript
const finalUrl = spotifyPage.url();
if (finalUrl.includes('stationhead.com')) {
  console.log('✅ Redirected back to Stationhead - auth may be complete');
  return; // 認証完了
}
```

**安定性:** ⚠️ 中（初回のみ表示、2回目以降はスキップ）

---

## Go On Air フローのまとめ

### ✅ 成功したこと
1. 番組名入力の自動化成功（maxlength="30"で特定）
2. マイク許可の自動化成功（Playwright permissions API）
3. Spotify連携ボタンの特定成功（div要素であることを発見）
4. Spotifyログインフローの調査完了

### ⚠️ 重要な発見
1. **「Connect Spotify」はdiv要素**
   - button要素ではない
   - `div:has-text("Connect Spotify")` で特定する必要あり

2. **Spotifyログインは複数段階**
   - メールアドレス入力 → 「次へ」
   - **【重要】6桁コード入力ページが表示される場合がある**
   - 「パスワードでログイン」ボタンをクリックしてパスワード入力方式に切り替え
   - パスワード入力 → ログイン

3. **Spotify認証は初回のみ**
   - 2回目以降は自動でStationheadにリダイレクト
   - パスワード入力後、Stationheadの `/on/spotifyAuthCallback` へリダイレクト

4. **マイク許可は事前設定が必須**
   - ブラウザダイアログは自動操作不可
   - `context.grantPermissions(['microphone'])` で対応

### 📋 次に調査すべきこと
1. Spotify認証完了後の画面（Stationheadに戻った後）
2. プレイリスト選択UI
3. 配信開始ボタン
4. 配信中のUI（再生状況、停止ボタンなど）
5. プレイリスト終了検知方法

### 参考ファイル
- `scripts/test-go-on-air.ts` - Go On Airフロー調査スクリプト（完全動作確認済み）
- `screenshots/go-on-air-*.png` - フローのスクリーンショット
  - `go-on-air-01-login-page.png` - ログインページ
  - `go-on-air-02-logged-in.png` - ログイン後
  - `go-on-air-03-initial-page.png` - Go On Air初期ページ
  - `go-on-air-04-show-name-entered.png` - 番組名入力後
  - `go-on-air-05-after-next.png` - Next後
  - `go-on-air-06-mic-permission.png` - マイク許可
  - `go-on-air-07-mic-test-page.png` - マイクテストページ
  - `go-on-air-08-after-mic-test.png` - マイクテスト後
  - `go-on-air-09-spotify-page.png` - Spotify接続ページ
  - `go-on-air-11-spotify-auth-page.png` - Spotifyログインページ
  - `go-on-air-11a-spotify-email-entered.png` - メール入力後
  - `go-on-air-11b-after-next.png` - 「次へ」後（6桁コード画面）
  - `go-on-air-11b2-after-password-login-button.png` - パスワード入力画面
  - `go-on-air-12-spotify-auth-page.png` - 認証完了後
- `data/go-on-air-test-result.json` - テスト結果（全ステップ成功）
- `.env.example` - 必要な環境変数（SPOTIFY_EMAIL, SPOTIFY_PASSWORD追加）
- `package.json` - テストコマンド（`npm run test:go-on-air`）追加
