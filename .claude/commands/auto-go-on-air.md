---
description: Stationhead Go On Air完全自動化（Chrome DevTools MCP使用）
---

# Stationhead Go On Air 完全自動化

このコマンドは、Chrome DevTools MCPツールを使用してStationheadの配信開始フロー全体を自動化します。

## 前提条件

1. Chromeが起動済み（`npm run prepare:chrome`で起動）
2. .envファイルに以下の設定がある：
   - `SHOW_NAME`: 番組名
   - `PLAYLIST_NAME`: プレイリスト名

## 実行フロー

以下のステップをChrome DevTools MCPツールで順次実行してください：

### Step 1: ページリスト確認
まず、Chromeに接続されているか確認します：

```
mcp__chrome-devtools__list_pages
```

### Step 2: ログイン状態確認
Stationheadのサインインページに遷移します：

```
mcp__chrome-devtools__navigate_page({
  type: "url",
  url: "https://www.stationhead.com/on/sign-in"
})
```

スナップショットを取得してログイン済みか確認：

```
mcp__chrome-devtools__take_snapshot()
```

- ログイン済み → Step 3へ
- 未ログイン → 手動でログインしてから再実行

### Step 3: Go On Airページへ遷移

```
mcp__chrome-devtools__navigate_page({
  type: "url",
  url: "https://www.stationhead.com/on/go-on-air"
})
```

### Step 4: 番組名を入力
スナップショットで入力フィールドのuidを確認：

```
mcp__chrome-devtools__take_snapshot()
```

番組名を入力（uidは実際のスナップショット結果から取得）：

```
mcp__chrome-devtools__fill({
  uid: "[Tell us the name of your show のuid]",
  value: process.env.SHOW_NAME || "My Show"
})
```

### Step 5: マイク許可とテスト
スナップショットでボタンのuidを確認：

```
mcp__chrome-devtools__take_snapshot()
```

「Request mic access」ボタンをクリック（存在する場合）：

```
mcp__chrome-devtools__click({
  uid: "[Request mic access ボタンのuid]"
})
```

「Test mic」ボタンをクリック：

```
mcp__chrome-devtools__click({
  uid: "[Test mic ボタンのuid]"
})
```

### Step 6: Spotify連携確認
スナップショットでSpotify連携状態を確認：

```
mcp__chrome-devtools__take_snapshot()
```

- 「Connect to Spotify」ボタンがある → 手動で連携
- ボタンがない → 既に連携済み、次へ

### Step 7: プレイリスト選択
「Choose song」ボタンをクリック：

```
mcp__chrome-devtools__click({
  uid: "[Choose song ボタンのuid]"
})
```

「Playlists」タブをクリック：

```
mcp__chrome-devtools__click({
  uid: "[Playlists タブのuid]"
})
```

プレイリスト検索フィールドに入力：

```
mcp__chrome-devtools__fill({
  uid: "[Search playlists 入力欄のuid]",
  value: process.env.PLAYLIST_NAME || "My Playlist"
})
```

プレイリストを選択：

```
mcp__chrome-devtools__click({
  uid: "[プレイリスト名のuid]"
})
```

「Add all songs」ボタンをクリック：

```
mcp__chrome-devtools__click({
  uid: "[Add all songs ボタンのuid]"
})
```

### Step 8: 配信開始
「Go on air」ボタンをクリック：

```
mcp__chrome-devtools__click({
  uid: "[Go on air ボタンのuid]"
})
```

### Step 9: 配信成功確認
スクリーンショットを撮影：

```
mcp__chrome-devtools__take_screenshot({
  name: "broadcast-started"
})
```

URLを確認（配信ページに遷移したか）：

```
mcp__chrome-devtools__list_pages()
```

## 注意事項

1. 各ステップ間で`take_snapshot()`を実行してuidを確認すること
2. 初回実行時はログインとSpotify連携が必要
3. 2回目以降はセッションが保持されるため、自動化可能
4. Spotify playerエラーが出ないことを確認

## 完了後

配信が正常に開始されたら、Chrome上で音楽が再生されているはずです。
配信を終了する場合は、手動でChromeを操作するか、Chromeを閉じてください。
