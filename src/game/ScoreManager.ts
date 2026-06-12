import { SCORE } from '../config/constants';

export class ComboSystem {
  private hits: { timestamp: number }[] = [];
  private comboWindow: number = SCORE.comboWindow;
  private maxCombo: number = SCORE.maxComboMultiplier;

  addHit(): number {
    const now = Date.now();
    this.hits.push({ timestamp: now });
    this.cleanOldHits();
    return this.getMultiplier();
  }

  private cleanOldHits(): void {
    const now = Date.now();
    this.hits = this.hits.filter((h) => now - h.timestamp < this.comboWindow);
  }

  getMultiplier(): number {
    this.cleanOldHits();
    return Math.min(this.hits.length, this.maxCombo);
  }

  getHitCount(): number {
    this.cleanOldHits();
    return this.hits.length;
  }

  reset(): void {
    this.hits = [];
  }
}

export class ScoreManager {
  private score: number = 0;
  private totalScore: number = 0;
  private surviveTime: number = 0;
  private hitCount: number = 0;
  private combo: ComboSystem;
  private lastSurviveScoreTime: number = 0;

  constructor() {
    this.combo = new ComboSystem();
  }

  reset(): void {
    this.score = 0;
    this.totalScore = 0;
    this.surviveTime = 0;
    this.hitCount = 0;
    this.lastSurviveScoreTime = 0;
    this.combo.reset();
  }

  update(deltaTime: number, currentTime: number): void {
    this.surviveTime += deltaTime;
  }

  addHitScore(): { points: number; combo: number } {
    this.hitCount++;
    const multiplier = this.combo.addHit();
    const points = SCORE.hitBase * multiplier;
    this.score += points;
    this.totalScore += points;
    return { points, combo: multiplier };
  }

  calculateLevelBonus(levelBallCount: number, targetHitCount?: number): number {
    let bonus = 0;

    bonus += levelBallCount * SCORE.ballBonus;

    this.totalScore += bonus;
    return bonus;
  }

  getScore(): number {
    return this.score;
  }

  getTotalScore(): number {
    return this.totalScore;
  }

  getSurviveTime(): number {
    return this.surviveTime;
  }

  getSurviveTimeInSeconds(): number {
    return Math.floor(this.surviveTime / 1000);
  }

  getHitCount(): number {
    return this.hitCount;
  }

  getCombo(): number {
    return this.combo.getMultiplier();
  }

  getComboHitCount(): number {
    return this.combo.getHitCount();
  }

  resetCombo(): void {
    this.combo.reset();
  }
}
