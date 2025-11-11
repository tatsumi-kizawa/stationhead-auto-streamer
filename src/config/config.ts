/**
 * アプリケーション設定
 */

export interface Config {
  // Stationhead設定
  stationhead: {
    url: string;
    loginEmail: string;
    loginPassword: string;
  };

  // Slack通知設定
  slack: {
    webhookUrl: string;
    enabled: boolean;
  };

  // スケジューラー設定
  scheduler: {
    checkIntervalMs: number;
  };

  // ブラウザ設定
  browser: {
    headless: boolean;
    slowMo: number;
    timeout: number;
  };

  // ログ設定
  logging: {
    level: string;
  };
}

export const config: Config = {
  stationhead: {
    url: process.env.STATIONHEAD_URL || '',
    loginEmail: process.env.STATIONHEAD_EMAIL || '',
    loginPassword: process.env.STATIONHEAD_PASSWORD || '',
  },

  slack: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
    enabled: process.env.SLACK_NOTIFICATIONS_ENABLED === 'true',
  },

  scheduler: {
    checkIntervalMs: parseInt(process.env.SCHEDULER_CHECK_INTERVAL_MS || '60000', 10),
  },

  browser: {
    headless: process.env.BROWSER_HEADLESS !== 'false',
    slowMo: parseInt(process.env.BROWSER_SLOW_MO || '0', 10),
    timeout: parseInt(process.env.BROWSER_TIMEOUT || '30000', 10),
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};
