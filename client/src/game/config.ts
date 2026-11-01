import type { LevelData } from './types';
import { TileType } from './types';

export const TILE = 32;

export const PHYSICS = {
  gravity: 0.55,
  maxFallSpeed: 12,
  playerRunSpeed: 4.5,
  playerWalkSpeed: 2.5,
  playerAccel: 0.35,
  playerDecel: 0.25,
  playerJumpForce: -10.5,
  playerJumpHold: -0.45,
  playerMaxJumpTime: 14,
  enemySpeed: 1.0,
  koopaShellSpeed: 6,
  mushroomSpeed: 1.5,
} as const;

export const COLORS = {
  sky: '#5C94FC',
  skyBottom: '#92C4FC',
  cloud: '#FFFFFF',
  cloudShadow: '#D0E8FF',
  hillGreen: '#00A800',
  hillLight: '#38D838',
  hillSpot: '#68E868',
  grassGreen: '#00D800',
  grassDark: '#009800',
  groundBrown: '#C84C0C',
  groundDark: '#A03800',
  groundDeep: '#784018',
  brickOrange: '#D87820',
  brickDark: '#A04808',
  brickLight: '#F8B878',
  brickLine: '#903800',
  questionOrange: '#E87D00',
  questionLight: '#FCD8A8',
  questionDark: '#794000',
  coinGold: '#FBD000',
  coinLight: '#FFFFFF',
  coinDark: '#D09800',
  pipeGreen: '#00A800',
  pipeLight: '#68FF68',
  pipeDark: '#004D00',
  marioRed: '#E52521',
  marioBlue: '#0022AA',
  marioSkin: '#FCD8A8',
  marioHair: '#794000',
  marioWhite: '#FFFFFF',
  goombaBrown: '#B84418',
  goombaLight: '#D88858',
  goombaDark: '#783010',
  koopaGreen: '#00A800',
  koopaLight: '#68E868',
  koopaSkin: '#FCD8A8',
  koopaShell: '#007800',
  mushroomRed: '#E52521',
  mushroomWhite: '#FFFFFF',
  mushroomSpot: '#FFFFFF',
  flagWhite: '#FFFFFF',
  flagGreen: '#00A800',
  hudBg: 'rgba(0,0,0,0.65)',
  hudText: '#FFFFFF',
  hudGold: '#FBD000',
  hudRed: '#E52521',
} as const;

export const DIMENSIONS = {
  player: { w: 28, h: 32 },
  playerBig: { w: 28, h: 48 },
  goomba: { w: 28, h: 28 },
  koopa: { w: 28, h: 36 },
  koopaShell: { w: 28, h: 24 },
  flying: { w: 30, h: 30 },
  spiny: { w: 28, h: 28 },
  coin: { w: 16, h: 16 },
  questionBlock: { w: 32, h: 32 },
  brick: { w: 32, h: 32 },
  mushroom: { w: 28, h: 28 },
  pipeWidth: 64,
  bush: { w: 64, h: 32 },
  smallHill: { w: 128, h: 96 },
  largeHill: { w: 192, h: 160 },
  cloud: { w: 96, h: 48 },
} as const;

const T = TileType;
const _ = T.EMPTY;
const g = T.GROUND_TOP;
const B = T.BRICK;
const D = T.GROUND_DEEP;
const P = T.PLATFORM;

function createBaseLevel(): LevelData {
  const cols = 240;
  const rows = 15;
  const tiles: number[][] = [];

  for (let r = 0; r < rows; r++) {
    tiles.push(new Array(cols).fill(_));
  }

  // ground: rows 13-14 (bottom two rows) — no gaps, fully solid
  for (let c = 0; c < cols; c++) {
    tiles[13][c] = g;
    tiles[14][c] = D;
  }

  // elevated platform sections
  // section 1: small steps at col 30
  for (let c = 134; c <= 137; c++) { tiles[9][c] = B; }
  for (let c = 135; c <= 137; c++) { tiles[8][c] = B; }
  for (let c = 136; c <= 137; c++) { tiles[7][c] = B; }
  tiles[6][137] = B;

  // stairs section 2 at col 180
  for (let c = 180; c <= 187; c++) { tiles[9][c] = B; }
  for (let c = 181; c <= 187; c++) { tiles[8][c] = B; }
  for (let c = 182; c <= 187; c++) { tiles[7][c] = B; }
  for (let c = 183; c <= 187; c++) { tiles[6][c] = B; }

  // some floating platforms
  for (let c = 50; c <= 54; c++) { tiles[9][c] = P; }
  for (let c = 108; c <= 112; c++) { tiles[9][c] = P; }
  for (let c = 116; c <= 118; c++) { tiles[7][c] = P; }
  for (let c = 160; c <= 165; c++) { tiles[9][c] = P; }
  for (let c = 195; c <= 200; c++) { tiles[10][c] = P; }

  // ── parkour sections ──────────────────────────────────────

  // parkour 1 (cols 32-42): ascending steps
  tiles[11][33] = B; tiles[11][34] = B;
  tiles[10][36] = B; tiles[10][37] = B;
  tiles[9][39] = B;  tiles[9][40] = B;
  tiles[8][42] = B;

  // parkour 2 (cols 60-68): zigzag platforms
  tiles[10][60] = B; tiles[10][61] = B;
  tiles[8][63] = B;  tiles[8][64] = B;
  tiles[10][66] = B; tiles[10][67] = B;

  // parkour 3 (cols 73-80): floating island chain
  tiles[10][73] = B; tiles[10][74] = B; tiles[10][75] = B;
  tiles[8][77] = B;  tiles[8][78] = B;
  tiles[6][80] = B;

  // parkour 4 (cols 96-104): multi-level bridge
  for (let c = 96; c <= 99; c++) { tiles[10][c] = B; }
  for (let c = 101; c <= 104; c++) { tiles[8][c] = B; }

  // parkour 5 (cols 140-150): descending staircase
  tiles[7][140] = B;
  tiles[8][142] = B; tiles[8][143] = B;
  tiles[9][145] = B; tiles[9][146] = B;
  tiles[10][148] = B; tiles[10][149] = B; tiles[10][150] = B;

  // parkour 6 (cols 168-175): alternating heights
  tiles[11][168] = B;
  tiles[9][170] = B;
  tiles[11][172] = B;
  tiles[9][174] = B;

  // parkour 7 (cols 190-194): tight jumps at height
  tiles[9][190] = B;
  tiles[7][192] = B;
  tiles[9][194] = B;

  // parkour 8 (cols 205-215): final gauntlet
  tiles[10][205] = B; tiles[10][206] = B;
  tiles[8][208] = B;  tiles[8][209] = B;
  tiles[6][211] = B;  tiles[6][212] = B;
  tiles[8][214] = B;  tiles[8][215] = B;

  return {
    width: cols * TILE,
    height: rows * TILE,
    tileSize: TILE,
    tiles,
    playerSpawn: { x: 3 * TILE, y: 11 * TILE },
    enemies: [
      { type: 'goomba', x: 22 * TILE, y: 12 * TILE },
      { type: 'goomba', x: 40 * TILE, y: 12 * TILE },
      { type: 'koopa',  x: 55 * TILE, y: 11 * TILE },
      { type: 'goomba', x: 80 * TILE, y: 12 * TILE },
      { type: 'goomba', x: 82 * TILE, y: 12 * TILE },
      { type: 'koopa',  x: 100 * TILE, y: 11 * TILE },
      { type: 'flying', x: 63 * TILE, y: 7 * TILE },
      { type: 'goomba', x: 110 * TILE, y: 12 * TILE },
      { type: 'goomba', x: 130 * TILE, y: 12 * TILE },
      { type: 'koopa',  x: 145 * TILE, y: 11 * TILE },
      { type: 'goomba', x: 170 * TILE, y: 12 * TILE },
      { type: 'goomba', x: 172 * TILE, y: 12 * TILE },
      { type: 'flying', x: 155 * TILE, y: 6 * TILE },
      { type: 'spiny',  x: 190 * TILE, y: 12 * TILE },
      { type: 'goomba', x: 205 * TILE, y: 12 * TILE },
      { type: 'koopa',  x: 215 * TILE, y: 11 * TILE },
    ],
    blocks: [
      { type: 'brick',    x: 20 * TILE, y: 9 * TILE, contents: 'none' },
      { type: 'brick',    x: 22 * TILE, y: 9 * TILE, contents: 'none' },
      { type: 'brick',    x: 79 * TILE, y: 9 * TILE, contents: 'none' },
      { type: 'brick',    x: 80 * TILE, y: 9 * TILE, contents: 'none' },
      { type: 'brick',    x: 95 * TILE, y: 5 * TILE, contents: 'none' },
      { type: 'brick',    x: 96 * TILE, y: 5 * TILE, contents: 'none' },
      { type: 'brick',    x: 107 * TILE, y: 9 * TILE, contents: 'none' },
      { type: 'brick',    x: 129 * TILE, y: 9 * TILE, contents: 'none' },
      { type: 'brick',    x: 130 * TILE, y: 9 * TILE, contents: 'none' },
      { type: 'brick',    x: 132 * TILE, y: 9 * TILE, contents: 'none' },
      { type: 'brick',    x: 175 * TILE, y: 9 * TILE, contents: 'none' },
      { type: 'brick',    x: 210 * TILE, y: 9 * TILE, contents: 'none' },
      { type: 'brick',    x: 211 * TILE, y: 9 * TILE, contents: 'none' },
    ],
    coins: [],
    pipes: [
      { x: 7 * TILE, y: 11 * TILE, h: 64 },
      { x: 28 * TILE, y: 11 * TILE, h: 64 },
      { x: 38 * TILE, y: 10 * TILE, h: 96 },
      { x: 46 * TILE, y: 9 * TILE,  h: 128 },
      { x: 57 * TILE, y: 11 * TILE, h: 64 },
      { x: 92 * TILE, y: 11 * TILE, h: 64 },
      { x: 125 * TILE, y: 10 * TILE, h: 96 },
      { x: 143 * TILE, y: 11 * TILE, h: 64 },
      { x: 178 * TILE, y: 11 * TILE, h: 64 },
      { x: 222 * TILE, y: 10 * TILE, h: 96 },
    ],
    movingPlatforms: [
      { x: 72 * TILE, y: 9 * TILE, w: 64, startX: 72 * TILE, endX: 76 * TILE, speed: 1 },
      { x: 152 * TILE, y: 8 * TILE, w: 64, startX: 150 * TILE, endX: 156 * TILE, speed: 0.8 },
    ],
    flagPole: { x: 230 * TILE, y: 3 * TILE, h: 10 * TILE },
    checkpoints: [
      { x: 100 * TILE, y: 12 * TILE },
    ],
  };
}

export function createLevel1(): LevelData {
  const base = createBaseLevel();
  const offset = 240 * TILE;
  const firstFiveArea = 80 * TILE;
  return {
    ...base,
    width: 320 * TILE,
    tiles: base.tiles.map(row => [...row, ...row.slice(0, 80)]),
    enemies: [...base.enemies,
      ...base.enemies.filter(enemy => enemy.x < firstFiveArea).map(enemy => ({ ...enemy, x: enemy.x + offset }))],
    blocks: [...base.blocks,
      ...base.blocks.filter(block => block.x < firstFiveArea).map(block => ({ ...block, x: block.x + offset }))],
    pipes: [...base.pipes,
      ...base.pipes.slice(0, 5).map(pipe => ({ ...pipe, x: pipe.x + offset }))],
    movingPlatforms: [...base.movingPlatforms,
      ...base.movingPlatforms.filter(platform => platform.x < firstFiveArea).map(platform => ({
        ...platform, x: platform.x + offset,
        startX: platform.startX + offset, endX: platform.endX + offset,
      }))],
    checkpoints: [...base.checkpoints, { x: 260 * TILE, y: 12 * TILE }],
    flagPole: { x: 315 * TILE, y: 3 * TILE, h: 10 * TILE },
  };
}

export function createLevel2(): LevelData {
  const base = createBaseLevel();
  const segment = 240 * TILE;
  const width = 560 * TILE;
  const tiles = base.tiles.map(row => [
    ...row,
    ...row,
    ...row.slice(0, 80),
  ]);
  const shifted = <T extends { x: number }>(items: T[], offset: number) =>
    items.map(item => ({ ...item, x: item.x + offset }));
  const repeat = <T extends { x: number }>(items: T[]) => [
    ...shifted(items, 0), ...shifted(items, segment),
    ...shifted(items.filter(item => item.x < 80 * TILE), segment * 2),
  ];
  return {
    ...base,
    width,
    tiles,
    enemies: repeat(base.enemies),
    blocks: repeat(base.blocks),
    pipes: [
      ...shifted(base.pipes, 0),
      ...shifted(base.pipes, segment),
      ...shifted(base.pipes.slice(0, 5), segment * 2),
    ],
    movingPlatforms: [0, segment, segment * 2].flatMap((offset, index) =>
      base.movingPlatforms.filter(platform => index < 2 || platform.x < 80 * TILE)
        .map(platform => ({ ...platform, x: platform.x + offset,
          startX: platform.startX + offset, endX: platform.endX + offset }))),
    checkpoints: [
      ...shifted(base.checkpoints, 0),
      ...shifted(base.checkpoints, segment),
      { x: 500 * TILE, y: 12 * TILE },
    ],
    flagPole: { x: 555 * TILE, y: 3 * TILE, h: 10 * TILE },
  };
}
