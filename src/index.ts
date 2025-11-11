/**
 * Stationhead Auto Streamer
 * メインエントリーポイント
 */

import dotenv from 'dotenv';
import { logger } from './logger/logger';

// 環境変数の読み込み
dotenv.config();

async function main(): Promise<void> {
  try {
    logger.info('Stationhead Auto Streamer starting...');

    // TODO: 初期化処理

    logger.info('Stationhead Auto Streamer started successfully');
  } catch (error) {
    logger.error('Failed to start Stationhead Auto Streamer', error);
    process.exit(1);
  }
}

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// 未処理のエラーをキャッチ
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

main().catch((error) => {
  logger.error('Fatal error in main:', error);
  process.exit(1);
});
