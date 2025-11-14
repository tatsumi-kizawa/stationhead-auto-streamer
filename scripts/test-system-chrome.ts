import { chromium } from 'playwright-extra';
import type { Page } from 'playwright';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Stealth Pluginを有効化（自動化検出を回避）
chromium.use(StealthPlugin());

// プロジェクトルートの.envファイルを明示的に読み込む
const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

/**
 * システムChrome + Persistent Profile アプローチのテスト
 *
 * 目的:
 * - 実際のChromeブラウザを使用してSpotify Web Playback SDKの互換性問題を解決
 * - セッション情報を.chrome-profile/に永続化
 * - 初回: 手動でログイン・Spotify連携を完了
 * - 2回目以降: 自動的にログイン済み・連携済み状態
 */

async function testSystemChrome() {
  console.log('🎙️  Starting System Chrome + Persistent Profile test...\n');
  console.log('═══════════════════════════════════════════════════════\n');

  // 専用のChromeプロファイルディレクトリを使用
  // これにより、ログイン状態やSpotify連携が永続化される
  const chromeProfilePath = path.join(__dirname, '../.chrome-profile');

  const context = await chromium.launchPersistentContext(chromeProfilePath, {
    channel: 'chrome', // システムにインストールされている実際のChromeを使用
    headless: false,
    slowMo: 500,
    viewport: { width: 1920, height: 1080 },
    // マイク許可 + メディア再生のパーミッションを追加
    permissions: ['microphone'],
    // Spotify Web Playback SDK互換のための設定
    // 注意: フェイクデバイスは削除（Spotify SDKが実際のデバイスを要求するため）
    args: [
      '--autoplay-policy=no-user-gesture-required', // 自動再生を許可
      '--disable-blink-features=AutomationControlled', // 自動化検出を無効化
    ],
  });

  // launchPersistentContextは自動的に最初のページを開くので、それを使用
  const page = context.pages()[0] || (await context.newPage());

  const screenshotsDir = path.join(__dirname, '../screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  try {
    console.log('\n📋 初回セットアップ手順:');
    console.log('1. ブラウザが起動します');
    console.log('2. 手動でStationheadにログインしてください');
    console.log('3. Go On Airページに進み、Spotify連携を完了してください');
    console.log('4. プレイリストを選択して配信準備を完了してください');
    console.log('5. このターミナルでEnterキーを押してテストを完了してください\n');

    // Stationheadのサインインページに遷移
    await page.goto('https://www.stationhead.com/on/sign-in');
    await page.waitForTimeout(2000);

    // 現在のURLをチェック（既にログイン済みかどうか）
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    const isLoggedIn = currentUrl.includes('/profile') || !currentUrl.includes('/sign-in');

    if (isLoggedIn) {
      console.log('✅ 既にログイン済みです');
      console.log('   セッション永続性テストを実行します...\n');

      // Go On Airページに遷移してSpotify連携状態を確認
      console.log('🎙️  Go On Airページに遷移します...');
      await page.goto('https://www.stationhead.com/on/go-on-air');
      await page.waitForTimeout(3000);

      await page.screenshot({
        path: path.join(screenshotsDir, 'system-chrome-01-go-on-air.png'),
        fullPage: true,
      });

      console.log('   ✅ セッション永続性テスト成功（ログイン済み状態）\n');

      // Go On Airフロー全体を自動実行
      console.log('🎵 Go On Air フロー全体を自動実行します...\n');

      await runGoOnAirFlow(page, context, screenshotsDir);

    } else {
      console.log('⏳ ログインページが表示されています');
      console.log('   初回セットアップ: 手動でログインしてください...\n');

      await page.screenshot({
        path: path.join(screenshotsDir, 'system-chrome-01-login-page.png'),
        fullPage: true,
      });
    }

    // ユーザーの操作を待つ
    console.log('✋ 確認が完了したらEnterキーを押してください...');
    await waitForUserInput();

    // 最終状態のスクリーンショット
    await page.screenshot({
      path: path.join(screenshotsDir, 'system-chrome-02-final.png'),
      fullPage: true,
    });

    // テスト結果を保存
    const result = {
      timestamp: new Date().toISOString(),
      success: true,
      profilePath: chromeProfilePath,
      message: 'System Chrome test completed successfully',
    };

    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(dataDir, 'system-chrome-test-result.json'),
      JSON.stringify(result, null, 2)
    );

    console.log('\n✅ セッション情報が保存されました');
    console.log(`   プロファイル: ${chromeProfilePath}`);
    console.log('   次回からはログイン済み状態で起動します\n');

    console.log('⏳ ブラウザを60秒間開いたままにします（確認用）...');
    await page.waitForTimeout(60000);
  } catch (error) {
    console.error('\n❌ Error during System Chrome test:', error);

    await page.screenshot({
      path: path.join(screenshotsDir, 'system-chrome-error.png'),
      fullPage: true,
    });

    const result = {
      timestamp: new Date().toISOString(),
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };

    const dataDir = path.join(__dirname, '../data');
    fs.writeFileSync(
      path.join(dataDir, 'system-chrome-test-result.json'),
      JSON.stringify(result, null, 2)
    );

    throw error;
  } finally {
    await context.close();
    console.log('\n✅ System Chrome test completed!');
  }
}

/**
 * Go On Airフロー全体の自動処理
 * 番組名入力 → マイクテスト → プレイリスト選択 → 配信開始
 */
async function runGoOnAirFlow(
  page: Page,
  context: any,
  screenshotsDir: string
): Promise<void> {
  const SHOW_NAME = 'Automated Test Show';

  try {
    // Step 1: 番組名を入力
    console.log('📝 Step 1: Entering show name...');

    // 複数のセレクタパターンを試す
    const possibleSelectors = [
      'input[maxlength="30"]',
      'input[placeholder*="name"]',
      'input[placeholder*="show"]',
      'input[type="text"]',
    ];

    let showNameInput = null;
    for (const selector of possibleSelectors) {
      const input = page.locator(selector).first();
      if ((await input.count()) > 0) {
        showNameInput = input;
        console.log(`   Found input with selector: ${selector}`);
        break;
      }
    }

    if (!showNameInput) {
      // ページ全体の構造を調査
      console.log('   ⚠️  Show name input not found, analyzing page...');
      const pageInfo = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input')).map((input) => ({
          type: input.type,
          placeholder: input.placeholder,
          maxLength: input.maxLength,
          name: input.name,
          id: input.id,
        }));

        const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map((h) =>
          h.textContent?.trim()
        );

        return { inputs, headings };
      });

      console.log('   Page inputs:', JSON.stringify(pageInfo.inputs, null, 2));
      console.log('   Page headings:', pageInfo.headings);

      await page.screenshot({
        path: path.join(screenshotsDir, 'system-chrome-02-show-name-input-not-found.png'),
        fullPage: true,
      });

      throw new Error('Show name input not found');
    }

    // 番組名を入力
    console.log(`   Entering show name: "${SHOW_NAME}"`);
    await showNameInput.fill(SHOW_NAME);
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(screenshotsDir, 'system-chrome-02-show-name-entered.png'),
      fullPage: true,
    });

    console.log(`   ✅ Show name entered: "${SHOW_NAME}"`);

    // Step 2: Next buttonをクリック
    console.log('⏭️  Step 2: Clicking Next button...');
    const nextButton = page.locator('button:has-text("Next")').first();

    if ((await nextButton.count()) > 0) {
      await nextButton.click({ force: true });
      await page.waitForTimeout(2000);
      console.log('   ✅ Next button clicked');
    }

    await page.screenshot({
      path: path.join(screenshotsDir, 'system-chrome-03-after-next.png'),
      fullPage: true,
    });

    // Step 3: マイク許可
    console.log('🎤 Step 3: Granting microphone permission...');
    await context.grantPermissions(['microphone'], {
      origin: 'https://www.stationhead.com',
    });
    await page.waitForTimeout(2000);
    console.log('   ✅ Microphone permission granted');

    await page.screenshot({
      path: path.join(screenshotsDir, 'system-chrome-04-mic-permission.png'),
      fullPage: true,
    });

    // Step 4: マイクテスト - Next buttonをクリック
    console.log('🎙️  Step 4: Handling microphone test...');
    const micTestNext = page.locator('button:has-text("Next")').first();

    if ((await micTestNext.count()) > 0) {
      await micTestNext.click({ force: true });
      await page.waitForTimeout(2000);
      console.log('   ✅ Microphone test completed');
    }

    await page.screenshot({
      path: path.join(screenshotsDir, 'system-chrome-05-after-mic-test.png'),
      fullPage: true,
    });

    // Step 5: Spotify連携確認 - "Add music"ボタンの有無をチェック
    console.log('🎵 Step 5: Checking Spotify connection...');
    await page.waitForTimeout(2000);

    const addMusicButton = page.locator('button:has-text("Add music")').last();
    const hasAddMusic = (await addMusicButton.count()) > 0;

    if (hasAddMusic) {
      console.log('   ✅ Spotify already connected (Add music button found)');

      // プレイリスト選択〜配信開始
      await selectPlaylistAndStartBroadcast(page, screenshotsDir);
    } else {
      console.log('   ⚠️  Spotify not connected yet');
      console.log('   This should not happen with session persistence...');

      await page.screenshot({
        path: path.join(screenshotsDir, 'system-chrome-spotify-not-connected.png'),
        fullPage: true,
      });
    }
  } catch (error) {
    console.error('❌ Error during Go On Air flow:', error);
    throw error;
  }
}

/**
 * プレイリスト選択〜配信開始までの自動処理
 */
async function selectPlaylistAndStartBroadcast(
  page: Page,
  screenshotsDir: string
): Promise<void> {
  try {
    // Step 1: Add musicボタンをクリック
    console.log('🎵 Step 1: Clicking "Add music" button...');
    const addMusicButton = page.locator('button:has-text("Add music")').last();
    await addMusicButton.click({ force: true });
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(screenshotsDir, 'system-chrome-03-add-music-clicked.png'),
      fullPage: true,
    });

    // Step 2: プレイリストモーダルの表示を待つ
    console.log('🎵 Step 2: Waiting for playlist modal...');
    const myPlaylistsText = page.locator('text="My playlists"').first();
    await myPlaylistsText.waitFor({ timeout: 10000 });

    await page.screenshot({
      path: path.join(screenshotsDir, 'system-chrome-04-playlist-modal.png'),
      fullPage: true,
    });

    // Step 3: 最初のプレイリストを選択
    console.log('🎵 Step 3: Selecting first playlist...');
    await page.waitForTimeout(2000);

    const playlistClickResult = await page.evaluate(() => {
      const allDivs = Array.from(document.querySelectorAll('div'));

      // "songs" を含み、クリック可能なdivを探す
      const clickableDivs = allDivs.filter((div) => {
        const text = div.textContent?.trim() || '';
        const hasPlaylistText =
          text.includes('songs') &&
          !text.includes('Saved songs') &&
          !text.includes('Add music');

        const isClickable =
          div.onclick != null ||
          div.getAttribute('role') === 'button' ||
          window.getComputedStyle(div).cursor === 'pointer';

        return hasPlaylistText && isClickable && text.length < 100;
      });

      if (clickableDivs.length > 0 && clickableDivs[0]) {
        clickableDivs[0].click();
        const text = clickableDivs[0].textContent;
        return {
          success: true,
          text: text ? text.trim().substring(0, 80) : 'Unknown',
        };
      }

      return { success: false, text: null };
    });

    if (playlistClickResult.success) {
      console.log(`   ✅ Clicked playlist: "${playlistClickResult.text}"`);
    } else {
      console.log('   ⚠️  Could not select playlist automatically');
    }

    await page.waitForTimeout(3000);

    await page.screenshot({
      path: path.join(screenshotsDir, 'system-chrome-05-playlist-selected.png'),
      fullPage: true,
    });

    // Step 4: "All songs"ボタンをクリック
    console.log('🎵 Step 4: Clicking "All songs" button...');
    const allSongsButton = page.locator('button:has-text("All songs")').first();

    if ((await allSongsButton.count()) > 0) {
      await allSongsButton.click({ force: true });
      await page.waitForTimeout(3000);
      console.log('   ✅ All songs added');
    }

    await page.screenshot({
      path: path.join(screenshotsDir, 'system-chrome-06-all-songs-added.png'),
      fullPage: true,
    });

    // Step 5: Closeボタンをクリック
    console.log('🎵 Step 5: Closing success popup...');
    const closeButton = page
      .locator('button:has-text("Close"), button:has-text("CLOSE")')
      .first();

    if ((await closeButton.count()) > 0) {
      await closeButton.click({ force: true });
      await page.waitForTimeout(2000);
    }

    // Step 6: Nextボタンをクリック
    const nextButton = page.locator('button:has-text("Next")').first();
    if ((await nextButton.count()) > 0) {
      await nextButton.click({ force: true });
      await page.waitForTimeout(2000);
    }

    await page.screenshot({
      path: path.join(screenshotsDir, 'system-chrome-07-after-next.png'),
      fullPage: true,
    });

    // Step 7: Send Notificationボタンをクリック
    console.log('🔔 Step 6: Sending notification...');
    await page.waitForTimeout(2000);

    const sendButton = page.locator('button:has-text("Send Notification")').first();
    if ((await sendButton.count()) > 0) {
      await sendButton.click({ force: true });
      await page.waitForTimeout(3000);
      console.log('   ✅ Notification sent');
    }

    await page.screenshot({
      path: path.join(screenshotsDir, 'system-chrome-08-notification-sent.png'),
      fullPage: true,
    });

    // Step 8: GO ON AIRボタンをクリック
    console.log('🎙️  Step 7: Starting broadcast...');

    const goOnAirSelectors = [
      'button:has-text("GO ON AIR")',
      'button:has-text("Go on air")',
      'button:has-text("go on air")',
    ];

    let clicked = false;

    for (const selector of goOnAirSelectors) {
      const button = page.locator(selector).last();
      const count = await button.count();

      if (count > 0) {
        console.log(`   Found button with selector: ${selector}`);

        try {
          await button.click({ force: true, timeout: 5000 });
          console.log('   ✅ Clicked with Playwright (force)');
          clicked = true;
          break;
        } catch (error) {
          console.log('   ⚠️  Playwright click failed, trying JavaScript click...');

          const jsClickResult = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const targetButton = buttons
              .filter((btn) => btn.textContent?.toLowerCase().includes('go on air'))
              .pop();

            if (targetButton) {
              (targetButton as HTMLButtonElement).click();
              return true;
            }
            return false;
          });

          if (jsClickResult) {
            console.log('   ✅ Clicked with JavaScript');
            clicked = true;
            break;
          }
        }
      }
    }

    if (!clicked) {
      console.log('   ⚠️  GO ON AIR button not found or could not be clicked');
    }

    await page.waitForTimeout(5000);

    await page.screenshot({
      path: path.join(screenshotsDir, 'system-chrome-09-broadcasting.png'),
      fullPage: true,
    });

    console.log('✅ プレイリスト選択〜配信開始が完了しました！\n');

    // Spotify playerのエラーチェック
    console.log('🔍 Checking for Spotify player errors...\n');
    await checkSpotifyPlayerStatus(page, screenshotsDir);
  } catch (error) {
    console.error('❌ Error during playlist selection and broadcast:', error);
    throw error;
  }
}

/**
 * Spotify playerのエラー状態をチェック
 */
async function checkSpotifyPlayerStatus(page: Page, screenshotsDir: string): Promise<void> {
  try {
    // 1. ページ上のエラーメッセージを探す
    const errorMessage = await page
      .locator('text=/Spotify player failed/i')
      .first()
      .textContent()
      .catch(() => null);

    if (errorMessage) {
      console.log('❌ Spotify player error detected:');
      console.log(`   "${errorMessage}"\n`);

      await page.screenshot({
        path: path.join(screenshotsDir, 'system-chrome-spotify-error.png'),
        fullPage: true,
      });
    } else {
      console.log('✅ No Spotify player error message found on page\n');
    }

    // 2. ブラウザの機能サポート状況を確認
    console.log('🔍 Checking browser capabilities...\n');
    const capabilities = await page.evaluate(() => {
      const results: any = {
        userAgent: navigator.userAgent,
        audioContext: typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined',
        mediaDevices: typeof navigator.mediaDevices !== 'undefined',
        getUserMedia: typeof navigator.mediaDevices?.getUserMedia !== 'undefined',
        webAudio: typeof AudioContext !== 'undefined',
        autoplayPolicy: (document as any).autoplayPolicy || 'unknown',
      };

      // Spotify Web Playback SDKの初期化状態を確認
      if (typeof (window as any).Spotify !== 'undefined') {
        results.spotifySDK = {
          loaded: true,
          Player: typeof (window as any).Spotify.Player !== 'undefined',
        };
      } else {
        results.spotifySDK = {
          loaded: false,
        };
      }

      return results;
    });

    console.log('Browser capabilities:');
    console.log(JSON.stringify(capabilities, null, 2));
    console.log('');

    // 3. ブラウザコンソールのエラーを確認
    console.log('🔍 Checking browser console for errors...\n');

    // ページのコンソールログを監視
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error' || type === 'warning') {
        consoleLogs.push(`[${type}] ${text}`);
      }
    });

    // 5秒間待機してログを収集
    await page.waitForTimeout(5000);

    if (consoleLogs.length > 0) {
      console.log('❌ Browser console errors/warnings:');
      consoleLogs.forEach((log) => console.log(`   ${log}`));
      console.log('');
    } else {
      console.log('✅ No console errors detected\n');
    }

    // 4. 結果のサマリー
    console.log('📊 Diagnosis Summary:');
    console.log(`   - Error message on page: ${errorMessage ? 'YES ❌' : 'NO ✅'}`);
    console.log(`   - Audio Context support: ${capabilities.audioContext ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   - Media Devices API: ${capabilities.mediaDevices ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   - Spotify SDK loaded: ${capabilities.spotifySDK?.loaded ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   - Console errors: ${consoleLogs.length > 0 ? `YES (${consoleLogs.length}) ❌` : 'NO ✅'}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error during Spotify player status check:', error);
  }
}

/**
 * ユーザーのEnterキー入力を待つ
 */
function waitForUserInput(): Promise<void> {
  return new Promise<void>((resolve) => {
    const stdin = process.stdin;

    // TTY（ターミナル）でない場合は自動的に続行
    if (!stdin.isTTY) {
      console.log('⚠️  Not running in a TTY, automatically continuing...');
      resolve();
      return;
    }

    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    const onData = (key: string) => {
      // Ctrl+C で終了
      if (key === '\u0003') {
        process.exit();
      }
      // Enter キー
      if (key === '\r' || key === '\n') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        console.log('✅ 続行します...\n');
        resolve();
      }
    };

    stdin.on('data', onData);
  });
}

// 実行
testSystemChrome().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
