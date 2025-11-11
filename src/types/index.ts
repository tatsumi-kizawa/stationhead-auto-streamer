/**
 * 共通型定義
 */

/**
 * スケジュールステータス
 */
export enum ScheduleStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * スケジュール
 */
export interface Schedule {
  id: string;
  title: string;
  playlistName: string;
  startTime: Date;
  endTime: Date;
  status: ScheduleStatus;
  createdAt: Date;
  updatedAt: Date;
  error?: string;
}

/**
 * スケジュール作成データ
 */
export interface CreateScheduleData {
  title: string;
  playlistName: string;
  startTime: Date;
  endTime: Date;
}

/**
 * ログレベル
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * エラーレベル
 */
export enum ErrorLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}
