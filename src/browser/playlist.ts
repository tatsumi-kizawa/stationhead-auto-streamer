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
   * ユーザーフロー:
   * 1. プレイリスト名をクリック
   * 2. 楽曲一覧が読み込まれる（preloader表示）
   * 3. 楽曲一覧が表示され、"All songs"ボタンが新しく表示される
   *
   * @param playlistName プレイリスト名（部分一致可）
   */
  async selectPlaylistByName(playlistName: string): Promise<void> {
    console.log(`Selecting playlist: "${playlistName}"`);

    try {
      // Step 1: プレイリスト名を含む要素を探してクリック
      // "My playlists"セクション配下でプレイリスト名を探す
      const playlistNameLocator = this.page.locator(`text="${playlistName}"`).first();

      const count = await playlistNameLocator.count();
      if (count === 0) {
        throw new Error(`Playlist "${playlistName}" not found in modal`);
      }

      console.log(`Found playlist: "${playlistName}"`);
      await this.takeScreenshot('before-playlist-click');

      // プレイリスト名をクリック
      await playlistNameLocator.click({ force: true });

      console.log(`Clicked playlist: "${playlistName}"`);

      // Step 2: 楽曲一覧が読み込まれるまで待機
      // preloaderが表示される可能性があるので、少し待つ
      await this.page.waitForTimeout(2000);

      await this.takeScreenshot('after-playlist-click');

      // "All songs"ボタンが表示されるまで待機（楽曲一覧が読み込まれた証拠）
      const allSongsButton = this.page.locator('text="All songs"').first();
      await allSongsButton.waitFor({ state: 'visible', timeout: 10000 });

      console.log(`Playlist songs loaded for: "${playlistName}"`);
      await this.takeScreenshot('playlist-songs-loaded');

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
   *
   * ユーザーフロー:
   * 1. プレイリスト選択後に表示される "All songs" ボタンをクリック
   * 2. トーストメッセージ「Added playlists ... to show play」が表示される
   *
   * @param playlistName プレイリスト名（トーストメッセージ確認用）
   */
  async selectAllSongs(playlistName: string): Promise<void> {
    console.log(`Selecting all songs from playlist: "${playlistName}"`);

    try {
      // Step 1: "All songs"ボタンを探す
      // プレイリスト選択後に表示されている "All songs" ボタン
      const allSongsButton = this.page.locator('text="All songs"').first();

      const count = await allSongsButton.count();
      if (count === 0) {
        throw new Error(`"All songs" button not found for playlist "${playlistName}"`);
      }

      await this.takeScreenshot('before-all-songs-click');

      // "All songs"ボタンをクリック
      await allSongsButton.click({ force: true });

      console.log(`Clicked "All songs" button for "${playlistName}"`);

      // Step 2: トーストメッセージが表示されるまで待機
      // "Added playlists ... to show play" というメッセージ
      const toastMessage = this.page.locator('text=/Added playlist/i').first();
      await toastMessage.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
        console.log('   ⚠️  Toast message not found (may have already disappeared)');
      });

      await this.page.waitForTimeout(1000);
      await this.takeScreenshot('after-all-songs-click-toast');

      console.log(`✅ All songs selected, toast message displayed`);

      // トーストメッセージが消えるまで少し待つ
      await this.page.waitForTimeout(2000);
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
   *
   * "My playlists"セクション内のプレイリスト名と曲数を解析します。
   * 例: "New Music Wednesday\n79 songs" → "New Music Wednesday"
   */
  async getAvailablePlaylists(): Promise<string[]> {
    console.log('Getting available playlists...');

    try {
      // "My playlists"セクションを特定
      const myPlaylistsSection = this.page.locator('text="My playlists"').first();
      await myPlaylistsSection.waitFor({ state: 'visible', timeout: 5000 });

      // モーダル内の構造を解析
      const playlistData = await this.page.evaluate(() => {
        // "My playlists"テキストを含む要素を探す
        const myPlaylistsElement = Array.from(document.querySelectorAll('*')).find(
          (el) => el.textContent?.trim() === 'My playlists'
        );

        if (!myPlaylistsElement || !myPlaylistsElement.parentElement) {
          return [];
        }

        // "My playlists"の親要素配下で "songs" を含む要素を探す
        const parentSection = myPlaylistsElement.parentElement;
        const playlistElements = Array.from(parentSection.querySelectorAll('*')).filter((el) => {
          const text = el.textContent?.trim() || '';
          return (
            text.includes('songs') &&
            !text.includes('All songs') &&
            !text.includes('My saved songs')
          );
        });

        const playlists: string[] = [];

        playlistElements.forEach((el) => {
          const text = el.textContent?.trim() || '';
          // "New Music Wednesday\n79 songs" のような形式を想定
          const lines = text
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line);

          // プレイリスト名を抽出（"XX songs"より前の部分）
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line && !line.match(/^\d+\s+songs?$/i) && !playlists.includes(line)) {
              // 次の行が曲数情報かチェック
              const nextLine = lines[i + 1];
              if (nextLine && nextLine.match(/^\d+\s+songs?$/i)) {
                playlists.push(line);
                break; // 1つの要素から1つのプレイリストのみ抽出
              }
            }
          }
        });

        return playlists;
      });

      console.log(`Found ${playlistData.length} playlists:`, playlistData);
      return playlistData;
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
