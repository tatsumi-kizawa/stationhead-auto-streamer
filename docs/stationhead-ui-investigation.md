# Stationhead UI調査結果

## 調査日
2025-11-11

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
1. 配信開始フローの調査
2. Spotify連携の調査
3. プレイリスト選択UIの調査
