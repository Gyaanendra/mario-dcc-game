import React, { useEffect, useRef } from 'react';
import { chiptune } from '../audio/chiptune';

interface MarioRunnerProps {
  status: string; // 'LOBBY' | 'LEVEL_INTRO' | 'QUESTION_ACTIVE' | 'QUESTION_LOCKED' | 'REVEAL' | 'BOWSER_STAGE' | 'PODIUM_WINNERS'
  category?: string;
  isCorrect?: boolean | null;
  interactive?: boolean;
  height?: number;
  onBlockHit?: () => void;
}

export const MarioRunnerCanvas: React.FC<MarioRunnerProps> = ({
  status,
  category = 'GENERAL',
  isCorrect = null,
  interactive = true,
  height = 240,
  onBlockHit
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Game internal state
  const stateRef = useRef({
    tick: 0,
    marioX: 80,
    marioY: 0, // calculated from ground
    marioVY: 0,
    isJumping: false,
    scrollOffset: 0,
    blockX: -100,
    blockY: 80,
    blockHit: false,
    blockBounceY: 0,
    coinY: 0,
    coinVY: 0,
    coinActive: false,
    bowserX: 0,
    fireballs: [] as { x: number; y: number; vx: number }[],
    particles: [] as { x: number; y: number; vx: number; vy: number; color: string; life: number }[]
  });

  // Handle jump
  const triggerJump = () => {
    const s = stateRef.current;
    if (!s.isJumping) {
      s.isJumping = true;
      s.marioVY = -10;
      chiptune.playJump();
    }
  };

  // When question becomes active, spawn the Question Block ahead
  useEffect(() => {
    const s = stateRef.current;
    if (status === 'QUESTION_ACTIVE') {
      s.blockX = 350; // starts ahead on the right
      s.blockHit = false;
      s.blockBounceY = 0;
      s.coinActive = false;
    } else if (status === 'REVEAL') {
      if (isCorrect) {
        // Spawn victory particles
        for (let i = 0; i < 30; i++) {
          s.particles.push({
            x: s.marioX + 16,
            y: height - 60,
            vx: (Math.random() - 0.5) * 8,
            vy: -4 - Math.random() * 6,
            color: ['#FBD000', '#FFF', '#00A800', '#E52521'][Math.floor(Math.random() * 4)],
            life: 60
          });
        }
      }
    }
  }, [status, isCorrect, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const render = () => {
      if (!running) return;
      const s = stateRef.current;
      s.tick++;

      const width = canvas.width;
      const groundY = height - 36;
      const isCastle = status === 'BOWSER_STAGE' || status === 'PODIUM_WINNERS';

      // 1. CLEAR & BACKGROUND
      if (isCastle) {
        // Castle Dark Volcanic Sky
        ctx.fillStyle = '#1A0022';
        ctx.fillRect(0, 0, width, height);

        // Castle Stone Bricks in background
        ctx.fillStyle = '#2D1B36';
        for (let y = 0; y < groundY; y += 24) {
          const shift = ((y / 24) % 2) * 20;
          for (let x = -shift; x < width; x += 40) {
            ctx.strokeRect(x, y, 40, 24);
          }
        }

        // Lava Pit at bottom
        ctx.fillStyle = '#E52521';
        ctx.fillRect(0, groundY, width, 36);
        ctx.fillStyle = '#FBD000';
        for (let x = 0; x < width; x += 30) {
          const bubbleH = Math.sin((s.tick + x) * 0.1) * 6;
          ctx.fillRect(x, groundY + 4 + bubbleH, 16, 8);
        }
      } else {
        // Classic Mario Sky Blue
        ctx.fillStyle = '#5C94FC';
        ctx.fillRect(0, 0, width, height);

        // Parallax Clouds
        ctx.fillStyle = '#FFFFFF';
        const cloudSpeed = 0.5;
        for (let i = 0; i < 4; i++) {
          const cx = ((i * 320 - s.tick * cloudSpeed) % (width + 200)) - 100;
          drawPixelCloud(ctx, cx, 30 + (i % 2) * 35);
        }

        // Hills in background
        ctx.fillStyle = '#00A800';
        for (let i = 0; i < 3; i++) {
          const hx = ((i * 450 - s.tick * 1.0) % (width + 300)) - 100;
          ctx.beginPath();
          ctx.ellipse(hx, groundY + 10, 90, 50, 0, Math.PI, 0);
          ctx.fill();
        }

        // Ground Tiles (Brick & Grass)
        for (let x = 0; x < width; x += 24) {
          // Grass Top
          ctx.fillStyle = '#00A800';
          ctx.fillRect(x, groundY, 24, 6);
          ctx.fillStyle = '#00D800';
          ctx.fillRect(x, groundY, 24, 2);
          // Dirt/Brick
          ctx.fillStyle = '#D06000';
          ctx.fillRect(x, groundY + 6, 24, 30);
          ctx.fillStyle = '#8B4500';
          ctx.strokeRect(x, groundY + 6, 24, 15);
          ctx.strokeRect(x + 12, groundY + 21, 24, 15);
        }

        // Pipes
        const pipeX = ((600 - s.tick * 2) % (width + 400)) - 80;
        drawPixelPipe(ctx, pipeX, groundY - 48, 48);
      }

      // 2. QUESTION BLOCK INTERACTION (During active questions)
      if (status === 'QUESTION_ACTIVE' || status === 'QUESTION_LOCKED' || status === 'REVEAL') {
        if (!s.blockHit) {
          // Move block towards Mario until it reaches jumping range
          if (s.blockX > s.marioX + 30) {
            s.blockX -= 3;
          } else {
            // Auto jump when block is overhead!
            if (!s.isJumping) {
              s.isJumping = true;
              s.marioVY = -11;
              chiptune.playJump();
            }
          }

          // Check if Mario head hits block
          const marioHeadY = groundY - s.marioY - 32;
          if (
            Math.abs(s.marioX + 16 - (s.blockX + 16)) < 24 &&
            marioHeadY <= s.blockY + 32 &&
            marioHeadY >= s.blockY &&
            s.marioVY < 0
          ) {
            s.blockHit = true;
            s.blockBounceY = -12;
            s.coinActive = true;
            s.coinY = s.blockY - 16;
            s.coinVY = -9;
            s.marioVY = 4; // rebound Mario downwards
            chiptune.playCoin();
            if (onBlockHit) onBlockHit();
          }
        }

        // Draw Question Block
        const curBlockY = s.blockY + s.blockBounceY;
        if (s.blockBounceY < 0) s.blockBounceY += 1.5;
        drawQuestionBlock(ctx, s.blockX, curBlockY, s.blockHit, s.tick);

        // Animated Coin popping out
        if (s.coinActive) {
          s.coinY += s.coinVY;
          s.coinVY += 0.8; // gravity
          drawSpinningCoin(ctx, s.blockX + 8, s.coinY, s.tick);
          if (s.coinY > s.blockY + 40) {
            s.coinActive = false;
          }
        }
      }

      // 3. BOWSER (In Level 3 Boss Challenge)
      if (isCastle) {
        s.bowserX = width - 130;
        drawBowserBoss(ctx, s.bowserX, groundY - 64, s.tick);

        // Bowser breathing fireballs
        if (s.tick % 70 === 0 && status === 'BOWSER_STAGE') {
          s.fireballs.push({ x: s.bowserX, y: groundY - 40, vx: -5 });
          chiptune.playBossRoar();
        }

        // Update & Draw fireballs
        ctx.fillStyle = '#FF4500';
        for (let i = s.fireballs.length - 1; i >= 0; i--) {
          const f = s.fireballs[i];
          f.x += f.vx;
          ctx.beginPath();
          ctx.arc(f.x, f.y, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FBD000';
          ctx.beginPath();
          ctx.arc(f.x + 3, f.y, 4, 0, Math.PI * 2);
          ctx.fill();
          if (f.x < -20) s.fireballs.splice(i, 1);
        }
      }

      // 4. MARIO RUNNER PHYSICS & DRAW
      if (s.isJumping) {
        s.marioY += -s.marioVY;
        s.marioVY += 0.7; // Gravity
        if (s.marioY <= 0) {
          s.marioY = 0;
          s.marioVY = 0;
          s.isJumping = false;
        }
      }

      const marioDrawY = groundY - s.marioY - 32;
      drawPixelMario(ctx, s.marioX, marioDrawY, s.isJumping, s.tick, status === 'REVEAL' && isCorrect);

      // 5. RED FLAG BOO GHOST (Appears on Red Flag questions)
      if (category === 'RED FLAG' && (status === 'QUESTION_ACTIVE' || status === 'REVEAL')) {
        const ghostX = (s.tick * 2) % (width + 100) - 50;
        const ghostY = 70 + Math.sin(s.tick * 0.08) * 20;
        drawBooGhost(ctx, ghostX, ghostY, s.tick);
      }

      // 6. PARTICLES (Victory Stars / Coin Sparks)
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.life--;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 4, 4);
        if (p.life <= 0) s.particles.splice(i, 1);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [status, category, isCorrect, height, onBlockHit]);

  return (
    <div className="relative w-full overflow-hidden select-none border-b-4 border-black">
      <canvas
        ref={canvasRef}
        width={960}
        height={height}
        onClick={interactive ? triggerJump : undefined}
        className="w-full block pixelated cursor-pointer"
        style={{ height }}
      />
      {interactive && (
        <div className="absolute top-2 right-3 px-2 py-0.5 bg-black/50 text-[10px] font-pixel text-yellow-300 rounded border border-white/20 pointer-events-none">
          CLICK CANVAS TO JUMP ⬆
        </div>
      )}
    </div>
  );
};

// =========================================================================
// RETRO PIXEL SPRITE RENDERERS (NES Style procedural 8-bit drawing)
// =========================================================================

function drawPixelMario(ctx: CanvasRenderingContext2D, x: number, y: number, isJumping: boolean, tick: number, isVictory: boolean | null) {
  const p = 2; // pixel scale

  // If victory, draw Mario facing front with arms up
  if (isVictory) {
    ctx.fillStyle = '#E52521'; // Red Hat
    ctx.fillRect(x + 3 * p, y, 6 * p, 2 * p);
    ctx.fillStyle = '#FCD8A8'; // Face
    ctx.fillRect(x + 3 * p, y + 2 * p, 6 * p, 3 * p);
    ctx.fillStyle = '#000'; // Eyes
    ctx.fillRect(x + 4 * p, y + 3 * p, p, p);
    ctx.fillRect(x + 7 * p, y + 3 * p, p, p);
    // Overalls
    ctx.fillStyle = '#0022AA';
    ctx.fillRect(x + 3 * p, y + 5 * p, 6 * p, 6 * p);
    // Arms up
    ctx.fillStyle = '#E52521';
    ctx.fillRect(x + p, y + 2 * p, 2 * p, 4 * p);
    ctx.fillRect(x + 9 * p, y + 2 * p, 2 * p, 4 * p);
    ctx.fillStyle = '#FCD8A8'; // Hands
    ctx.fillRect(x + p, y + p, 2 * p, 2 * p);
    ctx.fillRect(x + 9 * p, y + p, 2 * p, 2 * p);
    return;
  }

  // Running frames: cycle between 3 frames
  const runFrame = isJumping ? 3 : Math.floor(tick / 6) % 3;

  // Red Hat & Hair
  ctx.fillStyle = '#E52521';
  ctx.fillRect(x + 3 * p, y, 6 * p, 2 * p);
  ctx.fillRect(x + 2 * p, y + p, 8 * p, p);

  // Face
  ctx.fillStyle = '#FCD8A8';
  ctx.fillRect(x + 4 * p, y + 2 * p, 4 * p, 3 * p);
  ctx.fillStyle = '#794000'; // Hair/Moustache
  ctx.fillRect(x + 2 * p, y + 2 * p, 2 * p, 2 * p);
  ctx.fillRect(x + 6 * p, y + 3 * p, 3 * p, p);
  ctx.fillStyle = '#000'; // Eye
  ctx.fillRect(x + 6 * p, y + 2 * p, p, p);

  // Red Shirt & Blue Overalls
  ctx.fillStyle = '#E52521';
  ctx.fillRect(x + 2 * p, y + 5 * p, 6 * p, 3 * p);
  ctx.fillStyle = '#0022AA';
  ctx.fillRect(x + 3 * p, y + 6 * p, 5 * p, 5 * p);
  ctx.fillStyle = '#FBD000'; // Yellow Buttons
  ctx.fillRect(x + 4 * p, y + 7 * p, p, p);

  // Arms
  if (isJumping) {
    // Punching air reaching up
    ctx.fillStyle = '#FCD8A8';
    ctx.fillRect(x + 6 * p, y - 2 * p, 2 * p, 2 * p);
    ctx.fillStyle = '#E52521';
    ctx.fillRect(x + 5 * p, y, 2 * p, 3 * p);
  } else {
    ctx.fillStyle = '#FCD8A8';
    ctx.fillRect(x + (runFrame === 1 ? 7 : 8) * p, y + 7 * p, 2 * p, 2 * p);
  }

  // Legs & Shoes
  ctx.fillStyle = '#794000'; // Brown Shoes
  if (isJumping) {
    ctx.fillRect(x + p, y + 11 * p, 4 * p, 2 * p);
    ctx.fillRect(x + 6 * p, y + 10 * p, 4 * p, 2 * p);
  } else if (runFrame === 0) {
    ctx.fillRect(x + 2 * p, y + 11 * p, 3 * p, 2 * p);
    ctx.fillRect(x + 6 * p, y + 11 * p, 3 * p, 2 * p);
  } else if (runFrame === 1) {
    ctx.fillRect(x + p, y + 10 * p, 3 * p, 2 * p);
    ctx.fillRect(x + 7 * p, y + 11 * p, 4 * p, 2 * p);
  } else {
    ctx.fillRect(x + 3 * p, y + 11 * p, 4 * p, 2 * p);
    ctx.fillRect(x + 6 * p, y + 10 * p, 3 * p, 2 * p);
  }
}

function drawQuestionBlock(ctx: CanvasRenderingContext2D, x: number, y: number, isHit: boolean, tick: number) {
  const size = 32;

  // Outer black border
  ctx.fillStyle = '#000';
  ctx.fillRect(x, y, size, size);

  // Fill Gold or Brown if Hit
  ctx.fillStyle = isHit ? '#8B5A2B' : '#E87D00';
  ctx.fillRect(x + 2, y + 2, size - 4, size - 4);

  // Corner Rivets
  ctx.fillStyle = '#000';
  ctx.fillRect(x + 3, y + 3, 2, 2);
  ctx.fillRect(x + size - 5, y + 3, 2, 2);
  ctx.fillRect(x + 3, y + size - 5, 2, 2);
  ctx.fillRect(x + size - 5, y + size - 5, 2, 2);

  if (!isHit) {
    // Flashing white/yellow question mark
    const flash = Math.floor(tick / 15) % 2 === 0;
    ctx.fillStyle = flash ? '#FFFFFF' : '#FCD8A8';
    // Draw '?'
    ctx.fillRect(x + 10, y + 6, 12, 4);
    ctx.fillRect(x + 18, y + 10, 4, 6);
    ctx.fillRect(x + 14, y + 16, 4, 4);
    ctx.fillRect(x + 14, y + 22, 4, 4);
  } else {
    // Empty center
    ctx.fillStyle = '#5C381E';
    ctx.fillRect(x + 8, y + 8, 16, 16);
  }
}

function drawSpinningCoin(ctx: CanvasRenderingContext2D, x: number, y: number, tick: number) {
  const frame = Math.floor(tick / 4) % 4;
  const widths = [16, 10, 4, 10];
  const w = widths[frame];
  const cx = x + (16 - w) / 2;

  ctx.fillStyle = '#000';
  ctx.fillRect(cx, y, w, 20);
  ctx.fillStyle = '#FBD000';
  ctx.fillRect(cx + 2, y + 2, Math.max(2, w - 4), 16);
  ctx.fillStyle = '#FFF';
  ctx.fillRect(cx + 2, y + 4, Math.max(1, (w - 4) / 3), 12);
}

function drawPixelPipe(ctx: CanvasRenderingContext2D, x: number, y: number, h: number) {
  const w = 44;
  // Rim
  ctx.fillStyle = '#000';
  ctx.fillRect(x, y, w, 16);
  ctx.fillStyle = '#00A800';
  ctx.fillRect(x + 2, y + 2, w - 4, 12);
  ctx.fillStyle = '#68FF68';
  ctx.fillRect(x + 4, y + 2, 6, 12);
  // Stem
  ctx.fillStyle = '#000';
  ctx.fillRect(x + 4, y + 16, w - 8, h);
  ctx.fillStyle = '#00A800';
  ctx.fillRect(x + 6, y + 16, w - 12, h);
  ctx.fillStyle = '#68FF68';
  ctx.fillRect(x + 8, y + 16, 6, h);
}

function drawPixelCloud(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x + 20, y, 40, 16);
  ctx.fillRect(x + 10, y + 8, 60, 20);
  ctx.fillRect(x, y + 16, 80, 16);
  ctx.fillStyle = '#D8E8F8'; // Shadow line
  ctx.fillRect(x, y + 28, 80, 4);
}

function drawBooGhost(ctx: CanvasRenderingContext2D, x: number, y: number, tick: number) {
  const bob = Math.sin(tick * 0.1) * 3;
  const drawY = y + bob;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(x + 16, drawY + 16, 14, 0, Math.PI * 2);
  ctx.fill();
  // Red warning eyes
  ctx.fillStyle = '#E52521';
  ctx.fillRect(x + 10, drawY + 12, 4, 4);
  ctx.fillRect(x + 18, drawY + 12, 4, 4);
  // Mouth
  ctx.fillStyle = '#000';
  ctx.fillRect(x + 12, drawY + 20, 8, 4);
  ctx.fillStyle = '#E52521';
  ctx.fillRect(x + 14, drawY + 22, 4, 3);
}

function drawBowserBoss(ctx: CanvasRenderingContext2D, x: number, y: number, tick: number) {
  const breath = Math.sin(tick * 0.1) * 3;
  // Shell
  ctx.fillStyle = '#004D00';
  ctx.fillRect(x + 10, y + 10, 40, 36);
  // Spikes
  ctx.fillStyle = '#FFF';
  ctx.fillRect(x + 6, y + 12, 4, 6);
  ctx.fillRect(x + 12, y + 4, 6, 6);
  ctx.fillRect(x + 30, y + 4, 6, 6);
  // Green Head
  ctx.fillStyle = '#00A800';
  ctx.fillRect(x - 14, y + 10 + breath, 28, 24);
  // Horns
  ctx.fillStyle = '#E52521';
  ctx.fillRect(x - 8, y + 2 + breath, 4, 8);
  ctx.fillRect(x + 8, y + 2 + breath, 4, 8);
  // Fierce Glowing Red Eyes
  ctx.fillStyle = '#E52521';
  ctx.fillRect(x - 8, y + 16 + breath, 5, 4);
  ctx.fillStyle = '#FFF';
  ctx.fillRect(x - 6, y + 16 + breath, 2, 2);
  // Jaws / Snout
  ctx.fillStyle = '#FCD8A8';
  ctx.fillRect(x - 22, y + 22 + breath, 20, 14);
  ctx.fillStyle = '#000';
  ctx.fillRect(x - 20, y + 28 + breath, 16, 6); // open mouth
  ctx.fillStyle = '#FFF'; // fangs
  ctx.fillRect(x - 18, y + 28 + breath, 3, 3);
  ctx.fillRect(x - 8, y + 28 + breath, 3, 3);
}
