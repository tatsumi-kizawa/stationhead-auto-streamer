import { Page } from 'playwright';
import * as path from 'path';

/**
 * PlaylistSelector - Stationheadプレイリスト選択管理クラス
 *
 * 機能:
 * - プレイリスト選択モーダルの操作
 * - 動的なクラス名に依存しない安定したセレクタ
 * - プレイリスト名による柔軟な選択
 */
export class PlaylistSelector {
  private page: Page;
  private screenshotsDir: string;

  constructor(page: Page, screenshotsDir?: string) {
    this.page = page;
    this.screenshotsDir = screenshotsDir || path.join(process.cwd(), 'screenshots');
  }

  /**
   * "Add music"ボタンをクリックしてプレイリスト選択モーダルを開く
   */
  async openPlaylistModal(): Promise<void> {
    console.log('Opening playlist modal...');

    // "Add music"ボタンをクリック（テキストベースで安定）
    const addMusicButton = this.page.locator('button:has-text("Add music")');
    await addMusicButton.waitFor({ state: 'visible', timeout: 10000 });
    await addMusicButton.click({ force: true });

    console.log('Clicked "Add music" button');

    // モーダルが開くまで待機（"My playlists"テキストで判定）
    await this.page.waitForSelector('text="My playlists"', { timeout: 5000 });
    console.log('Playlist modal opened successfully');

    // スクリーンショット
    await this.takeScreenshot('playlist-modal-opened');
  }

  /**
   * プレイリスト名を指定して選択
   *
   * @param playlistName プレイリスト名（部分一致可）
   */
  async selectPlaylistByName(playlistName: string): Promise<void> {
    console.log(`Selecting playlist: "${playlistName}"`);

    // 方法1: プレイリスト名を含む要素で"All songs"ボタンを持つ行を探す
    try {
      // "All songs"ボタンを持つすべてのプレイリスト行を取得
      const playlistRows = this.page.locator('button:has-text("All songs")');

      // プレイリスト名を含む行を特定
      const targetRow = playlistRows.filter({ hasText: playlistName }).first();

      // 存在確認
      const count = await targetRow.count();
      if (count === 0) {
        throw new Error(`Playlist "${playlistName}" not found`);
      }

      console.log(`Found playlist: "${playlistName}"`);
      await this.takeScreenshot('before-playlist-click');

      // プレイリスト行をクリック（親要素をクリック）
      const playlistItem = targetRow.locator('..').first();
      await playlistItem.click({ force: true });

      console.log(`Clicked playlist: "${playlistName}"`);
      await this.takeScreenshot('after-playlist-click');

      // 選択が完了するまで少し待機
      await this.page.waitForTimeout(1000);
    } catch (error) {
      console.error(`Failed to select playlist: ${error}`);
      await this.takeScreenshot('playlist-selection-error');
      throw error;
    }
  }

  /**
   * 最初のプレイリストを選択（プレイリスト名が不明な場合）
   */
  async selectFirstPlaylist(): Promise<string | null> {
    console.log('Selecting first available playlist...');

    try {
      // "My playlists"セクション配下の最初のプレイリストを探す
      const myPlaylistsSection = this.page.locator('text="My playlists"');
      await myPlaylistsSection.waitFor({ state: 'visible', timeout: 5000 });

      // "All songs"ボタンを持つ最初のプレイリスト
      const firstPlaylist = this.page.locator('button:has-text("All songs")').first();

      const count = await firstPlaylist.count();
      if (count === 0) {
        throw new Error('No playlists found');
      }

      // プレイリスト名を取得
      const playlistItem = firstPlaylist.locator('..').first();
      const playlistText = await playlistItem.textContent();
      const playlistNameRaw = playlistText ? playlistText.split('All songs')[0] : null;
      const playlistName = playlistNameRaw ? playlistNameRaw.trim() : 'Unknown';

      console.log(`Found first playlist: "${playlistName}"`);
      await this.takeScreenshot('before-first-playlist-click');

      // クリック
      await playlistItem.click({ force: true });

      console.log(`Clicked first playlist: "${playlistName}"`);
      await this.takeScreenshot('after-first-playlist-click');

      await this.page.waitForTimeout(1000);

      return playlistName;
    } catch (error) {
      console.error(`Failed to select first playlist: ${error}`);
      await this.takeScreenshot('first-playlist-selection-error');
      throw error;
    }
  }

  /**
   * "All songs"ボタンをクリックしてプレイリスト全体を選択
   */
  async selectAllSongs(playlistName: string): Promise<void> {
    console.log(`Selecting all songs from playlist: "${playlistName}"`);

    try {
      // プレイリスト名を含む"All songs"ボタンを探す
      const allSongsButton = this.page
        .locator('button:has-text("All songs")')
        .filter({ hasText: playlistName })
        .first();

      const count = await allSongsButton.count();
      if (count === 0) {
        throw new Error(`"All songs" button not found for playlist "${playlistName}"`);
      }

      await this.takeScreenshot('before-all-songs-click');

      // "All songs"ボタンをクリック
      await allSongsButton.click({ force: true });

      console.log(`Clicked "All songs" button for "${playlistName}"`);
      await this.takeScreenshot('after-all-songs-click');

      await this.page.waitForTimeout(1000);
    } catch (error) {
      console.error(`Failed to select all songs: ${error}`);
      await this.takeScreenshot('all-songs-selection-error');
      throw error;
    }
  }

  /**
   * プレイリスト選択モーダルを閉じる
   */
  async closePlaylistModal(): Promise<void> {
    console.log('Closing playlist modal...');

    try {
      // "Close"ボタンをクリック
      const closeButton = this.page.locator('button:has-text("Close")');
      await closeButton.waitFor({ state: 'visible', timeout: 5000 });
      await closeButton.click({ force: true });

      console.log('Clicked "Close" button');

      // モーダルが閉じるまで待機
      await this.page.waitForTimeout(1000);
      await this.takeScreenshot('playlist-modal-closed');
    } catch (error) {
      console.error(`Failed to close modal: ${error}`);
      await this.takeScreenshot('modal-close-error');
      throw error;
    }
  }

  /**
   * 利用可能なプレイリスト一覧を取得
   */
  async getAvailablePlaylists(): Promise<string[]> {
    console.log('Getting available playlists...');

    try {
      // "All songs"ボタンを持つすべてのプレイリストを取得
      const playlistRows = this.page.locator('button:has-text("All songs")');
      const count = await playlistRows.count();

      const playlists: string[] = [];

      for (let i = 0; i < count; i++) {
        const row = playlistRows.nth(i);
        const parent = row.locator('..').first();
        const text = await parent.textContent();

        if (text) {
          // "All songs"より前の部分を抽出
          const playlistNameRaw = text.split('All songs')[0];
          if (playlistNameRaw) {
            const playlistName = playlistNameRaw.trim();
            // 曲数情報を削除（例: "79 songs"）
            const cleanName = playlistName.replace(/\d+\s+songs?$/i, '').trim();
            playlists.push(cleanName);
          }
        }
      }

      console.log(`Found ${playlists.length} playlists:`, playlists);
      return playlists;
    } catch (error) {
      console.error(`Failed to get playlists: ${error}`);
      return [];
    }
  }

  /**
   * スクリーンショット撮影
   */
  private async takeScreenshot(name: string): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `playlist-${name}-${timestamp}.png`;
      await this.page.screenshot({
        path: path.join(this.screenshotsDir, filename),
      });
      console.log(`  📸 Screenshot: ${filename}`);
    } catch (error) {
      console.error(`Failed to take screenshot: ${error}`);
    }
  }
}
