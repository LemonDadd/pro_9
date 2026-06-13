import { COLORS } from '../config/constants';
import type { LevelConfig } from '../types';

export class HUD {
  private container: HTMLElement;
  private scoreElement: HTMLElement;
  private levelElement: HTMLElement;
  private goalElement: HTMLElement;
  private timeElement: HTMLElement;
  private hitsElement: HTMLElement;
  private comboElement: HTMLElement;
  private pauseButton: HTMLButtonElement;
  private soundButton: HTMLButtonElement;
  private soundEnabled: boolean = true;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'hud';

    this.scoreElement = document.createElement('div');
    this.scoreElement.className = 'hud-score';

    this.levelElement = document.createElement('div');
    this.levelElement.className = 'hud-level';

    this.goalElement = document.createElement('div');
    this.goalElement.className = 'hud-goal';

    this.timeElement = document.createElement('div');
    this.timeElement.className = 'hud-time';

    this.hitsElement = document.createElement('div');
    this.hitsElement.className = 'hud-hits';

    this.comboElement = document.createElement('div');
    this.comboElement.className = 'hud-combo';

    this.pauseButton = document.createElement('button');
    this.pauseButton.className = 'hud-button pause-button';
    this.pauseButton.innerHTML = '⏸';

    this.soundButton = document.createElement('button');
    this.soundButton.className = 'hud-button sound-button';
    this.soundButton.innerHTML = '🔊';

    const leftPanel = document.createElement('div');
    leftPanel.className = 'hud-panel left';
    leftPanel.appendChild(this.levelElement);
    leftPanel.appendChild(this.scoreElement);

    const centerPanel = document.createElement('div');
    centerPanel.className = 'hud-panel center';
    centerPanel.appendChild(this.hitsElement);
    centerPanel.appendChild(this.comboElement);

    const rightPanel = document.createElement('div');
    rightPanel.className = 'hud-panel right';
    rightPanel.appendChild(this.timeElement);

    const buttonsPanel = document.createElement('div');
    buttonsPanel.className = 'hud-buttons';
    buttonsPanel.appendChild(this.soundButton);
    buttonsPanel.appendChild(this.pauseButton);

    this.container.appendChild(leftPanel);
    this.container.appendChild(centerPanel);
    this.container.appendChild(rightPanel);
    this.container.appendChild(buttonsPanel);
  }

  getElement(): HTMLElement {
    return this.container;
  }

  update(
    score: number,
    level: LevelConfig,
    surviveSeconds: number,
    hitCount: number,
    combo: number
  ): void {
    this.scoreElement.textContent = `分数: ${score}`;
    this.levelElement.textContent = `第 ${level.id} 关`;

    const { goal } = level;
    const targetHits = goal.hitCount || 0;

    this.hitsElement.textContent = `已反弹 ${hitCount} / ${targetHits}`;
    this.timeElement.textContent = '';

    if (combo >= 2) {
      this.comboElement.textContent = `COMBO x${combo}`;
      this.comboElement.style.color = COLORS.accent;
    } else {
      this.comboElement.textContent = '';
    }
  }

  onPauseClick(callback: () => void): void {
    this.pauseButton.addEventListener('click', callback);
  }

  onSoundClick(callback: (enabled: boolean) => void): void {
    this.soundButton.addEventListener('click', () => {
      this.soundEnabled = !this.soundEnabled;
      this.soundButton.innerHTML = this.soundEnabled ? '🔊' : '🔇';
      callback(this.soundEnabled);
    });
  }

  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    this.soundButton.innerHTML = enabled ? '🔊' : '🔇';
  }

  show(): void {
    this.container.style.display = 'flex';
  }

  hide(): void {
    this.container.style.display = 'none';
  }
}
