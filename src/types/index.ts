export type GameState = 'MENU' | 'LEVEL_SELECT' | 'COUNTDOWN' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'LEVEL_COMPLETE';

export type GoalType = 'SURVIVE' | 'HITS' | 'HYBRID';

export type RingRadius = 'small' | 'medium' | 'large';

export interface GapConfig {
  startAngle: number;
  angleWidth: number;
  rotationSpeed?: number;
}

export interface LevelConfig {
  id: number;
  name: string;
  ballCount: number;
  ringRadius: RingRadius;
  gaps: GapConfig[];
  restitution: number;
  friction: number;
  frictionAir: number;
  goal: {
    type: GoalType;
    surviveSeconds?: number;
    hitCount?: number;
  };
  forceMultiplier: number;
  targetAllBalls: boolean;
  description: string;
}

export interface Gap {
  startAngle: number;
  endAngle: number;
  centerAngle: number;
}

export interface BallData {
  id: number;
  x: number;
  y: number;
  radius: number;
  color: string;
  velocity: { x: number; y: number };
  speed: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
  size: number;
  speed: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface ComboText {
  text: string;
  x: number;
  y: number;
  alpha: number;
  life: number;
}

export interface FailureInfo {
  ballId: number;
  reason: 'gap_escape' | 'out_of_bounds';
  position: { x: number; y: number };
  velocity: { x: number; y: number };
}

export interface CollisionEvent {
  ballId: number;
  speed: number;
  position: { x: number; y: number };
  normal: { x: number; y: number };
}

export interface GameSettings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
}

export interface GameSaveData {
  highScore: number;
  highestLevel: number;
  unlockedLevel: number;
  settings: GameSettings;
  levelScores: Record<number, number>;
}

export interface GameStateData {
  score: number;
  combo: number;
  surviveTime: number;
  hitCount: number;
  ballsAlive: number;
}
