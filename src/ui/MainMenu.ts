import { COLORS } from '../config/constants';

export class MainMenu {
  private container: HTMLElement;
  private startButton: HTMLButtonElement;
  private levelSelectButton: HTMLButtonElement;
  private settingsButton: HTMLButtonElement;
  private helpButton: HTMLButtonElement;
  private highScoreElement: HTMLElement;
  private highestLevelElement: HTMLElement;
  private helpPanel: HTMLElement;
  private settingsPanel: HTMLElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'main-menu';

    const title = document.createElement('h1');
    title.className = 'menu-title';
    title.textContent = '圆环缺口守球';

    const subtitle = document.createElement('p');
    subtitle.className = 'menu-subtitle';
    subtitle.textContent = '阻止小球从缺口逃出';

    const statsPanel = document.createElement('div');
    statsPanel.className = 'stats-panel';

    this.highScoreElement = document.createElement('div');
    this.highScoreElement.className = 'stat-item';
    this.highScoreElement.innerHTML = `<span class="stat-label">最高分</span><span class="stat-value">0</span>`;

    this.highestLevelElement = document.createElement('div');
    this.highestLevelElement.className = 'stat-item';
    this.highestLevelElement.innerHTML = `<span class="stat-label">最高关卡</span><span class="stat-value">1</span>`;

    statsPanel.appendChild(this.highScoreElement);
    statsPanel.appendChild(this.highestLevelElement);

    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'button-group';

    this.startButton = this.createButton('开始游戏', 'primary');
    this.levelSelectButton = this.createButton('关卡选择', 'secondary');
    this.settingsButton = this.createButton('设置', 'secondary');
    this.helpButton = this.createButton('玩法说明', 'secondary');

    buttonGroup.appendChild(this.startButton);
    buttonGroup.appendChild(this.levelSelectButton);
    buttonGroup.appendChild(this.settingsButton);
    buttonGroup.appendChild(this.helpButton);

    this.helpPanel = this.createHelpPanel();
    this.settingsPanel = this.createSettingsPanel();

    this.container.appendChild(title);
    this.container.appendChild(subtitle);
    this.container.appendChild(statsPanel);
    this.container.appendChild(buttonGroup);
    this.container.appendChild(this.helpPanel);
    this.container.appendChild(this.settingsPanel);
  }

  private createButton(text: string, variant: 'primary' | 'secondary'): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = `menu-button ${variant}`;
    button.textContent = text;
    return button;
  }

  private createHelpPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'overlay-panel help-panel';
    panel.style.display = 'none';

    const content = document.createElement('div');
    content.className = 'panel-content';

    const title = document.createElement('h2');
    title.textContent = '玩法说明';

    const instructions = document.createElement('div');
    instructions.className = 'instructions';
    instructions.innerHTML = `
      <div class="instruction-item">
        <span class="instruction-icon">🖱️</span>
        <span>按住鼠标拖动给球施加切向力</span>
      </div>
      <div class="instruction-item">
        <span class="instruction-icon">🎯</span>
        <span>阻止小球从红色缺口逃出</span>
      </div>
      <div class="instruction-item">
        <span class="instruction-icon">⚡</span>
        <span>连续碰撞获得 Combo 加分</span>
      </div>
      <div class="instruction-item">
        <span class="instruction-icon">⏱️</span>
        <span>完成关卡目标即可过关</span>
      </div>
      <div class="instruction-item">
        <span class="instruction-icon">📱</span>
        <span>移动端: 单指拖动操作</span>
      </div>
    `;

    const closeButton = this.createButton('关闭', 'secondary');
    closeButton.addEventListener('click', () => {
      panel.style.display = 'none';
    });

    content.appendChild(title);
    content.appendChild(instructions);
    content.appendChild(closeButton);
    panel.appendChild(content);

    return panel;
  }

  private createSettingsPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'overlay-panel settings-panel';
    panel.style.display = 'none';

    const content = document.createElement('div');
    content.className = 'panel-content';

    const title = document.createElement('h2');
    title.textContent = '设置';

    const options = document.createElement('div');
    options.className = 'settings-options';

    const soundOption = this.createToggleOption('音效', 'sound', true);
    const vibrationOption = this.createToggleOption('震动', 'vibration', true);

    const resetButton = this.createButton('重置进度', 'secondary');
    resetButton.style.marginTop = '20px';
    resetButton.addEventListener('click', () => {
      if (confirm('确定要重置所有游戏进度吗？此操作不可恢复！')) {
        this.dispatchEvent('resetProgress');
      }
    });

    const closeButton = this.createButton('关闭', 'secondary');
    closeButton.addEventListener('click', () => {
      panel.style.display = 'none';
    });

    options.appendChild(soundOption);
    options.appendChild(vibrationOption);

    content.appendChild(title);
    content.appendChild(options);
    content.appendChild(resetButton);
    content.appendChild(closeButton);
    panel.appendChild(content);

    return panel;
  }

  private createToggleOption(label: string, id: string, defaultValue: boolean): HTMLElement {
    const option = document.createElement('div');
    option.className = 'toggle-option';

    const labelEl = document.createElement('span');
    labelEl.textContent = label;

    const toggle = document.createElement('label');
    toggle.className = 'toggle-switch';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.checked = defaultValue;
    input.addEventListener('change', () => {
      this.dispatchEvent(`${id}Toggle`, input.checked);
    });

    const slider = document.createElement('span');
    slider.className = 'toggle-slider';

    toggle.appendChild(input);
    toggle.appendChild(slider);

    option.appendChild(labelEl);
    option.appendChild(toggle);

    return option;
  }

  private dispatchEvent(type: string, detail?: any): void {
    this.container.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
  }

  onStartClick(callback: () => void): void {
    this.startButton.addEventListener('click', callback);
  }

  onLevelSelectClick(callback: () => void): void {
    this.levelSelectButton.addEventListener('click', callback);
  }

  onSettingsClick(callback: () => void): void {
    this.settingsButton.addEventListener('click', () => {
      this.settingsPanel.style.display = 'flex';
      callback();
    });
  }

  onHelpClick(callback: () => void): void {
    this.helpButton.addEventListener('click', () => {
      this.helpPanel.style.display = 'flex';
      callback();
    });
  }

  onSoundToggle(callback: (enabled: boolean) => void): void {
    this.container.addEventListener('soundToggle', (e: any) => callback(e.detail));
  }

  onVibrationToggle(callback: (enabled: boolean) => void): void {
    this.container.addEventListener('vibrationToggle', (e: any) => callback(e.detail));
  }

  onResetProgress(callback: () => void): void {
    this.container.addEventListener('resetProgress', () => callback());
  }

  updateStats(highScore: number, highestLevel: number): void {
    this.highScoreElement.querySelector('.stat-value')!.textContent = highScore.toString();
    this.highestLevelElement.querySelector('.stat-value')!.textContent = highestLevel.toString();
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
