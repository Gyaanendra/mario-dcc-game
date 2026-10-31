import { COLORS, TILE } from './config';
import type { PlayerState, Direction, EnemyEntity, Particle } from './types';

const p = 2; // pixel scale for character sprites

function flipDraw(
  ctx: CanvasRenderingContext2D,
  x: number,
  w: number,
  drawFn: (ctx: CanvasRenderingContext2D, x: number) => void,
  direction: Direction
) {
  if (direction === -1) {
    ctx.save();
    ctx.translate(x + w / 2, 0);
    ctx.scale(-1, 1);
    drawFn(ctx, -w / 2);
    ctx.restore();
  } else {
    drawFn(ctx, x);
  }
}

// ---------------------------------------------------------------------------
// 1. PLAYER
// ---------------------------------------------------------------------------

export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  state: PlayerState,
  direction: Direction,
  animFrame: number,
  _powerLevel: number,
  invuln: number
) {
  if (invuln > 0 && Math.floor(invuln / 3) % 2 === 0) return;

  flipDraw(ctx, x, 28, (ctx2, bx) => {
    drawPlayerInner(ctx2, bx, y, state, animFrame);
  }, direction);
}

function drawPlayerInner(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  state: PlayerState,
  animFrame: number
) {
  // Dead state — flipped upside-down Mario
  if (state === 'dead') {
    ctx.fillStyle = COLORS.marioRed;
    ctx.fillRect(x + 3 * p, y + 10 * p, 6 * p, 2 * p);
    ctx.fillRect(x + 2 * p, y + 11 * p, 8 * p, p);
    ctx.fillStyle = COLORS.marioSkin;
    ctx.fillRect(x + 4 * p, y + 8 * p, 4 * p, 2 * p);
    ctx.fillStyle = COLORS.marioBlue;
    ctx.fillRect(x + 3 * p, y + 3 * p, 6 * p, 5 * p);
    ctx.fillStyle = COLORS.marioHair;
    ctx.fillRect(x + 2 * p, y, 3 * p, 2 * p);
    ctx.fillRect(x + 7 * p, y, 3 * p, 2 * p);
    return;
  }

  // Victory — arms raised
  if (state === 'victory') {
    // Hat
    ctx.fillStyle = COLORS.marioRed;
    ctx.fillRect(x + 3 * p, y, 6 * p, 2 * p);
    ctx.fillRect(x + 2 * p, y + p, 8 * p, p);
    // Face
    ctx.fillStyle = COLORS.marioSkin;
    ctx.fillRect(x + 3 * p, y + 2 * p, 6 * p, 3 * p);
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 4 * p, y + 3 * p, p, p);
    ctx.fillRect(x + 7 * p, y + 3 * p, p, p);
    // Smile
    ctx.fillRect(x + 5 * p, y + 4 * p, 2 * p, p);
    // Body / overalls
    ctx.fillStyle = COLORS.marioRed;
    ctx.fillRect(x + 3 * p, y + 5 * p, 6 * p, 2 * p);
    ctx.fillStyle = COLORS.marioBlue;
    ctx.fillRect(x + 3 * p, y + 7 * p, 6 * p, 4 * p);
    // Arms up
    ctx.fillStyle = COLORS.marioRed;
    ctx.fillRect(x + p, y + 3 * p, 2 * p, 3 * p);
    ctx.fillRect(x + 9 * p, y + 3 * p, 2 * p, 3 * p);
    ctx.fillStyle = COLORS.marioSkin;
    ctx.fillRect(x + p, y + p, 2 * p, 2 * p);
    ctx.fillRect(x + 9 * p, y + p, 2 * p, 2 * p);
    // Shoes
    ctx.fillStyle = COLORS.marioHair;
    ctx.fillRect(x + 2 * p, y + 11 * p, 3 * p, 2 * p);
    ctx.fillRect(x + 7 * p, y + 11 * p, 3 * p, 2 * p);
    return;
  }

  // Landing — crouched
  if (state === 'landing') {
    ctx.fillStyle = COLORS.marioRed;
    ctx.fillRect(x + 3 * p, y + 2 * p, 6 * p, 2 * p);
    ctx.fillRect(x + 2 * p, y + 3 * p, 8 * p, p);
    ctx.fillStyle = COLORS.marioSkin;
    ctx.fillRect(x + 4 * p, y + 4 * p, 4 * p, 2 * p);
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 5 * p, y + 4 * p, p, p);
    ctx.fillRect(x + 7 * p, y + 4 * p, p, p);
    ctx.fillStyle = COLORS.marioRed;
    ctx.fillRect(x + 3 * p, y + 6 * p, 6 * p, 2 * p);
    ctx.fillStyle = COLORS.marioBlue;
    ctx.fillRect(x + 2 * p, y + 8 * p, 8 * p, 3 * p);
    ctx.fillStyle = COLORS.marioHair;
    ctx.fillRect(x + p, y + 11 * p, 4 * p, 2 * p);
    ctx.fillRect(x + 7 * p, y + 11 * p, 4 * p, 2 * p);
    return;
  }

  // Jumping / Falling
  if (state === 'jumping' || state === 'falling') {
    // Hat
    ctx.fillStyle = COLORS.marioRed;
    ctx.fillRect(x + 3 * p, y, 6 * p, 2 * p);
    ctx.fillRect(x + 2 * p, y + p, 8 * p, p);
    // Hair
    ctx.fillStyle = COLORS.marioHair;
    ctx.fillRect(x + 2 * p, y + 2 * p, 2 * p, 2 * p);
    ctx.fillRect(x + 6 * p, y + 3 * p, 3 * p, p);
    // Face
    ctx.fillStyle = COLORS.marioSkin;
    ctx.fillRect(x + 4 * p, y + 2 * p, 4 * p, 3 * p);
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 6 * p, y + 2 * p, p, p);
    // Red shirt
    ctx.fillStyle = COLORS.marioRed;
    ctx.fillRect(x + 2 * p, y + 5 * p, 8 * p, 2 * p);
    // Overalls
    ctx.fillStyle = COLORS.marioBlue;
    ctx.fillRect(x + 3 * p, y + 7 * p, 6 * p, 4 * p);
    ctx.fillStyle = COLORS.coinGold;
    ctx.fillRect(x + 4 * p, y + 7 * p, p, p);
    // Arm reaching up
    ctx.fillStyle = COLORS.marioSkin;
    ctx.fillRect(x + 8 * p, y - p, 2 * p, 2 * p);
    ctx.fillStyle = COLORS.marioRed;
    ctx.fillRect(x + 8 * p, y + p, 2 * p, 3 * p);
    // Legs spread
    ctx.fillStyle = COLORS.marioHair;
    if (state === 'jumping') {
      ctx.fillRect(x + p, y + 11 * p, 4 * p, 2 * p);
      ctx.fillRect(x + 7 * p, y + 10 * p, 4 * p, 2 * p);
    } else {
      ctx.fillRect(x + 2 * p, y + 11 * p, 3 * p, 2 * p);
      ctx.fillRect(x + 7 * p, y + 11 * p, 3 * p, 2 * p);
    }
    return;
  }

  // Damaged — draw blinking tinted version
  if (state === 'damaged') {
    if (Math.floor(animFrame / 2) % 2 === 0) {
      drawPlayerStanding(ctx, x, y);
    }
    return;
  }

  // Powerup — flash between normal and white
  if (state === 'powerup') {
    if (Math.floor(animFrame / 3) % 2 === 0) {
      // White flash
      ctx.fillStyle = '#FFF';
      ctx.fillRect(x + 2 * p, y, 8 * p, 13 * p);
    } else {
      drawPlayerStanding(ctx, x, y);
    }
    return;
  }

  // Walking / Running / Idle
  if (state === 'walking' || state === 'running') {
    const runFrame = animFrame % 3;
    drawPlayerWalking(ctx, x, y, runFrame);
    return;
  }

  // Default: idle
  drawPlayerStanding(ctx, x, y);
}

function drawPlayerStanding(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Hat
  ctx.fillStyle = COLORS.marioRed;
  ctx.fillRect(x + 3 * p, y, 6 * p, 2 * p);
  ctx.fillRect(x + 2 * p, y + p, 9 * p, p);
  // Hair
  ctx.fillStyle = COLORS.marioHair;
  ctx.fillRect(x + 2 * p, y + 2 * p, 2 * p, 2 * p);
  ctx.fillRect(x + 6 * p, y + 3 * p, 3 * p, p);
  // Face
  ctx.fillStyle = COLORS.marioSkin;
  ctx.fillRect(x + 4 * p, y + 2 * p, 4 * p, 3 * p);
  ctx.fillRect(x + 8 * p, y + 3 * p, p, 2 * p);
  ctx.fillStyle = '#000';
  ctx.fillRect(x + 6 * p, y + 2 * p, p, p);
  // Mustache
  ctx.fillStyle = COLORS.marioHair;
  ctx.fillRect(x + 5 * p, y + 4 * p, 4 * p, p);
  // Red shirt
  ctx.fillStyle = COLORS.marioRed;
  ctx.fillRect(x + 2 * p, y + 5 * p, 8 * p, 2 * p);
  // Arms
  ctx.fillStyle = COLORS.marioSkin;
  ctx.fillRect(x + p, y + 6 * p, 2 * p, 2 * p);
  ctx.fillRect(x + 9 * p, y + 6 * p, 2 * p, 2 * p);
  // Overalls
  ctx.fillStyle = COLORS.marioBlue;
  ctx.fillRect(x + 3 * p, y + 7 * p, 6 * p, 4 * p);
  ctx.fillStyle = COLORS.coinGold;
  ctx.fillRect(x + 4 * p, y + 7 * p, p, p);
  ctx.fillRect(x + 7 * p, y + 7 * p, p, p);
  // Shoes
  ctx.fillStyle = COLORS.marioHair;
  ctx.fillRect(x + 2 * p, y + 11 * p, 3 * p, 2 * p);
  ctx.fillRect(x + 7 * p, y + 11 * p, 3 * p, 2 * p);
}

function drawPlayerWalking(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  // Hat
  ctx.fillStyle = COLORS.marioRed;
  ctx.fillRect(x + 3 * p, y, 6 * p, 2 * p);
  ctx.fillRect(x + 2 * p, y + p, 9 * p, p);
  // Hair
  ctx.fillStyle = COLORS.marioHair;
  ctx.fillRect(x + 2 * p, y + 2 * p, 2 * p, 2 * p);
  ctx.fillRect(x + 6 * p, y + 3 * p, 3 * p, p);
  // Face
  ctx.fillStyle = COLORS.marioSkin;
  ctx.fillRect(x + 4 * p, y + 2 * p, 4 * p, 3 * p);
  ctx.fillRect(x + 8 * p, y + 3 * p, p, 2 * p);
  ctx.fillStyle = '#000';
  ctx.fillRect(x + 6 * p, y + 2 * p, p, p);
  // Red shirt
  ctx.fillStyle = COLORS.marioRed;
  ctx.fillRect(x + 2 * p, y + 5 * p, 8 * p, 2 * p);
  // Trailing arm
  ctx.fillStyle = COLORS.marioSkin;
  ctx.fillRect(x + (frame === 1 ? 9 : 10) * p, y + 6 * p, 2 * p, 2 * p);
  // Overalls
  ctx.fillStyle = COLORS.marioBlue;
  ctx.fillRect(x + 3 * p, y + 7 * p, 6 * p, 4 * p);
  ctx.fillStyle = COLORS.coinGold;
  ctx.fillRect(x + 4 * p, y + 7 * p, p, p);
  // Legs & shoes
  ctx.fillStyle = COLORS.marioHair;
  if (frame === 0) {
    ctx.fillRect(x + 2 * p, y + 11 * p, 3 * p, 2 * p);
    ctx.fillRect(x + 7 * p, y + 11 * p, 3 * p, 2 * p);
  } else if (frame === 1) {
    ctx.fillRect(x + p, y + 10 * p, 3 * p, 2 * p);
    ctx.fillRect(x + 8 * p, y + 11 * p, 4 * p, 2 * p);
  } else {
    ctx.fillRect(x + 3 * p, y + 11 * p, 4 * p, 2 * p);
    ctx.fillRect(x + 7 * p, y + 10 * p, 3 * p, 2 * p);
  }
}

// ---------------------------------------------------------------------------
// 2. GOOMBA
// ---------------------------------------------------------------------------

export function drawGoomba(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  animFrame: number,
  alive: boolean,
  deathTimer: number
) {
  if (!alive) {
    if (deathTimer > 0) {
      ctx.globalAlpha = Math.min(1, deathTimer / 15);
      // Squished flat
      ctx.fillStyle = COLORS.goombaBrown;
      ctx.fillRect(x, y + 10 * p, 14 * p, 3 * p);
      ctx.fillStyle = COLORS.goombaDark;
      ctx.fillRect(x + p, y + 11 * p, 12 * p, p);
      ctx.globalAlpha = 1;
    }
    return;
  }

  const footOff = animFrame % 2 === 0 ? 0 : p;

  // Brown body (round top)
  ctx.fillStyle = COLORS.goombaBrown;
  ctx.fillRect(x + 2 * p, y, 10 * p, 4 * p);
  ctx.fillRect(x + p, y + 2 * p, 12 * p, 5 * p);
  ctx.fillRect(x + 2 * p, y + 7 * p, 10 * p, 2 * p);

  // Dark top cap
  ctx.fillStyle = COLORS.goombaDark;
  ctx.fillRect(x + 3 * p, y, 8 * p, 2 * p);

  // White/angry eyes
  ctx.fillStyle = '#FFF';
  ctx.fillRect(x + 3 * p, y + 3 * p, 3 * p, 3 * p);
  ctx.fillRect(x + 8 * p, y + 3 * p, 3 * p, 3 * p);
  // Pupils (angry, looking down-inward)
  ctx.fillStyle = '#000';
  ctx.fillRect(x + 4 * p, y + 4 * p, 2 * p, 2 * p);
  ctx.fillRect(x + 8 * p, y + 4 * p, 2 * p, 2 * p);
  // Angry eyebrow lines
  ctx.fillRect(x + 3 * p, y + 2 * p, 3 * p, p);
  ctx.fillRect(x + 8 * p, y + 2 * p, 3 * p, p);

  // Small frown
  ctx.fillStyle = '#000';
  ctx.fillRect(x + 5 * p, y + 7 * p, 4 * p, p);

  // Feet
  ctx.fillStyle = COLORS.goombaDark;
  ctx.fillRect(x + p - footOff, y + 9 * p, 4 * p, 3 * p);
  ctx.fillRect(x + 9 * p + footOff, y + 9 * p, 4 * p, 3 * p);

  // Foot sole highlight
  ctx.fillStyle = COLORS.goombaLight;
  ctx.fillRect(x + p - footOff, y + 11 * p, 4 * p, p);
  ctx.fillRect(x + 9 * p + footOff, y + 11 * p, 4 * p, p);
}

// ---------------------------------------------------------------------------
// 3. KOOPA
// ---------------------------------------------------------------------------

export function drawKoopa(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  direction: Direction,
  animFrame: number,
  inShell: boolean,
  shellMoving: boolean
) {
  if (inShell) {
    drawKoopaShellInternal(ctx, x, y + 6 * p, shellMoving, animFrame);
    return;
  }

  flipDraw(ctx, x, 28, (ctx2, bx) => {
    drawKoopaWalking(ctx2, bx, y, animFrame);
  }, direction);
}

function drawKoopaShellInternal(ctx: CanvasRenderingContext2D, x: number, y: number, moving: boolean, frame: number) {
  // Green shell
  ctx.fillStyle = COLORS.koopaGreen;
  ctx.fillRect(x + 2 * p, y, 10 * p, 8 * p);
  ctx.fillRect(x + p, y + p, 12 * p, 6 * p);

  // Shell highlight
  ctx.fillStyle = COLORS.koopaLight;
  ctx.fillRect(x + 3 * p, y + p, 2 * p, 2 * p);

  // Shell border
  ctx.fillStyle = COLORS.koopaShell;
  ctx.fillRect(x + 2 * p, y + 7 * p, 10 * p, p);

  // White belly stripe
  ctx.fillStyle = '#FFF';
  ctx.fillRect(x + 4 * p, y + 4 * p, 6 * p, 3 * p);

  if (moving) {
    // Speed lines
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    const off = frame % 3;
    ctx.fillRect(x - 2 * p - off * p, y + 2 * p, 3 * p, p);
    ctx.fillRect(x - p - off * p, y + 5 * p, 2 * p, p);
  }
}

function drawKoopaWalking(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  const step = frame % 2;

  // Head
  ctx.fillStyle = COLORS.koopaSkin;
  ctx.fillRect(x + 7 * p, y, 5 * p, 5 * p);
  // Eye
  ctx.fillStyle = '#FFF';
  ctx.fillRect(x + 9 * p, y + p, 3 * p, 2 * p);
  ctx.fillStyle = '#000';
  ctx.fillRect(x + 10 * p, y + p, 2 * p, 2 * p);
  // Beak
  ctx.fillStyle = COLORS.koopaSkin;
  ctx.fillRect(x + 11 * p, y + 3 * p, 2 * p, p);

  // Shell
  ctx.fillStyle = COLORS.koopaGreen;
  ctx.fillRect(x + 2 * p, y + 3 * p, 8 * p, 8 * p);
  ctx.fillRect(x + p, y + 4 * p, 10 * p, 6 * p);
  // Shell highlight
  ctx.fillStyle = COLORS.koopaLight;
  ctx.fillRect(x + 3 * p, y + 4 * p, 2 * p, 2 * p);
  // Shell belly
  ctx.fillStyle = '#FFF';
  ctx.fillRect(x + 4 * p, y + 8 * p, 5 * p, 2 * p);

  // Legs
  ctx.fillStyle = COLORS.koopaSkin;
  if (step === 0) {
    ctx.fillRect(x + 3 * p, y + 11 * p, 3 * p, 3 * p);
    ctx.fillRect(x + 7 * p, y + 12 * p, 3 * p, 2 * p);
  } else {
    ctx.fillRect(x + 3 * p, y + 12 * p, 3 * p, 2 * p);
    ctx.fillRect(x + 7 * p, y + 11 * p, 3 * p, 3 * p);
  }
  // Shoes
  ctx.fillStyle = COLORS.marioHair;
  ctx.fillRect(x + 2 * p, y + 13 * p + (step === 0 ? p : 0), 4 * p, p);
  ctx.fillRect(x + 7 * p, y + 13 * p + (step === 1 ? p : 0), 4 * p, p);
}

// ---------------------------------------------------------------------------
// 4. FLYING ENEMY
// ---------------------------------------------------------------------------

export function drawFlyingEnemy(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  animFrame: number
) {
  const wingUp = animFrame % 2 === 0;

  // Body
  ctx.fillStyle = COLORS.goombaBrown;
  ctx.fillRect(x + 3 * p, y + 3 * p, 9 * p, 7 * p);
  ctx.fillRect(x + 4 * p, y + 2 * p, 7 * p, 9 * p);

  // Eyes
  ctx.fillStyle = '#FFF';
  ctx.fillRect(x + 4 * p, y + 4 * p, 3 * p, 2 * p);
  ctx.fillRect(x + 8 * p, y + 4 * p, 3 * p, 2 * p);
  ctx.fillStyle = '#000';
  ctx.fillRect(x + 5 * p, y + 4 * p, 2 * p, 2 * p);
  ctx.fillRect(x + 9 * p, y + 4 * p, 2 * p, 2 * p);

  // Mouth
  ctx.fillStyle = '#000';
  ctx.fillRect(x + 5 * p, y + 8 * p, 5 * p, p);

  // Wings
  ctx.fillStyle = '#FFF';
  if (wingUp) {
    // Wings up
    ctx.fillRect(x, y, 3 * p, 4 * p);
    ctx.fillRect(x + p, y - p, 2 * p, 2 * p);
    ctx.fillRect(x + 12 * p, y, 3 * p, 4 * p);
    ctx.fillRect(x + 12 * p, y - p, 2 * p, 2 * p);
  } else {
    // Wings down
    ctx.fillRect(x, y + 5 * p, 3 * p, 4 * p);
    ctx.fillRect(x + 12 * p, y + 5 * p, 3 * p, 4 * p);
  }

  // Feet
  ctx.fillStyle = COLORS.goombaDark;
  ctx.fillRect(x + 4 * p, y + 11 * p, 3 * p, 2 * p);
  ctx.fillRect(x + 8 * p, y + 11 * p, 3 * p, 2 * p);
}

// ---------------------------------------------------------------------------
// 5. SPINY
// ---------------------------------------------------------------------------

export function drawSpiny(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  animFrame: number
) {
  const step = animFrame % 2;

  // Red body
  ctx.fillStyle = '#E85020';
  ctx.fillRect(x + 2 * p, y + 3 * p, 10 * p, 6 * p);
  ctx.fillRect(x + 3 * p, y + 2 * p, 8 * p, 8 * p);

  // Spikes on top
  ctx.fillStyle = '#FFF';
  ctx.fillRect(x + 3 * p, y, 2 * p, 3 * p);
  ctx.fillRect(x + 6 * p, y - p, 2 * p, 3 * p);
  ctx.fillRect(x + 9 * p, y, 2 * p, 3 * p);

  // Spike tips
  ctx.fillStyle = COLORS.marioRed;
  ctx.fillRect(x + 3 * p, y, 2 * p, p);
  ctx.fillRect(x + 6 * p, y - p, 2 * p, p);
  ctx.fillRect(x + 9 * p, y, 2 * p, p);

  // Eyes
  ctx.fillStyle = '#FFF';
  ctx.fillRect(x + 3 * p, y + 4 * p, 3 * p, 2 * p);
  ctx.fillRect(x + 8 * p, y + 4 * p, 3 * p, 2 * p);
  ctx.fillStyle = '#000';
  ctx.fillRect(x + 4 * p, y + 4 * p, 2 * p, 2 * p);
  ctx.fillRect(x + 9 * p, y + 4 * p, 2 * p, 2 * p);

  // Feet
  ctx.fillStyle = '#C84000';
  if (step === 0) {
    ctx.fillRect(x + 2 * p, y + 10 * p, 4 * p, 2 * p);
    ctx.fillRect(x + 8 * p, y + 10 * p, 4 * p, 2 * p);
  } else {
    ctx.fillRect(x + p, y + 10 * p, 4 * p, 2 * p);
    ctx.fillRect(x + 9 * p, y + 10 * p, 4 * p, 2 * p);
  }
}

// ---------------------------------------------------------------------------
// 6. QUESTION BLOCK
// ---------------------------------------------------------------------------

export function drawQuestionBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  hit: boolean,
  bounceOffset: number,
  tick: number
) {
  const dy = y + bounceOffset;

  // Outer black border
  ctx.fillStyle = '#000';
  ctx.fillRect(x, dy, TILE, TILE);

  // Fill
  ctx.fillStyle = hit ? '#8B5A2B' : COLORS.questionOrange;
  ctx.fillRect(x + 2, dy + 2, TILE - 4, TILE - 4);

  // Highlight top-left
  ctx.fillStyle = hit ? '#A06E3B' : COLORS.questionLight;
  ctx.fillRect(x + 2, dy + 2, TILE - 4, 2);
  ctx.fillRect(x + 2, dy + 2, 2, TILE - 4);

  // Shadow bottom-right
  ctx.fillStyle = hit ? '#5C381E' : COLORS.questionDark;
  ctx.fillRect(x + 2, dy + TILE - 4, TILE - 4, 2);
  ctx.fillRect(x + TILE - 4, dy + 2, 2, TILE - 4);

  // Corner rivets
  ctx.fillStyle = '#000';
  ctx.fillRect(x + 4, dy + 4, 2, 2);
  ctx.fillRect(x + TILE - 6, dy + 4, 2, 2);
  ctx.fillRect(x + 4, dy + TILE - 6, 2, 2);
  ctx.fillRect(x + TILE - 6, dy + TILE - 6, 2, 2);

  if (!hit) {
    // Flashing question mark
    const flash = Math.floor(tick / 12) % 2 === 0;
    ctx.fillStyle = flash ? '#FFF' : COLORS.questionLight;
    // '?' shape
    ctx.fillRect(x + 10, dy + 6, 12, 3);
    ctx.fillRect(x + 18, dy + 9, 4, 5);
    ctx.fillRect(x + 13, dy + 13, 6, 3);
    ctx.fillRect(x + 13, dy + 18, 5, 3);
    // dot
    ctx.fillRect(x + 13, dy + 23, 5, 3);
  } else {
    // Empty dark center
    ctx.fillStyle = '#5C381E';
    ctx.fillRect(x + 8, dy + 8, TILE - 16, TILE - 16);
  }
}

// ---------------------------------------------------------------------------
// 7. BRICK BLOCK
// ---------------------------------------------------------------------------

export function drawBrickBlock(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Base brown fill
  ctx.fillStyle = COLORS.brickOrange;
  ctx.fillRect(x, y, TILE, TILE);

  // Highlight top-left
  ctx.fillStyle = COLORS.brickLight;
  ctx.fillRect(x, y, TILE, 2);
  ctx.fillRect(x, y, 2, TILE);

  // Shadow bottom-right
  ctx.fillStyle = COLORS.brickDark;
  ctx.fillRect(x, y + TILE - 2, TILE, 2);
  ctx.fillRect(x + TILE - 2, y, 2, TILE);

  // Mortar lines (horizontal)
  ctx.fillStyle = COLORS.brickLine;
  ctx.fillRect(x, y + 8, TILE, 1);
  ctx.fillRect(x, y + 16, TILE, 1);
  ctx.fillRect(x, y + 24, TILE, 1);

  // Mortar lines (vertical, staggered)
  ctx.fillRect(x + 16, y, 1, 8);
  ctx.fillRect(x + 8, y + 8, 1, 8);
  ctx.fillRect(x + 24, y + 8, 1, 8);
  ctx.fillRect(x + 16, y + 16, 1, 8);
  ctx.fillRect(x + 8, y + 24, 1, 8);
  ctx.fillRect(x + 24, y + 24, 1, 8);
}

// ---------------------------------------------------------------------------
// 8. COIN
// ---------------------------------------------------------------------------

export function drawCoin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  animFrame: number
) {
  const frame = animFrame % 4;
  const widths = [14, 10, 4, 10];
  const w = widths[frame];
  const cx = x + (16 - w) / 2;

  // Outline
  ctx.fillStyle = '#000';
  ctx.fillRect(cx - 1, y, w + 2, 16);
  ctx.fillRect(cx, y - 1, w, 18);

  // Gold fill
  ctx.fillStyle = COLORS.coinGold;
  ctx.fillRect(cx, y, w, 16);

  // Highlight stripe
  if (w > 4) {
    ctx.fillStyle = COLORS.coinLight;
    ctx.fillRect(cx + 1, y + 2, Math.max(1, Math.floor(w / 4)), 12);
    // Inner shadow
    ctx.fillStyle = COLORS.coinDark;
    ctx.fillRect(cx + w - Math.max(1, Math.floor(w / 4)) - 1, y + 2, Math.max(1, Math.floor(w / 4)), 12);
  }
}

// ---------------------------------------------------------------------------
// 9. PIPE
// ---------------------------------------------------------------------------

export function drawPipe(ctx: CanvasRenderingContext2D, x: number, y: number, h: number) {
  const rimH = 16;
  const rimW = 64;
  const stemW = 48;
  const stemOff = (rimW - stemW) / 2;

  // Rim black outline
  ctx.fillStyle = '#000';
  ctx.fillRect(x, y, rimW, rimH);
  // Rim fill
  ctx.fillStyle = COLORS.pipeGreen;
  ctx.fillRect(x + 2, y + 2, rimW - 4, rimH - 4);
  // Rim highlight
  ctx.fillStyle = COLORS.pipeLight;
  ctx.fillRect(x + 2, y + 2, rimW - 4, 2);
  ctx.fillRect(x + 2, y + 2, 6, rimH - 4);
  // Rim dark side
  ctx.fillStyle = COLORS.pipeDark;
  ctx.fillRect(x + rimW - 8, y + 2, 6, rimH - 4);

  // Stem black outline
  ctx.fillStyle = '#000';
  ctx.fillRect(x + stemOff, y + rimH, stemW, h - rimH);
  // Stem fill
  ctx.fillStyle = COLORS.pipeGreen;
  ctx.fillRect(x + stemOff + 2, y + rimH, stemW - 4, h - rimH);
  // Stem highlight
  ctx.fillStyle = COLORS.pipeLight;
  ctx.fillRect(x + stemOff + 2, y + rimH, 6, h - rimH);
  // Stem dark
  ctx.fillStyle = COLORS.pipeDark;
  ctx.fillRect(x + stemOff + stemW - 8, y + rimH, 6, h - rimH);
}

// ---------------------------------------------------------------------------
// 10. MUSHROOM
// ---------------------------------------------------------------------------

export function drawMushroom(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Red dome top
  ctx.fillStyle = COLORS.mushroomRed;
  ctx.fillRect(x + 2 * p, y, 10 * p, 4 * p);
  ctx.fillRect(x + p, y + p, 12 * p, 3 * p);

  // White spots
  ctx.fillStyle = COLORS.mushroomWhite;
  ctx.fillRect(x + 3 * p, y + p, 3 * p, 2 * p);
  ctx.fillRect(x + 8 * p, y + p, 3 * p, 2 * p);
  ctx.fillRect(x + 6 * p, y, 2 * p, p);

  // White stem
  ctx.fillStyle = COLORS.mushroomWhite;
  ctx.fillRect(x + 3 * p, y + 4 * p, 8 * p, 5 * p);

  // Eyes
  ctx.fillStyle = '#000';
  ctx.fillRect(x + 4 * p, y + 5 * p, 2 * p, 2 * p);
  ctx.fillRect(x + 8 * p, y + 5 * p, 2 * p, 2 * p);

  // Black outline bottom
  ctx.fillStyle = '#000';
  ctx.fillRect(x + 3 * p, y + 9 * p, 8 * p, p);
}

// ---------------------------------------------------------------------------
// 11. CLOUD
// ---------------------------------------------------------------------------

export function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  const s = w / 96;
  ctx.fillStyle = COLORS.cloud;
  // Center blob
  ctx.beginPath();
  ctx.ellipse(x + 48 * s, y + 16 * s, 36 * s, 16 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Left bump
  ctx.beginPath();
  ctx.ellipse(x + 20 * s, y + 20 * s, 22 * s, 14 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Right bump
  ctx.beginPath();
  ctx.ellipse(x + 72 * s, y + 20 * s, 24 * s, 14 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Top bumps
  ctx.beginPath();
  ctx.ellipse(x + 34 * s, y + 8 * s, 16 * s, 12 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + 60 * s, y + 10 * s, 14 * s, 10 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Shadow line at bottom
  ctx.fillStyle = COLORS.cloudShadow;
  ctx.beginPath();
  ctx.ellipse(x + 48 * s, y + 30 * s, 38 * s, 6 * s, 0, 0, Math.PI);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// 12. HILL
// ---------------------------------------------------------------------------

export function drawHill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  withSpots: boolean
) {
  ctx.fillStyle = COLORS.hillGreen;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y, w / 2, h, 0, 0, Math.PI, true);
  ctx.fill();

  // Lighter rim at top
  ctx.fillStyle = COLORS.hillLight;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y, w / 2 - 4, h - 6, 0, Math.PI, Math.PI + 0.6, true);
  ctx.fill();

  if (withSpots) {
    ctx.fillStyle = COLORS.hillSpot;
    const spots = [
      { cx: 0.3, cy: 0.5, r: 0.08 },
      { cx: 0.5, cy: 0.35, r: 0.1 },
      { cx: 0.65, cy: 0.55, r: 0.07 },
      { cx: 0.4, cy: 0.7, r: 0.06 },
      { cx: 0.6, cy: 0.75, r: 0.05 },
    ];
    for (const s of spots) {
      ctx.beginPath();
      ctx.arc(x + w * s.cx, y - h * s.cy, w * s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ---------------------------------------------------------------------------
// 13. BUSH
// ---------------------------------------------------------------------------

export function drawBush(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  ctx.fillStyle = COLORS.hillGreen;
  ctx.beginPath();
  ctx.ellipse(x + w * 0.25, y, w * 0.28, 14, 0, 0, Math.PI, true);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + w * 0.5, y, w * 0.3, 18, 0, 0, Math.PI, true);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + w * 0.75, y, w * 0.28, 14, 0, 0, Math.PI, true);
  ctx.fill();

  // Lighter highlights
  ctx.fillStyle = COLORS.hillLight;
  ctx.beginPath();
  ctx.ellipse(x + w * 0.5, y - 4, w * 0.18, 8, 0, 0, Math.PI, true);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// 14. GROUND TILE
// ---------------------------------------------------------------------------

export function drawGroundTile(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Grass strip on top
  ctx.fillStyle = COLORS.grassGreen;
  ctx.fillRect(x, y, TILE, 3);
  ctx.fillStyle = COLORS.grassDark;
  ctx.fillRect(x, y + 3, TILE, 1);

  // Dirt / brick brown pattern
  ctx.fillStyle = COLORS.groundBrown;
  ctx.fillRect(x, y + 4, TILE, TILE - 4);

  // Brick mortar lines
  ctx.fillStyle = COLORS.groundDark;
  ctx.fillRect(x, y + 12, TILE, 1);
  ctx.fillRect(x, y + 22, TILE, 1);
  ctx.fillRect(x + 8, y + 4, 1, 8);
  ctx.fillRect(x + 24, y + 4, 1, 8);
  ctx.fillRect(x + 16, y + 12, 1, 10);
  ctx.fillRect(x + 8, y + 22, 1, 10);
  ctx.fillRect(x + 24, y + 22, 1, 10);
}

// ---------------------------------------------------------------------------
// 15. DEEP GROUND
// ---------------------------------------------------------------------------

export function drawDeepGround(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = COLORS.groundDeep;
  ctx.fillRect(x, y, TILE, TILE);

  // Brick mortar lines
  ctx.fillStyle = COLORS.groundDark;
  ctx.fillRect(x, y + 10, TILE, 1);
  ctx.fillRect(x, y + 21, TILE, 1);
  ctx.fillRect(x + 16, y, 1, 10);
  ctx.fillRect(x + 8, y + 10, 1, 11);
  ctx.fillRect(x + 24, y + 10, 1, 11);
  ctx.fillRect(x + 16, y + 21, 1, 11);
}

// ---------------------------------------------------------------------------
// 16. PLATFORM TILE
// ---------------------------------------------------------------------------

export function drawPlatformTile(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = COLORS.brickOrange;
  ctx.fillRect(x, y, TILE, TILE);

  // Top edge highlight
  ctx.fillStyle = COLORS.brickLight;
  ctx.fillRect(x, y, TILE, 3);
  ctx.fillRect(x, y, 2, TILE);

  // Shadow
  ctx.fillStyle = COLORS.brickDark;
  ctx.fillRect(x, y + TILE - 2, TILE, 2);
  ctx.fillRect(x + TILE - 2, y, 2, TILE);

  // Brick lines
  ctx.fillStyle = COLORS.brickLine;
  ctx.fillRect(x, y + 10, TILE, 1);
  ctx.fillRect(x, y + 21, TILE, 1);
  ctx.fillRect(x + 16, y + 3, 1, 7);
  ctx.fillRect(x + 8, y + 10, 1, 11);
  ctx.fillRect(x + 24, y + 10, 1, 11);
  ctx.fillRect(x + 16, y + 21, 1, 11);
}

// ---------------------------------------------------------------------------
// 17. FLAG
// ---------------------------------------------------------------------------

export function drawFlag(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  flagY: number
) {
  // Pole
  ctx.fillStyle = '#888';
  ctx.fillRect(x + 2, y, 4, h);
  ctx.fillStyle = '#AAA';
  ctx.fillRect(x + 2, y, 2, h);

  // Gold ball on top
  ctx.fillStyle = COLORS.coinGold;
  ctx.fillRect(x - 1, y - 4, 10, 8);
  ctx.fillStyle = '#FFF';
  ctx.fillRect(x, y - 3, 3, 3);

  // Green triangular flag
  const fy = y + flagY;
  ctx.fillStyle = COLORS.flagGreen;
  ctx.fillRect(x + 6, fy, 4, 20);
  ctx.fillRect(x + 10, fy + 2, 4, 16);
  ctx.fillRect(x + 14, fy + 4, 4, 12);
  ctx.fillRect(x + 18, fy + 6, 4, 8);
  ctx.fillRect(x + 22, fy + 8, 4, 4);

  // Flag pole base block
  ctx.fillStyle = COLORS.hillGreen;
  ctx.fillRect(x - 8, y + h, 24, TILE);
}

// ---------------------------------------------------------------------------
// 18. CHECKPOINT
// ---------------------------------------------------------------------------

export function drawCheckpoint(ctx: CanvasRenderingContext2D, x: number, y: number, activated: boolean, _tick?: number) {
  // Pole
  ctx.fillStyle = activated ? '#888' : '#555';
  ctx.fillRect(x + 4, y - 40, 4, 44);

  // Banner
  ctx.fillStyle = activated ? COLORS.flagGreen : '#666';
  ctx.fillRect(x + 8, y - 38, 16, 12);

  // Exclamation mark on banner
  ctx.fillStyle = activated ? '#FFF' : '#888';
  ctx.fillRect(x + 14, y - 36, 3, 5);
  ctx.fillRect(x + 14, y - 30, 3, 2);
}

// ---------------------------------------------------------------------------
// 19. BRICK DEBRIS
// ---------------------------------------------------------------------------

export function drawBrickDebris(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  _vx: number,
  _vy: number
) {
  ctx.fillStyle = COLORS.brickOrange;
  ctx.fillRect(x, y, 8, 8);
  ctx.fillStyle = COLORS.brickDark;
  ctx.fillRect(x, y + 6, 8, 2);
  ctx.fillRect(x + 6, y, 2, 8);
}

// ---------------------------------------------------------------------------
// 20. COIN POP EFFECT
// ---------------------------------------------------------------------------

export function drawCoinPopEffect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  frame: number
) {
  const spinWidths = [14, 10, 4, 10];
  const w = spinWidths[frame % 4];
  const cx = x + (16 - w) / 2;

  ctx.fillStyle = COLORS.coinGold;
  ctx.fillRect(cx, y, w, 16);
  if (w > 4) {
    ctx.fillStyle = '#FFF';
    ctx.fillRect(cx + 1, y + 2, Math.max(1, Math.floor(w / 4)), 12);
  }
}

// ---------------------------------------------------------------------------
// 21. STAR EFFECT
// ---------------------------------------------------------------------------

export function drawStarEffect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rotation: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  const s = size;
  ctx.fillStyle = '#FFF';
  // 4-pointed star via two overlapping rectangles
  ctx.fillRect(-s / 2, -s / 6, s, s / 3);
  ctx.fillRect(-s / 6, -s / 2, s / 3, s);
  // Diagonal arms
  ctx.fillRect(-s / 3, -s / 3, 2, 2);
  ctx.fillRect(s / 3 - 2, -s / 3, 2, 2);
  ctx.fillRect(-s / 3, s / 3 - 2, 2, 2);
  ctx.fillRect(s / 3 - 2, s / 3 - 2, 2, 2);

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 22. MINIMAP
// ---------------------------------------------------------------------------

export function drawMinimap(
  ctx: CanvasRenderingContext2D,
  mx: number,
  my: number,
  mw: number,
  mh: number,
  cameraX: number,
  worldWidth: number,
  playerX: number,
  playerY: number,
  worldHeight: number,
  enemies: EnemyEntity[],
  pipes: PipeEntity[],
  blocks: BlockEntity[]
) {
  const scaleX = mw / worldWidth;
  const scaleY = mh / worldHeight;

  // Background
  ctx.fillStyle = 'rgba(20, 40, 80, 0.75)';
  ctx.fillRect(mx, my, mw, mh);
  // Border
  ctx.strokeStyle = 'rgba(100, 160, 255, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(mx, my, mw, mh);

  // Ground line
  ctx.fillStyle = 'rgba(0, 168, 0, 0.5)';
  const groundY = my + mh - 4;
  ctx.fillRect(mx, groundY, mw, 4);

  // Pipes
  ctx.fillStyle = 'rgba(0, 168, 0, 0.6)';
  for (const pipe of pipes) {
    const px = mx + pipe.pos.x * scaleX;
    const py = my + pipe.pos.y * scaleY;
    ctx.fillRect(px, py, Math.max(2, 64 * scaleX), Math.max(2, pipe.h * scaleY));
  }

  // Blocks
  ctx.fillStyle = 'rgba(232, 125, 0, 0.6)';
  for (const block of blocks) {
    if (!block.hit) {
      const bx = mx + block.pos.x * scaleX;
      const by = my + block.pos.y * scaleY;
      ctx.fillRect(bx, by, Math.max(1, 32 * scaleX), Math.max(1, 32 * scaleY));
    }
  }

  // Enemies
  ctx.fillStyle = 'rgba(255, 80, 40, 0.7)';
  for (const e of enemies) {
    if (e.alive) {
      const ex = mx + e.pos.x * scaleX;
      const ey = my + e.pos.y * scaleY;
      ctx.fillRect(ex, ey, 2, 2);
    }
  }

  // Camera viewport box
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1;
  const viewW = ctx.canvas.width * scaleX;
  ctx.strokeRect(mx + cameraX * scaleX, my, viewW, mh);

  // Player dot (bright red)
  ctx.fillStyle = '#FF2020';
  const dotX = mx + playerX * scaleX;
  const dotY = my + playerY * scaleY;
  ctx.fillRect(dotX - 2, dotY - 2, 5, 5);
  // Pulsing glow
  ctx.fillStyle = 'rgba(255, 32, 32, 0.4)';
  ctx.fillRect(dotX - 3, dotY - 3, 7, 7);
}

// ---------------------------------------------------------------------------
// ENGINE ADAPTER EXPORTS
// The engine imports these names; they wrap the core drawing functions above.
// ---------------------------------------------------------------------------

export function drawSky(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, COLORS.sky);
  grad.addColorStop(1, COLORS.skyBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

export function drawHillLarge(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  drawHill(ctx, x, y, size, size * 0.7, true);
}

export function drawHillSmall(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  drawHill(ctx, x, y, size * 0.6, size * 0.4, false);
}

export { drawDeepGround as drawDeepTile };
export { drawBrickBlock as drawBrickTile };
export { drawCoinPopEffect as drawCoinPop };
export { drawFlag as drawFlagPole };

export function drawMovingPlatformSprite(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = COLORS.brickOrange;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = COLORS.brickLight;
  ctx.fillRect(x, y, w, 3);
  ctx.fillStyle = COLORS.brickDark;
  ctx.fillRect(x, y + h - 3, w, 3);
  ctx.fillStyle = COLORS.brickLine;
  for (let bx = x; bx < x + w; bx += 16) {
    ctx.fillRect(bx, y + 3, 1, h - 6);
  }
}

export function drawKoopaShell(ctx: CanvasRenderingContext2D, x: number, y: number, _w: number, _h: number) {
  const s = 2;
  ctx.fillStyle = COLORS.koopaGreen;
  ctx.fillRect(x + 2 * s, y + 2 * s, 10 * s, 8 * s);
  ctx.fillStyle = COLORS.koopaShell;
  ctx.fillRect(x + 3 * s, y + 3 * s, 8 * s, 6 * s);
  ctx.fillStyle = COLORS.koopaLight;
  ctx.fillRect(x + 4 * s, y + 3 * s, 3 * s, 2 * s);
  ctx.fillStyle = '#000';
  ctx.fillRect(x + 1 * s, y + 2 * s, 1 * s, 8 * s);
  ctx.fillRect(x + 12 * s, y + 2 * s, 1 * s, 8 * s);
  ctx.fillRect(x + 2 * s, y + 1 * s, 10 * s, 1 * s);
  ctx.fillRect(x + 2 * s, y + 10 * s, 10 * s, 1 * s);
}

export function drawParticle(ctx: CanvasRenderingContext2D, x: number, y: number, pt: Particle) {
  const alpha = Math.max(0, pt.life / pt.maxLife);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = pt.color;
  ctx.fillRect(x - pt.size / 2, y - pt.size / 2, pt.size, pt.size);
  ctx.globalAlpha = 1;
}
