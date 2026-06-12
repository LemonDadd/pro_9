import type { LevelConfig } from '../types';

export class LevelSelect {
  private container: HTMLElement;
  private levelsContainer: HTMLElement;
  private backButton: HTMLButtonElement;
  private levels: LevelConfig[] = [];
  private unlockedLevel: number = 1;
  private levelScores: Record<number, number> = {};

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'level-select';

    const title = document.createElement('h2');
    title.className = 'level-select-title';
    title.textContent = '选择关卡';

    this.levelsContainer = document.createElement('div');
    this.levelsContainer.className = 'levels-grid';

    this.backButton = document.createElement('button');
    this.backButton.className = 'menu-button secondary';
    this.backButton.textContent = '返回主菜单';

    this.container.appendChild(title);
    this.container.appendChild(this.levelsContainer);
    this.container.appendChild(this.backButton);
  }

  setLevels(levels: LevelConfig[], unlockedLevel: number, levelScores: Record<number, number>): void {
    this.levels = levels;
    this.unlockedLevel = unlockedLevel;
    this.levelScores = levelScores;
    this.renderLevels();
  }

  private renderLevels(): void {
    this.levelsContainer.innerHTML = '';

    this.levels.forEach((level) => {
      const isUnlocked = level.id <= this.unlockedLevel;
      const highScore = this.levelScores[level.id] || 0;

      const levelCard = document.createElement('div');
      levelCard.className = `level-card ${isUnlocked ? 'unlocked' : 'locked'}`;
      levelCard.dataset.levelId = level.id.toString();

      const levelNumber = document.createElement('div');
      levelNumber.className = 'level-number';
      levelNumber.textContent = isUnlocked ? level.id.toString() : '🔒';

      const levelName = document.createElement('div');
      levelName.className = 'level-name';
      levelName.textContent = level.name;

      const levelGoal = document.createElement('div');
      levelGoal.className = 'level-goal';
      levelGoal.textContent = this.getGoalShortText(level);

      const levelScore = document.createElement('div');
      levelScore.className = 'level-score';
      if (isUnlocked && highScore > 0) {
        levelScore.textContent = `最高: ${highScore}`;
      }

      levelCard.appendChild(levelNumber);
      levelCard.appendChild(levelName);
      levelCard.appendChild(levelGoal);
      levelCard.appendChild(levelScore);

      if (isUnlocked) {
        levelCard.addEventListener('click', () => {
          this.dispatchEvent('levelSelect', level.id);
        });
      }

      this.levelsContainer.appendChild(levelCard);
    });
  }

  private getGoalShortText(level: LevelConfig): string {
    const { goal } = level;
    switch (goal.type) {
      case 'SURVIVE':
        return `${goal.surviveSeconds}s`;
      case 'HITS':
        return `${goal.hitCount}次`;
      case 'HYBRID':
        return `${goal.surviveSeconds}s + ${goal.hitCount}次`;
      default:
        return '';
    }
  }

  private dispatchEvent(type: string, detail?: any): void {
    this.container.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
  }

  onLevelSelect(callback: (levelId: number) => void): void {
    this.container.addEventListener('levelSelect', (e: any) => callback(e.detail));
  }

  onBackClick(callback: () => void): void {
    this.backButton.addEventListener('click', callback);
  }

  getElement(): HTMLElement {
    return this.container;
  }

  show(): void {
    this.container.style.display = 'flex';
  }

  hide(): void {
    this.container.style.display = 'none';
  }
}
