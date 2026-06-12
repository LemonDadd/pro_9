import levelsData from '../config/levels.json';
import type { LevelConfig } from '../types';

export class LevelManager {
  private levels: LevelConfig[] = [];
  private currentLevel: LevelConfig | null = null;
  private unlockedLevel: number = 1;

  constructor() {
    this.levels = levelsData as LevelConfig[];
  }

  loadLevels(): LevelConfig[] {
    return this.levels;
  }

  getLevel(id: number): LevelConfig | undefined {
    return this.levels.find((l) => l.id === id);
  }

  getCurrentLevel(): LevelConfig | null {
    return this.currentLevel;
  }

  setCurrentLevel(id: number): void {
    const level = this.getLevel(id);
    if (level) {
      this.currentLevel = level;
    }
  }

  getUnlockedLevel(): number {
    return this.unlockedLevel;
  }

  setUnlockedLevel(level: number): void {
    this.unlockedLevel = Math.max(this.unlockedLevel, level);
  }

  unlockNextLevel(): void {
    if (this.currentLevel && this.currentLevel.id < this.levels.length) {
      this.unlockedLevel = Math.max(this.unlockedLevel, this.currentLevel.id + 1);
    }
  }

  isUnlocked(id: number): boolean {
    return id <= this.unlockedLevel;
  }

  getTotalLevels(): number {
    return this.levels.length;
  }

  hasNextLevel(): boolean {
    return this.currentLevel !== null && this.currentLevel.id < this.levels.length;
  }

  getNextLevelId(): number | null {
    if (this.currentLevel && this.currentLevel.id < this.levels.length) {
      return this.currentLevel.id + 1;
    }
    return null;
  }

  getGoalDescription(level: LevelConfig): string {
    const { goal } = level;
    switch (goal.type) {
      case 'SURVIVE':
        return `坚持 ${goal.surviveSeconds} 秒`;
      case 'HITS':
        return `碰撞墙壁 ${goal.hitCount} 次`;
      case 'HYBRID':
        return `坚持 ${goal.surviveSeconds} 秒且碰撞 ${goal.hitCount} 次`;
      default:
        return '';
    }
  }
}
