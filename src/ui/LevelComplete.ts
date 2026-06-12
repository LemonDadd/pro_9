export class LevelComplete {
  private container: HTMLElement;
  private scoreElement: HTMLElement;
  private bonusElement: HTMLElement;
  private totalScoreElement: HTMLElement;
  private levelNameElement: HTMLElement;
  private nextButton: HTMLButtonElement;
  private retryButton: HTMLButtonElement;
  private menuButton: HTMLButtonElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'level-complete overlay';

    const content = document.createElement('div');
    content.className = 'overlay-content';

    const title = document.createElement('h2');
    title.className = 'overlay-title success';
    title.textContent = '关卡完成！';

    this.levelNameElement = document.createElement('div');
    this.levelNameElement.className = 'level-name-display';

    const scoresContainer = document.createElement('div');
    scoresContainer.className = 'scores-container';

    this.scoreElement = document.createElement('div');
    this.scoreElement.className = 'score-display current';

    this.bonusElement = document.createElement('div');
    this.bonusElement.className = 'score-display bonus';

    this.totalScoreElement = document.createElement('div');
    this.totalScoreElement.className = 'score-display total';

    scoresContainer.appendChild(this.scoreElement);
    scoresContainer.appendChild(this.bonusElement);
    scoresContainer.appendChild(this.totalScoreElement);

    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'button-group';

    this.nextButton = this.createButton('下一关', 'primary');
    this.retryButton = this.createButton('重玩', 'secondary');
    this.menuButton = this.createButton('主菜单', 'secondary');

    buttonGroup.appendChild(this.nextButton);
    buttonGroup.appendChild(this.retryButton);
    buttonGroup.appendChild(this.menuButton);

    content.appendChild(title);
    content.appendChild(this.levelNameElement);
    content.appendChild(scoresContainer);
    content.appendChild(buttonGroup);
    this.container.appendChild(content);
  }

  private createButton(text: string, variant: 'primary' | 'secondary'): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = `menu-button ${variant}`;
    button.textContent = text;
    return button;
  }

  setData(levelName: string, score: number, bonus: number, totalScore: number, hasNextLevel: boolean): void {
    this.levelNameElement.textContent = levelName;
    this.scoreElement.innerHTML = `<span class="score-label">关卡得分</span><span class="score-value">${score}</span>`;
    this.bonusElement.innerHTML = `<span class="score-label">奖励</span><span class="score-value">+${bonus}</span>`;
    this.totalScoreElement.innerHTML = `<span class="score-label">总计</span><span class="score-value">${totalScore}</span>`;
    this.nextButton.style.display = hasNextLevel ? 'inline-block' : 'none';
  }

  onNextClick(callback: () => void): void {
    this.nextButton.addEventListener('click', callback);
  }

  onRetryClick(callback: () => void): void {
    this.retryButton.addEventListener('click', callback);
  }

  onMenuClick(callback: () => void): void {
    this.menuButton.addEventListener('click', callback);
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
