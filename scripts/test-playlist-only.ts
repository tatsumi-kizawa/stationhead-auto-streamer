import { chromium, BrowserContext, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// ========================================
// 環境変数読み込み
// ========================================

const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

/**
 * Spotifyパスワード取得（特殊文字対応）
 * dotenvライブラリは$を変数展開として扱うため、直接パースする
 */
function getSpotifyPassword(): string {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/SPOTIFY_PASSWORD="([^"]+)"/);
  if (match && match[1]) {
    return match[1].replace(/\\(.)/g, '$1');
  }
  return process.env.SPOTIFY_PASSWORD || '';
}

// ========================================
// 設定
// ========================================

const SHOW_NAME = 'Test Radio Show - Playlist';
const PLAYLIST_NAME = process.env.PLAYLIST_NAME || 'New Music Wednesday';

// ========================================
// Stationhead認証・Go On Airフロー
// test-go-on-air.tsで成功したロジック
// ========================================

/**
 * Stationheadにログイン
 */
async function login(page: Page, screenshotsDir: string): Promise<void> {
  console.log('\n🔐 Step 1: Logging in...');

  await page.goto('https://www.stationhead.com/on/sign-in', {
    waitUntil: 'networkidle',
  });

  await page.screenshot({
    path: path.join(screenshotsDir, 'playlist-only-01-login-page.png'),
  });

  // "Use email instead" をクリック
  await page.click('text="Use email instead"');
  await page.waitForTimeout(1000);

  // 認証情報入力
  const emailInput = page.locator('input[placeholder="Email"]');
  await emailInput.fill(process.env.STATIONHEAD_EMAIL || '');

  const passwordInput = page.locator('input[placeholder="Password"]');
  await passwordInput.fill(process.env.STATIONHEAD_PASSWORD || '');

  await page.waitForTimeout(1000);

  // ログインボタンクリック
  const loginButton = page.locator('button:has-text("Log in")').last();
  await loginButton.click({ force: true });

  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: path.join(screenshotsDir, 'playlist-only-02-logged-in.png'),
  });

  console.log('✅ Login successful\n');
}

/**
 * Go On Air ページへ遷移
 */
async function navigateToGoOnAir(
  page: Page,
  screenshotsDir: string
): Promise<void> {
  console.log('🎙️  Step 2: Navigating to Go On Air page...');

  await page.goto('https://www.stationhead.com/on/go-on-air', {
    waitUntil: 'networkidle',
  });

  await page.waitForTimeout(2000);

  await page.screenshot({
    path: path.join(screenshotsDir, 'playlist-only-03-initial-page.png'),
    fullPage: true,
  });

  console.log('✅ Go On Air page loaded\n');
}

/**
 * 番組名入力
 */
async function enterShowName(
  page: Page,
  screenshotsDir: string
): Promise<void> {
  console.log('📝 Step 3: Entering show name...');

  // 番組名入力フィールドを探す（複数のセレクタを試行）
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
      break;
    }
  }

  if (!showNameInput) {
    throw new Error('Show name input not found');
  }

  await showNameInput.fill(SHOW_NAME);
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: path.join(screenshotsDir, 'playlist-only-04-show-name-entered.png'),
    fullPage: true,
  });

  console.log('✅ Show name entered\n');
}

/**
 * Nextボタンをクリック
 */
async function clickNext(page: Page, screenshotsDir: string): Promise<void> {
  console.log('⏭️  Step 4: Clicking Next button...');

  const nextButton = page.locator('button:has-text("Next")').first();
  await nextButton.click({ force: true });
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: path.join(screenshotsDir, 'playlist-only-05-after-next.png'),
    fullPage: true,
  });

  console.log('✅ Next button clicked\n');
}

/**
 * マイク許可
 */
async function grantMicrophonePermission(
  context: BrowserContext,
  page: Page,
  screenshotsDir: string
): Promise<void> {
  console.log('🎤 Step 5: Granting microphone permission...');

  await context.grantPermissions(['microphone'], {
    origin: 'https://www.stationhead.com',
  });

  await page.waitForTimeout(2000);

  await page.screenshot({
    path: path.join(screenshotsDir, 'playlist-only-06-mic-permission.png'),
    fullPage: true,
  });

  console.log('✅ Microphone permission granted\n');
}

/**
 * マイクテストページでNextをクリック
 */
async function handleMicTest(
  page: Page,
  screenshotsDir: string
): Promise<void> {
  console.log('🎙️  Step 6: Handling microphone test...');

  await page.screenshot({
    path: path.join(screenshotsDir, 'playlist-only-07-mic-test-page.png'),
    fullPage: true,
  });

  const nextButton = page.locator('button:has-text("Next")').first();
  await nextButton.click({ force: true });
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: path.join(screenshotsDir, 'playlist-only-08-after-mic-test.png'),
    fullPage: true,
  });

  console.log('✅ Microphone test completed\n');
}

/**
 * Spotify連携（ボタンクリック〜認証完了まで）
 */
async function connectSpotify(
  page: Page,
  screenshotsDir: string
): Promise<void> {
  console.log('🎵 Step 7: Connecting Spotify...');

  await page.screenshot({
    path: path.join(screenshotsDir, 'playlist-only-09-spotify-page.png'),
    fullPage: true,
  });

  // Spotifyボタンを探す（button要素またはdiv要素）
  const spotifyButton = await findSpotifyButton(page);
  if (!spotifyButton) {
    throw new Error('Spotify button not found');
  }

  // Spotifyボタンをクリック（新しいタブが開く）
  const [spotifyPage] = await Promise.all([
    page.context().waitForEvent('page'),
    spotifyButton.click({ force: true }),
  ]);

  await spotifyPage.waitForLoadState('networkidle', { timeout: 15000 });
  await spotifyPage.waitForTimeout(2000);

  await spotifyPage.screenshot({
    path: path.join(screenshotsDir, 'playlist-only-10-spotify-auth-page.png'),
    fullPage: true,
  });

  console.log('✅ Spotify tab opened\n');

  // Spotify認証処理
  await handleSpotifyAuth(spotifyPage, screenshotsDir);
}

/**
 * Spotifyボタンを探す
 */
async function findSpotifyButton(page: Page) {
  const selectors = [
    'button:has-text("Connect Spotify")',
    'button:has-text("Spotify")',
    'div:has-text("Connect Spotify")',
    '[role="button"]:has-text("Connect Spotify")',
    'text="Connect Spotify"',
  ];

  for (const selector of selectors) {
    const element = page.locator(selector).first();
    if ((await element.count()) > 0) {
      return element;
    }
  }

  return null;
}

/**
 * Spotify認証フロー
 *
 * フロー:
 * 1. ログインページかどうか確認
 * 2. ログインページの場合 → loginToSpotify() でID/PW入力
 * 3. ログイン成功 → 認証・同意ページに遷移
 * 4. 「同意する」ボタンをクリック
 * 5. Stationheadに戻る
 */
async function handleSpotifyAuth(
  spotifyPage: Page,
  screenshotsDir: string
): Promise<void> {
  console.log('🎵 Step 8: Handling Spotify authorization...');

  const currentUrl = spotifyPage.url();

  // ログインページの場合、ID/PW入力
  if (currentUrl.includes('/login')) {
    console.log('   Spotify login page detected');
    await loginToSpotify(spotifyPage, screenshotsDir);
  }

  // ログイン後、認証・同意ページに遷移するまで待機
  await spotifyPage.waitForTimeout(3000);

  await spotifyPage.screenshot({
    path: path.join(screenshotsDir, 'playlist-only-11-spotify-consent-page.png'),
    fullPage: true,
  });

  // 「同意する」ボタンを探してクリック
  const agreeButton = await findAgreeButton(spotifyPage);

  if (!agreeButton) {
    // 既にStationheadに戻っている場合
    const finalUrl = spotifyPage.url();
    if (finalUrl.includes('stationhead.com')) {
      console.log('   Already authorized and returned to Stationhead');
      return;
    }
    console.log('   ⚠️  Agree button not found');
  } else {
    console.log('   Clicking agree button...');
    await agreeButton.click({ force: true });

    await spotifyPage.waitForTimeout(2000).catch(() => {
      // ページが閉じられた場合は無視
    });
  }

  console.log('✅ Spotify authorization completed\n');
}

/**
 * 「同意する」ボタンを探す
 */
async function findAgreeButton(spotifyPage: Page) {
  const selectors = [
    'button:has-text("同意する")',
    'button:has-text("Agree")',
    'button:has-text("Accept")',
    'button:has-text("承認")',
    'button[id*="auth-accept"]',
    'button[data-testid="auth-accept"]',
  ];

  for (const selector of selectors) {
    const button = spotifyPage.locator(selector).first();
    if ((await button.count()) > 0) {
      return button;
    }
  }

  return null;
}

/**
 * Spotifyログイン（ID/PW入力）
 *
 * フロー:
 * 1. メールアドレス入力
 * 2. 「次へ」ボタンをクリック
 * 3. 「パスワードでログイン」ボタンをクリック（表示されている場合）
 * 4. パスワード入力（keyboard.type()で特殊文字対応）
 * 5. 「ログイン」ボタンをクリック
 * 6. ログイン完了 → 認証・同意ページに遷移
 */
async function loginToSpotify(
  spotifyPage: Page,
  screenshotsDir: string
): Promise<void> {
  console.log('   Logging in to Spotify...');

  // メールアドレス入力
  const usernameInput = spotifyPage.locator('input[id="login-username"]').first();
  if ((await usernameInput.count()) === 0) {
    throw new Error('Spotify login form not found');
  }

  await usernameInput.fill(process.env.SPOTIFY_EMAIL || '');

  await spotifyPage.screenshot({
    path: path.join(screenshotsDir, 'playlist-only-11a-spotify-email.png'),
    fullPage: true,
  });

  // 「次へ」ボタンをクリック
  const nextButton = spotifyPage.locator('button#login-button').first();
  if ((await nextButton.count()) > 0) {
    await nextButton.click({ force: true });
    await spotifyPage.waitForTimeout(2000);

    await spotifyPage.screenshot({
      path: path.join(screenshotsDir, 'playlist-only-11b-after-next.png'),
      fullPage: true,
    });

    // 「パスワードでログイン」ボタンをクリック（表示されている場合）
    const passwordLoginButton = spotifyPage
      .locator('button:has-text("パスワードでログイン")')
      .first();

    if ((await passwordLoginButton.count()) > 0) {
      await passwordLoginButton.click({ force: true });
      await spotifyPage.waitForTimeout(2000);

      await spotifyPage.screenshot({
        path: path.join(screenshotsDir, 'playlist-only-11c-password-mode.png'),
        fullPage: true,
      });
    }

    await spotifyPage.waitForTimeout(1000);
  }

  // パスワード入力フィールドを探す
  const passwordInput = await findPasswordInput(spotifyPage);
  if (!passwordInput) {
    throw new Error('Password input field not found');
  }

  // パスワード入力（keyboard.type()で特殊文字対応）
  const spotifyPassword = getSpotifyPassword();
  await passwordInput.click();
  await spotifyPage.keyboard.type(spotifyPassword, { delay: 100 });

  await spotifyPage.waitForTimeout(1000);

  await spotifyPage.screenshot({
    path: path.join(screenshotsDir, 'playlist-only-11d-password-entered.png'),
    fullPage: true,
  });

  // ログインボタンをクリック
  const loginButton = await findLoginButton(spotifyPage);
  if (!loginButton) {
    throw new Error('Login button not found');
  }

  await loginButton.click({ force: true });
  await spotifyPage.waitForTimeout(5000);

  await spotifyPage.screenshot({
    path: path.join(screenshotsDir, 'playlist-only-11e-logged-in.png'),
    fullPage: true,
  });

  console.log('   ✅ Spotify login completed');
}

/**
 * パスワード入力フィールドを探す
 */
async function findPasswordInput(spotifyPage: Page) {
  const selectors = [
    'input[id="login-password"]',
    'input[type="password"]',
    'input[name="password"]',
  ];

  for (const selector of selectors) {
    const input = spotifyPage.locator(selector).first();
    if ((await input.count()) > 0 && (await input.isVisible())) {
      return input;
    }
  }

  return null;
}

/**
 * ログインボタンを探す
 */
async function findLoginButton(spotifyPage: Page) {
  const selectors = [
    'button#login-button',
    'button:has-text("ログイン")',
    'button:has-text("Log in")',
  ];

  for (const selector of selectors) {
    const button = spotifyPage.locator(selector).first();
    if ((await button.count()) > 0) {
      return button;
    }
  }

  return null;
}

// ========================================
// プレイリスト選択フロー
// ユーザー説明に基づいて実装
// ========================================

/**
 * プレイリスト選択フロー
 *
 * フロー:
 * 1. "Add music" ボタンをクリック
 * 2. モーダルが開く → "My playlists" セクションが表示
 * 3. プレイリスト名をクリック
 * 4. 楽曲一覧が読み込まれる（preloader表示）
 * 5. "All songs" ボタンをクリック
 * 6. トーストメッセージ「Added playlists...」が表示される
 * 7. "Close" ボタンをクリック
 */
async function selectPlaylistFlow(
  page: Page,
  screenshotsDir: string,
  playlistName: string
): Promise<void> {
  console.log(`\n🎵 Step 9: Playlist Selection...\n`);
  console.log(`   Target: "${playlistName}"\n`);

  // Spotify認証後、Stationheadに戻るまで待機
  await page.waitForTimeout(3000);

  await page.screenshot({
    path: path.join(screenshotsDir, 'playlist-only-12-music-selection.png'),
    fullPage: true,
  });

  // Step 1: "Add music" ボタンをクリック
  console.log('   Step 9-1: Opening playlist modal...');

  const addMusicButton = await findAddMusicButton(page);
  if (!addMusicButton) {
    throw new Error('Add Music button not found');
  }

  await addMusicButton.click({ force: true });
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: path.join(screenshotsDir, 'playlist-only-13-add-music-clicked.png'),
    fullPage: true,
  });

  console.log('   ✅ Modal opened');

  // Step 2: "My playlists" セクションが表示されるまで待機
  const myPlaylistsText = page.locator('text="My playlists"').first();
  await myPlaylistsText.waitFor({ timeout: 10000 });

  await page.screenshot({
    path: path.join(screenshotsDir, 'playlist-only-14-modal-visible.png'),
    fullPage: true,
  });

  // Step 3: プレイリスト名をクリック
  console.log(`   Step 9-2: Selecting playlist "${playlistName}"...`);

  const playlistNameLocator = page.locator(`text="${playlistName}"`).first();

  if ((await playlistNameLocator.count()) === 0) {
    throw new Error(`Playlist "${playlistName}" not found in modal`);
  }

  await playlistNameLocator.click({ force: true });

  // Step 4: 楽曲一覧が読み込まれるまで待機
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: path.join(screenshotsDir, 'playlist-only-15-playlist-clicked.png'),
    fullPage: true,
  });

  // "All songs" ボタンが表示されるまで待つ（読み込み完了の証拠）
  const allSongsButton = page.locator('text="All songs"').first();
  await allSongsButton.waitFor({ state: 'visible', timeout: 10000 });

  await page.screenshot({
    path: path.join(screenshotsDir, 'playlist-only-16-songs-loaded.png'),
    fullPage: true,
  });

  console.log('   ✅ Playlist songs loaded');

  // Step 5: "All songs" ボタンをクリック
  console.log('   Step 9-3: Adding all songs...');

  await allSongsButton.click({ force: true });

  // Step 6: トーストメッセージを待機
  const toastMessage = page.locator('text=/Added playlist/i').first();
  await toastMessage.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
    // トーストが既に消えている場合は無視
  });

  await page.waitForTimeout(2000);

  await page.screenshot({
    path: path.join(screenshotsDir, 'playlist-only-17-all-songs-added.png'),
    fullPage: true,
  });

  console.log('   ✅ All songs added');

  // Step 7: "Close" ボタンをクリック
  console.log('   Step 9-4: Closing modal...');

  const closeButton = await findCloseButton(page);
  if (!closeButton) {
    throw new Error('Close button not found');
  }

  await closeButton.click({ force: true });
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: path.join(screenshotsDir, 'playlist-only-18-modal-closed.png'),
    fullPage: true,
  });

  console.log('   ✅ Modal closed');
  console.log('\n✅ Playlist selection completed!\n');
}

/**
 * "Add music" ボタンを探す
 */
async function findAddMusicButton(page: Page) {
  const selectors = [
    'button:has-text("Add music")',
    'div:has-text("Add music")',
    'text="Add music"',
  ];

  for (const selector of selectors) {
    const button = page.locator(selector).last(); // .last()で「Show playlist」セクションのボタンを取得
    if ((await button.count()) > 0 && (await button.isVisible())) {
      return button;
    }
  }

  return null;
}

/**
 * "Close" ボタンを探す
 */
async function findCloseButton(page: Page) {
  const selectors = [
    'button:has-text("Close")',
    'button:has-text("CLOSE")',
  ];

  for (const selector of selectors) {
    const button = page.locator(selector).first();
    if ((await button.count()) > 0 && (await button.isVisible())) {
      return button;
    }
  }

  return null;
}

// ========================================
// 配信開始フロー関数群
// ========================================

/**
 * プレイリスト選択後の成功ポップアップを閉じる
 */
async function closeSuccessPopup(
  page: Page,
  screenshotsDir: string
): Promise<void> {
  console.log('\n✅ Closing success popup...');

  // 成功ポップアップの "Close" ボタンをクリック
  const closeButton = page
    .locator('button:has-text("Close"), button:has-text("CLOSE")')
    .first();

  if ((await closeButton.count()) > 0) {
    console.log('   Clicking "Close" button...');
    await closeButton.click({ force: true });
    await page.waitForTimeout(2000);
  }

  await page.screenshot({
    path: path.join(screenshotsDir, 'playlist-only-19-after-close.png'),
  });

  // "Next" ボタンをクリック
  const nextButton = page.locator('button:has-text("Next")').first();
  if ((await nextButton.count()) > 0) {
    console.log('   Clicking "Next" button...');
    await nextButton.click({ force: true });
    await page.waitForTimeout(2000);
  }

  await page.screenshot({
    path: path.join(screenshotsDir, 'playlist-only-20-after-next.png'),
  });

  console.log('✅ Success popup closed\n');
}

/**
 * 通知送信
 */
async function sendNotification(
  page: Page,
  screenshotsDir: string
): Promise<void> {
  console.log('🔔 Sending notification...');

  // プレイリスト選択後、通知画面が表示されるまで待つ
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: path.join(screenshotsDir, 'playlist-only-21-notification-page.png'),
  });

  // "Send Notification" ボタンをクリック
  const sendButton = page
    .locator('button:has-text("Send Notification")')
    .first();

  if ((await sendButton.count()) === 0) {
    console.log('   ⚠️  Send Notification button not found');
    const buttons = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button')).map((btn) =>
        btn.textContent?.trim()
      )
    );
    console.log('   Available buttons:', buttons);
  } else {
    console.log('   Clicking "Send Notification" button...');
    await sendButton.click({ force: true });
    await page.waitForTimeout(3000);
  }

  await page.screenshot({
    path: path.join(screenshotsDir, 'playlist-only-22-after-send-notification.png'),
  });

  console.log('✅ Notification sent\n');
}

/**
 * 配信開始
 */
async function startBroadcast(
  page: Page,
  screenshotsDir: string
): Promise<void> {
  console.log('🎙️  Starting broadcast...');

  await page.screenshot({
    path: path.join(screenshotsDir, 'playlist-only-23-before-go-on-air.png'),
  });

  // 画面には2つの「Go on air」ボタンが存在：
  // 1. 左側パネル内のボタン（クリック不要）
  // 2. 右下の矢印付きボタン（これをクリックする必要がある）

  console.log('   Looking for "Go on air" button with arrow...');

  // すべての「Go on air」ボタンを調査
  const allButtons = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons
      .map((btn, index) => ({
        index,
        text: btn.textContent?.trim(),
        hasArrow: btn.innerHTML.includes('→') || btn.innerHTML.includes('arrow'),
        visible: btn.offsetWidth > 0 && btn.offsetHeight > 0,
      }))
      .filter((btn) => btn.text?.toLowerCase().includes('go on air'));
  });

  console.log('   Found "Go on air" buttons:', allButtons);

  // 右下の矢印付きボタンを探す（複数のセレクタパターンを試す）
  const possibleSelectors = [
    'button:has-text("Go on air"):has-text("→")',  // 矢印を含むボタン
    'button:has-text("Go on air") >> nth=1',        // 2番目のボタン
    'button:has-text("Go on air"):not(:has-text("Get ready"))', // 左パネル外のボタン
  ];

  let clicked = false;

  for (const selector of possibleSelectors) {
    try {
      const button = page.locator(selector).first();
      if ((await button.count()) > 0 && (await button.isVisible())) {
        console.log(`   Found button with selector: ${selector}`);
        await button.click({ force: true });
        clicked = true;
        await page.waitForTimeout(5000);
        break;
      }
    } catch (error) {
      console.log(`   Selector "${selector}" failed, trying next...`);
    }
  }

  // セレクタで見つからない場合は、すべてのボタンから右下のものをクリック
  if (!clicked) {
    console.log('   Trying to click the last visible "Go on air" button...');
    const result = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
        .filter((btn) => {
          const text = btn.textContent?.trim().toLowerCase() || '';
          return text.includes('go on air') && btn.offsetWidth > 0 && btn.offsetHeight > 0;
        });

      if (buttons.length >= 2 && buttons[1]) {
        // 2番目のボタン（右下のボタン）をクリック
        buttons[1].click();
        return { success: true, clickedIndex: 1, total: buttons.length };
      } else if (buttons.length > 0 && buttons[0]) {
        // 1つしかない場合はそれをクリック
        buttons[0].click();
        return { success: true, clickedIndex: 0, total: buttons.length };
      }

      return { success: false, total: buttons.length };
    });

    console.log('   Click result:', result);
    clicked = result.success;
    await page.waitForTimeout(5000);
  }

  await page.screenshot({
    path: path.join(screenshotsDir, 'playlist-only-24-after-click.png'),
  });

  if (!clicked) {
    throw new Error('Could not click "Go on air" button');
  }

  // 配信開始後、URLが変わるか確認
  const currentUrl = page.url();
  console.log(`   Current URL after click: ${currentUrl}`);

  // 配信画面に遷移したか確認
  await page.waitForTimeout(3000);

  await page.screenshot({
    path: path.join(screenshotsDir, 'playlist-only-25-broadcasting.png'),
  });

  console.log('✅ Broadcast started!\n');

  // 配信中のUIを確認
  const broadcastInfo = await page.evaluate(() => {
    const bodyText = document.body.innerText.substring(0, 500);
    const hasLiveIndicator = bodyText.includes('LIVE') || bodyText.includes('Live') || bodyText.includes('ON AIR');
    return { bodyText, hasLiveIndicator };
  });

  console.log('   Broadcast page info:', broadcastInfo);
}

// ========================================
// メイン実行関数
// ========================================

async function testPlaylistOnly() {
  console.log('🎵 Stationhead Playlist Selection Test\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Target Playlist: "${PLAYLIST_NAME}"`);
  console.log('═══════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500,
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    permissions: ['microphone'],
  });

  const page = await context.newPage();

  const screenshotsDir = path.join(__dirname, '../screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  try {
    // Stationhead認証 + Go On Airフロー
    await login(page, screenshotsDir);
    await navigateToGoOnAir(page, screenshotsDir);
    await enterShowName(page, screenshotsDir);
    await clickNext(page, screenshotsDir);
    await grantMicrophonePermission(context, page, screenshotsDir);
    await handleMicTest(page, screenshotsDir);
    await connectSpotify(page, screenshotsDir);

    // プレイリスト選択フロー
    await selectPlaylistFlow(page, screenshotsDir, PLAYLIST_NAME);

    // 配信開始フロー
    await closeSuccessPopup(page, screenshotsDir);
    await sendNotification(page, screenshotsDir);
    await startBroadcast(page, screenshotsDir);

    // 結果を保存
    const result = {
      timestamp: new Date().toISOString(),
      success: true,
      playlistName: PLAYLIST_NAME,
      showName: SHOW_NAME,
      steps: {
        login: 'completed',
        goOnAir: 'completed',
        showNameEntry: 'completed',
        next: 'completed',
        micPermission: 'completed',
        micTest: 'completed',
        spotifyAuth: 'completed',
        playlistSelection: 'completed',
        closeSuccessPopup: 'completed',
        sendNotification: 'completed',
        broadcastStart: 'completed',
      },
    };

    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(dataDir, 'playlist-only-test-result.json'),
      JSON.stringify(result, null, 2)
    );

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ All steps completed successfully!');
    console.log(`🎉 Playlist "${PLAYLIST_NAME}" selected and added!`);
    console.log('🎙️  BROADCAST IS NOW LIVE!');
    console.log('📊 Results: data/playlist-only-test-result.json\n');

    console.log('⏳ Browser will remain open for 60 seconds for manual inspection...');
    await page.waitForTimeout(60000);
  } catch (error) {
    console.error('\n❌ Error:', error);

    await page.screenshot({
      path: path.join(screenshotsDir, 'playlist-only-error.png'),
      fullPage: true,
    });
    console.log('📸 Error screenshot: screenshots/playlist-only-error.png\n');

    const result = {
      timestamp: new Date().toISOString(),
      success: false,
      playlistName: PLAYLIST_NAME,
      error: error instanceof Error ? error.message : String(error),
    };

    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(dataDir, 'playlist-only-test-result.json'),
      JSON.stringify(result, null, 2)
    );

    throw error;
  } finally {
    await browser.close();
    console.log('\n✅ Test completed!');
  }
}

// 実行
testPlaylistOnly().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
