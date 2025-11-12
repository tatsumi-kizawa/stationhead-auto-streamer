import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { StationheadAuth } from '../src/browser/auth';
import { PlaylistSelector } from '../src/browser/playlist';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// 環境変数を明示的に読み込む
const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

const screenshotsDir = path.join(__dirname, '../screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

/**
 * プレイリスト選択機能のテストスクリプト（既存セッション前提）
 *
 * 前提条件:
 * - 既にログイン済みのセッションが存在する
 * - Spotify連携済み
 *
 * テスト内容:
 * - Go on airページからプレイリスト選択まで
 */

async function main() {
  console.log('🚀 Starting Playlist Selection Test (Existing Session)...\n');

  // 環境変数チェック
  const email = process.env.STATIONHEAD_EMAIL;
  const password = process.env.STATIONHEAD_PASSWORD;

  if (!email || !password) {
    console.error('❌ Error: STATIONHEAD_EMAIL and STATIONHEAD_PASSWORD must be set');
    process.exit(1);
  }

  console.log('✅ Environment variables loaded\n');

  let browser: Browser | null = null;

  try {
    // ブラウザを起動
    console.log('🌐 Launching browser...');
    browser = await chromium.launch({
      headless: false,
      slowMo: 300,
    });

    // 既存セッションでログイン
    console.log('\n🔐 Loading existing session...');
    const auth = new StationheadAuth(browser, email, password);
    const context = await auth.login();

    // マイク許可
    await context.grantPermissions(['microphone']);

    // ページを取得または作成
    let page: Page;
    const pages = context.pages();
    if (pages.length > 0 && pages[0]) {
      page = pages[0];
    } else {
      page = await context.newPage();
    }

    console.log('✅ Session loaded\n');

    // Go on airページに直接移動
    console.log('📡 Navigating to "Go on air" page...');
    await page.goto('https://www.stationhead.com/on/go-on-air');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotsDir, 'test-playlist-01-go-on-air-page.png') });

    // 現在のページ状態を確認
    const pageTitle = await page.title();
    const pageUrl = page.url();
    console.log(`   Current page: ${pageTitle}`);
    console.log(`   URL: ${pageUrl}`);

    // Show name入力
    console.log('\n📝 Entering show name...');
    const showNameInput = page.locator('input[placeholder*="name of your show" i]').first();
    await showNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await showNameInput.fill('Test Show - Playlist Selection');
    await page.screenshot({ path: path.join(screenshotsDir, 'test-playlist-02-show-name-entered.png') });
    console.log('✅ Show name entered');

    // Next ボタンをクリック
    console.log('\n⏭️  Clicking first "Next" button...');
    await page.locator('button:has-text("Next")').first().click({ force: true });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotsDir, 'test-playlist-03-after-first-next.png') });

    // マイクテストページ - Nextボタンがあればクリック
    console.log('\n🎤 Handling microphone test page...');
    const micNextButton = page.locator('button:has-text("Next")');
    if ((await micNextButton.count()) > 0) {
      console.log('   Found Next button, clicking...');
      await micNextButton.first().click({ force: true });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(screenshotsDir, 'test-playlist-04-after-mic-test.png') });
    } else {
      console.log('   No mic test page (already configured)');
    }

    // Spotify連携ページ - Nextボタンがあればクリック、なければ連携処理
    console.log('\n🎵 Handling Spotify connection page...');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotsDir, 'test-playlist-05-spotify-page.png') });

    const spotifyNextButton = page.locator('button:has-text("Next")');
    const spotifyConnectButton = page.locator('button:has-text("Connect Spotify")');

    if ((await spotifyNextButton.count()) > 0) {
      console.log('   ✅ Spotify already connected');
      // Nextボタンは押さない（Choose musicをスキップしてしまうため）
    } else if ((await spotifyConnectButton.count()) > 0) {
      console.error('   ❌ Spotify not connected!');
      console.error('   Please run `npm run test:go-on-air` first to complete Spotify setup');
      throw new Error('Spotify connection required. Run full setup first with: npm run test:go-on-air');
    } else {
      console.log('   ⚠️  Unexpected page state');
      throw new Error('Neither Next nor Connect Spotify button found');
    }

    await page.screenshot({ path: path.join(screenshotsDir, 'test-playlist-06-after-spotify.png') });

    // サイドバーの"Choose music"ステップをクリックして音楽選択ページに移動
    console.log('\n🎵 Clicking "Choose music" step in sidebar...');
    const chooseMusicStep = page.locator('text="Choose music"').first();
    await chooseMusicStep.click({ force: true });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotsDir, 'test-playlist-07-music-page.png') });

    // プレイリスト選択画面に到達
    console.log('✅ Reached music selection page');

    // "Add music"ボタンが表示されているか確認
    const addMusicButton = page.locator('button:has-text("Add music")');
    const addMusicCount = await addMusicButton.count();
    console.log(`   Found ${addMusicCount} "Add music" button(s)`);

    if (addMusicCount === 0) {
      console.error('❌ "Add music" button not found');
      console.log('   Current page may not be the music selection page');
      throw new Error('"Add music" button not found');
    }

    // プレイリスト選択モジュールを初期化
    console.log('\n🎶 Initializing Playlist Selector...');
    const playlistSelector = new PlaylistSelector(page, screenshotsDir);

    // モーダルを開く
    console.log('\n📂 Opening playlist modal...');
    await playlistSelector.openPlaylistModal();
    console.log('✅ Modal opened');

    // 利用可能なプレイリスト一覧を取得
    console.log('\n📋 Getting available playlists...');
    const playlists = await playlistSelector.getAvailablePlaylists();

    if (playlists.length === 0) {
      console.error('❌ No playlists found');
      throw new Error('No playlists found');
    }

    console.log(`✅ Found ${playlists.length} playlists:`);
    playlists.forEach((name, i) => {
      console.log(`   ${i + 1}. ${name}`);
    });

    // テスト1: 最初のプレイリストを選択
    const targetPlaylist = playlists[0];
    if (!targetPlaylist) {
      throw new Error('First playlist is undefined');
    }

    console.log(`\n🎯 Test 1: Selecting playlist by name: "${targetPlaylist}"`);
    await playlistSelector.selectPlaylistByName(targetPlaylist);
    console.log('✅ Playlist selected successfully');
    await page.waitForTimeout(2000);

    // テスト2: "All songs"ボタンをクリック
    console.log(`\n🎯 Test 2: Clicking "All songs" button for: "${targetPlaylist}"`);
    await playlistSelector.selectAllSongs(targetPlaylist);
    console.log('✅ "All songs" button clicked successfully');
    await page.waitForTimeout(2000);

    // モーダルを閉じる
    console.log('\n❌ Closing playlist modal...');
    await playlistSelector.closePlaylistModal();
    console.log('✅ Modal closed');

    console.log('\n✅ All tests completed successfully! 🎉\n');

    // 結果を保存
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      testType: 'existing-session',
      playlists: playlists,
      selectedPlaylist: targetPlaylist,
    };

    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(dataDir, 'playlist-selection-test-result.json'),
      JSON.stringify(result, null, 2)
    );

    console.log('📄 Test result saved to: data/playlist-selection-test-result.json\n');

    // ブラウザを閉じずに待機
    console.log('⏸️  Browser will remain open for 10 seconds...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('\n❌ Error during test:', error);

    const errorResult = {
      success: false,
      timestamp: new Date().toISOString(),
      testType: 'existing-session',
      error: error instanceof Error ? error.message : String(error),
    };

    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(dataDir, 'playlist-selection-test-result.json'),
      JSON.stringify(errorResult, null, 2)
    );

    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
      console.log('\n🔚 Browser closed');
    }
  }
}

main();
