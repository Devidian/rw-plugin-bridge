import type { DbPlayer } from '../interfaces/game-player.js';

export interface OzAdminUtilsPlayerlistResponse {
  schemaVersion: 1;
  generatedAt: string;
  players: DbPlayer[];
}
