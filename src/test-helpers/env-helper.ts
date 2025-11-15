import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// プロジェクトルートの.envファイルパス
const envPath = path.join(__dirname, '../../.env');

// .envファイルを読み込む
dotenv.config({ path: envPath });

/**
 * Spotifyパスワードを取得する
 *
 * Spotifyパスワードは$を含むため、dotenvの変数展開の影響を受ける。
 * .envファイルから直接読み取り、バックスラッシュエスケープを解除する。
 *
 * @returns Spotifyパスワード
 */
export function getSpotifyPassword(): string {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/SPOTIFY_PASSWORD="([^"]+)"/);
  if (match && match[1]) {
    // バックスラッシュエスケープを解除
    return match[1].replace(/\\(.)/g, '$1');
  }
  return process.env.SPOTIFY_PASSWORD || '';
}

/**
 * 環境変数ファイルのパスを取得する
 *
 * @returns .envファイルの絶対パス
 */
export function getEnvPath(): string {
  return envPath;
}
