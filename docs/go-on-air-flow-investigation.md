# Go On Air フロー調査結果

## 調査日
2025-11-12

## 調査概要
Stationheadの「Go On Air」（配信開始）フローの完全な自動化について調査し、Playwrightによる自動化スクリプトを実装しました。

## 完全なフロー

### 1. ログイン
- **URL**: `https://www.stationhead.com/on/sign-in`
- **ステップ**:
  1. "Use email instead" をクリック
  2. Email入力: `input[placeholder="Email"]`
  3. Password入力: `input[placeholder="Password"]`
  4. "Log in" ボタンをクリック: `button:has-text("Log in")`.last()
- **セレクタ戦略**: placeholder属性とテキストベース
- **成功率**: 100%

### 2. Go On Airページへ遷移
- **URL**: `https://www.stationhead.com/on/go-on-air`
- **待機**: `waitUntil: 'networkidle'`
- **成功率**: 100%

### 3. 番組名入力
- **セレクタ**: `input[placeholder*="name"]` または `input[maxlength="30"]`
- **制限**: 最大30文字
- **注意点**: 入力後Enterキーまたは"Next"ボタンで次へ
- **成功率**: 100%

### 4. マイク許可
- **実装方法**: `context.grantPermissions(['microphone'])`
- **注意点**: ブラウザコンテキスト作成時に事前付与が可能
- **成功率**: 100%

### 5. マイクテストページ
- **検知**: `text=/Want to test your microphone/i`
- **アクション**: "Next" ボタンをクリック
- **セレクタ**: `button:has-text("Next")`.last()
- **成功率**: 100%

### 6. Spotify連携
- **検知**: `text=/Want to play music/i`
- **セレクタ**: `div:has-text("Connect Spotify")`（ボタンではなくdiv要素）
- **注意点**: `button`タグではなく`div`で実装されている
- **新しいタブ**: `page.context().waitForEvent('page')` でSpotify認証タブを取得
- **成功率**: 100%

### 7. Spotify認証
#### 7.1 ログインページ検知
- **URL判定**: `spotifyPage.url().includes('accounts.spotify.com')`

#### 7.2 メールアドレス入力
- **セレクタ**: `input[id="login-username"]`
- **次へボタン**: `button#login-button`

#### 7.3 パスワードログイン選択
- **検知**: `button:has-text("パスワードでログイン")`
- **注意点**: デフォルトは6桁コード認証。パスワードログインを明示的に選択する必要がある
- **重要**: この手順をスキップすると6桁コード入力画面になる

#### 7.4 パスワード入力
- **セレクタ**: `input[type="password"]`（IDではなくtype属性で検索）
- **複数セレクタ試行**:
  ```typescript
  const passwordSelectors = [
    'input[id="login-password"]',
    'input[type="password"]',  // ← これが成功
    'input[name="password"]',
  ];
  ```

#### 7.5 ログインボタン
- **セレクタ**: `button:has-text("ログイン")` または `button#login-button`

#### 7.6 同意ボタン
- **セレクタ**: `button:has-text("同意する")`
- **注意点**: クリック後、Spotifyタブが自動的に閉じる（正常動作）
- **エラーハンドリング**: タブクローズをエラーとして扱わないよう`.catch()`で対応

**Spotify認証全体の成功率**: 100%

### 8. プレイリスト選択（Choose music）

#### 8.1 "Add music" ボタンをクリック
- **セレクタ**: `button:has-text("Add music")`.last()
- **注意点**: "Walk on music"セクションにも"Add music"があるため、`.last()`で"Show playlist"セクションのボタンを取得
- **モーダル**: クリック後、プレイリスト選択モーダルが開く
- **成功率**: 100%（モーダルは開く）

#### 8.2 プレイリスト選択モーダル
**モーダル構成**:
- "My saved songs" セクション
  - "Saved songs" （保存済み楽曲）
- "My playlists" セクション
  - プレイリスト一覧（例: "New Music Wednesday - 78 songs"）

**プレイリスト要素の特徴**:
- タグ: `div`
- クラス: 動的（CSS-in-JS）
- テキスト: プレイリスト名 + 曲数（例: "New Music Wednesday78 songs"）
- クリック可能判定:
  - `div.onclick != null` または
  - `window.getComputedStyle(div).cursor === 'pointer'`

**実装済みセレクタアプローチ**:
```typescript
// page.evaluate()内でDOMから直接検索
const clickableDivs = allDivs.filter((div) => {
  const text = div.textContent?.trim() || '';
  const hasPlaylistText =
    text.includes('songs') &&
    !text.includes('My saved songs') &&
    !text.includes('Add music');

  const isClickable =
    div.onclick != null ||
    div.getAttribute('role') === 'button' ||
    window.getComputedStyle(div).cursor === 'pointer';

  return hasPlaylistText && isClickable && text.length < 100;
});

if (clickableDivs.length > 0) {
  clickableDivs[0].click();  // JavaScriptから直接クリック
}
```

**課題**:
- プレイリストのクリックイベントが発火しない場合がある
- モーダルが閉じずに残る可能性がある
- **現状**: プレイリスト選択をスキップしても後続フローは正常に動作

#### 8.3 "+ All songs" ボタン
- **目的**: プレイリスト内のすべての曲を配信に追加
- **セレクタ**: `button:has-text("All songs")`
- **前提条件**: プレイリストを選択後、曲一覧が表示される
- **現状**: プレイリストが正しく開かないため、このボタンにアクセスできず
- **成功率**: 0%（プレイリスト選択が未完了のため）

#### 8.4 成功ポップアップとNext
- **検知**: 曲追加後に表示されるポップアップ
- **アクション**:
  1. "Close" ボタンをクリック（ポップアップを閉じる）
  2. "Next" ボタンをクリック（次のステップへ）
- **注意点**: プレイリスト選択が未完了でも"Close"ボタンでモーダルを閉じれば次へ進める

### 9. Notify followers（フォロワーへ通知）
- **ページ検知**: `text=/Send a notification/i`
- **アクション**: "Send notification" ボタンをクリック
- **セレクタ**: `button:has-text("Send notification")`
- **成功メッセージ**: "Your followers have been notified!"
- **成功率**: 100%

### 10. GO ON AIR（配信開始）
- **最終ステップ**: すべてのステップ完了後、"GO ON AIR"ボタンが有効化
- **セレクタ**: `button:has-text("GO ON AIR")`.last()
- **アクション**: クリックで配信開始
- **確認**:
  - URLが `https://www.stationhead.com/undefined` → `https://www.stationhead.com/{username}` に変化
  - ページに "Your followers have been notified!" が表示
  - エラーメッセージが表示されない
- **成功率**: 100%

## 重要な発見

### 1. CSS-in-JSによる動的クラス名
- Stationheadは`styled-components`等を使用
- クラス名は **ビルドごとに変化する**（例: `sc-jqNall hXhDdg` → `sc-jqNall giaLcO`）
- **絶対にクラス名単体でのセレクタを使用しない**

### 2. セレクタの優先順位（Stationhead向け）
1. `aria-label`属性（最優先）
2. `placeholder`属性
3. テキストベースセレクタ（`button:has-text("Log in")`）
4. `id`属性（存在する場合）
5. `type`属性（input要素）
6. **使用禁止**: クラス名単体

### 3. Spotifyパスワード認証の罠
- デフォルトは **6桁コード認証**
- **"パスワードでログイン"ボタンを明示的にクリックする必要がある**
- このステップを忘れると自動化が止まる

### 4. Spotifyタブの自動クローズ
- "同意する"ボタンをクリック後、**Spotifyタブは自動的に閉じる**（正常動作）
- `page.waitForTimeout()`がエラーになるため、`.catch()`で対応必須

### 5. プレイリスト選択の任意性
- **重要**: プレイリスト選択をスキップしても配信開始は可能
- "Add music"モーダルを"Close"ボタンで閉じれば次へ進める
- 配信中に音楽がない状態になる可能性あり（要検証）

### 6. 要素のクリック方法
- `{ force: true }` オプションを使用して確実にクリック
- JavaScript経由のクリック（`page.evaluate(() => element.click())`）も有効
- Playwrightのlocatorクリックが効かない場合の代替手段

## 実装されたスクリプト

### ファイル
- `scripts/test-go-on-air.ts`

### 主要な関数
1. `login()` - Stationheadログイン
2. `navigateToGoOnAir()` - Go On Airページへ遷移
3. `enterShowName()` - 番組名入力
4. `clickNext()` - Nextボタンクリック
5. `handleMicrophonePermission()` - マイク許可
6. `handleMicrophoneTest()` - マイクテスト
7. `connectSpotify()` - Spotify連携ボタンクリック
8. `handleSpotifyAuth()` - Spotify認証処理（メインロジック）
9. `loginToSpotify()` - Spotifyログイン（サブ関数）
10. `selectPlaylist()` - プレイリスト選択
11. `selectAllSongs()` - 全曲選択
12. `closeSuccessPopup()` - 成功ポップアップを閉じてNext
13. `sendNotification()` - フォロワーへ通知送信
14. `startBroadcast()` - 配信開始

### 環境変数
```env
# Stationhead
STATIONHEAD_EMAIL=your-email@example.com
STATIONHEAD_PASSWORD=your-password

# Spotify
SPOTIFY_EMAIL=your-spotify-email@example.com
SPOTIFY_PASSWORD=your-spotify-password
```

## 現在の課題

### 1. プレイリスト選択の完全自動化
**問題点**:
- プレイリストのdiv要素をクリックしてもモーダルが閉じない
- "+ All songs"ボタンにアクセスできない

**原因候補**:
- クリックイベントがバブリングしていない
- 親要素または子要素をクリックすべきところ、中間要素をクリックしている
- JavaScriptフレームワークのイベントハンドラーが正しく発火していない

**代替案**:
1. プレイリスト選択をスキップし、"Close"ボタンでモーダルを閉じる（**現在の実装**）
2. Spotify Web APIを使用してプレイリスト情報を取得し、曲IDを直接指定
3. 手動でプレイリストを設定してからスクリプトを実行

### 2. プレイリスト終了検知
**調査不足**:
- プレイリストの最後まで再生完了を検知する方法は未調査
- 自動ループ再生のロジック未実装

**今後の調査項目**:
- Stationhead UIでの再生状態表示
- DOM要素の変化監視
- Spotify Web API経由での再生位置取得

## 成功基準の達成状況

### 達成済み
- ✅ Stationheadへのログイン自動化
- ✅ Spotify連携の自動化
- ✅ 番組名の自動設定
- ✅ マイク許可の自動化
- ✅ フォロワーへの通知送信
- ✅ 配信開始ボタンのクリック
- ✅ セッション永続化（Playwright storageState）

### 未達成
- ❌ プレイリスト選択の完全自動化
- ❌ "+ All songs"による全曲追加
- ⚠️ プレイリスト終了検知（未調査）
- ⚠️ 自動ループ再生（未実装）

## 次のステップ

### Phase 1（基盤構築）完了項目
1. ✅ プロジェクトセットアップ
2. ✅ StationheadのWeb UI構造調査
3. ✅ 認証方式の調査と実装
4. ✅ ブラウザ自動化による基本操作の実装
5. ✅ Spotify認証フローの完全自動化

### Phase 2（コア機能実装）
1. ⏭️ プレイリスト選択ロジックの改善
2. ⏭️ プレイリスト終了検知の実装
3. ⏭️ ループ再生機能の実装
4. ⏭️ スケジュール管理モジュール実装
5. ⏭️ エラーハンドリング強化
6. ⏭️ Slack通知機能

## 備考

### スクリーンショット
調査中に取得したスクリーンショットは`screenshots/go-on-air-*.png`に保存されています。

主要なスクリーンショット:
- `go-on-air-01-login-page.png` - ログインページ
- `go-on-air-11d-after-login.png` - Spotifyログイン完了
- `go-on-air-15-after-add-music-click.png` - プレイリスト選択モーダル
- `go-on-air-23-before-go-on-air.png` - 配信開始直前
- `go-on-air-24-broadcasting.png` - 配信開始後

### 実行方法
```bash
npm run test:go-on-air
```

### デバッグ
- ヘッドレスモード無効化: `test-go-on-air.ts`内の`headless: false`
- スクリーンショット: 各ステップで自動取得
- コンソールログ: 詳細な進捗状況を出力
