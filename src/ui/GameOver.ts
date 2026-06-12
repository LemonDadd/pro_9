export class GameOver {
  private container: HTMLElement;
  private scoreElement: HTMLElement;
  private highScoreElement: HTMLElement;
  private newHighScoreElement: HTMLElement;
  private reasonElement: HTMLElement;
  private retryButton: HTMLButtonElement;
  private levelSelectButton: HTMLButtonElement;
  private menuButton: HTMLButtonElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'game-over overlay';

    const content = document.createElement('div');
    content.className = 'overlay-content';

    const title = document.createElement('h2');
    title.className = 'overlay-title';
    title.textContent = '游戏结束';

    this.reasonElement = document.createElement('div');
    this.reasonElement.className = 'game-over-reason';

    const scoresContainer = document.createElement('div');
    scoresContainer.className = 'scores-container';

    this.scoreElement = document.createElement('div');
    this.scoreElement.className = 'score-display current';

    this.highScoreElement = document.createElement('div');
    this.highScoreElement.className = 'score-display high';

    this.newHighScoreElement = document.createElement('div');
    this.newHighScoreElement.className = 'new-high-score';
    this.newHighScoreElement.textContent = '🎉 新纪录！';
    this.newHighScoreElement.style.display = 'none';

    scoresContainer.appendChild(this.scoreElement);
    scoresContainer.appendChild(this.highScoreElement);

    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'button-group';

    this.retryButton = this.createButton('重试', 'primary');
    this.levelSelectButton = this.createButton('选关', 'secondary');
    this.menuButton = this.createButton('主菜单', 'secondary');

    buttonGroup.appendChild(this.retryButton);
    buttonGroup.appendChild(this.levelSelectButton);
    buttonGroup.appendChild(this.menuButton);

    content.appendChild(title);
    content.appendChild(this.reasonElement);
    content.appendChild(scoresContainer);
    content.appendChild(this.newHighScoreElement);
    content.appendChild(buttonGroup);
    this.container.appendChild(content);
  }

  private createButton(text: string, variant: 'primary' | 'secondary'): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = `menu-button ${variant}`;
    button.textContent = text;
    return button;
  }

  setData(score: number, highScore: number, reason: string, isNewHighScore: boolean): void {
    this.scoreElement.innerHTML = `<span class="score-label">本局得分</span><span class="score-value">${score}</span>`;
    this.highScoreElement.innerHTML = `<span class="score-label">最高分</span><span class="score-value">${highScore}</span>`;
    this.reasonElement.textContent = reason;
    this.newHighScoreElement.style.display = isNewHighScore ? 'block' : 'none';
  }

  onRetryClick(callback: () => void): void {
    this.retryButton.addEventListener('click', callback);
  }

  onLevelSelectClick(callback: () => void): void {
    this.levelSelectButton.addEventListener('click', callback);
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
