import { HUD } from './HUD';
import { MainMenu } from './MainMenu';
import { LevelSelect } from './LevelSelect';
import { GameOver } from './GameOver';
import { LevelComplete } from './LevelComplete';
import type { GameState, LevelConfig, GameSettings } from '../types';

export class UIManager {
  private container: HTMLElement;
  private hud: HUD;
  private mainMenu: MainMenu;
  private levelSelect: LevelSelect;
  private gameOver: GameOver;
  private levelComplete: LevelComplete;
  private currentState: GameState = 'MENU';

  constructor(appContainer: HTMLElement) {
    this.container = appContainer;

    this.hud = new HUD();
    this.mainMenu = new MainMenu();
    this.levelSelect = new LevelSelect();
    this.gameOver = new GameOver();
    this.levelComplete = new LevelComplete();

    this.setupUI();
  }

  private setupUI(): void {
    this.container.appendChild(this.mainMenu.getElement());
    this.container.appendChild(this.levelSelect.getElement());
    this.container.appendChild(this.hud.getElement());
    this.container.appendChild(this.gameOver.getElement());
    this.container.appendChild(this.levelComplete.getElement());

    this.updateUIState();
  }

  setState(state: GameState): void {
    this.currentState = state;
    this.updateUIState();
  }

  private updateUIState(): void {
    this.mainMenu.hide();
    this.levelSelect.hide();
    this.hud.hide();
    this.gameOver.hide();
    this.levelComplete.hide();

    switch (this.currentState) {
      case 'MENU':
        this.mainMenu.show();
        break;
      case 'LEVEL_SELECT':
        this.levelSelect.show();
        break;
      case 'COUNTDOWN':
      case 'PLAYING':
      case 'PAUSED':
        this.hud.show();
        break;
      case 'GAME_OVER':
        this.hud.show();
        this.gameOver.show();
        break;
      case 'LEVEL_COMPLETE':
        this.hud.show();
        this.levelComplete.show();
        break;
    }
  }

  getHUD(): HUD {
    return this.hud;
  }

  getMainMenu(): MainMenu {
    return this.mainMenu;
  }

  getLevelSelect(): LevelSelect {
    return this.levelSelect;
  }

  getGameOver(): GameOver {
    return this.gameOver;
  }

  getLevelComplete(): LevelComplete {
    return this.levelComplete;
  }

  updateHUD(
    score: number,
    level: LevelConfig,
    surviveSeconds: number,
    hitCount: number,
    combo: number
  ): void {
    this.hud.update(score, level, surviveSeconds, hitCount, combo);
  }

  showGameOver(score: number, highScore: number, reason: string, isNewHighScore: boolean): void {
    this.gameOver.setData(score, highScore, reason, isNewHighScore);
    this.setState('GAME_OVER');
  }

  showLevelComplete(
    levelName: string,
    score: number,
    bonus: number,
    totalScore: number,
    hasNextLevel: boolean
  ): void {
    this.levelComplete.setData(levelName, score, bonus, totalScore, hasNextLevel);
    this.setState('LEVEL_COMPLETE');
  }

  updateMainMenuStats(highScore: number, highestLevel: number): void {
    this.mainMenu.updateStats(highScore, highestLevel);
  }

  updateLevelSelect(
    levels: LevelConfig[],
    unlockedLevel: number,
    levelScores: Record<number, number>
  ): void {
    this.levelSelect.setLevels(levels, unlockedLevel, levelScores);
  }

  setSoundEnabled(enabled: boolean): void {
    this.hud.setSoundEnabled(enabled);
  }

  getContainer(): HTMLElement {
    return this.container;
  }
}
