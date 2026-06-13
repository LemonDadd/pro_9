import { PhysicsEngine } from './core/PhysicsEngine';
import { Renderer } from './core/Renderer';
import { InputController } from './core/InputController';
import { AudioManager } from './audio/AudioManager';
import { UIManager } from './ui/UIManager';
import { StorageManager } from './storage/StorageManager';
import { LevelManager } from './game/LevelManager';
import { ScoreManager } from './game/ScoreManager';
import { ParticleSystem } from './game/ParticleSystem';
import { GAME } from './config/constants';
import type { GameState, LevelConfig, FailureInfo, CollisionEvent, TrailPoint, GameSettings } from './types';

export class Game {
  private state: GameState = 'MENU';
  private canvas: HTMLCanvasElement;
  private physics: PhysicsEngine;
  private renderer: Renderer;
  private input: InputController;
  private audio: AudioManager;
  private ui: UIManager;
  private storage: StorageManager;
  private levels: LevelManager;
  private score: ScoreManager;
  private particles: ParticleSystem;

  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private slowMotionTimer: number = 0;
  private slowMotionActive: boolean = false;
  private levelCompleteFlash: number = 0;
  private ballTrails: Map<number, TrailPoint[]> = new Map();
  private currentLevel: LevelConfig | null = null;
  private countdownTimer: number = 0;
  private countdownNumber: number = 3;
  private lastMouseAngle: number | null = null;

  constructor(canvas: HTMLCanvasElement, appContainer: HTMLElement) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.physics = new PhysicsEngine(this.renderer.getCenter().x, this.renderer.getCenter().y);
    this.input = new InputController(canvas);
    this.storage = new StorageManager();
    this.audio = new AudioManager(this.storage.getSettings());
    this.ui = new UIManager(appContainer);
    this.levels = new LevelManager();
    this.score = new ScoreManager();
    this.particles = new ParticleSystem();

    this.levels.setUnlockedLevel(this.storage.getUnlockedLevel());
    this.setupEventListeners();
    this.setupInputHandlers();
    this.updateUI();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.handleResize.bind(this));

    const mainMenu = this.ui.getMainMenu();
    mainMenu.onStartClick(() => this.startGame(this.storage.getUnlockedLevel()));
    mainMenu.onLevelSelectClick(() => this.showLevelSelect());
    mainMenu.onSettingsClick(() => {});
    mainMenu.onHelpClick(() => {});
    mainMenu.onSoundToggle((enabled) => this.toggleSound(enabled));
    mainMenu.onVibrationToggle((enabled) => this.toggleVibration(enabled));
    mainMenu.onResetProgress(() => this.resetProgress());

    const levelSelect = this.ui.getLevelSelect();
    levelSelect.onLevelSelect((levelId) => this.startGame(levelId));
    levelSelect.onBackClick(() => this.showMenu());

    const hud = this.ui.getHUD();
    hud.onPauseClick(() => this.togglePause());
    hud.onSoundClick((enabled) => this.toggleSound(enabled));

    const gameOver = this.ui.getGameOver();
    gameOver.onRetryClick(() => this.restartLevel());
    gameOver.onLevelSelectClick(() => this.showLevelSelect());
    gameOver.onMenuClick(() => this.showMenu());

    const levelComplete = this.ui.getLevelComplete();
    levelComplete.onNextClick(() => this.nextLevel());
    levelComplete.onRetryClick(() => this.restartLevel());
    levelComplete.onMenuClick(() => this.showMenu());

    this.physics.onCollision((event) => this.handleCollision(event));
  }

  private setupInputHandlers(): void {
    this.input.onMove((current, delta) => {
      if (this.state !== 'PLAYING') {
        this.lastMouseAngle = null;
        return;
      }

      const center = this.renderer.getCenter();
      const currentAngle = Math.atan2(current.y - center.y, current.x - center.x);

      if (this.lastMouseAngle !== null) {
        let deltaAngle = currentAngle - this.lastMouseAngle;
        if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
        if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

        const sensitivity = GAME.ringRotationSensitivity;
        const rotation = deltaAngle * sensitivity;

        if (Math.abs(rotation) > 0.0001) {
          this.physics.rotateRing(rotation);
        }
      }

      this.lastMouseAngle = currentAngle;
    });
  }

  private handleResize(): void {
    this.renderer.resize();
    const center = this.renderer.getCenter();
    this.physics.resize(center.x, center.y);
  }

  private startGame(levelId: number): void {
    const level = this.levels.getLevel(levelId);
    if (!level) return;

    this.currentLevel = level;
    this.levels.setCurrentLevel(levelId);
    this.score.reset();
    this.particles.clear();
    this.ballTrails.clear();
    this.slowMotionTimer = 0;
    this.slowMotionActive = false;
    this.levelCompleteFlash = 0;
    this.countdownTimer = 0;
    this.countdownNumber = 3;
    this.lastMouseAngle = null;

    const center = this.renderer.getCenter();
    this.physics.setupLevel(level, center.x, center.y);
    this.physics.setSpeed(0);
    this.physics.start();

    this.state = 'COUNTDOWN';
    this.ui.setState('PLAYING');
    this.lastTime = performance.now();

    if (!this.animationFrameId) {
      this.gameLoop();
    }
  }

  private showLevelSelect(): void {
    this.stopPhysics();
    const levels = this.levels.loadLevels();
    this.ui.updateLevelSelect(levels, this.storage.getUnlockedLevel(), this.getLevelScores());
    this.state = 'LEVEL_SELECT';
    this.ui.setState('LEVEL_SELECT');
    this.renderMenuBackground();
  }

  private showMenu(): void {
    this.stopPhysics();
    this.state = 'MENU';
    this.ui.setState('MENU');
    this.updateUI();
    this.renderMenuBackground();
  }

  private stopPhysics(): void {
    this.physics.stop();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private togglePause(): void {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.physics.stop();
      this.input.pause();
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.physics.start();
      this.input.resume();
      this.lastTime = performance.now();
    }
    this.ui.setState(this.state);
  }

  private restartLevel(): void {
    if (this.currentLevel) {
      this.startGame(this.currentLevel.id);
    }
  }

  private nextLevel(): void {
    const nextId = this.levels.getNextLevelId();
    if (nextId) {
      this.startGame(nextId);
    } else {
      this.showMenu();
    }
  }

  private toggleSound(enabled: boolean): void {
    const settings = this.storage.getSettings();
    settings.soundEnabled = enabled;
    this.storage.updateSettings(settings);
    this.audio.updateSettings(settings);
    this.ui.setSoundEnabled(enabled);
  }

  private toggleVibration(enabled: boolean): void {
    const settings = this.storage.getSettings();
    settings.vibrationEnabled = enabled;
    this.storage.updateSettings(settings);
    this.audio.updateSettings(settings);
  }

  private resetProgress(): void {
    this.storage.resetProgress();
    this.levels.setUnlockedLevel(1);
    this.updateUI();
  }

  private handleCollision(event: CollisionEvent): void {
    if (this.state !== 'PLAYING') return;

    const { points, combo } = this.score.addHitScore();
    this.audio.playCollision(event.speed);
    this.audio.vibrate(10);

    this.particles.spawnCollisionParticles(
      event.position.x,
      event.position.y,
      event.normal.x,
      event.normal.y,
      this.getBallColor(event.ballId)
    );

    if (combo >= 2) {
      this.audio.play('combo');
      this.particles.spawnComboText(`COMBO x${combo} +${points}`, event.position.x, event.position.y - 30);
    }
  }

  private getBallColor(ballId: number): string {
    const ballData = this.physics.getAllBallData().find((b) => b.id === ballId);
    return ballData?.color || '#ffffff';
  }

  private checkLevelComplete(): boolean {
    if (!this.currentLevel) return false;

    const { goal } = this.currentLevel;
    const hitCount = this.score.getHitCount();

    return hitCount >= (goal.hitCount || 0);
  }

  private handleLevelComplete(): void {
    if (!this.currentLevel) return;

    this.state = 'LEVEL_COMPLETE';
    this.physics.stop();
    this.audio.play('level_complete');
    this.audio.vibrate([100, 50, 100]);

    const center = this.renderer.getCenter();
    this.particles.spawnLevelCompleteParticles(center.x, center.y);

    const levelScore = this.score.getScore();
    const bonus = this.score.calculateLevelBonus(
      this.currentLevel.ballCount,
      this.currentLevel.goal.hitCount
    );
    const totalScore = this.score.getTotalScore();

    this.storage.setHighScore(totalScore);
    this.storage.setLevelScore(this.currentLevel.id, levelScore);
    this.levels.unlockNextLevel();
    this.storage.unlockLevel(this.levels.getUnlockedLevel());

    this.levelCompleteFlash = 1;

    this.ui.showLevelComplete(
      this.currentLevel.name,
      levelScore,
      bonus,
      totalScore,
      this.levels.hasNextLevel()
    );

    this.updateUI();
  }

  private handleGameOver(failureInfo: FailureInfo): void {
    if (this.slowMotionActive) return;

    this.slowMotionActive = true;
    this.slowMotionTimer = GAME.slowMotionDuration;
    this.physics.setSpeed(GAME.slowMotionScale);

    this.particles.spawnExplosionParticles(
      failureInfo.position.x,
      failureInfo.position.y,
      failureInfo.velocity.x,
      failureInfo.velocity.y,
      this.getBallColor(failureInfo.ballId)
    );

    setTimeout(() => {
      this.state = 'GAME_OVER';
      this.physics.stop();
      this.audio.play('game_over');
      this.audio.vibrate(200);

      const totalScore = this.score.getTotalScore();
      const isNewHighScore = totalScore > this.storage.getHighScore();
      this.storage.setHighScore(totalScore);

      const reason = failureInfo.reason === 'gap_escape' ? '小球从缺口掉落了！' : '小球越出了边界！';

      this.ui.showGameOver(totalScore, this.storage.getHighScore(), reason, isNewHighScore);
      this.updateUI();
    }, GAME.slowMotionDuration);
  }

  private updateUI(): void {
    this.ui.updateMainMenuStats(this.storage.getHighScore(), this.storage.getHighestLevel());
  }

  private getLevelScores(): Record<number, number> {
    const scores: Record<number, number> = {};
    for (let i = 1; i <= this.levels.getTotalLevels(); i++) {
      scores[i] = this.storage.getLevelScore(i);
    }
    return scores;
  }

  private gameLoop(): void {
    const currentTime = performance.now();
    let deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    if (deltaTime > 100) deltaTime = 16;

    if (this.state === 'COUNTDOWN') {
      this.updateCountdown(deltaTime);
    } else if (this.state === 'PLAYING') {
      this.update(deltaTime, currentTime);
    }

    this.render(deltaTime);

    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }

  private updateCountdown(deltaTime: number): void {
    this.countdownTimer += deltaTime;

    if (this.countdownTimer >= 1000) {
      this.countdownTimer = 0;
      this.countdownNumber--;
      this.audio.play('combo');

      if (this.countdownNumber < 0) {
        this.state = 'PLAYING';
        this.physics.setSpeed(1);
        this.lastTime = performance.now();
        this.lastMouseAngle = null;
        this.audio.play('level_complete');
      }
    }
  }

  private update(deltaTime: number, currentTime: number): void {
    if (this.slowMotionActive) {
      this.slowMotionTimer -= deltaTime;
      if (this.slowMotionTimer <= 0) {
        this.slowMotionActive = false;
        this.physics.setSpeed(1);
      }
    }

    this.score.update(deltaTime, currentTime);
    this.particles.update(deltaTime);

    this.physics.updateGapRotation(deltaTime / 1000);

    const failureInfo = this.physics.checkFailure();
    if (failureInfo) {
      this.handleGameOver(failureInfo);
      return;
    }

    if (this.checkLevelComplete()) {
      this.handleLevelComplete();
      return;
    }

    this.updateTrails();

    if (this.currentLevel) {
      this.ui.updateHUD(
        this.score.getScore(),
        this.currentLevel,
        this.score.getSurviveTime() / 1000,
        this.score.getHitCount(),
        this.score.getCombo()
      );
    }
  }

  private updateTrails(): void {
    const balls = this.physics.getAllBallData();

    balls.forEach((ball) => {
      let trail = this.ballTrails.get(ball.id);
      if (!trail) {
        trail = [];
        this.ballTrails.set(ball.id, trail);
      }

      const speedFactor = Math.min(ball.speed / 20, 1);
      const alpha = 0.4 + speedFactor * 0.6;
      const size = ball.radius * (0.3 + speedFactor * 0.7);

      trail.push({
        x: ball.x,
        y: ball.y,
        alpha,
        size,
        speed: ball.speed
      });

      const maxLength = Math.floor(GAME.trailLength * (0.6 + speedFactor * 0.4));
      if (trail.length > maxLength) {
        trail.shift();
      }
    });
  }

  private render(deltaTime: number): void {
    this.renderer.clear();

    if (this.state === 'MENU' || this.state === 'LEVEL_SELECT') {
      return;
    }

    if (this.levelCompleteFlash > 0) {
      this.renderer.drawLevelCompleteFlash(this.levelCompleteFlash);
      this.levelCompleteFlash -= deltaTime / 500;
      if (this.levelCompleteFlash < 0) this.levelCompleteFlash = 0;
    }

    if (this.slowMotionActive) {
      const intensity = this.slowMotionTimer / GAME.slowMotionDuration;
      this.renderer.drawSlowMotionOverlay(intensity);
    }

    const pulseIntensity = this.physics.checkBallNearGap();
    this.renderer.drawRing(
      this.physics.getRingRadius(),
      this.physics.getRingThickness(),
      this.physics.getGaps(),
      pulseIntensity
    );

    const balls = this.physics.getAllBallData();
    balls.forEach((ball) => {
      const trail = this.ballTrails.get(ball.id) || [];
      this.renderer.drawBall(ball, trail);
    });

    this.renderer.drawParticles(this.particles.getParticles());
    this.renderer.drawComboText(this.particles.getComboTexts());

    if (this.state === 'COUNTDOWN') {
      const scale = 1 + Math.sin(this.countdownTimer / 100) * 0.1;
      this.renderer.drawCountdown(this.countdownNumber, scale);
    }
  }

  private renderMenuBackground(): void {
    const renderIdle = () => {
      if (this.state !== 'MENU' && this.state !== 'LEVEL_SELECT') return;

      this.renderer.clear();

      const time = Date.now() * 0.001;
      const demoRadius = Math.min(window.innerWidth, window.innerHeight) * 0.35;

      for (let i = 0; i < 3; i++) {
        const angle = time * (0.5 + i * 0.2) + i * Math.PI * 0.67;
        const x = this.renderer.getCenter().x + Math.cos(angle) * demoRadius * 0.6;
        const y = this.renderer.getCenter().y + Math.sin(angle) * demoRadius * 0.6;

        this.renderer.drawBall(
          {
            id: i,
            x,
            y,
            radius: 12,
            color: ['#ff6b6b', '#4ecdc4', '#45b7d1'][i],
            velocity: { x: 0, y: 0 },
            speed: 5
          },
          []
        );
      }

      requestAnimationFrame(renderIdle);
    };

    renderIdle();
  }

  start(): void {
    this.showMenu();
  }

  getState(): GameState {
    return this.state;
  }

  destroy(): void {
    this.stopPhysics();
    this.input.destroy();
    window.removeEventListener('resize', this.handleResize.bind(this));
  }
}
