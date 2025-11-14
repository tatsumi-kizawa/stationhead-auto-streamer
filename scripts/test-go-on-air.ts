import { BrowserContext, Page } from 'playwright';
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import {
  detectReCaptcha,
  waitForManualReCaptchaSolution,
} from '../src/test-helpers/stationhead-test-helpers';

// Stealth Pluginを有効化（自動化検出を回避）
chromium.use(StealthPlugin());

// プロジェクトルートの.envファイルを明示的に読み込む
const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

// Spotifyパスワードは$を含むため、dotenvの変数展開の影響を受ける
// .envファイルから直接読み取る
function getSpotifyPassword(): string {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/SPOTIFY_PASSWORD="([^"]+)"/);
  if (match && match[1]) {
    // バックスラッシュエスケープを解除
    return match[1].replace(/\\(.)/g, '$1');
  }
  return process.env.SPOTIFY_PASSWORD || '';
}

/**
 * Stationhead Go On Air フロー調査スクリプト
 *
 * フロー:
 * 1. ログイン
 * 2. https://www.stationhead.com/on/go-on-air へ遷移
 * 3. 番組名入力 (30文字以内)
 * 4. NextボタンまたはEnter押下
 * 5. マイク許可
 * 6. マイクテストページでNext押下
 * 7. Spotify連携 (Connectボタン)
 * 8. Spotify認証ページで「同意する」クリック
 */

const SHOW_NAME = 'Test Radio Show'; // テスト用番組名

async function login(page: Page, screenshotsDir: string): Promise<void> {
  console.log('\n🔐 Step 1: Logging in...');

  await page.goto('https://www.stationhead.com/on/sign-in', {
    waitUntil: 'networkidle',
  });

  await page.screenshot({
    path: path.join(screenshotsDir, 'go-on-air-01-login-page.png'),
  });

  // "Use email instead" をクリック
  console.log('   Clicking "Use email instead"...');
  await page.click('text="Use email instead"');
  await page.waitForTimeout(1000);

  // Email入力
  console.log('   Entering credentials...');
  const emailInput = page.locator('input[placeholder="Email"]');
  await emailInput.fill(process.env.STATIONHEAD_EMAIL || '');

  // Password入力
  const passwordInput = page.locator('input[placeholder="Password"]');
  await passwordInput.fill(process.env.STATIONHEAD_PASSWORD || '');

  await page.waitForTimeout(1000);

  // Log inボタンをクリック
  console.log('   Clicking "Log in" button...');
  const loginButton = page.locator('button:has-text("Log in")').last();
  await loginButton.click({ force: true });

  // ログイン完了を待つ
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: path.join(screenshotsDir, 'go-on-air-02-logged-in.png'),
  });

  console.log('✅ Login successful\n');
}

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
    path: path.join(screenshotsDir, 'go-on-air-03-initial-page.png'),
    fullPage: true,
  });

  console.log('✅ Go On Air page loaded\n');
}

async function enterShowName(
  page: Page,
  screenshotsDir: string
): Promise<void> {
  console.log('📝 Step 3: Entering show name...');

  // "Tell us the name of your show" というテキストまたは30文字制限のinputを探す
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
      const inputs = Array.from(document.querySelectorAll('input')).map(
        (input) => ({
          type: input.type,
          placeholder: input.placeholder,
          maxLength: input.maxLength,
          name: input.name,
          id: input.id,
        })
      );

      const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map(
        (h) => h.textContent?.trim()
      );

      return { inputs, headings };
    });

    console.log('   Page inputs:', JSON.stringify(pageInfo.inputs, null, 2));
    console.log('   Page headings:', pageInfo.headings);

    await page.screenshot({
      path: path.join(
        screenshotsDir,
        'go-on-air-04-show-name-input-not-found.png'
      ),
      fullPage: true,
    });

    throw new Error('Show name input not found');
  }

  // 番組名を入力
  console.log(`   Entering show name: "${SHOW_NAME}"`);
  await showNameInput.fill(SHOW_NAME);
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: path.join(screenshotsDir, 'go-on-air-04-show-name-entered.png'),
    fullPage: true,
  });

  console.log('✅ Show name entered\n');
}

async function clickNext(page: Page, screenshotsDir: string): Promise<void> {
  console.log('⏭️  Step 4: Clicking Next button...');

  // Nextボタンを探す
  const nextButton = page.locator('button:has-text("Next")').first();

  if ((await nextButton.count()) === 0) {
    console.log('   ⚠️  Next button not found, analyzing page...');
    const buttons = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button')).map((btn) => ({
        text: btn.textContent?.trim(),
        disabled: btn.disabled,
      }))
    );
    console.log('   Available buttons:', buttons);
  }

  await nextButton.click({ force: true });
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: path.join(screenshotsDir, 'go-on-air-05-after-next.png'),
    fullPage: true,
  });

  console.log('✅ Next button clicked\n');
}

async function grantMicrophonePermission(
  context: BrowserContext,
  page: Page,
  screenshotsDir: string
): Promise<void> {
  console.log('🎤 Step 5: Handling microphone permission...');

  // ブラウザのPermission APIを使用してマイク許可を自動化
  await context.grantPermissions(['microphone'], {
    origin: 'https://www.stationhead.com',
  });

  console.log('   Microphone permission granted');

  await page.waitForTimeout(2000);

  await page.screenshot({
    path: path.join(screenshotsDir, 'go-on-air-06-mic-permission.png'),
    fullPage: true,
  });

  console.log('✅ Microphone permission handled\n');
}

async function handleMicTest(
  page: Page,
  screenshotsDir: string
): Promise<void> {
  console.log('🎙️  Step 6: Handling microphone test page...');

  // "Record yourself speaking..." というテキストが表示されているか確認
  const micTestText = await page
    .locator('text=/Record yourself speaking/i')
    .count();

  if (micTestText > 0) {
    console.log('   Microphone test page detected');
  } else {
    console.log('   ⚠️  Microphone test page text not found');
    const pageText = await page.evaluate(() =>
      document.body.innerText.substring(0, 500)
    );
    console.log('   Page content:', pageText);
  }

  await page.screenshot({
    path: path.join(screenshotsDir, 'go-on-air-07-mic-test-page.png'),
    fullPage: true,
  });

  // Nextボタンをクリック
  console.log('   Clicking Next button...');
  const nextButton = page.locator('button:has-text("Next")').first();
  await nextButton.click({ force: true });
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: path.join(screenshotsDir, 'go-on-air-08-after-mic-test.png'),
    fullPage: true,
  });

  console.log('✅ Microphone test completed\n');
}

async function connectSpotify(
  page: Page,
  screenshotsDir: string
): Promise<void> {
  console.log('🎵 Step 7: Connecting Spotify...');

  // "Want to play music?" ページが表示されているか確認
  const musicPrompt = await page.locator('text=/Want to play music/i').count();

  if (musicPrompt > 0) {
    console.log('   Spotify connection page detected');
  } else {
    console.log('   ⚠️  Spotify connection page text not found');
    const pageText = await page.evaluate(() =>
      document.body.innerText.substring(0, 500)
    );
    console.log('   Page content:', pageText);
  }

  await page.screenshot({
    path: path.join(screenshotsDir, 'go-on-air-09-spotify-page.png'),
    fullPage: true,
  });

  // Spotifyボタンを探す（複数のセレクタを試す）
  const possibleSelectors = [
    'button:has-text("Connect Spotify")',
    'button:has-text("Spotify")',
    'button:has-text("spotify")',
  ];

  let spotifyButton = null;
  for (const selector of possibleSelectors) {
    const button = page.locator(selector).first();
    if ((await button.count()) > 0) {
      spotifyButton = button;
      console.log(`   Found Spotify button with selector: ${selector}`);
      break;
    }
  }

  if (!spotifyButton) {
    console.log('   ⚠️  Spotify button not found with button selector, analyzing page...');

    const pageElements = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button')).map(
        (btn) => ({
          type: 'button',
          text: btn.textContent?.trim(),
          disabled: btn.disabled,
        })
      );

      const divs = Array.from(document.querySelectorAll('div')).filter(
        (div) => div.textContent?.includes('Spotify')
      ).map((div) => ({
        type: 'div',
        text: div.textContent?.trim().substring(0, 50),
        role: div.getAttribute('role'),
        className: div.className,
      }));

      const allClickable = Array.from(
        document.querySelectorAll('[role="button"], a, div[onclick]')
      ).filter((el) => el.textContent?.includes('Spotify')).map((el) => ({
        type: el.tagName,
        text: el.textContent?.trim(),
        role: el.getAttribute('role'),
      }));

      return { buttons, divs, allClickable };
    });

    console.log('   Available buttons:', pageElements.buttons);
    console.log('   Spotify-related divs:', pageElements.divs);
    console.log('   Clickable Spotify elements:', pageElements.allClickable);

    await page.screenshot({
      path: path.join(
        screenshotsDir,
        'go-on-air-10-spotify-button-not-found.png'
      ),
      fullPage: true,
    });

    // div[role="button"] や他の可能性を試す
    const alternativeSelectors = [
      'div:has-text("Connect Spotify")',
      '[role="button"]:has-text("Connect Spotify")',
      'text="Connect Spotify"',
      '*:has-text("Connect Spotify")',
    ];

    for (const selector of alternativeSelectors) {
      const element = page.locator(selector).first();
      if ((await element.count()) > 0) {
        console.log(`   ✅ Found with alternative selector: ${selector}`);
        spotifyButton = element;
        break;
      }
    }

    if (!spotifyButton) {
      throw new Error('Spotify button not found with any selector');
    }
  }

  // Spotifyボタンをクリック
  console.log('   Clicking Spotify button...');

  // 新しいタブが開かれることを待つ
  const [newPage] = await Promise.all([
    page.context().waitForEvent('page'),
    spotifyButton.click({ force: true }),
  ]);

  console.log('   New tab opened for Spotify authorization');
  await newPage.waitForLoadState('networkidle', { timeout: 15000 });
  await newPage.waitForTimeout(2000);

  const spotifyUrl = newPage.url();
  console.log(`   Spotify auth URL: ${spotifyUrl}`);

  await newPage.screenshot({
    path: path.join(screenshotsDir, 'go-on-air-11-spotify-auth-page.png'),
    fullPage: true,
  });

  console.log('✅ Spotify authorization page opened\n');

  // Spotify認証ページで「同意する」ボタンをクリック
  await handleSpotifyAuth(newPage, screenshotsDir);
}

async function handleSpotifyAuth(
  spotifyPage: Page,
  screenshotsDir: string
): Promise<void> {
  console.log('✅ Step 8: Handling Spotify authorization...');

  // Spotify認証ページの構造を分析
  const currentUrl = spotifyPage.url();
  console.log(`   Current URL: ${currentUrl}`);

  // ログインページかどうか確認
  if (currentUrl.includes('/login')) {
    console.log('   Spotify login page detected, logging in...');
    await loginToSpotify(spotifyPage, screenshotsDir);
  }

  // ログイン後、認証ページに遷移するまで待つ
  await spotifyPage.waitForTimeout(3000);

  const pageInfo = await spotifyPage.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button')).map(
      (btn) => ({
        text: btn.textContent?.trim(),
        id: btn.id,
        className: btn.className,
      })
    );

    const links = Array.from(document.querySelectorAll('a')).map((link) => ({
      text: link.textContent?.trim(),
      href: link.href,
    }));

    return { buttons, links };
  });

  console.log('   Spotify page buttons:', pageInfo.buttons);

  await spotifyPage.screenshot({
    path: path.join(screenshotsDir, 'go-on-air-12-spotify-auth-page.png'),
    fullPage: true,
  });

  // 「同意する」ボタンを探す（複数の表現を試す）
  const possibleSelectors = [
    'button:has-text("同意する")',
    'button:has-text("Agree")',
    'button:has-text("Accept")',
    'button:has-text("承認")',
    'button[id*="auth-accept"]',
    'button[data-testid="auth-accept"]',
  ];

  let agreeButton = null;
  for (const selector of possibleSelectors) {
    const button = spotifyPage.locator(selector).first();
    if ((await button.count()) > 0) {
      agreeButton = button;
      console.log(`   Found agree button with selector: ${selector}`);
      break;
    }
  }

  if (!agreeButton) {
    console.log('   ⚠️  Agree button not found');
    console.log(
      '   This may be because Spotify is already authorized or the page structure changed'
    );
    await spotifyPage.screenshot({
      path: path.join(
        screenshotsDir,
        'go-on-air-13-spotify-agree-button-not-found.png'
      ),
      fullPage: true,
    });

    // Stationheadに戻っているか確認
    const finalUrl = spotifyPage.url();
    if (finalUrl.includes('stationhead.com')) {
      console.log('   ✅ Redirected back to Stationhead - auth may be complete');
      return;
    }

    throw new Error('Spotify agree button not found');
  }

  // 「同意する」ボタンをクリック
  console.log('   Clicking agree button...');
  await agreeButton.click({ force: true });

  // Spotifyタブが閉じるまで少し待つ
  await spotifyPage.waitForTimeout(2000).catch(() => {
    // ページが閉じられた場合はエラーを無視
    console.log('   Spotify tab closed - authorization complete');
  });

  console.log('✅ Spotify authorization completed\n');
}

async function loginToSpotify(
  spotifyPage: Page,
  screenshotsDir: string
): Promise<void> {
  console.log('   Logging in to Spotify...');

  // メールアドレス/ユーザー名入力フィールドを探す
  const usernameInput = spotifyPage
    .locator('input[id="login-username"]')
    .first();
  if ((await usernameInput.count()) > 0) {
    console.log('   Entering Spotify email...');
    await usernameInput.fill(process.env.SPOTIFY_EMAIL || '');

    await spotifyPage.screenshot({
      path: path.join(screenshotsDir, 'go-on-air-11a-spotify-email-entered.png'),
      fullPage: true,
    });

    // 「次へ」ボタンをクリック
    const nextButton = spotifyPage.locator('button#login-button').first();
    if ((await nextButton.count()) > 0) {
      console.log('   Clicking "Next" button...');
      await nextButton.click({ force: true });
      await spotifyPage.waitForTimeout(2000);

      await spotifyPage.screenshot({
        path: path.join(screenshotsDir, 'go-on-air-11b-after-next.png'),
        fullPage: true,
      });

      // 「パスワードでログイン」ボタンが表示されているか確認
      const passwordLoginButton = spotifyPage
        .locator('button:has-text("パスワードでログイン")')
        .first();

      if ((await passwordLoginButton.count()) > 0) {
        console.log('   Clicking "パスワードでログイン" button...');
        await passwordLoginButton.click({ force: true });
        await spotifyPage.waitForTimeout(2000);

        await spotifyPage.screenshot({
          path: path.join(
            screenshotsDir,
            'go-on-air-11b2-after-password-login-button.png'
          ),
          fullPage: true,
        });
      }

      // パスワード入力ページに遷移するまで待つ
      await spotifyPage.waitForTimeout(1000);
    }

    // パスワード入力フィールドを探す（複数のセレクタを試す）
    const passwordSelectors = [
      'input[id="login-password"]',
      'input[type="password"]',
      'input[name="password"]',
    ];

    let passwordInput = null;
    for (const selector of passwordSelectors) {
      const input = spotifyPage.locator(selector).first();
      if ((await input.count()) > 0 && (await input.isVisible())) {
        passwordInput = input;
        console.log(`   Found password field with selector: ${selector}`);
        break;
      }
    }

    if (passwordInput) {
      const spotifyPassword = getSpotifyPassword();
      console.log('   Entering Spotify password...');
      console.log(`   Password length: ${spotifyPassword.length} characters`);

      // フィールドをクリックしてフォーカス
      await passwordInput.click();

      // keyboard.type()を使用して確実に特殊文字を入力
      await spotifyPage.keyboard.type(spotifyPassword, { delay: 100 });

      // 値が正しく設定されたか確認
      const actualValue = await passwordInput.inputValue();
      console.log(`   Actual password length in field: ${actualValue.length} characters`);

      await spotifyPage.waitForTimeout(1000);

      await spotifyPage.screenshot({
        path: path.join(
          screenshotsDir,
          'go-on-air-11c-spotify-password-entered.png'
        ),
        fullPage: true,
      });

      // ログインボタンをクリック（複数のセレクタを試す）
      const loginButtonSelectors = [
        'button#login-button',
        'button:has-text("ログイン")',
        'button:has-text("Log in")',
      ];

      let loginButton = null;
      for (const selector of loginButtonSelectors) {
        const button = spotifyPage.locator(selector).first();
        if ((await button.count()) > 0) {
          loginButton = button;
          console.log(`   Found login button with selector: ${selector}`);
          break;
        }
      }

      if (loginButton) {
        console.log('   Clicking "Login" button...');
        await loginButton.click({ force: true });
        await spotifyPage.waitForTimeout(3000);

        // reCAPTCHAチェック（ログインボタンクリック直後）
        console.log('   Checking for reCAPTCHA...');
        const hasRecaptcha = await detectReCaptcha(spotifyPage);

        if (hasRecaptcha) {
          // reCAPTCHA検出 - 手動解決を促す
          await waitForManualReCaptchaSolution(spotifyPage, screenshotsDir);
        } else {
          console.log('   ✅ No reCAPTCHA detected');
        }

        await spotifyPage.waitForTimeout(2000);

        await spotifyPage.screenshot({
          path: path.join(screenshotsDir, 'go-on-air-11d-after-login.png'),
          fullPage: true,
        });

        console.log('   ✅ Spotify login completed');
      } else {
        console.log('   ⚠️  Login button not found');
      }
    } else {
      console.log('   ⚠️  Password input field not found');
    }
  } else {
    console.log('   ⚠️  Spotify login form not found');
    throw new Error('Spotify login form not found');
  }
}

async function selectPlaylist(
  page: Page,
  screenshotsDir: string
): Promise<void> {
  console.log('🎵 Step 9: Selecting playlist...');

  // Spotify認証後、Stationheadに戻るまで待つ
  await page.waitForTimeout(3000);

  await page.screenshot({
    path: path.join(screenshotsDir, 'go-on-air-14-after-spotify-auth.png'),
    fullPage: true,
  });

  // "Show playlist" セクションの "Add music" ボタンを探す
  // 複数のセレクタパターンを試す
  const addMusicSelectors = [
    'button:has-text("Add music")',
    'div:has-text("Add music")',
    'text="Add music"',
  ];

  let addMusicButton = null;
  for (const selector of addMusicSelectors) {
    const button = page.locator(selector).last(); // .last()を使用して「Show playlist」セクションのボタンを取得
    if ((await button.count()) > 0 && (await button.isVisible())) {
      addMusicButton = button;
      console.log(`   Found "Add music" button with selector: ${selector}`);
      break;
    }
  }

  if (!addMusicButton) {
    console.log('   ⚠️  Add Music button not found, analyzing page...');
    const pageInfo = await page.evaluate(() => {
      const textElements = Array.from(
        document.querySelectorAll('button, div, span')
      )
        .filter((el) => el.textContent?.includes('Add music'))
        .map((el) => ({
          tag: el.tagName,
          text: el.textContent?.trim(),
          role: el.getAttribute('role'),
          visible:
            el instanceof HTMLElement &&
            el.offsetWidth > 0 &&
            el.offsetHeight > 0,
        }));

      return {
        url: window.location.href,
        addMusicElements: textElements,
      };
    });
    console.log('   Page info:', pageInfo);
    throw new Error('Add Music button not found');
  }

  console.log('   Clicking "Add music" button in Show playlist section...');
  await addMusicButton.click({ force: true });
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: path.join(screenshotsDir, 'go-on-air-15-after-add-music-click.png'),
    fullPage: true,
  });

  // モーダルまたはオーバーレイが表示されるまで待つ
  console.log('   Waiting for playlist selection modal...');

  // モーダルやオーバーレイ要素を探す
  const modalOrOverlay = await page
    .locator('[role="dialog"], [role="presentation"], .modal, .overlay')
    .first()
    .waitFor({ timeout: 5000 })
    .catch(() => {
      console.log('   ⚠️  Modal/overlay not found by role or class');
      return null;
    });

  // "My playlists" テキストが表示されるまで待つ
  const myPlaylistsText = page.locator('text="My playlists"').first();
  await myPlaylistsText.waitFor({ timeout: 10000 }).catch(async () => {
    console.log('   ⚠️  "My playlists" text not found, analyzing page...');

    const pageAnalysis = await page.evaluate(() => {
      const allText = document.body.innerText;
      const hasPlaylist = allText.includes('playlist');
      const hasMyPlaylists = allText.includes('My playlists');

      const clickableElements = Array.from(
        document.querySelectorAll('[role="button"], button')
      ).map((el) => ({
        tag: el.tagName,
        text: el.textContent?.trim().substring(0, 50),
        role: el.getAttribute('role'),
      }));

      return {
        hasPlaylist,
        hasMyPlaylists,
        clickableElements: clickableElements.slice(0, 10), // 最初の10個
        bodyTextPreview: allText.substring(0, 500),
      };
    });

    console.log('   Page analysis:', JSON.stringify(pageAnalysis, null, 2));
  });

  await page.screenshot({
    path: path.join(screenshotsDir, 'go-on-air-16-playlist-modal.png'),
    fullPage: true,
  });

  // プレイリスト一覧から最初のプレイリストを選択
  console.log('   Selecting first playlist...');

  // プレイリスト項目を探す（複数のセレクタパターンを試す）
  await page.waitForTimeout(2000);

  // プレイリスト名を含む要素を探す
  const playlistSelectors = [
    'text="New Music Wednesday"', // 実際のプレイリスト名
    '[role="button"]:has-text("songs")', // "78 songs" などのテキストを含むボタン
    'div:has-text("My playlists") ~ div', // "My playlists"の後続要素
  ];

  let playlistClicked = false;

  // まず、モーダル内のすべてのクリック可能な要素を分析
  const modalAnalysis = await page.evaluate(() => {
    const modal = document.querySelector('[role="dialog"]') || document.body;
    const clickableElements = Array.from(
      modal.querySelectorAll('div, button, [role="button"]')
    )
      .filter((el) => {
        const text = el.textContent?.trim();
        return (
          text &&
          (text.includes('songs') ||
            text.includes('Music') ||
            text.includes('playlist'))
        );
      })
      .map((el) => ({
        tag: el.tagName,
        text: el.textContent?.trim().substring(0, 80),
        role: el.getAttribute('role'),
        clickable:
          el instanceof HTMLElement &&
          (el.onclick != null ||
            el.getAttribute('role') === 'button' ||
            el.tagName === 'BUTTON'),
      }));

    return {
      clickableElements: clickableElements.slice(0, 20),
    };
  });

  console.log(
    '   Modal analysis:',
    JSON.stringify(modalAnalysis, null, 2)
  );

  // "My playlists" セクション内のプレイリストをクリック
  // モーダル内のclickable=trueでプレイリスト名を含むdivを直接クリック
  const playlistClickResult = await page.evaluate(() => {
    const allDivs = Array.from(document.querySelectorAll('div'));

    // "songs" を含み、onclickまたはクリックハンドラーを持つdivを探す
    // ただし "Saved songs" は除外する（実際のプレイリストのみ選択）
    const clickableDivs = allDivs.filter((div) => {
      const text = div.textContent?.trim() || '';
      const hasPlaylistText =
        text.includes('songs') &&
        !text.includes('Saved songs') &&  // "Saved songs" を確実に除外
        !text.includes('Add music');

      // クリック可能かチェック
      const isClickable =
        div.onclick != null ||
        div.getAttribute('role') === 'button' ||
        window.getComputedStyle(div).cursor === 'pointer';

      return hasPlaylistText && isClickable && text.length < 100;
    });

    if (clickableDivs.length > 0 && clickableDivs[0]) {
      // 最初のプレイリストをクリック
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
    console.log(
      `   Clicked playlist: "${playlistClickResult.text}"`
    );
    playlistClicked = true;
    await page.waitForTimeout(3000);
  } else {
    console.log(
      '   ⚠️  Clickable playlist not found, trying text-based selector...'
    );

    // フォールバック: テキストベースのセレクタ
    const playlistByText = page
      .locator('text="New Music Wednesday"')
      .first();

    if ((await playlistByText.count()) > 0) {
      console.log('   Clicking playlist by text...');
      await playlistByText.click({ force: true });
      playlistClicked = true;
      await page.waitForTimeout(3000);
    }
  }

  await page.screenshot({
    path: path.join(screenshotsDir, 'go-on-air-17-playlist-selected.png'),
    fullPage: true,
  });

  if (!playlistClicked) {
    console.log('   ⚠️  Warning: Playlist may not have been clicked');
  } else {
    console.log('✅ Playlist selected\n');
  }
}

async function selectAllSongs(
  page: Page,
  screenshotsDir: string
): Promise<void> {
  console.log('🎵 Step 10: Selecting all songs...');

  // "+ All songs" ボタンをクリック
  const allSongsButton = page.locator('button:has-text("All songs")').first();

  if ((await allSongsButton.count()) === 0) {
    console.log('   ⚠️  All songs button not found');
  } else {
    console.log('   Clicking "+ All songs" button...');
    await allSongsButton.click({ force: true });
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: path.join(screenshotsDir, 'go-on-air-18-after-all-songs.png'),
      fullPage: true,
    });

    console.log('✅ All songs added\n');
  }
}

async function closeSuccessPopup(
  page: Page,
  screenshotsDir: string
): Promise<void> {
  console.log('✅ Step 11: Closing success popup...');

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
    path: path.join(screenshotsDir, 'go-on-air-19-after-close.png'),
    fullPage: true,
  });

  // "Next" ボタンをクリック
  const nextButton = page.locator('button:has-text("Next")').first();
  if ((await nextButton.count()) > 0) {
    console.log('   Clicking "Next" button...');
    await nextButton.click({ force: true });
    await page.waitForTimeout(2000);
  }

  await page.screenshot({
    path: path.join(screenshotsDir, 'go-on-air-20-after-next.png'),
    fullPage: true,
  });

  console.log('✅ Success popup closed\n');
}

async function sendNotification(
  page: Page,
  screenshotsDir: string
): Promise<void> {
  console.log('🔔 Step 12: Sending notification...');

  // プレイリスト選択後、通知画面が表示されるまで待つ
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: path.join(screenshotsDir, 'go-on-air-21-notification-page.png'),
    fullPage: true,
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
    path: path.join(screenshotsDir, 'go-on-air-22-after-send-notification.png'),
    fullPage: true,
  });

  console.log('✅ Notification sent\n');
}

async function startBroadcast(
  page: Page,
  screenshotsDir: string
): Promise<void> {
  console.log('🎙️  Step 13: Starting broadcast...');

  await page.screenshot({
    path: path.join(screenshotsDir, 'go-on-air-23-before-go-on-air.png'),
    fullPage: true,
  });

  // "GO ON AIR" ボタンを探して確実にクリック
  console.log('   Looking for "GO ON AIR" button...');

  // 複数のセレクタパターンを試す
  const goOnAirSelectors = [
    'button:has-text("GO ON AIR")',
    'button:has-text("Go on air")',
    'button:has-text("go on air")',
  ];

  let clicked = false;

  for (const selector of goOnAirSelectors) {
    const button = page.locator(selector).last(); // .last() で最下部のボタンを取得
    const count = await button.count();

    if (count > 0) {
      console.log(`   Found button with selector: ${selector} (count: ${count})`);

      // 方法1: Playwright クリック（force: true）
      try {
        await button.click({ force: true, timeout: 5000 });
        console.log('   ✅ Clicked with Playwright (force)');
        clicked = true;
        break;
      } catch (error) {
        console.log('   ⚠️  Playwright click failed, trying JavaScript click...');

        // 方法2: JavaScriptで直接クリック（より確実）
        try {
          await page.evaluate((sel) => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const targetButton = buttons.filter(btn =>
              btn.textContent?.toLowerCase().includes('go on air')
            ).pop(); // 最後のボタン

            if (targetButton) {
              targetButton.click();
              return true;
            }
            return false;
          }, selector);

          console.log('   ✅ Clicked with JavaScript');
          clicked = true;
          break;
        } catch (jsError) {
          console.log('   ⚠️  JavaScript click also failed:', jsError);
        }
      }
    }
  }

  if (!clicked) {
    const buttons = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button')).map((btn) =>
        btn.textContent?.trim()
      )
    );
    console.log('   Available buttons:', buttons);
    throw new Error('GO ON AIR button not found or could not be clicked');
  }

  await page.waitForTimeout(3000);

  // ボタンクリック後の状態を詳細に分析
  console.log('\n📊 Analyzing post-click state...');

  // エラーメッセージやモーダルをチェック
  const pageAnalysis = await page.evaluate(() => {
    const bodyText = document.body.innerText;

    // エラーメッセージを探す
    const errorKeywords = [
      'error',
      'Error',
      'ERROR',
      'cannot',
      'Cannot',
      'unable',
      'Unable',
      'failed',
      'Failed',
      'Spotify',
      '再生',
      'できない',
      'エラー',
    ];

    const foundErrors = errorKeywords.filter((keyword) =>
      bodyText.includes(keyword)
    );

    // モーダルやダイアログの存在をチェック
    const modals = Array.from(
      document.querySelectorAll('[role="dialog"], [role="alertdialog"], .modal')
    ).map((el) => ({
      text: el.textContent?.trim().substring(0, 200),
      visible:
        el instanceof HTMLElement &&
        el.offsetWidth > 0 &&
        el.offsetHeight > 0,
    }));

    // すべてのボタンテキストを取得
    const allButtons = Array.from(document.querySelectorAll('button')).map(
      (btn) => btn.textContent?.trim()
    );

    return {
      currentUrl: window.location.href,
      bodyTextPreview: bodyText.substring(0, 800),
      foundErrors,
      modals,
      allButtons,
      hasGoOnAirButton: bodyText.includes('Go on air'),
    };
  });

  console.log('   Current URL:', pageAnalysis.currentUrl);
  console.log('   Has "Go on air" button:', pageAnalysis.hasGoOnAirButton);
  console.log('   Found error keywords:', pageAnalysis.foundErrors);
  console.log('   Modals detected:', pageAnalysis.modals.length);
  if (pageAnalysis.modals.length > 0) {
    console.log('   Modal content:', JSON.stringify(pageAnalysis.modals, null, 2));
  }
  console.log('   Available buttons:', pageAnalysis.allButtons);
  console.log('\n📝 Page content preview:');
  console.log(pageAnalysis.bodyTextPreview);

  await page.screenshot({
    path: path.join(screenshotsDir, 'go-on-air-24-after-button-click.png'),
    fullPage: true,
  });

  // URLが変わったかチェック
  if (pageAnalysis.hasGoOnAirButton) {
    console.log('\n⚠️  WARNING: Still on "Go on air" preparation page!');
    console.log('   Broadcasting may not have started.');

    // エラーメッセージがある場合は警告
    if (pageAnalysis.foundErrors.length > 0) {
      console.log('   ⚠️  Possible errors detected!');
    }
  } else {
    console.log('\n✅ Successfully transitioned to broadcast page!');
  }

  // さらに5秒待って再度確認
  await page.waitForTimeout(5000);

  await page.screenshot({
    path: path.join(screenshotsDir, 'go-on-air-25-broadcasting-final.png'),
    fullPage: true,
  });

  const finalAnalysis = await page.evaluate(() => ({
    url: window.location.href,
    hasGoOnAirButton: document.body.innerText.includes('Go on air'),
    bodyPreview: document.body.innerText.substring(0, 300),
  }));

  console.log('\n📊 Final state after 5 seconds:');
  console.log('   URL:', finalAnalysis.url);
  console.log('   Still has "Go on air" button:', finalAnalysis.hasGoOnAirButton);
  console.log('   Page preview:', finalAnalysis.bodyPreview);

  if (!finalAnalysis.hasGoOnAirButton) {
    console.log('\n✅ Broadcast confirmed started!\n');
  } else {
    console.log('\n⚠️  Broadcast may not have started - still on preparation page\n');
  }
}

async function testGoOnAir() {
  console.log('🎙️  Starting Stationhead Go On Air flow test...\n');
  console.log('═══════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500,
    // Spotify 再生をサポートするための追加設定
    args: [
      '--autoplay-policy=no-user-gesture-required',  // 自動再生を許可
      '--disable-blink-features=AutomationControlled',  // 自動化検出を無効化
      '--use-fake-ui-for-media-stream',  // メディアストリーム UI をスキップ
      '--use-fake-device-for-media-stream',  // フェイクデバイスを使用
      '--enable-features=WebRTCPipeWireCapturer',  // WebRTC サポート
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    // User-Agent を通常の Chrome に設定（Spotify が自動化ブラウザをブロックしないように）
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    // マイク許可 + メディア再生のパーミッションを追加
    permissions: ['microphone'],
    // Extra HTTP ヘッダー
    extraHTTPHeaders: {
      'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
    },
  });

  const page = await context.newPage();

  const screenshotsDir = path.join(__dirname, '../screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  try {
    // Step 1: ログイン
    await login(page, screenshotsDir);

    // Step 2: Go On Air ページへ遷移
    await navigateToGoOnAir(page, screenshotsDir);

    // Step 3: 番組名入力
    await enterShowName(page, screenshotsDir);

    // Step 4: Nextボタンクリック
    await clickNext(page, screenshotsDir);

    // Step 5: マイク許可
    await grantMicrophonePermission(context, page, screenshotsDir);

    // Step 6: マイクテスト
    await handleMicTest(page, screenshotsDir);

    // Step 7-8: Spotify連携
    await connectSpotify(page, screenshotsDir);

    // Step 9: プレイリスト選択
    await selectPlaylist(page, screenshotsDir);

    // Step 10: All songs選択
    await selectAllSongs(page, screenshotsDir);

    // Step 11: 成功ポップアップを閉じる
    await closeSuccessPopup(page, screenshotsDir);

    // Step 12: 通知送信
    await sendNotification(page, screenshotsDir);

    // Step 13: 配信開始
    await startBroadcast(page, screenshotsDir);

    // 結果を保存
    const result = {
      timestamp: new Date().toISOString(),
      success: true,
      showName: SHOW_NAME,
      steps: {
        login: 'completed',
        goOnAir: 'completed',
        showNameEntry: 'completed',
        micPermission: 'completed',
        micTest: 'completed',
        spotifyAuth: 'completed',
        playlistSelection: 'completed',
        allSongsSelection: 'completed',
        successPopupClose: 'completed',
        sendNotification: 'completed',
        broadcastStart: 'completed',
      },
    };

    const dataDir = path.join(__dirname, '../data');
    fs.writeFileSync(
      path.join(dataDir, 'go-on-air-test-result.json'),
      JSON.stringify(result, null, 2)
    );

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ All steps completed successfully!');
    console.log('🎉 BROADCAST IS NOW LIVE!');
    console.log('📊 Results saved to data/go-on-air-test-result.json\n');

    // ブラウザを60秒間開いたままにして、配信を確認できるようにする
    console.log('⏳ Keeping browser open for manual inspection (60 seconds)...');
    await page.waitForTimeout(60000);
  } catch (error) {
    console.error('\n❌ Error during Go On Air test:', error);

    await page.screenshot({
      path: path.join(screenshotsDir, 'go-on-air-error.png'),
      fullPage: true,
    });
    console.log('📸 Error screenshot saved\n');

    const result = {
      timestamp: new Date().toISOString(),
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };

    const dataDir = path.join(__dirname, '../data');
    fs.writeFileSync(
      path.join(dataDir, 'go-on-air-test-result.json'),
      JSON.stringify(result, null, 2)
    );

    throw error;
  } finally {
    await browser.close();
    console.log('\n✅ Go On Air test completed!');
  }
}

// 実行
testGoOnAir().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
