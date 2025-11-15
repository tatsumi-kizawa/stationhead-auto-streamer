import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Chrome DevTools MCP自動化のためのChrome起動スクリプト
 *
 * このスクリプトは：
 * 1. システムのChromeをデバッグポート有効で起動
 * 2. .chrome-profile/を使用してセッション永続化
 * 3. Claude Codeからのスラッシュコマンド実行を待機
 *
 * 使い方：
 * 1. npm run prepare:chrome
 * 2. /auto-go-on-air を実行
 */

async function prepareChromeForAutomation() {
  console.log('🎙️  Preparing Chrome for MCP-based automation...\n');
  console.log('═══════════════════════════════════════════════════════\n');

  const chromeProfilePath = path.join(__dirname, '../.chrome-profile');
  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

  // Chromeが存在するか確認
  if (!fs.existsSync(chromePath)) {
    throw new Error(`Chrome not found at: ${chromePath}`);
  }

  // プロファイルディレクトリを作成
  if (!fs.existsSync(chromeProfilePath)) {
    fs.mkdirSync(chromeProfilePath, { recursive: true });
    console.log('📁 Created Chrome profile directory');
  }

  console.log('🌐 Launching real Chrome with debugging port...\n');
  console.log('   Chrome path:', chromePath);
  console.log('   Profile path:', chromeProfilePath);
  console.log('   Remote debugging port: 9222\n');

  // 実際のChromeを起動（CDP有効）
  const chrome = spawn(chromePath, [
    '--remote-debugging-port=9222',
    `--user-data-dir=${chromeProfilePath}`,
    '--autoplay-policy=no-user-gesture-required',
    // 注意: 自動化検出フラグは一切追加しない
    // これにより「通常のChrome」として動作し、Spotify Web Playback SDKが動作する
  ], {
    detached: true,
    stdio: 'ignore'
  });

  // プロセスを切り離し（スクリプト終了後もChromeを起動したまま）
  chrome.unref();

  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('✅ Chrome is ready for automation!\n');
  console.log('📋 Next steps:');
  console.log('   1. Chrome is now running with remote debugging enabled');
  console.log('   2. Session will persist in .chrome-profile/');
  console.log('   3. Run the automation command:\n');
  console.log('      /auto-go-on-air\n');
  console.log('   4. Or manually use Chrome DevTools MCP tools\n');
  console.log('💡 Tip: Chrome will remain open. Close it manually when done.\n');

  // プロセス情報を保存
  const processInfo = {
    pid: chrome.pid,
    timestamp: new Date().toISOString(),
    port: 9222,
    profilePath: chromeProfilePath,
  };

  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(dataDir, 'chrome-process-info.json'),
    JSON.stringify(processInfo, null, 2)
  );

  console.log('✅ Chrome process info saved to data/chrome-process-info.json\n');
}

// スクリプト実行
prepareChromeForAutomation().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
