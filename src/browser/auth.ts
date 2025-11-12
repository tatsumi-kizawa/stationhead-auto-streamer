import { Browser, BrowserContext } from 'playwright';
import { SessionManager } from './session';
import * as path from 'path';

/**
 * StationheadAuth - Stationhead認証管理クラス
 *
 * 機能:
 * - セッション永続化を活用した自動ログイン
 * - セッション有効性の自動チェック
 * - 期限切れ時の自動再ログイン
 */
export class StationheadAuth {
  private browser: Browser;
  private context: BrowserContext | null = null;
  private sessionManager: SessionManager;
  private email: string;
  private password: string;

  /**
   * @param browser Playwrightブラウザインスタンス
   * @param email Stationheadのメールアドレス
   * @param password Stationheadのパスワード
   * @param sessionName セッションファイル名（オプション）
   */
  constructor(browser: Browser, email: string, password: string, sessionName?: string) {
    this.browser = browser;
    this.email = email;
    this.password = password;
    this.sessionManager = new SessionManager(sessionName);
  }

  /**
   * ログイン処理（セッション再利用または新規ログイン）
   *
   * 1. 既存セッションをチェック
   * 2. 有効な場合はセッション復元、無効な場合は再ログイン
   *
   * @returns Promise<BrowserContext> 認証済みのブラウザコンテキスト
   */
  async login(): Promise<BrowserContext> {
    // セッションを読み込んでコンテキストを作成
    this.context = await this.sessionManager.loadSession(this.browser);

    // セッションが有効かチェック
    if (this.sessionManager.hasSession()) {
      const isValid = await this.sessionManager.isSessionValid(this.context);

      if (isValid) {
        console.log('✅ Using existing valid session');
        return this.context;
      } else {
        console.log('⚠️  Session expired or invalid, performing fresh login');
        // 古いセッションを削除
        this.sessionManager.deleteSession();
        // コンテキストを閉じて再作成
        await this.context.close();
        this.context = await this.browser.newContext({
          viewport: { width: 1920, height: 1080 },
        });
      }
    }

    // 新規ログイン実行
    await this.performLogin();

    // セッションを保存
    await this.sessionManager.saveSession(this.context);

    return this.context;
  }

  /**
   * 実際のログイン処理を実行
   *
   * @private
   */
  private async performLogin(): Promise<void> {
    if (!this.context) {
      throw new Error('Browser context is not initialized');
    }

    const page = await this.context.newPage();

    try {
      console.log('🔐 Starting fresh login...\n');

      // 1. ログインページへアクセス
      console.log('📄 Navigating to login page...');
      await page.goto('https://www.stationhead.com/on/sign-in', {
        waitUntil: 'networkidle',
        timeout: 15000,
      });

      // 2. "Use email instead" をクリック
      console.log('🖱️  Clicking "Use email instead"...');
      await page.click('text="Use email instead"', { timeout: 5000 });
      await page.waitForTimeout(1000);

      // 3. Email を入力
      console.log('📧 Entering email...');
      const emailInput = page.locator('input[placeholder="Email"]');
      await emailInput.fill(this.email);

      // 4. Password を入力
      console.log('🔑 Entering password...');
      const passwordInput = page.locator('input[placeholder="Password"]');
      await passwordInput.fill(this.password);

      // フォームバリデーションの完了を待つ
      await page.waitForTimeout(1000);

      // 5. Log in ボタンをクリック
      console.log('🚀 Clicking "Log in" button...');
      const loginButton = page.locator('button:has-text("Log in")').last();
      await loginButton.click({ force: true });

      // ログイン処理の完了を待つ
      console.log('⏳ Waiting for login to complete...');
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      await page.waitForTimeout(3000);

      // ログイン成功の確認
      const currentUrl = page.url();
      console.log(`   Current URL: ${currentUrl}`);

      if (currentUrl.includes('/on/sign-in')) {
        // まだログインページにいる場合はエラー
        const errorElements = await page.locator('text=/error|invalid|incorrect/i').count();
        if (errorElements > 0) {
          throw new Error('Login failed: Invalid credentials or error message detected');
        }
        throw new Error('Login failed: Still on login page after submission');
      }

      console.log('✅ Login successful!\n');
    } catch (error) {
      console.error('❌ Login failed:', error);

      // エラー時のスクリーンショット
      try {
        const screenshotsDir = path.join(process.cwd(), 'screenshots');
        await page.screenshot({
          path: path.join(screenshotsDir, `login-error-${Date.now()}.png`),
          fullPage: true,
        });
        console.log('📸 Error screenshot saved');
      } catch (screenshotError) {
        console.error('Failed to save error screenshot:', screenshotError);
      }

      throw error;
    } finally {
      await page.close();
    }
  }

  /**
   * ログアウト処理（セッション削除）
   */
  async logout(): Promise<void> {
    this.sessionManager.deleteSession();
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    console.log('✅ Logged out and session cleared');
  }

  /**
   * 現在のコンテキストを取得
   *
   * @returns BrowserContext | null
   */
  getContext(): BrowserContext | null {
    return this.context;
  }

  /**
   * セッション情報を取得（デバッグ用）
   *
   * @returns object | null
   */
  getSessionInfo(): object | null {
    return this.sessionManager.getSessionInfo();
  }
}
