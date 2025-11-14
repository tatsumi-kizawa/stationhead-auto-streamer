import { chromium } from 'playwright-extra';
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
    // Spotify 再生をサポートするための追加設定
    args: [
      '--autoplay-policy=no-user-gesture-required', // 自動再生を許可
      '--disable-blink-features=AutomationControlled', // 自動化検出を無効化
      '--use-fake-ui-for-media-stream', // メディアストリーム UI をスキップ
      '--use-fake-device-for-media-stream', // フェイクデバイスを使用
      '--enable-features=WebRTCPipeWireCapturer', // WebRTC サポート
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

      // Spotify連携状態を確認（"Add music"ボタンの有無）
      const addMusicButton = page.locator('button:has-text("Add music")');
      const hasAddMusic = (await addMusicButton.count()) > 0;

      if (hasAddMusic) {
        console.log('   ✅ Spotify連携済み（Add musicボタン確認）');
        console.log('   ✅ セッション永続性テスト成功\n');
      } else {
        console.log('   ⚠️  Spotify未連携の可能性（Add musicボタンなし）');
        console.log('   手動でSpotify連携を完了してください...\n');
      }

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
