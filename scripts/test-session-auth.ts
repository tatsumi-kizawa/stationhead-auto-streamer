import { chromium } from 'playwright';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { StationheadAuth } from '../src/browser/auth';

// プロジェクトルートの.envファイルを明示的に読み込む
const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

/**
 * セッション永続化機能のテストスクリプト
 *
 * 実行方法:
 * 1回目: 新規ログイン + セッション保存
 * 2回目以降: 保存されたセッションを使用（ログイン不要）
 */
async function testSessionAuth() {
  console.log('🧪 Testing session persistence with StationheadAuth\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500,
  });

  try {
    // StationheadAuth インスタンスを作成
    const auth = new StationheadAuth(
      browser,
      process.env.STATIONHEAD_EMAIL || '',
      process.env.STATIONHEAD_PASSWORD || ''
    );

    // セッション情報を確認
    const sessionInfo = auth.getSessionInfo();
    if (sessionInfo) {
      console.log('📂 Existing session found:');
      console.log(JSON.stringify(sessionInfo, null, 2));
      console.log('');
    } else {
      console.log('ℹ️  No existing session, will perform fresh login\n');
    }

    // ログイン実行（セッションがあれば再利用、なければ新規ログイン）
    const context = await auth.login();

    // ログイン後の動作確認
    const page = await context.newPage();
    await page.goto('https://www.stationhead.com', {
      waitUntil: 'networkidle',
    });

    console.log('🔍 Analyzing logged-in page...');

    const pageInfo = await page.evaluate(() => {
      const title = document.title;
      const bodyText = document.body.innerText.substring(0, 200);
      const buttons = Array.from(document.querySelectorAll('button'))
        .map((btn) => btn.textContent?.trim())
        .filter((text) => text);

      return {
        title,
        bodyText,
        buttons: buttons.slice(0, 10),
      };
    });

    console.log(`   Page title: ${pageInfo.title}`);
    console.log(`   Visible buttons: ${pageInfo.buttons.join(', ')}\n`);

    // Spotify連携や配信関連の要素を探す
    const dashboardElements = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button')).map(
        (btn) => ({
          text: btn.textContent?.trim(),
          ariaLabel: btn.getAttribute('aria-label'),
        })
      );

      const links = Array.from(document.querySelectorAll('a')).map((link) => ({
        text: link.textContent?.trim(),
        href: link.href,
      }));

      // Spotifyに関連する要素
      const spotifyElements = [...buttons, ...links].filter((el) =>
        el.text?.toLowerCase().includes('spotify')
      );

      // 配信に関連する要素
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

    console.log('🎵 Dashboard elements:');
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

    // スクリーンショット保存
    const screenshotsDir = path.join(__dirname, '../screenshots');
    await page.screenshot({
      path: path.join(screenshotsDir, `session-test-${Date.now()}.png`),
      fullPage: true,
    });
    console.log('📸 Screenshot saved\n');

    // セッション情報を再度確認
    const updatedSessionInfo = auth.getSessionInfo();
    console.log('📂 Current session info:');
    console.log(JSON.stringify(updatedSessionInfo, null, 2));
    console.log('');

    console.log('✅ Session authentication test completed successfully!');
    console.log('💡 Run this script again to test session restoration\n');

    // ユーザーが確認できるように30秒待機
    console.log('⏳ Keeping browser open for 30 seconds...');
    await page.waitForTimeout(30000);

    await page.close();
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await browser.close();
    console.log('\n✅ Browser closed');
  }
}

// 実行
testSessionAuth().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
