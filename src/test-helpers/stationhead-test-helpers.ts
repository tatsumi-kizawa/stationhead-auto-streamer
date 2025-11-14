import { Page, BrowserContext } from 'playwright';
import * as path from 'path';

/**
 * Stationheadテスト用の共通ヘルパー関数
 */

export interface LoginOptions {
  email: string;
  password: string;
}

export interface ShowOptions {
  name: string;
}

/**
 * Stationheadにログイン
 */
export async function login(
  page: Page,
  options: LoginOptions,
  _screenshotsDir: string
): Promise<void> {
  console.log('\n🔐 Step 1: Logging in...');

  // ログイン済みかチェック（"Use email instead"ボタンが存在しない場合）
  const useEmailButton = page.locator('button:has-text("Use email instead")');
  const useEmailButtonCount = await useEmailButton.count();

  if (useEmailButtonCount === 0) {
    console.log('   ✅ Already logged in - skipping login process');
    return;
  }

  // "Use email instead"ボタンをクリック
  console.log('   Clicking "Use email instead"...');
  await useEmailButton.waitFor({ state: 'visible', timeout: 10000 });
  await useEmailButton.click({ force: true });
  await page.waitForTimeout(1000);

  // メールアドレスとパスワードを入力
  console.log('   Entering credentials...');
  await page.locator('input[type="email"]').fill(options.email);
  await page.locator('input[type="password"]').fill(options.password);
  await page.waitForTimeout(500);

  // Log inボタンをクリック
  console.log('   Clicking "Log in" button...');
  const loginButton = page.locator('button:has-text("Log in")').last();
  await loginButton.click({ force: true });
  await page.waitForTimeout(3000);

  console.log('✅ Login successful');
}

/**
 * Go on airページに遷移
 */
export async function navigateToGoOnAir(page: Page, _screenshotsDir: string): Promise<void> {
  console.log('\n🎙️  Step 2: Navigating to Go On Air page...');

  await page.goto('https://www.stationhead.com/on/go-on-air');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: path.join(_screenshotsDir, 'current-page.png'),
    fullPage: true,
  });

  console.log('✅ Go On Air page loaded');
}

/**
 * 番組名を入力
 */
export async function enterShowName(
  page: Page,
  options: ShowOptions,
  _screenshotsDir: string
): Promise<void> {
  console.log('\n📝 Step 3: Entering show name...');

  // プレースホルダーベースのセレクタで入力欄を探す
  const showNameInput = page.locator('input[placeholder*="name" i]').first();

  await showNameInput.waitFor({ state: 'visible', timeout: 10000 });
  console.log('   Found input with selector: input[placeholder*="name"]');

  await showNameInput.fill(options.name);
  console.log(`   Entering show name: "${options.name}"`);
  await page.waitForTimeout(1000);

  console.log('✅ Show name entered');
}

/**
 * Nextボタンをクリック
 */
export async function clickNext(page: Page, _screenshotsDir: string): Promise<void> {
  console.log('\n⏭️  Step 4: Clicking Next button...');

  const nextButton = page.locator('button:has-text("Next")').first();
  await nextButton.waitFor({ state: 'visible', timeout: 10000 });
  await nextButton.click({ force: true });
  await page.waitForTimeout(2000);

  console.log('✅ Next button clicked');
}

/**
 * マイク許可を付与
 */
export async function grantMicrophonePermission(context: BrowserContext): Promise<void> {
  console.log('\n🎤 Step 5: Handling microphone permission...');

  await context.grantPermissions(['microphone']);
  console.log('   Microphone permission granted');

  console.log('✅ Microphone permission handled');
}

/**
 * マイクテストページをハンドリング
 */
export async function handleMicTest(page: Page, _screenshotsDir: string): Promise<void> {
  console.log('\n🎙️  Step 6: Handling microphone test page...');

  await page.waitForTimeout(2000);

  // Nextボタンがあるかチェック
  const nextButton = page.locator('button:has-text("Next")');
  const nextCount = await nextButton.count();

  if (nextCount > 0) {
    console.log('   Microphone test page detected');
    console.log('   Clicking Next button...');
    await nextButton.first().click({ force: true });
    await page.waitForTimeout(2000);
  } else {
    console.log('   No microphone test page (already configured)');
  }

  console.log('✅ Microphone test completed');
}

/**
 * Spotifyパスワードを安全に入力
 * 特殊文字を含むパスワードでも正しく入力できるようにkeyboard APIを使用
 */
export async function enterSpotifyPassword(page: Page, password: string): Promise<void> {
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.waitFor({ state: 'visible', timeout: 10000 });

  console.log('   Found password field with selector: input[type="password"]');
  console.log('   Entering Spotify password...');
  console.log(`   Password length: ${password.length} characters`);

  // フィールドをクリックしてフォーカス
  await passwordInput.click();

  // keyboard.type()を使用して確実に特殊文字を入力
  await page.keyboard.type(password, { delay: 100 });

  // 値が正しく設定されたか確認
  const actualValue = await passwordInput.inputValue();
  console.log(`   Actual password length in field: ${actualValue.length} characters`);

  await page.waitForTimeout(1000);
}

/**
 * reCAPTCHAが表示されているかチェック
 * 複数のreCAPTCHAパターンを検出
 */
export async function detectReCaptcha(page: Page): Promise<boolean> {
  try {
    // reCAPTCHAの一般的なセレクタをチェック
    const recaptchaSelectors = [
      'iframe[src*="recaptcha"]',
      'iframe[title*="reCAPTCHA"]',
      '[class*="recaptcha"]',
      '#recaptcha',
      'div:has-text("I\'m not a robot")',
      'div:has-text("あなたは人間ですか")',
      'div:has-text("Verify you are human")',
    ];

    for (const selector of recaptchaSelectors) {
      const element = page.locator(selector).first();
      if ((await element.count()) > 0) {
        console.log(`   ⚠️  reCAPTCHA detected with selector: ${selector}`);
        return true;
      }
    }

    // iframe内のreCAPTCHAもチェック
    const frames = page.frames();
    for (const frame of frames) {
      const frameUrl = frame.url();
      if (frameUrl.includes('recaptcha') || frameUrl.includes('captcha')) {
        console.log(`   ⚠️  reCAPTCHA iframe detected: ${frameUrl}`);
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('   Error detecting reCAPTCHA:', error);
    return false;
  }
}

/**
 * reCAPTCHAの手動解決を待つ
 * ユーザーにreCAPTCHAを解決するように促し、Enterキー入力を待つ
 */
export async function waitForManualReCaptchaSolution(
  page: Page,
  screenshotsDir: string
): Promise<void> {
  console.log('\n🤖 reCAPTCHA detected!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚠️  MANUAL ACTION REQUIRED:');
  console.log('   1. Please solve the reCAPTCHA in the browser window');
  console.log('   2. Wait for the page to proceed');
  console.log('   3. Press ENTER in this terminal when complete');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // スクリーンショットを保存
  try {
    await page.screenshot({
      path: path.join(screenshotsDir, `recaptcha-detected-${Date.now()}.png`),
      fullPage: true,
    });
    console.log('📸 Screenshot saved for reference\n');
  } catch (error) {
    console.error('Failed to save screenshot:', error);
  }

  // Enterキー入力を待つ
  await new Promise<void>((resolve) => {
    const stdin = process.stdin;

    // TTY（ターミナル）でない場合は自動的に続行
    if (!stdin.isTTY) {
      console.log('⚠️  Not running in a TTY, automatically continuing after 10 seconds...');
      setTimeout(() => {
        console.log('✅ Continuing automation...\n');
        resolve();
      }, 10000);
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
        console.log('✅ Continuing automation...\n');
        resolve();
      }
    };

    stdin.on('data', onData);
  });

  // reCAPTCHAが解決されたか確認
  await page.waitForTimeout(2000);
  const stillHasRecaptcha = await detectReCaptcha(page);

  if (stillHasRecaptcha) {
    console.log('⚠️  reCAPTCHA still detected. Waiting a bit longer...');
    await page.waitForTimeout(3000);
  } else {
    console.log('✅ reCAPTCHA appears to be solved!\n');
  }
}
