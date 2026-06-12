export const COLORS = {
  background: '#0a0a1a',
  backgroundGradientStart: '#1a1a2e',
  backgroundGradientEnd: '#0a0a1a',
  ring: '#00f5ff',
  ringGlow: 'rgba(0, 245, 255, 0.5)',
  gapWarning: '#ff3366',
  gapGlow: 'rgba(255, 51, 102, 0.6)',
  accent: '#ff00ff',
  text: '#ffffff',
  textSecondary: '#a0a0c0',
  success: '#00ff88',
  warning: '#ffaa00',
  ballColors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9', '#fd79a8', '#a29bfe']
};

export const PHYSICS = {
  gravity: 0.3,
  defaultRestitution: 0.9,
  defaultFriction: 0.05,
  defaultFrictionAir: 0.01,
  ringThickness: 20,
  ballRadius: 12,
  maxBallSpeed: 20,
  minBallSpeed: 1
};

export const RING_RADIUS: Record<string, number> = {
  small: 180,
  medium: 240,
  large: 300
};

export const SCORE = {
  survivePerSecond: 10,
  hitBase: 5,
  maxComboMultiplier: 3,
  comboWindow: 2000,
  timeBonusPerSecond: 50,
  ballBonus: 100
};

export const GAME = {
  targetFPS: 60,
  slowMotionDuration: 300,
  slowMotionScale: 0.3,
  trailLength: 20,
  particleCount: 15,
  gapWarningAngle: 15 * Math.PI / 180,
  maxBalls: 6
};

export const STORAGE_KEY = 'ring_gap_keeper_save';

export const DEFAULT_SETTINGS = {
  soundEnabled: true,
  vibrationEnabled: true,
  musicVolume: 0.5,
  sfxVolume: 0.7
};
