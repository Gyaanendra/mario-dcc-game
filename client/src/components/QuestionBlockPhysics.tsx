import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { chiptune } from '../audio/chiptune';
import { QuestionBlock } from '../utils/pixelSprites';

interface QuestionBlockPhysicsProps {
  onTap?: () => void;
  triggerBurst?: boolean;
  disabled?: boolean;
  size?: number;
}

export const QuestionBlockPhysics: React.FC<QuestionBlockPhysicsProps> = ({
  onTap,
  triggerBurst = false,
  disabled = false,
  size = 64
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isHit, setIsHit] = useState(false);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);

  // Initialize Matter.js canvas for coin particle fountain
  useEffect(() => {
    if (!canvasRef.current) return;

    const { Engine, Render, Runner, Bodies, Composite } = Matter;

    const width = 280;
    const height = 180;

    const engine = Engine.create({
      gravity: { x: 0, y: 1.2 }
    });
    engineRef.current = engine;

    const render = Render.create({
      canvas: canvasRef.current,
      engine: engine,
      options: {
        width: width,
        height: height,
        wireframes: false,
        background: 'transparent'
      }
    });
    renderRef.current = render;

    // Invisible boundary walls
    const ground = Bodies.rectangle(width / 2, height + 10, width * 2, 20, { isStatic: true });
    const leftWall = Bodies.rectangle(-10, height / 2, 20, height * 2, { isStatic: true });
    const rightWall = Bodies.rectangle(width + 10, height / 2, 20, height * 2, { isStatic: true });

    Composite.add(engine.world, [ground, leftWall, rightWall]);

    const runner = Runner.create();
    runnerRef.current = runner;
    Runner.run(runner, engine);
    Render.run(render);

    return () => {
      Render.stop(render);
      Runner.stop(runner);
      Composite.clear(engine.world, false);
      Engine.clear(engine);
    };
  }, []);

  // Spawn coin burst
  const spawnCoins = (count = 12) => {
    if (!engineRef.current) return;
    const { Bodies, Composite, Body } = Matter;
    const spawnX = 140;
    const spawnY = 120;

    const newCoins: Matter.Body[] = [];

    for (let i = 0; i < count; i++) {
      const radius = 9 + Math.random() * 3;
      const coin = Bodies.circle(spawnX, spawnY, radius, {
        restitution: 0.65,
        friction: 0.1,
        render: {
          fillStyle: '#FBD000',
          strokeStyle: '#B8860B',
          lineWidth: 2
        }
      });

      // Explode upwards with random angle
      const vx = (Math.random() - 0.5) * 12;
      const vy = -(8 + Math.random() * 10);
      Body.setVelocity(coin, { x: vx, y: vy });
      Body.setAngularVelocity(coin, (Math.random() - 0.5) * 0.4);

      newCoins.push(coin);
    }

    Composite.add(engineRef.current.world, newCoins);

    // Clean up coins after 2.5 seconds to conserve memory
    setTimeout(() => {
      if (engineRef.current) {
        Composite.remove(engineRef.current.world, newCoins);
      }
    }, 2500);
  };

  const handleTap = () => {
    if (disabled) return;
    setIsHit(true);
    chiptune.playCoin();
    if (navigator.vibrate) {
      navigator.vibrate(40);
    }
    spawnCoins(8);

    if (onTap) {
      onTap();
    }

    setTimeout(() => {
      setIsHit(false);
    }, 150);
  };

  // Trigger burst from props
  useEffect(() => {
    if (triggerBurst) {
      handleTap();
    }
  }, [triggerBurst]);

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center justify-center select-none"
      style={{ width: 280, height: 180 }}
    >
      {/* Matter.js Physics Canvas Layer */}
      <canvas
        ref={canvasRef}
        width={280}
        height={180}
        className="absolute inset-0 pointer-events-none z-10"
      />

      {/* Tap-able Question Block Sprite */}
      <div
        onClick={handleTap}
        className={`relative z-20 cursor-pointer active:scale-95 transition-transform ${
          disabled ? 'opacity-70 cursor-not-allowed' : ''
        }`}
      >
        <QuestionBlock size={size} isHit={isHit} />
      </div>

      <div className="absolute bottom-2 text-xs font-pixel text-yellow-400/80 tracking-widest uppercase">
        {disabled ? 'LOCKED' : 'TAP FOR LUCK'}
      </div>
    </div>
  );
};

