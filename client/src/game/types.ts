export interface Vec2 {
  x: number;
  y: number;
}

export interface AABB {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type PlayerState =
  | 'idle'
  | 'walking'
  | 'running'
  | 'jumping'
  | 'falling'
  | 'landing'
  | 'damaged'
  | 'powerup'
  | 'victory'
  | 'dead';

export type EnemyType = 'goomba' | 'koopa' | 'flying' | 'spiny';

export type Direction = -1 | 1;

export interface PlayerEntity {
  pos: Vec2;
  vel: Vec2;
  w: number;
  h: number;
  state: PlayerState;
  direction: Direction;
  grounded: boolean;
  animFrame: number;
  animTimer: number;
  invulnTimer: number;
  lives: number;
  coins: number;
  score: number;
  powerLevel: number; // 0=small, 1=big, 2=fire
  landTimer: number;
  deadTimer: number;
  victoryTimer: number;
}

export interface EnemyEntity {
  pos: Vec2;
  vel: Vec2;
  w: number;
  h: number;
  type: EnemyType;
  direction: Direction;
  alive: boolean;
  animFrame: number;
  animTimer: number;
  deathTimer: number;
  grounded: boolean;
  // koopa-specific
  inShell?: boolean;
  shellMoving?: boolean;
  // flying-specific
  baseY?: number;
  flyAmplitude?: number;
  flySpeed?: number;
  flyPhase?: number;
}

export interface BlockEntity {
  pos: Vec2;
  w: number;
  h: number;
  type: 'question' | 'brick';
  hit: boolean;
  bounceTimer: number;
  contents: 'coin' | 'mushroom' | 'none';
}

export interface CoinEntity {
  pos: Vec2;
  collected: boolean;
  animTimer: number;
  popVel: number;
  popping: boolean;
}

export interface PipeEntity {
  pos: Vec2;
  w: number;
  h: number;
  colorIndex: number;
}

export interface MushroomEntity {
  pos: Vec2;
  vel: Vec2;
  w: number;
  h: number;
  active: boolean;
  emerging: boolean;
  emergeTimer: number;
  sourceY: number;
}

export interface MovingPlatform {
  pos: Vec2;
  w: number;
  h: number;
  startX: number;
  endX: number;
  speed: number;
  direction: Direction;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export interface FlagPole {
  pos: Vec2;
  h: number;
  triggered: boolean;
  flagY: number;
}

export interface Checkpoint {
  pos: Vec2;
  activated: boolean;
}

export interface GameCamera {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  worldWidth: number;
  worldHeight: number;
  viewWidth: number;
  viewHeight: number;
}

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  jumpPressed: boolean;
  pause: boolean;
}

export interface LevelData {
  width: number;
  height: number;
  tileSize: number;
  tiles: number[][];
  playerSpawn: Vec2;
  enemies: Array<{ type: EnemyType; x: number; y: number }>;
  blocks: Array<{ type: 'question' | 'brick'; x: number; y: number; contents: 'coin' | 'mushroom' | 'none' }>;
  coins: Array<{ x: number; y: number }>;
  pipes: Array<{ x: number; y: number; h: number }>;
  movingPlatforms: Array<{ x: number; y: number; w: number; startX: number; endX: number; speed: number }>;
  flagPole?: { x: number; y: number; h: number };
  checkpoints: Array<{ x: number; y: number }>;
}

export interface GameState {
  paused: boolean;
  gameOver: boolean;
  levelComplete: boolean;
  timer: number;
  maxTime: number;
  world: string;
}

export const TileType = {
  EMPTY: 0,
  GROUND: 1,
  GROUND_TOP: 2,
  BRICK: 3,
  GROUND_LEFT: 4,
  GROUND_RIGHT: 5,
  GROUND_DEEP: 6,
  PLATFORM: 7,
} as const;
