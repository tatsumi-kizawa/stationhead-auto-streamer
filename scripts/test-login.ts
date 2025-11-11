import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// プロジェクトルートの.envファイルを明示的に読み込む
const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

/**
 * Stationheadへの実際のログインをテストするスクリプト
 *
 * 調査で判明したセレクタ:
 * - "Use email instead" ボタン: text="Use email instead"
 * - Email フィールド: input[placeholder="Email"]
 * - Password フィールド: input[placeholder="Password"]
 * - Log in ボタン: button:has-text("Log in")
 */
async function testLogin() {
  console.log('🔐 Starting Stationhead login test...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500,
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();

  const screenshotsDir = path.join(__dirname, '../screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  try {
    // 1. ログインページへアクセス
    console.log('📄 Navigating to login page...');
    await page.goto('https://www.stationhead.com/on/sign-in', {
      waitUntil: 'networkidle',
    });

    await page.screenshot({
      path: path.join(screenshotsDir, 'test-login-01-initial.png'),
    });
    console.log('✅ Initial page loaded\n');

    // 2. "Use email instead" をクリック
    console.log('🖱️  Clicking "Use email instead"...');
    await page.click('text="Use email instead"');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(screenshotsDir, 'test-login-02-email-form.png'),
    });
    console.log('✅ Email form displayed\n');

    // 3. Email を入力
    console.log('📧 Entering email...');
    const emailInput = page.locator('input[placeholder="Email"]');
    await emailInput.fill(process.env.STATIONHEAD_EMAIL || '');
    console.log(`   Email: ${process.env.STATIONHEAD_EMAIL}\n`);

    // 4. Password を入力
    console.log('🔑 Entering password...');
    const passwordInput = page.locator('input[placeholder="Password"]');
    await passwordInput.fill(process.env.STATIONHEAD_PASSWORD || '');
    console.log('   Password: ********\n');

    // 入力後、ボタンが有効化されるまで待つ
    console.log('⏳ Waiting for login button to be enabled...');
    await page.waitForTimeout(1000); // フォームバリデーションの完了を待つ

    await page.screenshot({
      path: path.join(screenshotsDir, 'test-login-03-credentials-filled.png'),
    });

    // 5. Log in ボタンをクリック（紫色の大きなボタンを確実にクリック）
    console.log('🚀 Clicking "Log in" button...');

    // クラス名は動的に変化するため、テキストベースのセレクタを使用
    // .last() で最後のボタン（紫色の大きいボタン）を取得
    // { force: true } で確実にクリック
    const loginButton = page.locator('button:has-text("Log in")').last();

    console.log('   Clicking purple login button...');
    await loginButton.click({ force: true });
    console.log('   ✅ Login button clicked');

    // ログイン処理の完了を待つ
    console.log('⏳ Waiting for login to complete...');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: path.join(screenshotsDir, 'test-login-04-after-login.png'),
      fullPage: true,
    });
    console.log('✅ Login completed\n');

    // 6. ログイン成功の確認
    console.log('🔍 Verifying login success...');
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);

    // ログイン後のページ構造を確認
    const pageInfo = await page.evaluate(() => {
      const title = document.title;
      const bodyText = document.body.innerText.substring(0, 200);
      const buttons = Array.from(document.querySelectorAll('button'))
        .map((btn) => btn.textContent?.trim())
        .filter((text) => text);

      return { title, bodyText, buttons: buttons.slice(0, 10) };
    });

    console.log(`   Page title: ${pageInfo.title}`);
    console.log(`   Visible buttons: ${pageInfo.buttons.join(', ')}\n`);

    // ログイン失敗のエラーメッセージがないか確認
    const errorElements = await page.locator('text=/error|invalid|incorrect/i').count();
    if (errorElements > 0) {
      console.log('❌ Login may have failed - error messages detected');
    } else {
      console.log('✅ No error messages detected - login likely successful\n');
    }

    // 7. ダッシュボードの要素を調査
    console.log('🎵 Analyzing dashboard elements...');
    const dashboardElements = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button')).map(
        (btn) => ({
          text: btn.textContent?.trim(),
          className: btn.className,
          ariaLabel: btn.getAttribute('aria-label'),
        })
      );

      const links = Array.from(document.querySelectorAll('a')).map((link) => ({
        text: link.textContent?.trim(),
        href: link.href,
      }));

      // Spotifyに関連する要素を探す
      const spotifyElements = [...buttons, ...links].filter((el) =>
        el.text?.toLowerCase().includes('spotify')
      );

      // 配信に関連する要素を探す
      const streamingElements = [...buttons, ...links].filter((el) => {
        const text = el.text?.toLowerCase() || '';
        return (
          text.includes('stream') ||
          text.includes('live') ||
          text.includes('start') ||
          text.includes('broadcast')
        );
      });

      return {
        totalButtons: buttons.length,
        totalLinks: links.length,
        spotifyElements,
        streamingElements,
      };
    });

    console.log(`   Total buttons: ${dashboardElements.totalButtons}`);
    console.log(`   Total links: ${dashboardElements.totalLinks}`);
    console.log(
      `   Spotify-related elements: ${dashboardElements.spotifyElements.length}`
    );
    console.log(
      `   Streaming-related elements: ${dashboardElements.streamingElements.length}\n`
    );

    if (dashboardElements.spotifyElements.length > 0) {
      console.log('🎧 Found Spotify elements:');
      dashboardElements.spotifyElements.forEach((el) =>
        console.log(`   - ${el.text}`)
      );
      console.log('');
    }

    if (dashboardElements.streamingElements.length > 0) {
      console.log('📡 Found streaming elements:');
      dashboardElements.streamingElements.forEach((el) =>
        console.log(`   - ${el.text}`)
      );
      console.log('');
    }

    // 結果を保存
    const result = {
      timestamp: new Date().toISOString(),
      loginSuccess: errorElements === 0,
      finalUrl: currentUrl,
      pageTitle: pageInfo.title,
      dashboardElements,
    };

    const dataDir = path.join(__dirname, '../data');
    fs.writeFileSync(
      path.join(dataDir, 'login-test-result.json'),
      JSON.stringify(result, null, 2)
    );
    console.log('✅ Test results saved to data/login-test-result.json\n');

    // セッション情報を確認
    console.log('🍪 Checking session/cookies...');
    const cookies = await context.cookies();
    console.log(`   Total cookies: ${cookies.length}`);

    const importantCookies = cookies.filter(
      (cookie) =>
        cookie.name.includes('session') ||
        cookie.name.includes('token') ||
        cookie.name.includes('auth')
    );

    console.log(`   Auth-related cookies: ${importantCookies.length}`);
    importantCookies.forEach((cookie) =>
      console.log(`   - ${cookie.name}: ${cookie.value.substring(0, 20)}...`)
    );
    console.log('');

    // セッション情報を保存（パスワードなどは含まない）
    const sessionData = {
      cookies: cookies.map((c) => ({
        name: c.name,
        domain: c.domain,
        path: c.path,
        expires: c.expires,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite,
      })),
    };

    fs.writeFileSync(
      path.join(dataDir, 'session-info.json'),
      JSON.stringify(sessionData, null, 2)
    );
    console.log('✅ Session info saved to data/session-info.json\n');

    // ユーザーに確認のため待機
    console.log('⏳ Keeping browser open for manual inspection (30 seconds)...');
    await page.waitForTimeout(30000);
  } catch (error) {
    console.error('❌ Error during login test:', error);

    await page.screenshot({
      path: path.join(screenshotsDir, 'test-login-error.png'),
      fullPage: true,
    });
    console.log('📸 Error screenshot saved\n');

    throw error;
  } finally {
    await browser.close();
    console.log('\n✅ Login test completed!');
  }
}

// 実行
testLogin().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
