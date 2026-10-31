import type {
  PlayerEntity, EnemyEntity, BlockEntity, CoinEntity, PipeEntity,
  MushroomEntity, MovingPlatform, Particle, FlagPole, Checkpoint,
  GoldenPillar, GameCamera, InputState, GameState, LevelData, AABB, Direction,
} from './types';
import { TileType } from './types';
import { TILE, PHYSICS, COLORS, DIMENSIONS, createLevel1 } from './config';
import {
  drawSky, drawCloud, drawHillLarge, drawHillSmall, drawBush,
  drawGroundTile, drawDeepTile, drawPlatformTile, drawBrickBlock,
  drawPipe, drawQuestionBlock, drawCoin, drawCoinPop,
  drawMushroom, drawMovingPlatformSprite,
  drawGoomba, drawKoopa, drawKoopaShell, drawFlyingEnemy, drawSpiny,
  drawPlayer, drawFlagPole as drawFlagPoleSprite,
  drawCheckpoint as drawCheckpointSprite,
  drawParticle,
  drawGoldenPillar,
} from './sprites';
import { gameAudio } from './audio';

interface DecorItem { x: number; y: number; size: number; }

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  private player!: PlayerEntity;
  private enemies: EnemyEntity[] = [];
  private blocks: BlockEntity[] = [];
  private coins: CoinEntity[] = [];
  private pipes: PipeEntity[] = [];
  private mushrooms: MushroomEntity[] = [];
  private movingPlatforms: MovingPlatform[] = [];
  private particles: Particle[] = [];
  private flagPole: FlagPole | null = null;
  private checkpoints: Checkpoint[] = [];
  private pillars: GoldenPillar[] = [];
  private activePillarId: number | null = null;

  private camera!: GameCamera;
  private input: InputState = { left: false, right: false, jump: false, jumpPressed: false, pause: false };
  gameState!: GameState;
  private level!: LevelData;

  private rafId: number | null = null;
  private lastTime = 0;
  private tick = 0;
  private jumpHoldFrames = 0;
  private timerAccum = 0;
  private lastCheckpointPos = { x: 0, y: 0 };

  private clouds: DecorItem[] = [];
  private farHills: DecorItem[] = [];
  private nearHills: DecorItem[] = [];
  private bushes: DecorItem[] = [];

  private levelRng = 0;

  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;

    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp = this.onKeyUp.bind(this);
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
  }

  // ── public API ──────────────────────────────────────────────
  start() {
    this.loadLevel();
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop() {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const aspect = rect.width / rect.height;
    const logicalH = this.level ? this.level.height : 480;
    const logicalW = Math.round(logicalH * aspect);
    this.canvas.width = logicalW;
    this.canvas.height = logicalH;
    this.ctx.imageSmoothingEnabled = false;
    if (this.camera) {
      this.camera.viewWidth = logicalW;
      this.camera.viewHeight = logicalH;
    }
  }

  togglePause() {
    this.gameState.paused = !this.gameState.paused;
  }

  reset() {
    this.loadLevel();
  }

  getStats() {
    return {
      lives: this.player.lives,
      coins: this.player.coins,
      score: this.player.score,
      time: Math.ceil(this.gameState.timer),
      world: this.gameState.world,
    };
  }

  // touch helpers for mobile controls
  touchLeft(on: boolean)  { this.input.left = on; }
  touchRight(on: boolean) { this.input.right = on; }
  touchJump() {
    if (!this.input.jumpPressed) {
      this.input.jump = true;
      this.input.jumpPressed = true;
    }
  }
  touchJumpRelease() {
    this.input.jump = false;
    this.input.jumpPressed = false;
    this.jumpHoldFrames = PHYSICS.playerMaxJumpTime;
  }

  // ── input ───────────────────────────────────────────────────
  private onKeyDown(e: KeyboardEvent) {
    switch (e.code) {
      case 'ArrowLeft': case 'KeyA': this.input.left = true; break;
      case 'ArrowRight': case 'KeyD': this.input.right = true; break;
      case 'Space': case 'ArrowUp': case 'KeyW':
        e.preventDefault();
        if (!this.input.jumpPressed) {
          this.input.jump = true;
          this.input.jumpPressed = true;
        }
        break;
      case 'Escape':
        this.togglePause();
        break;
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    switch (e.code) {
      case 'ArrowLeft': case 'KeyA': this.input.left = false; break;
      case 'ArrowRight': case 'KeyD': this.input.right = false; break;
      case 'Space': case 'ArrowUp': case 'KeyW':
        this.input.jump = false;
        this.input.jumpPressed = false;
        this.jumpHoldFrames = PHYSICS.playerMaxJumpTime;
        break;
    }
  }

  // ── level loading ───────────────────────────────────────────
  private loadLevel() {
    this.level = createLevel1();
    this.tick = 0;
    this.jumpHoldFrames = 0;
    this.timerAccum = 0;
    this.particles = [];

    this.player = {
      pos: { x: this.level.playerSpawn.x, y: this.level.playerSpawn.y },
      vel: { x: 0, y: 0 },
      w: DIMENSIONS.player.w, h: DIMENSIONS.player.h,
      state: 'idle', direction: 1, grounded: false,
      animFrame: 0, animTimer: 0, invulnTimer: 0,
      lives: 3, coins: 0, score: 0, powerLevel: 0,
      landTimer: 0, deadTimer: 0, victoryTimer: 0,
    };
    this.lastCheckpointPos = { ...this.level.playerSpawn };

    this.enemies = this.level.enemies.map(e => {
      const dim = e.type === 'koopa' ? DIMENSIONS.koopa
        : e.type === 'flying' ? DIMENSIONS.flying
        : e.type === 'spiny' ? DIMENSIONS.spiny
        : DIMENSIONS.goomba;
      return {
        pos: { x: e.x, y: e.y }, vel: { x: -PHYSICS.enemySpeed, y: 0 },
        w: dim.w, h: dim.h, type: e.type, direction: -1 as Direction,
        alive: true, animFrame: 0, animTimer: 0, deathTimer: 0, grounded: false,
        ...(e.type === 'koopa' ? { inShell: false, shellMoving: false } : {}),
        ...(e.type === 'flying' ? { baseY: e.y, flyAmplitude: 40, flySpeed: 0.04, flyPhase: 0 } : {}),
      } as EnemyEntity;
    });

    this.blocks = this.level.blocks.map(b => ({
      pos: { x: b.x, y: b.y },
      w: DIMENSIONS.questionBlock.w, h: DIMENSIONS.questionBlock.h,
      type: b.type, hit: false, bounceTimer: 0, contents: b.contents,
    }));

    this.coins = this.level.coins.map(c => ({
      pos: { x: c.x, y: c.y }, collected: false, animTimer: 0, popVel: 0, popping: false,
    }));

    this.levelRng = 7;
    const nextRng = () => { this.levelRng = (this.levelRng * 16807 + 0) % 2147483647; return this.levelRng; };
    this.pipes = this.level.pipes.map(p => ({
      pos: { x: p.x, y: p.y }, w: DIMENSIONS.pipeWidth, h: p.h,
      colorIndex: nextRng() % 3,
    }));

    this.mushrooms = [];

    this.movingPlatforms = this.level.movingPlatforms.map(mp => ({
      pos: { x: mp.x, y: mp.y }, w: mp.w, h: 12,
      startX: mp.startX, endX: mp.endX, speed: mp.speed, direction: 1 as Direction,
    }));

    if (this.level.flagPole) {
      this.flagPole = { pos: { x: this.level.flagPole.x, y: this.level.flagPole.y },
        h: this.level.flagPole.h, triggered: false, flagY: 0 };
    } else {
      this.flagPole = null;
    }

    this.checkpoints = this.level.checkpoints.map(cp => ({
      pos: { x: cp.x, y: cp.y }, activated: false,
    }));

    this.pillars = (this.level.pillars || []).map(p => ({
      pos: { x: p.x, y: p.y },
      w: 48,
      h: 128,
      id: p.id,
      triggered: false,
      glowPhase: 0,
    }));
    this.activePillarId = null;

    this.camera = {
      x: 0, y: 0, targetX: 0, targetY: 0,
      worldWidth: this.level.width, worldHeight: this.level.height,
      viewWidth: this.canvas.width, viewHeight: this.canvas.height,
    };

    this.gameState = { paused: false, gameOver: false, levelComplete: false, timer: 400, maxTime: 400, world: '1-1' };

    this.generateDecor();
    this.resize();
  }

  private generateDecor() {
    const w = this.level.width;
    this.clouds = [];
    this.farHills = [];
    this.nearHills = [];
    this.bushes = [];

    const rng = (seed: number) => {
      let s = seed;
      return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
    };
    const r = rng(42);

    for (let x = 0; x < w; x += 280 + Math.floor(r() * 200)) {
      this.clouds.push({ x, y: 30 + r() * 60, size: 0.8 + r() * 0.6 });
    }
    for (let x = 0; x < w; x += 500 + Math.floor(r() * 300)) {
      this.farHills.push({ x, y: 0, size: 0.8 + r() * 0.7 });
    }
    for (let x = 200; x < w; x += 600 + Math.floor(r() * 400)) {
      this.nearHills.push({ x, y: 0, size: 0.7 + r() * 0.6 });
    }
    for (let x = 50; x < w; x += 200 + Math.floor(r() * 250)) {
      this.bushes.push({ x, y: 0, size: 0.8 + r() * 0.5 });
    }
  }

  // ── main loop ───────────────────────────────────────────────
  private loop = (now: number) => {
    const dt = Math.min((now - this.lastTime) / 16.667, 2);
    this.lastTime = now;

    if (!this.gameState.paused && !this.gameState.gameOver) {
      this.tick++;
      this.updatePlayer();
      this.updateEnemies();
      this.updateBlocks();
      this.updateCoins();
      this.updateMushrooms();
      this.updateMovingPlatforms();
      this.updateParticles();
      this.updateCamera();
      this.updateTimer(dt);
      this.checkLevelComplete();
      this.updatePillars();
    }

    this.render();
    this.rafId = requestAnimationFrame(this.loop);
  };

  // ── player update ───────────────────────────────────────────
  private updatePlayer() {
    const p = this.player;
    if (p.state === 'dead') {
      this.respawn();
      return;
    }
    if (p.state === 'victory') {
      p.victoryTimer--;
      if (p.victoryTimer <= 0) this.gameState.levelComplete = true;
      return;
    }
    if (p.invulnTimer > 0) p.invulnTimer--;
    if (p.landTimer > 0) p.landTimer--;

    // horizontal input
    const maxSpeed = Math.abs(p.vel.x) > PHYSICS.playerWalkSpeed
      ? PHYSICS.playerRunSpeed : PHYSICS.playerWalkSpeed;
    if (this.input.left) {
      p.vel.x -= PHYSICS.playerAccel;
      if (p.vel.x < -maxSpeed) p.vel.x = -maxSpeed;
      p.direction = -1;
    } else if (this.input.right) {
      p.vel.x += PHYSICS.playerAccel;
      if (p.vel.x > maxSpeed) p.vel.x = maxSpeed;
      p.direction = 1;
    } else {
      if (p.vel.x > 0) { p.vel.x -= PHYSICS.playerDecel; if (p.vel.x < 0) p.vel.x = 0; }
      if (p.vel.x < 0) { p.vel.x += PHYSICS.playerDecel; if (p.vel.x > 0) p.vel.x = 0; }
    }

    // jump
    if (this.input.jump && this.input.jumpPressed && p.grounded) {
      p.vel.y = PHYSICS.playerJumpForce;
      p.grounded = false;
      this.jumpHoldFrames = 0;
      gameAudio.jump();
    }
    if (this.input.jump && !p.grounded && p.vel.y < 0 && this.jumpHoldFrames < PHYSICS.playerMaxJumpTime) {
      p.vel.y += PHYSICS.playerJumpHold;
      this.jumpHoldFrames++;
    }

    // gravity
    p.vel.y += PHYSICS.gravity;
    if (p.vel.y > PHYSICS.maxFallSpeed) p.vel.y = PHYSICS.maxFallSpeed;

    // move X then resolve
    p.pos.x += p.vel.x;
    this.resolveTileCollisionX(p);
    this.resolveBlockCollisionX(p);
    this.resolvePipeCollisionX(p);
    this.resolvePillarCollisionX(p);

    // move Y then resolve
    const wasInAir = !p.grounded;
    p.pos.y += p.vel.y;
    p.grounded = false;
    this.resolveTileCollisionY(p);
    this.resolveBlockCollisionY(p);
    this.resolvePipeCollisionY(p);
    this.resolvePillarCollisionY(p);
    this.resolveMovingPlatformCollision(p);

    if (p.grounded && wasInAir && p.vel.y >= 0) {
      p.landTimer = 6;
    }

    // world bounds
    if (p.pos.x < 0) { p.pos.x = 0; p.vel.x = 0; }
    if (p.pos.x > this.level.width - p.w) { p.pos.x = this.level.width - p.w; p.vel.x = 0; }
    if (p.pos.y > this.level.height + 64) { this.respawn(); return; }

    // enemy collision
    this.checkEnemyCollision();
    // coin pickup
    this.checkCoinPickup();
    // mushroom pickup
    this.checkMushroomPickup();
    // checkpoint
    this.checkCheckpoints();
    // pillar collision
    const hitPillar = this.checkPillarCollision();
    if (hitPillar && !this.activePillarId) {
      this.activePillarId = hitPillar.id;
      this.gameState.paused = true;
    }
    // flagpole
    this.checkFlagPole();

    // state
    this.updatePlayerState();
    // animation
    p.animTimer++;
    if (p.state === 'walking' || p.state === 'running') {
      const speed = p.state === 'running' ? 4 : 6;
      if (p.animTimer % speed === 0) p.animFrame = (p.animFrame + 1) % 3;
    } else if (p.state === 'idle') {
      p.animFrame = 0;
    }
  }

  private updatePlayerState() {
    const p = this.player;
    if (p.state === 'dead' || p.state === 'victory') return;
    if (!p.grounded && p.vel.y < 0) { p.state = 'jumping'; return; }
    if (!p.grounded && p.vel.y >= 0) { p.state = 'falling'; return; }
    if (p.landTimer > 0) { p.state = 'landing'; return; }
    if (Math.abs(p.vel.x) > PHYSICS.playerWalkSpeed) { p.state = 'running'; return; }
    if (Math.abs(p.vel.x) > 0.2) { p.state = 'walking'; return; }
    p.state = 'idle';
  }

  private damagePlayer() {
    const p = this.player;
    if (p.invulnTimer > 0) return;
    if (p.powerLevel > 0) {
      p.powerLevel--;
      p.h = DIMENSIONS.player.h;
    }
    p.invulnTimer = 90;
    gameAudio.bump();
  }

  private respawn() {
    const p = this.player;
    p.pos = { ...this.lastCheckpointPos };
    p.vel = { x: 0, y: 0 };
    p.state = 'idle';
    p.grounded = false;
    p.invulnTimer = 90;
    p.powerLevel = 0;
    p.w = DIMENSIONS.player.w;
    p.h = DIMENSIONS.player.h;
  }

  // ── enemy update ────────────────────────────────────────────
  private updateEnemies() {
    for (const e of this.enemies) {
      if (!e.alive) {
        if (e.deathTimer > 0) e.deathTimer--;
        continue;
      }
      // only update if near-ish to camera
      if (e.pos.x < this.camera.x - 200 || e.pos.x > this.camera.x + this.camera.viewWidth + 200) continue;

      if (e.type === 'flying') {
        e.flyPhase = (e.flyPhase ?? 0) + (e.flySpeed ?? 0.04);
        e.pos.y = (e.baseY ?? e.pos.y) + Math.sin(e.flyPhase) * (e.flyAmplitude ?? 40);
        e.pos.x += e.vel.x;
        e.animTimer++;
        if (e.animTimer % 8 === 0) e.animFrame = (e.animFrame + 1) % 2;
        continue;
      }

      if (e.type === 'koopa' && e.inShell) {
        if (e.shellMoving) {
          e.pos.x += e.vel.x;
          this.resolveEnemyTileX(e);
          // shell kills other enemies
          for (const other of this.enemies) {
            if (other === e || !other.alive) continue;
            if (this.aabbOverlap(this.entityAABB(e), this.entityAABB(other))) {
              other.alive = false;
              other.deathTimer = 30;
              this.player.score += 100;
              this.spawnScoreParticles(other.pos.x, other.pos.y);
            }
          }
        }
        continue;
      }

      // gravity
      e.vel.y += PHYSICS.gravity;
      if (e.vel.y > PHYSICS.maxFallSpeed) e.vel.y = PHYSICS.maxFallSpeed;

      e.pos.x += e.vel.x;
      this.resolveEnemyTileX(e);

      e.pos.y += e.vel.y;
      e.grounded = false;
      this.resolveEnemyTileY(e);

      // edge detection for patrol: don't walk off cliffs
      if (e.grounded && e.type !== 'spiny') {
        const checkX = e.direction === 1 ? e.pos.x + e.w + 2 : e.pos.x - 2;
        const checkY = e.pos.y + e.h + 4;
        if (!this.isSolidAt(checkX, checkY)) {
          e.direction = (e.direction * -1) as Direction;
          e.vel.x = e.direction * PHYSICS.enemySpeed;
        }
      }

      // fall off world
      if (e.pos.y > this.level.height + 64) { e.alive = false; }

      e.animTimer++;
      if (e.animTimer % 10 === 0) e.animFrame = (e.animFrame + 1) % 2;
    }
  }

  // ── block update ────────────────────────────────────────────
  private updateBlocks() {
    for (const b of this.blocks) {
      if (b.bounceTimer > 0) b.bounceTimer--;
    }
  }

  private hitBlock(b: BlockEntity) {
    if (b.bounceTimer > 0) return;

    if (b.type === 'question') {
      b.bounceTimer = 8;
      const reward = Math.random() < 0.5 ? 1 : 2;
      for (let i = 0; i < reward; i++) {
        this.player.coins++;
        this.player.score += 200;
        this.spawnCoinPop(b.pos.x + 8 + i * 10, b.pos.y - 16 - i * 8);
      }
      gameAudio.blockHit();
      gameAudio.coin();
      // bump enemies standing on top
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (e.pos.x + e.w > b.pos.x && e.pos.x < b.pos.x + b.w &&
            Math.abs((e.pos.y + e.h) - b.pos.y) < 4) {
          e.alive = false;
          e.deathTimer = 30;
          this.player.score += 100;
          this.spawnScoreParticles(e.pos.x, e.pos.y);
        }
      }
    } else if (b.type === 'brick') {
      b.bounceTimer = 8;
      gameAudio.bump();
      // bump enemies on top
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (e.pos.x + e.w > b.pos.x && e.pos.x < b.pos.x + b.w &&
            Math.abs((e.pos.y + e.h) - b.pos.y) < 4) {
          e.alive = false;
          e.deathTimer = 30;
          this.player.score += 100;
          this.spawnScoreParticles(e.pos.x, e.pos.y);
        }
      }
    }
  }

  // ── coin update ─────────────────────────────────────────────
  private updateCoins() {
    for (const c of this.coins) {
      if (c.collected) continue;
      c.animTimer++;
      if (c.popping) {
        c.pos.y += c.popVel;
        c.popVel += 0.6;
        if (c.popVel > 5) { c.collected = true; }
      }
    }
  }

  // ── mushroom update ─────────────────────────────────────────
  private updateMushrooms() {
    for (const m of this.mushrooms) {
      if (!m.active) continue;
      if (m.emerging) {
        m.emergeTimer--;
        m.pos.y -= 1;
        if (m.emergeTimer <= 0) { m.emerging = false; m.vel.x = PHYSICS.mushroomSpeed; }
        continue;
      }
      m.vel.y += PHYSICS.gravity;
      if (m.vel.y > PHYSICS.maxFallSpeed) m.vel.y = PHYSICS.maxFallSpeed;
      m.pos.x += m.vel.x;
      this.resolveMushroomTileX(m);
      m.pos.y += m.vel.y;
      this.resolveMushroomTileY(m);
      if (m.pos.y > this.level.height + 64) m.active = false;
    }
  }

  // ── moving platforms ────────────────────────────────────────
  private updateMovingPlatforms() {
    for (const mp of this.movingPlatforms) {
      mp.pos.x += mp.speed * mp.direction;
      if (mp.pos.x >= mp.endX) { mp.direction = -1; }
      if (mp.pos.x <= mp.startX) { mp.direction = 1; }
    }
  }

  // ── particles ───────────────────────────────────────────────
  private updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.15;
      pt.life--;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }
  }

  // ── camera ──────────────────────────────────────────────────
  private updateCamera() {
    const p = this.player;
    this.camera.targetX = p.pos.x - this.camera.viewWidth * 0.35;
    this.camera.targetY = 0; // fixed vertical for now

    this.camera.x += (this.camera.targetX - this.camera.x) * 0.1;

    if (this.camera.x < 0) this.camera.x = 0;
    const maxX = this.camera.worldWidth - this.camera.viewWidth;
    if (this.camera.x > maxX) this.camera.x = maxX;
  }

  // ── timer ───────────────────────────────────────────────────
  private updateTimer(dt: number) {
    if (this.gameState.levelComplete) return;
    this.timerAccum += dt;
    if (this.timerAccum >= 60) {
      this.timerAccum -= 60;
      this.gameState.timer--;
      if (this.gameState.timer <= 0) {
        this.gameState.timer = 0;
      }
    }
  }

  // ── level complete check ────────────────────────────────────
  private checkLevelComplete() {
    // handled via flagpole
  }

  // ── collision helpers ───────────────────────────────────────
  private getTileAt(wx: number, wy: number): number {
    const col = Math.floor(wx / TILE);
    const row = Math.floor(wy / TILE);
    if (row < 0 || row >= this.level.tiles.length) return TileType.EMPTY;
    if (col < 0 || col >= this.level.tiles[0].length) return TileType.EMPTY;
    return this.level.tiles[row][col];
  }

  private isSolidTile(t: number): boolean {
    return t === TileType.GROUND || t === TileType.GROUND_TOP || t === TileType.BRICK ||
      t === TileType.GROUND_DEEP || t === TileType.GROUND_LEFT || t === TileType.GROUND_RIGHT ||
      t === TileType.PLATFORM;
  }

  private isSolidAt(wx: number, wy: number): boolean {
    return this.isSolidTile(this.getTileAt(wx, wy));
  }

  private entityAABB(e: { pos: { x: number; y: number }; w: number; h: number }): AABB {
    return { x: e.pos.x, y: e.pos.y, w: e.w, h: e.h };
  }

  private aabbOverlap(a: AABB, b: AABB): boolean {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // ── tile collision resolution ───────────────────────────────
  private resolveTileCollisionX(ent: { pos: { x: number; y: number }; vel: { x: number; y: number }; w: number; h: number }) {
    const margin = 2;
    const top = ent.pos.y + margin;
    const bot = ent.pos.y + ent.h - margin;
    const mid = ent.pos.y + ent.h / 2;

    if (ent.vel.x > 0) {
      const right = ent.pos.x + ent.w;
      if (this.isSolidAt(right, top) || this.isSolidAt(right, bot) || this.isSolidAt(right, mid)) {
        const col = Math.floor(right / TILE);
        ent.pos.x = col * TILE - ent.w;
        ent.vel.x = 0;
      }
    } else if (ent.vel.x < 0) {
      const left = ent.pos.x;
      if (this.isSolidAt(left, top) || this.isSolidAt(left, bot) || this.isSolidAt(left, mid)) {
        const col = Math.floor(left / TILE);
        ent.pos.x = (col + 1) * TILE;
        ent.vel.x = 0;
      }
    }
  }

  private resolveTileCollisionY(ent: PlayerEntity | { pos: { x: number; y: number }; vel: { x: number; y: number }; w: number; h: number; grounded?: boolean }) {
    const margin = 2;
    const left = ent.pos.x + margin;
    const right = ent.pos.x + ent.w - margin;
    const mid = ent.pos.x + ent.w / 2;

    if (ent.vel.y > 0) {
      const bottom = ent.pos.y + (ent as any).h;
      if (this.isSolidAt(left, bottom) || this.isSolidAt(right, bottom) || this.isSolidAt(mid, bottom)) {
        const row = Math.floor(bottom / TILE);
        ent.pos.y = row * TILE - (ent as any).h;
        ent.vel.y = 0;
        if ('grounded' in ent) (ent as any).grounded = true;
      }
    } else if (ent.vel.y < 0) {
      const top = ent.pos.y;
      if (this.isSolidAt(left, top) || this.isSolidAt(right, top) || this.isSolidAt(mid, top)) {
        const row = Math.floor(top / TILE);
        ent.pos.y = (row + 1) * TILE;
        ent.vel.y = 0;
        // hit blocks above
        if (ent === this.player) {
          this.checkBlockHitAbove(left, top);
          this.checkBlockHitAbove(right, top);
          this.checkBlockHitAbove(mid, top);
        }
      }
    }
  }

  private checkBlockHitAbove(wx: number, wy: number) {
    for (const b of this.blocks) {
      if (b.bounceTimer > 0) continue;
      const bBox: AABB = { x: b.pos.x, y: b.pos.y, w: b.w, h: b.h };
      if (wx >= bBox.x && wx <= bBox.x + bBox.w && wy >= bBox.y && wy <= bBox.y + bBox.h) {
        this.hitBlock(b);
        return;
      }
    }
  }

  // block collision for player movement
  private resolveBlockCollisionX(ent: { pos: { x: number; y: number }; vel: { x: number; y: number }; w: number; h: number }) {
    for (const b of this.blocks) {
      const bBox: AABB = { x: b.pos.x, y: b.pos.y, w: b.w, h: b.h };
      const eBox = this.entityAABB(ent);
      if (!this.aabbOverlap(eBox, bBox)) continue;
      if (ent.vel.x > 0) {
        ent.pos.x = b.pos.x - ent.w;
        ent.vel.x = 0;
      } else if (ent.vel.x < 0) {
        ent.pos.x = b.pos.x + b.w;
        ent.vel.x = 0;
      }
    }
  }

  private resolveBlockCollisionY(ent: PlayerEntity | { pos: { x: number; y: number }; vel: { x: number; y: number }; w: number; h: number; grounded?: boolean }) {
    for (const b of this.blocks) {
      const bBox: AABB = { x: b.pos.x, y: b.pos.y, w: b.w, h: b.h };
      const eBox = { x: ent.pos.x, y: ent.pos.y, w: (ent as any).w, h: (ent as any).h };
      if (!this.aabbOverlap(eBox, bBox)) continue;
      if (ent.vel.y > 0) {
        ent.pos.y = b.pos.y - (ent as any).h;
        ent.vel.y = 0;
        if ('grounded' in ent) (ent as any).grounded = true;
      } else if (ent.vel.y < 0) {
        ent.pos.y = b.pos.y + b.h;
        ent.vel.y = 0;
        if (ent === this.player) this.hitBlock(b);
      }
    }
  }

  // pipe collision
  private resolvePipeCollisionX(ent: { pos: { x: number; y: number }; vel: { x: number; y: number }; w: number; h: number }) {
    for (const pipe of this.pipes) {
      const pBox: AABB = { x: pipe.pos.x, y: pipe.pos.y, w: pipe.w, h: pipe.h };
      const eBox = this.entityAABB(ent);
      if (!this.aabbOverlap(eBox, pBox)) continue;
      if (ent.vel.x > 0) { ent.pos.x = pipe.pos.x - ent.w; ent.vel.x = 0; }
      else if (ent.vel.x < 0) { ent.pos.x = pipe.pos.x + pipe.w; ent.vel.x = 0; }
    }
  }

  private resolvePipeCollisionY(ent: PlayerEntity | { pos: { x: number; y: number }; vel: { x: number; y: number }; w: number; h: number; grounded?: boolean }) {
    for (const pipe of this.pipes) {
      const pBox: AABB = { x: pipe.pos.x, y: pipe.pos.y, w: pipe.w, h: pipe.h };
      const eBox = { x: ent.pos.x, y: ent.pos.y, w: (ent as any).w, h: (ent as any).h };
      if (!this.aabbOverlap(eBox, pBox)) continue;
      if (ent.vel.y > 0) {
        ent.pos.y = pipe.pos.y - (ent as any).h;
        ent.vel.y = 0;
        if ('grounded' in ent) (ent as any).grounded = true;
      } else if (ent.vel.y < 0) {
        ent.pos.y = pipe.pos.y + pipe.h;
        ent.vel.y = 0;
      }
    }
  }

  // moving platform
  private resolveMovingPlatformCollision(ent: PlayerEntity) {
    for (const mp of this.movingPlatforms) {
      const pBox: AABB = { x: mp.pos.x, y: mp.pos.y, w: mp.w, h: mp.h };
      const feetBox: AABB = { x: ent.pos.x + 2, y: ent.pos.y + ent.h - 4, w: ent.w - 4, h: 8 };
      if (this.aabbOverlap(feetBox, pBox) && ent.vel.y >= 0) {
        ent.pos.y = mp.pos.y - ent.h;
        ent.vel.y = 0;
        ent.grounded = true;
        ent.pos.x += mp.speed * mp.direction;
      }
    }
  }

  // enemy tile resolution
  private resolveEnemyTileX(e: EnemyEntity) {
    const top = e.pos.y + 2;
    const bot = e.pos.y + e.h - 2;
    if (e.vel.x > 0) {
      const right = e.pos.x + e.w;
      if (this.isSolidAt(right, top) || this.isSolidAt(right, bot)) {
        const col = Math.floor(right / TILE);
        e.pos.x = col * TILE - e.w;
        e.vel.x = -Math.abs(e.vel.x);
        e.direction = -1;
      }
    } else if (e.vel.x < 0) {
      const left = e.pos.x;
      if (this.isSolidAt(left, top) || this.isSolidAt(left, bot)) {
        const col = Math.floor(left / TILE);
        e.pos.x = (col + 1) * TILE;
        e.vel.x = Math.abs(e.vel.x);
        e.direction = 1;
      }
    }
    // pipe collision for enemies
    for (const pipe of this.pipes) {
      const pBox: AABB = { x: pipe.pos.x, y: pipe.pos.y, w: pipe.w, h: pipe.h };
      if (this.aabbOverlap(this.entityAABB(e), pBox)) {
        if (e.vel.x > 0) { e.pos.x = pipe.pos.x - e.w; e.vel.x = -Math.abs(e.vel.x); e.direction = -1; }
        else { e.pos.x = pipe.pos.x + pipe.w; e.vel.x = Math.abs(e.vel.x); e.direction = 1; }
      }
    }
  }

  private resolveEnemyTileY(e: EnemyEntity) {
    const left = e.pos.x + 2;
    const right = e.pos.x + e.w - 2;
    if (e.vel.y > 0) {
      const bottom = e.pos.y + e.h;
      if (this.isSolidAt(left, bottom) || this.isSolidAt(right, bottom)) {
        const row = Math.floor(bottom / TILE);
        e.pos.y = row * TILE - e.h;
        e.vel.y = 0;
        e.grounded = true;
      }
    } else if (e.vel.y < 0) {
      const top = e.pos.y;
      if (this.isSolidAt(left, top) || this.isSolidAt(right, top)) {
        const row = Math.floor(top / TILE);
        e.pos.y = (row + 1) * TILE;
        e.vel.y = 0;
      }
    }
  }

  // mushroom tile resolution
  private resolveMushroomTileX(m: MushroomEntity) {
    const top = m.pos.y + 2;
    const bot = m.pos.y + m.h - 2;
    if (m.vel.x > 0) {
      const right = m.pos.x + m.w;
      if (this.isSolidAt(right, top) || this.isSolidAt(right, bot)) {
        m.vel.x = -Math.abs(m.vel.x);
      }
    } else if (m.vel.x < 0) {
      const left = m.pos.x;
      if (this.isSolidAt(left, top) || this.isSolidAt(left, bot)) {
        m.vel.x = Math.abs(m.vel.x);
      }
    }
  }

  private resolveMushroomTileY(m: MushroomEntity) {
    const left = m.pos.x + 2;
    const right = m.pos.x + m.w - 2;
    if (m.vel.y > 0) {
      const bottom = m.pos.y + m.h;
      if (this.isSolidAt(left, bottom) || this.isSolidAt(right, bottom)) {
        const row = Math.floor(bottom / TILE);
        m.pos.y = row * TILE - m.h;
        m.vel.y = 0;
      }
    }
  }

  // ── enemy interaction ───────────────────────────────────────
  private checkEnemyCollision() {
    const p = this.player;
    if (p.invulnTimer > 0) return;

    for (const e of this.enemies) {
      if (!e.alive) continue;
      const pBox = this.entityAABB(p);
      const eBox = this.entityAABB(e);
      if (!this.aabbOverlap(pBox, eBox)) continue;

      const playerBottom = p.pos.y + p.h;
      const enemyTop = e.pos.y;
      const stompMargin = e.h * 0.4;

      if (p.vel.y > 0 && playerBottom - enemyTop < stompMargin) {
        // stomp
        if (e.type === 'spiny') {
          this.damagePlayer();
          continue;
        }
        if (e.type === 'koopa' && !e.inShell) {
          e.inShell = true;
          e.h = DIMENSIONS.koopaShell.h;
          e.pos.y = e.pos.y + (DIMENSIONS.koopa.h - DIMENSIONS.koopaShell.h);
          e.vel.x = 0;
          p.vel.y = PHYSICS.playerJumpForce * 0.5;
          p.score += 100;
          gameAudio.stomp();
        } else if (e.type === 'koopa' && e.inShell && !e.shellMoving) {
          e.shellMoving = true;
          e.vel.x = (p.pos.x < e.pos.x ? 1 : -1) * PHYSICS.koopaShellSpeed;
          p.vel.y = PHYSICS.playerJumpForce * 0.5;
          p.score += 200;
          gameAudio.stomp();
        } else {
          e.alive = false;
          e.deathTimer = 30;
          p.vel.y = PHYSICS.playerJumpForce * 0.5;
          p.score += 100;
          gameAudio.stomp();
          this.spawnScoreParticles(e.pos.x, e.pos.y);
        }
      } else {
        // side / below contact = damage
        if (e.type === 'koopa' && e.inShell && !e.shellMoving) {
          e.shellMoving = true;
          e.vel.x = (p.direction as number) * PHYSICS.koopaShellSpeed;
          p.score += 200;
          continue;
        }
        this.damagePlayer();
      }
    }
  }

  // ── coin pickup ─────────────────────────────────────────────
  private checkCoinPickup() {
    const p = this.player;
    const pBox = this.entityAABB(p);
    for (const c of this.coins) {
      if (c.collected || c.popping) continue;
      const cBox: AABB = { x: c.pos.x, y: c.pos.y, w: DIMENSIONS.coin.w, h: DIMENSIONS.coin.h };
      if (this.aabbOverlap(pBox, cBox)) {
        c.collected = true;
        p.coins++;
        p.score += 200;
        gameAudio.coin();
        this.spawnCoinSparkle(c.pos.x, c.pos.y);
      }
    }
  }

  // ── mushroom pickup ─────────────────────────────────────────
  private checkMushroomPickup() {
    const p = this.player;
    const pBox = this.entityAABB(p);
    for (const m of this.mushrooms) {
      if (!m.active || m.emerging) continue;
      if (this.aabbOverlap(pBox, this.entityAABB(m))) {
        m.active = false;
        p.powerLevel = Math.min(p.powerLevel + 1, 2);
        if (p.powerLevel >= 1) { p.h = DIMENSIONS.playerBig.h; }
        p.score += 1000;
        gameAudio.powerup();
        this.spawnScoreParticles(m.pos.x, m.pos.y);
      }
    }
  }

  // ── checkpoint ──────────────────────────────────────────────
  private checkCheckpoints() {
    const p = this.player;
    for (const cp of this.checkpoints) {
      if (cp.activated) continue;
      if (Math.abs(p.pos.x - cp.pos.x) < TILE && Math.abs(p.pos.y - cp.pos.y) < TILE * 2) {
        cp.activated = true;
        this.lastCheckpointPos = { x: cp.pos.x, y: cp.pos.y - TILE };
        gameAudio.coin();
      }
    }
  }

  // ── flagpole ────────────────────────────────────────────────
  private checkFlagPole() {
    if (!this.flagPole || this.flagPole.triggered) return;
    const p = this.player;
    const fp = this.flagPole;
    if (p.pos.x + p.w >= fp.pos.x && p.pos.x <= fp.pos.x + 16) {
      fp.triggered = true;
      p.state = 'victory';
      p.vel = { x: 0, y: 0 };
      p.victoryTimer = 120;
      p.score += 5000;
      gameAudio.victory();
      this.spawnCelebrationParticles(fp.pos.x, fp.pos.y);
    }
  }

  // ── golden pillars ──────────────────────────────────────────
  private updatePillars() {
    for (const pillar of this.pillars) {
      pillar.glowPhase++;
    }
  }

  private checkPillarCollision(): GoldenPillar | null {
    const p = this.player;
    const pBox = { x: p.pos.x, y: p.pos.y, w: p.w, h: p.h };
    for (const pillar of this.pillars) {
      if (pillar.triggered) continue;
      const pillarBox = { x: pillar.pos.x, y: pillar.pos.y, w: pillar.w, h: pillar.h };
      if (this.aabbOverlap(pBox, pillarBox)) {
        return pillar;
      }
    }
    return null;
  }

  private resolvePillarCollisionX(ent: { pos: { x: number; y: number }; vel: { x: number; y: number }; w: number; h: number }) {
    for (const pillar of this.pillars) {
      const pBox: AABB = { x: pillar.pos.x, y: pillar.pos.y, w: pillar.w, h: pillar.h };
      const eBox = this.entityAABB(ent);
      if (!this.aabbOverlap(eBox, pBox)) continue;
      if (ent.vel.x > 0) { ent.pos.x = pillar.pos.x - ent.w; ent.vel.x = 0; }
      else if (ent.vel.x < 0) { ent.pos.x = pillar.pos.x + pillar.w; ent.vel.x = 0; }
    }
  }

  private resolvePillarCollisionY(ent: { pos: { x: number; y: number }; vel: { x: number; y: number }; w: number; h: number; grounded?: boolean }) {
    for (const pillar of this.pillars) {
      const pBox: AABB = { x: pillar.pos.x, y: pillar.pos.y, w: pillar.w, h: pillar.h };
      const eBox = { x: ent.pos.x, y: ent.pos.y, w: (ent as any).w, h: (ent as any).h };
      if (!this.aabbOverlap(eBox, pBox)) continue;
      if (ent.vel.y > 0) {
        ent.pos.y = pillar.pos.y - (ent as any).h;
        ent.vel.y = 0;
        if ('grounded' in ent) (ent as any).grounded = true;
      } else if (ent.vel.y < 0) {
        ent.pos.y = pillar.pos.y + pillar.h;
        ent.vel.y = 0;
      }
    }
  }

  getActivePillarId(): number | null {
    return this.activePillarId;
  }

  markPillarAnswered(pillarId: number) {
    const pillar = this.pillars.find(p => p.id === pillarId);
    if (pillar) pillar.triggered = true;
    this.activePillarId = null;
    this.gameState.paused = false;
  }

  getPillarTriggeredState(): boolean[] {
    return this.pillars.map(p => p.triggered);
  }

  // ── spawn helpers ───────────────────────────────────────────
  private spawnCoinPop(x: number, y: number) {
    this.coins.push({
      pos: { x, y }, collected: false, animTimer: 0, popVel: -8, popping: true,
    });
  }

  private spawnScoreParticles(x: number, y: number) {
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: x + Math.random() * 20, y: y + Math.random() * 10,
        vx: (Math.random() - 0.5) * 4, vy: -2 - Math.random() * 3,
        color: COLORS.coinGold, life: 30, maxLife: 30, size: 3,
      });
    }
  }

  private spawnCoinSparkle(x: number, y: number) {
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x: x + 8, y: y + 8,
        vx: (Math.random() - 0.5) * 3, vy: -1 - Math.random() * 2,
        color: i % 2 === 0 ? COLORS.coinGold : '#FFF', life: 20, maxLife: 20, size: 2,
      });
    }
  }

  private spawnCelebrationParticles(x: number, y: number) {
    const colors = [COLORS.marioRed, COLORS.coinGold, COLORS.pipeGreen, '#FFFFFF', COLORS.marioBlue];
    for (let i = 0; i < 40; i++) {
      this.particles.push({
        x: x + Math.random() * 40 - 20, y: y + Math.random() * 40,
        vx: (Math.random() - 0.5) * 8, vy: -4 - Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 60 + Math.random() * 30, maxLife: 90, size: 3 + Math.random() * 3,
      });
    }
  }

  // ── rendering ───────────────────────────────────────────────
  private render() {
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const cam = this.camera;
    ctx.clearRect(0, 0, cw, ch);

    // compute view scale: map logical 1280×720 (level height is 15*32=480) to canvas
    const logicalW = cam.viewWidth;

    // 1. SKY
    drawSky(ctx, cw, ch);

    // 2. CLOUDS (parallax 0.2x)
    for (const c of this.clouds) {
      const sx = c.x - cam.x * 0.2;
      const wrappedX = ((sx % (cw + 200)) + cw + 200) % (cw + 200) - 100;
      drawCloud(ctx, wrappedX, c.y, c.size * DIMENSIONS.cloud.w);
    }

    // 3. FAR HILLS (parallax 0.3x)
    const groundScreenY = 13 * TILE - cam.y;
    for (const h of this.farHills) {
      const sx = h.x - cam.x * 0.3;
      const wrappedX = ((sx % (cw + 400)) + cw + 400) % (cw + 400) - 200;
      drawHillLarge(ctx, wrappedX, groundScreenY, h.size * DIMENSIONS.largeHill.w);
    }

    // 4. NEAR HILLS (parallax 0.5x)
    for (const h of this.nearHills) {
      const sx = h.x - cam.x * 0.5;
      const wrappedX = ((sx % (cw + 400)) + cw + 400) % (cw + 400) - 200;
      drawHillSmall(ctx, wrappedX, groundScreenY, h.size * DIMENSIONS.smallHill.w);
    }

    // 5. BUSHES (parallax 0.6x)
    for (const b of this.bushes) {
      const sx = b.x - cam.x * 0.6;
      const wrappedX = ((sx % (cw + 200)) + cw + 200) % (cw + 200) - 100;
      drawBush(ctx, wrappedX, groundScreenY - 14, b.size * DIMENSIONS.bush.w);
    }

    // world→screen helper
    const wx = (x: number) => x - cam.x;
    const wy = (y: number) => y - cam.y;

    // 6. GROUND TILES — only visible range
    const startCol = Math.max(0, Math.floor(cam.x / TILE) - 1);
    const endCol = Math.min(this.level.tiles[0].length, Math.ceil((cam.x + logicalW) / TILE) + 1);
    for (let r = 0; r < this.level.tiles.length; r++) {
      for (let c = startCol; c < endCol; c++) {
        const tile = this.level.tiles[r][c];
        if (tile === TileType.EMPTY) continue;
        const tx = wx(c * TILE);
        const ty = wy(r * TILE);
        if (tile === TileType.GROUND_TOP) drawGroundTile(ctx, tx, ty);
        else if (tile === TileType.GROUND_DEEP) drawDeepTile(ctx, tx, ty);
        else if (tile === TileType.PLATFORM) drawPlatformTile(ctx, tx, ty);
        else if (tile === TileType.BRICK) drawBrickBlock(ctx, tx, ty);
        else drawGroundTile(ctx, tx, ty);
      }
    }

    // 7. PIPES
    for (const pipe of this.pipes) {
      drawPipe(ctx, wx(pipe.pos.x), wy(pipe.pos.y), pipe.h, pipe.colorIndex);
    }

    // 8. BLOCKS
    for (const b of this.blocks) {
      const bounceOff = b.bounceTimer > 4 ? -6 : b.bounceTimer > 0 ? -3 : 0;
      if (b.type === 'brick') {
        drawBrickBlock(ctx, wx(b.pos.x), wy(b.pos.y) + bounceOff);
      } else {
        drawQuestionBlock(ctx, wx(b.pos.x), wy(b.pos.y) + bounceOff, false, bounceOff, this.tick);
      }
    }

    // 9. COINS
    for (const c of this.coins) {
      if (c.collected) continue;
      if (c.popping) {
        drawCoinPop(ctx, wx(c.pos.x), wy(c.pos.y), this.tick);
      } else {
        drawCoin(ctx, wx(c.pos.x), wy(c.pos.y), this.tick);
      }
    }

    // 10. MUSHROOMS
    for (const m of this.mushrooms) {
      if (!m.active) continue;
      drawMushroom(ctx, wx(m.pos.x), wy(m.pos.y));
    }

    // 11. MOVING PLATFORMS
    for (const mp of this.movingPlatforms) {
      drawMovingPlatformSprite(ctx, wx(mp.pos.x), wy(mp.pos.y), mp.w, mp.h);
    }

    // 12. ENEMIES
    for (const e of this.enemies) {
      if (e.deathTimer <= 0 && !e.alive) continue;
      const ex = wx(e.pos.x);
      const ey = wy(e.pos.y);
      if (ex < -64 || ex > cw + 64) continue;
      if (e.type === 'goomba') drawGoomba(ctx, ex, ey, e.animFrame, e.alive, e.deathTimer);
      else if (e.type === 'koopa' && e.inShell) drawKoopaShell(ctx, ex, ey, e.w, e.h);
      else if (e.type === 'koopa') drawKoopa(ctx, ex, ey, e.direction, e.animFrame, !!e.inShell, !!e.shellMoving);
      else if (e.type === 'flying') drawFlyingEnemy(ctx, ex, ey, e.animFrame);
      else if (e.type === 'spiny') drawSpiny(ctx, ex, ey, e.animFrame);
    }

    // 13. PLAYER
    const p = this.player;
    if (p.invulnTimer <= 0 || this.tick % 4 < 2) {
      drawPlayer(ctx, wx(p.pos.x), wy(p.pos.y), p.state, p.direction, p.animFrame, p.powerLevel, p.invulnTimer);
    }

    // 14. PARTICLES
    for (const pt of this.particles) {
      drawParticle(ctx, wx(pt.x), wy(pt.y), pt);
    }

    // 15. FLAG POLE
    if (this.flagPole) {
      drawFlagPoleSprite(ctx, wx(this.flagPole.pos.x), wy(this.flagPole.pos.y), this.flagPole.h, this.flagPole.flagY);
    }

    // 16. CHECKPOINTS
    for (const cp of this.checkpoints) {
      drawCheckpointSprite(ctx, wx(cp.pos.x), wy(cp.pos.y), cp.activated, this.tick);
    }

    // 16.5. GOLDEN PILLARS
    for (const pillar of this.pillars) {
      const px = wx(pillar.pos.x);
      const py = wy(pillar.pos.y);
      if (px < -100 || px > cw + 100) continue;
      drawGoldenPillar(ctx, px, py, pillar.w, pillar.h, pillar.glowPhase, pillar.triggered);
    }

    // 17. HUD
    this.renderHUD(ctx, cw, ch);

    // 18. MINIMAP
    this.renderMinimap(ctx, cw, ch);

    // overlays
    if (this.gameState.paused) this.renderPauseOverlay(ctx, cw, ch);
    if (this.gameState.gameOver) this.renderGameOverOverlay(ctx, cw, ch);
    if (this.gameState.levelComplete) this.renderLevelCompleteOverlay(ctx, cw, ch);
  }

  // ── HUD ─────────────────────────────────────────────────────
  private renderHUD(ctx: CanvasRenderingContext2D, cw: number, _ch: number) {
    const p = this.player;
    const pad = 8;
    const barH = 36;
    const fontSize = 8;
    const bigFont = 10;

    ctx.fillStyle = COLORS.hudBg;
    ctx.fillRect(0, 0, cw, barH + pad);
    ctx.textBaseline = 'top';

    // "MARIO" logo
    let x = pad;
    ctx.font = `bold ${bigFont}px monospace`;
    ctx.fillStyle = COLORS.hudRed; ctx.fillText('M', x, pad); x += bigFont * 0.7;
    ctx.fillStyle = COLORS.hudGold; ctx.fillText('A', x, pad); x += bigFont * 0.7;
    ctx.fillStyle = COLORS.pipeGreen; ctx.fillText('R', x, pad); x += bigFont * 0.7;
    ctx.fillStyle = COLORS.marioBlue; ctx.fillText('I', x, pad); x += bigFont * 0.5;
    ctx.fillStyle = COLORS.hudRed; ctx.fillText('O', x, pad);

    ctx.font = `${fontSize - 2}px monospace`;
    ctx.fillStyle = '#AAC8FF';
    ctx.fillText('CAREER QUEST', pad, pad + bigFont + 3);

    // WORLD
    const worldX = cw * 0.16;
    ctx.font = `${fontSize}px monospace`;
    ctx.fillStyle = COLORS.hudText;
    ctx.fillText('WORLD', worldX, pad);
    ctx.font = `bold ${bigFont}px monospace`;
    ctx.fillStyle = COLORS.hudGold;
    ctx.fillText(this.gameState.world, worldX, pad + fontSize + 3);

    // LIVES
    const livesX = cw * 0.30;
    ctx.font = `${fontSize}px monospace`;
    ctx.fillStyle = COLORS.hudRed;
    ctx.fillText('♥', livesX, pad);
    ctx.fillStyle = COLORS.hudGold;
    ctx.fillText(` x${p.lives}`, livesX + fontSize, pad);

    // COINS
    const coinsX = cw * 0.42;
    ctx.fillStyle = COLORS.coinGold;
    ctx.fillText('●', coinsX, pad);
    ctx.fillStyle = COLORS.hudGold;
    ctx.fillText(` x${p.coins}`, coinsX + fontSize, pad);

    // SCORE
    const scoreX = cw * 0.55;
    ctx.font = `${fontSize}px monospace`;
    ctx.fillStyle = COLORS.hudText;
    ctx.fillText('SCORE', scoreX, pad);
    ctx.font = `bold ${bigFont}px monospace`;
    ctx.fillStyle = COLORS.hudGold;
    ctx.fillText(String(p.score).padStart(7, '0'), scoreX, pad + fontSize + 3);

    // TIME
    const timeX = cw * 0.75;
    ctx.font = `${fontSize}px monospace`;
    ctx.fillStyle = COLORS.hudText;
    ctx.fillText('TIME', timeX, pad);
    const timer = Math.ceil(this.gameState.timer);
    ctx.font = `bold ${bigFont}px monospace`;
    ctx.fillStyle = timer <= 60 ? COLORS.hudRed : COLORS.hudGold;
    ctx.fillText(String(timer), timeX, pad + fontSize + 3);
  }

  // ── minimap ─────────────────────────────────────────────────
  private renderMinimap(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
    const mw = 120;
    const mh = 30;
    const mx = cw - mw - 10;
    const my = ch - mh - 10;

    ctx.fillStyle = 'rgba(0,0,50,0.6)';
    ctx.fillRect(mx, my, mw, mh);
    ctx.strokeStyle = 'rgba(100,150,255,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx, my, mw, mh);

    const scaleW = mw / this.level.width;
    const scaleH = mh / this.level.height;

    // terrain
    ctx.fillStyle = 'rgba(100,200,100,0.4)';
    for (let r = 0; r < this.level.tiles.length; r++) {
      for (let c = 0; c < this.level.tiles[0].length; c++) {
        if (this.level.tiles[r][c] !== TileType.EMPTY) {
          ctx.fillRect(mx + c * TILE * scaleW, my + r * TILE * scaleH, Math.max(1, TILE * scaleW), Math.max(1, TILE * scaleH));
        }
      }
    }

    // pipes
    ctx.fillStyle = 'rgba(0,180,0,0.6)';
    for (const pipe of this.pipes) {
      ctx.fillRect(mx + pipe.pos.x * scaleW, my + pipe.pos.y * scaleH, pipe.w * scaleW, pipe.h * scaleH);
    }

    // viewport
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      mx + this.camera.x * scaleW, my + this.camera.y * scaleH,
      this.camera.viewWidth * scaleW, this.camera.viewHeight * scaleH
    );

    // player dot
    ctx.fillStyle = COLORS.marioRed;
    const px = mx + this.player.pos.x * scaleW;
    const py = my + this.player.pos.y * scaleH;
    ctx.fillRect(px - 2, py - 2, 4, 4);
  }

  // ── overlays ────────────────────────────────────────────────
  private renderPauseOverlay(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', cw / 2, ch / 2 - 14);
    ctx.font = '10px monospace';
    ctx.fillStyle = '#AAA';
    ctx.fillText('Press ESC to resume', cw / 2, ch / 2 + 18);
    ctx.textAlign = 'start';
  }

  private renderGameOverOverlay(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = COLORS.hudRed;
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GAME OVER', cw / 2, ch / 2 - 14);
    ctx.font = '10px monospace';
    ctx.fillStyle = '#FFF';
    ctx.fillText('Tap or press SPACE to restart', cw / 2, ch / 2 + 18);
    ctx.textAlign = 'start';

    if (this.input.jumpPressed) {
      this.gameState.gameOver = false;
      this.input.jumpPressed = false;
      this.reset();
    }
  }

  private renderLevelCompleteOverlay(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = COLORS.coinGold;
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LEVEL COMPLETE!', cw / 2, ch / 2 - 20);
    ctx.font = '12px monospace';
    ctx.fillStyle = '#FFF';
    ctx.fillText(`SCORE: ${this.player.score}`, cw / 2, ch / 2 + 12);
    ctx.font = '9px monospace';
    ctx.fillStyle = '#AAA';
    ctx.fillText('Tap or press SPACE to play again', cw / 2, ch / 2 + 36);
    ctx.textAlign = 'start';

    if (this.input.jumpPressed) {
      this.gameState.levelComplete = false;
      this.input.jumpPressed = false;
      this.reset();
    }
  }
}
