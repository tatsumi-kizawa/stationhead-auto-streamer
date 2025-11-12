import { Browser, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

/**
 * SessionManager - Playwright storageStateを使用したセッション永続化管理
 *
 * 機能:
 * - ログイン状態をファイルに保存（Cookie、LocalStorage、SessionStorage）
 * - 保存したセッションを復元して再ログイン不要に
 * - セッション有効性の自動検証
 */
export class SessionManager {
  private sessionPath: string;
  private sessionsDir: string;

  /**
   * @param sessionName セッションファイル名（デフォルト: 'stationhead-session.json'）
   * @param sessionsDir セッション保存ディレクトリ（デフォルト: 'data/sessions'）
   */
  constructor(
    sessionName: string = 'stationhead-session.json',
    sessionsDir: string = path.join(process.cwd(), 'data', 'sessions')
  ) {
    this.sessionsDir = sessionsDir;
    this.sessionPath = path.join(sessionsDir, sessionName);

    // セッションディレクトリが存在しない場合は作成
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  /**
   * セッション情報を保存
   *
   * @param context ブラウザコンテキスト
   * @returns Promise<void>
   */
  async saveSession(context: BrowserContext): Promise<void> {
    try {
      await context.storageState({ path: this.sessionPath });
      console.log(`✅ Session saved to ${this.sessionPath}`);
    } catch (error) {
      console.error('❌ Failed to save session:', error);
      throw new Error(`Session save failed: ${error}`);
    }
  }

  /**
   * 保存されたセッションを読み込んで新しいコンテキストを作成
   *
   * @param browser ブラウザインスタンス
   * @param viewport ビューポート設定（デフォルト: 1920x1080）
   * @returns Promise<BrowserContext> セッション復元済みのコンテキスト
   */
  async loadSession(
    browser: Browser,
    viewport: { width: number; height: number } = { width: 1920, height: 1080 }
  ): Promise<BrowserContext> {
    if (this.hasSession()) {
      try {
        console.log(`🔄 Loading existing session from ${this.sessionPath}`);
        const context = await browser.newContext({
          storageState: this.sessionPath,
          viewport,
        });
        return context;
      } catch (error) {
        console.warn('⚠️  Failed to load session, creating new context:', error);
        // セッション読み込み失敗時は新規コンテキストを返す
        return await browser.newContext({ viewport });
      }
    } else {
      console.log('ℹ️  No existing session found, creating new context');
      return await browser.newContext({ viewport });
    }
  }

  /**
   * セッションファイルが存在するかチェック
   *
   * @returns boolean セッションファイルが存在する場合true
   */
  hasSession(): boolean {
    return fs.existsSync(this.sessionPath);
  }

  /**
   * セッションが有効かどうかを検証
   *
   * Stationheadにアクセスして、ログイン済み状態かを確認します。
   * ログイン済みの場合、ダッシュボードやプロフィール要素が存在します。
   *
   * @param context ブラウザコンテキスト
   * @returns Promise<boolean> セッションが有効な場合true
   */
  async isSessionValid(context: BrowserContext): Promise<boolean> {
    const page = await context.newPage();

    try {
      console.log('🔍 Validating session...');

      // Stationheadのトップページにアクセス
      await page.goto('https://www.stationhead.com', {
        waitUntil: 'networkidle',
        timeout: 15000,
      });

      // ログイン済みかどうかを判定
      // ログインページにリダイレクトされていないかチェック
      const currentUrl = page.url();
      if (currentUrl.includes('/on/sign-in')) {
        console.log('❌ Session invalid: Redirected to login page');
        return false;
      }

      // ログイン済みユーザー向けの要素が存在するかチェック
      // 例: プロフィールボタン、ダッシュボード要素など
      const loggedInIndicators = await page.evaluate(() => {
        // ログインしている場合に表示される要素をチェック
        const hasProfileButton = document.querySelector('[aria-label*="Profile"]') !== null;
        const hasUserMenu = document.querySelector('[aria-label*="User"]') !== null;
        const bodyText = document.body.innerText.toLowerCase();
        const hasStreamingElements = bodyText.includes('stream') || bodyText.includes('station');

        return {
          hasProfileButton,
          hasUserMenu,
          hasStreamingElements,
        };
      });

      const isValid =
        loggedInIndicators.hasProfileButton ||
        loggedInIndicators.hasUserMenu ||
        loggedInIndicators.hasStreamingElements;

      if (isValid) {
        console.log('✅ Session is valid');
      } else {
        console.log('❌ Session invalid: No logged-in indicators found');
      }

      return isValid;
    } catch (error) {
      console.error('❌ Session validation failed:', error);
      return false;
    } finally {
      await page.close();
    }
  }

  /**
   * 保存されたセッションを削除
   *
   * @returns void
   */
  deleteSession(): void {
    if (this.hasSession()) {
      try {
        fs.unlinkSync(this.sessionPath);
        console.log(`🗑️  Session deleted: ${this.sessionPath}`);
      } catch (error) {
        console.error('❌ Failed to delete session:', error);
      }
    } else {
      console.log('ℹ️  No session to delete');
    }
  }

  /**
   * セッション情報を取得（デバッグ用）
   *
   * @returns object | null セッション情報オブジェクト
   */
  getSessionInfo(): object | null {
    if (this.hasSession()) {
      try {
        const sessionData = JSON.parse(fs.readFileSync(this.sessionPath, 'utf-8'));
        return {
          path: this.sessionPath,
          cookies: sessionData.cookies?.length || 0,
          origins: sessionData.origins?.length || 0,
        };
      } catch (error) {
        console.error('❌ Failed to read session info:', error);
        return null;
      }
    }
    return null;
  }
}
