import { DEFAULT_SETTINGS, STORAGE_KEY } from '../config/constants';
import type { GameSaveData as IGameSaveData, GameSettings as IGameSettings } from '../types';

export class StorageManager {
  private data: IGameSaveData;

  constructor() {
    this.data = this.load();
  }

  private load(): IGameSaveData {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load save data:', e);
    }
    return this.getDefaultData();
  }

  private getDefaultData(): IGameSaveData {
    return {
      highScore: 0,
      highestLevel: 1,
      unlockedLevel: 1,
      settings: { ...DEFAULT_SETTINGS },
      levelScores: {}
    };
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Failed to save data:', e);
    }
  }

  getHighScore(): number {
    return this.data.highScore;
  }

  setHighScore(score: number): void {
    if (score > this.data.highScore) {
      this.data.highScore = score;
      this.save();
    }
  }

  getHighestLevel(): number {
    return this.data.highestLevel;
  }

  getUnlockedLevel(): number {
    return this.data.unlockedLevel;
  }

  unlockLevel(levelId: number): void {
    if (levelId > this.data.unlockedLevel) {
      this.data.unlockedLevel = levelId;
      this.save();
    }
    if (levelId > this.data.highestLevel) {
      this.data.highestLevel = levelId;
      this.save();
    }
  }

  isLevelUnlocked(levelId: number): boolean {
    return levelId <= this.data.unlockedLevel;
  }

  getLevelScore(levelId: number): number {
    return this.data.levelScores[levelId] || 0;
  }

  setLevelScore(levelId: number, score: number): void {
    if (!this.data.levelScores[levelId] || score > this.data.levelScores[levelId]) {
      this.data.levelScores[levelId] = score;
      this.save();
    }
  }

  getSettings(): IGameSettings {
    return { ...this.data.settings };
  }

  updateSettings(settings: Partial<IGameSettings>): void {
    this.data.settings = { ...this.data.settings, ...settings };
    this.save();
  }

  resetProgress(): void {
    this.data = this.getDefaultData();
    this.save();
  }
}
