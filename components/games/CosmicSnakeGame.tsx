import React, { useState, useEffect, useRef, useCallback } from 'react';
import { gameAudio } from './gameAudio';

// --- Constants ---
const GRID_SIZE = 22;
const BASE_SPEED = 140; // ms per tick
const INITIAL_LIVES = 3;

interface LevelConfig {
  scoreThreshold: number;
  name: string;
  theme: string;
  speed: number;
  colorHead: string;
  colorBodyStart: string;
  colorBodyEnd: string;
  foodColor: string;
  asteroidCount: number;
}

const LEVELS: LevelConfig[] = [
  {
    scoreThreshold: 0,
    name: 'Nebulosa Neon',
    theme: 'level-neon',
    speed: 135,
    colorHead: '#38bdf8',
    colorBodyStart: '#06b6d4',
    colorBodyEnd: '#a855f7',
    foodColor: '#ec4899',
    asteroidCount: 0,
  },
  {
    scoreThreshold: 12,
    name: 'Planeta Lava',
    theme: 'level-lava',
    speed: 115,
    colorHead: '#fbbf24',
    colorBodyStart: '#f97316',
    colorBodyEnd: '#dc2626',
    foodColor: '#facc15',
    asteroidCount: 2,
  },
  {
    scoreThreshold: 28,
    name: 'Cinturão de Meteoros',
    theme: 'level-meteors',
    speed: 95,
    colorHead: '#4ade80',
    colorBodyStart: '#10b981',
    colorBodyEnd: '#059669',
    foodColor: '#38bdf8',
    asteroidCount: 5,
  },
  {
    scoreThreshold: 48,
    name: 'Estação Alienígena',
    theme: 'level-station',
    speed: 80,
    colorHead: '#c084fc',
    colorBodyStart: '#a855f7',
    colorBodyEnd: '#7e22ce',
    foodColor: '#4ade80',
    asteroidCount: 6,
  },
  {
    scoreThreshold: 75,
    name: 'Buraco Negro',
    theme: 'level-blackhole',
    speed: 65,
    colorHead: '#f43f5e',
    colorBodyStart: '#ec4899',
    colorBodyEnd: '#4c1d95',
    foodColor: '#ffffff',
    asteroidCount: 8,
  },
];

interface Point {
  x: number;
  y: number;
}

interface SpecialItem {
  pos: Point;
  type: 'supernova' | 'slowmo' | 'shield';
  timer: number;
  duration: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
  decay: number;
}

interface CosmicSnakeGameProps {
  playerName: string;
  onClose: () => void;
}

const CosmicSnakeGame: React.FC<CosmicSnakeGameProps> = ({ playerName, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // States
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('labirinto_snake_highscore') || '0', 10) || 0;
    } catch {
      return 0;
    }
  });
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [levelIndex, setLevelIndex] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(() => gameAudio.getMuted());
  const [combo, setCombo] = useState(0);
  const [shieldActive, setShieldActive] = useState(false);
  const [slowMoActive, setSlowMoActive] = useState(false);
  const [slowMoRemaining, setSlowMoRemaining] = useState(0);

  // Refs for Game Loop & Physics
  const snakeRef = useRef<Point[]>([{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]);
  const foodRef = useRef<Point>({ x: 16, y: 10 });
  const specialItemRef = useRef<SpecialItem | null>(null);
  const asteroidsRef = useRef<Point[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const backgroundStarsRef = useRef<{ x: number; y: number; r: number; alpha: number; speed: number }[]>([]);

  // Direction & Input Buffer
  const currentDirRef = useRef<Point>({ x: 1, y: 0 });
  const inputQueueRef = useRef<Point[]>([]);
  const lastTickTimeRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  // Touch Swipe Refs
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Update High Score
  const updateScore = useCallback((newScore: number) => {
    setScore(newScore);
    if (newScore > highScore) {
      setHighScore(newScore);
      try {
        localStorage.setItem('labirinto_snake_highscore', newScore.toString());
      } catch {}
    }
  }, [highScore]);

  // Determine Current Level based on score
  useEffect(() => {
    let nextIdx = 0;
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (score >= LEVELS[i].scoreThreshold) {
        nextIdx = i;
        break;
      }
    }
    if (nextIdx !== levelIndex) {
      setLevelIndex(nextIdx);
      gameAudio.playLevelUp();
      spawnAsteroids(LEVELS[nextIdx].asteroidCount);
    }
  }, [score, levelIndex]);

  // Spawn Asteroids for current level
  const spawnAsteroids = (count: number) => {
    const newAsteroids: Point[] = [];
    const snake = snakeRef.current;
    while (newAsteroids.length < count) {
      const rx = Math.floor(Math.random() * GRID_SIZE);
      const ry = Math.floor(Math.random() * GRID_SIZE);
      // Avoid spawn near center or on snake or food
      const isTooCloseToCenter = Math.abs(rx - 10) < 3 && Math.abs(ry - 10) < 3;
      const onSnake = snake.some(s => s.x === rx && s.y === ry);
      const onFood = foodRef.current.x === rx && foodRef.current.y === ry;
      const alreadyThere = newAsteroids.some(a => a.x === rx && a.y === ry);
      if (!isTooCloseToCenter && !onSnake && !onFood && !alreadyThere) {
        newAsteroids.push({ x: rx, y: ry });
      }
    }
    asteroidsRef.current = newAsteroids;
  };

  // Helper: Find valid empty cell
  const getEmptyCoord = (): Point => {
    const snake = snakeRef.current;
    const asteroids = asteroidsRef.current;
    let attempts = 0;
    while (attempts < 200) {
      const p = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      const onSnake = snake.some(s => s.x === p.x && s.y === p.y);
      const onAsteroid = asteroids.some(a => a.x === p.x && a.y === p.y);
      const onSpecial = specialItemRef.current && specialItemRef.current.pos.x === p.x && specialItemRef.current.pos.y === p.y;
      if (!onSnake && !onAsteroid && !onSpecial) {
        return p;
      }
      attempts++;
    }
    return { x: 5, y: 5 };
  };

  // Initialize stars once
  useEffect(() => {
    const stars: { x: number; y: number; r: number; alpha: number; speed: number }[] = [];
    for (let i = 0; i < 60; i++) {
      stars.push({
        x: Math.random() * 500,
        y: Math.random() * 500,
        r: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.7 + 0.3,
        speed: Math.random() * 0.3 + 0.1,
      });
    }
    backgroundStarsRef.current = stars;
    foodRef.current = getEmptyCoord();
  }, []);

  // Reset Game
  const resetGame = () => {
    snakeRef.current = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    currentDirRef.current = { x: 1, y: 0 };
    inputQueueRef.current = [];
    asteroidsRef.current = [];
    specialItemRef.current = null;
    particlesRef.current = [];
    setScore(0);
    setLives(INITIAL_LIVES);
    setLevelIndex(0);
    setCombo(0);
    setShieldActive(false);
    setSlowMoActive(false);
    setSlowMoRemaining(0);
    setGameOver(false);
    setIsPaused(false);
    foodRef.current = getEmptyCoord();
  };

  // Emit Particles
  const emitParticles = (x: number, y: number, color: string, count = 10) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 3 + 1.5,
        alpha: 1,
        color,
        decay: Math.random() * 0.03 + 0.02,
      });
    }
  };

  // Queue Direction Change (with input buffering to prevent suicide)
  const queueDirection = useCallback((newDir: Point) => {
    const lastQueued = inputQueueRef.current.length > 0
      ? inputQueueRef.current[inputQueueRef.current.length - 1]
      : currentDirRef.current;

    // Prevent reversing directly
    if (newDir.x + lastQueued.x === 0 && newDir.y + lastQueued.y === 0) {
      return;
    }
    // Prevent duplicate consecutive direction
    if (newDir.x === lastQueued.x && newDir.y === lastQueued.y) {
      return;
    }

    if (inputQueueRef.current.length < 2) {
      inputQueueRef.current.push(newDir);
    }
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        setIsPaused(prev => !prev);
        return;
      }
      if (gameOver || isPaused) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          queueDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          queueDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          queueDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          queueDirection({ x: 1, y: 0 });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver, isPaused, queueDirection]);

  // Touch Swipe Handling
  const handleTouchStart = (e: React.TouchEvent) => {
    if (gameOver || isPaused) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || gameOver || isPaused) return;
    const touchEnd = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    const dx = touchEnd.x - touchStartRef.current.x;
    const dy = touchEnd.y - touchStartRef.current.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) > 25) {
      if (absX > absY) {
        queueDirection(dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 });
      } else {
        queueDirection(dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });
      }
      touchStartRef.current = null; // consume touch
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
  };

  // Handle Collision / Death
  const handleCollision = (cellX: number, cellY: number, cellSize: number) => {
    emitParticles((cellX + 0.5) * cellSize, (cellY + 0.5) * cellSize, '#ef4444', 25);
    gameAudio.playCrash();

    if (shieldActive) {
      setShieldActive(false);
      // bounce back 1 step if possible
      return;
    }

    if (lives > 1) {
      setLives(l => l - 1);
      setCombo(0);
      setIsPaused(true);
      setTimeout(() => {
        // Respawn in safe location
        snakeRef.current = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
        currentDirRef.current = { x: 1, y: 0 };
        inputQueueRef.current = [];
        setIsPaused(false);
      }, 1000);
    } else {
      setLives(0);
      setGameOver(true);
      gameAudio.playGameOver();
    }
  };

  // Main Game Loop (requestAnimationFrame)
  useEffect(() => {
    let active = true;

    const loop = (timestamp: number) => {
      if (!active) return;

      const canvas = canvasRef.current;
      if (!canvas) {
        animationFrameRef.current = requestAnimationFrame(loop);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const currentLevel = LEVELS[levelIndex] || LEVELS[0];
      const speed = slowMoActive ? currentLevel.speed * 1.6 : currentLevel.speed;

      // Handle Slow-Mo countdown
      if (slowMoActive) {
        setSlowMoRemaining(prev => {
          if (prev <= 16) {
            setSlowMoActive(false);
            return 0;
          }
          return prev - 16;
        });
      }

      // Step physics tick
      if (!gameOver && !isPaused && timestamp - lastTickTimeRef.current >= speed) {
        lastTickTimeRef.current = timestamp;

        // Apply queued direction
        if (inputQueueRef.current.length > 0) {
          currentDirRef.current = inputQueueRef.current.shift()!;
        }

        const snake = [...snakeRef.current];
        const head = { ...snake[0] };
        head.x += currentDirRef.current.x;
        head.y += currentDirRef.current.y;

        const cellSize = canvas.width / GRID_SIZE;

        // Wall collision
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          handleCollision(snake[0].x, snake[0].y, cellSize);
          return;
        }

        // Self collision
        for (let i = 1; i < snake.length; i++) {
          if (head.x === snake[i].x && head.y === snake[i].y) {
            handleCollision(head.x, head.y, cellSize);
            return;
          }
        }

        // Asteroid collision
        for (const ast of asteroidsRef.current) {
          if (head.x === ast.x && head.y === ast.y) {
            handleCollision(head.x, head.y, cellSize);
            return;
          }
        }

        // Snake moves forward
        snake.unshift(head);

        // Check Food
        if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
          const nextCombo = combo + 1;
          setCombo(nextCombo);
          updateScore(score + 10 + Math.min(nextCombo * 2, 20));
          gameAudio.playSnakeEat(nextCombo);
          emitParticles((head.x + 0.5) * cellSize, (head.y + 0.5) * cellSize, currentLevel.foodColor, 12);
          foodRef.current = getEmptyCoord();

          // Chance to spawn special item
          if (!specialItemRef.current && Math.random() < 0.28) {
            const types: ('supernova' | 'slowmo' | 'shield')[] = ['supernova', 'slowmo', 'shield'];
            const chosenType = types[Math.floor(Math.random() * types.length)];
            specialItemRef.current = {
              pos: getEmptyCoord(),
              type: chosenType,
              timer: 0,
              duration: 9000, // 9 seconds to collect
            };
          }
        } else if (
          specialItemRef.current &&
          head.x === specialItemRef.current.pos.x &&
          head.y === specialItemRef.current.pos.y
        ) {
          // Hit special item
          const item = specialItemRef.current;
          gameAudio.playPowerUp();
          if (item.type === 'supernova') {
            updateScore(score + 50);
            emitParticles((head.x + 0.5) * cellSize, (head.y + 0.5) * cellSize, '#facc15', 20);
          } else if (item.type === 'shield') {
            setShieldActive(true);
            emitParticles((head.x + 0.5) * cellSize, (head.y + 0.5) * cellSize, '#c084fc', 20);
          } else if (item.type === 'slowmo') {
            setSlowMoActive(true);
            setSlowMoRemaining(6000); // 6s slow-mo
            emitParticles((head.x + 0.5) * cellSize, (head.y + 0.5) * cellSize, '#38bdf8', 20);
          }
          specialItemRef.current = null;
        } else {
          snake.pop(); // regular move: trim tail
        }

        snakeRef.current = snake;

        // Emit tail trail particle occasionally
        if (Math.random() < 0.4) {
          const tail = snake[snake.length - 1];
          emitParticles((tail.x + 0.5) * cellSize, (tail.y + 0.5) * cellSize, currentLevel.colorBodyEnd, 2);
        }

        // Advance special item timer
        if (specialItemRef.current) {
          specialItemRef.current.timer += speed;
          if (specialItemRef.current.timer >= specialItemRef.current.duration) {
            specialItemRef.current = null;
          }
        }
      }

      // --- RENDERING ---
      const W = canvas.width;
      const H = canvas.height;
      const cellSize = W / GRID_SIZE;

      // 1. Draw Space Background
      ctx.clearRect(0, 0, W, H);

      // Deep space gradient
      const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, W * 0.7);
      if (levelIndex === 0) {
        bgGrad.addColorStop(0, '#1e1035');
        bgGrad.addColorStop(1, '#0a0518');
      } else if (levelIndex === 1) {
        bgGrad.addColorStop(0, '#360d0d');
        bgGrad.addColorStop(1, '#110303');
      } else if (levelIndex === 2) {
        bgGrad.addColorStop(0, '#062925');
        bgGrad.addColorStop(1, '#031210');
      } else if (levelIndex === 3) {
        bgGrad.addColorStop(0, '#241038');
        bgGrad.addColorStop(1, '#090312');
      } else {
        bgGrad.addColorStop(0, '#29061c');
        bgGrad.addColorStop(1, '#040108');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Drifting stars
      backgroundStarsRef.current.forEach(star => {
        star.y += star.speed;
        if (star.y > H) star.y = 0;
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Subtle Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, H);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(W, i * cellSize);
        ctx.stroke();
      }

      // 2. Draw Asteroids (Obstacles)
      asteroidsRef.current.forEach(ast => {
        const ax = ast.x * cellSize + cellSize / 2;
        const ay = ast.y * cellSize + cellSize / 2;
        const rad = cellSize * 0.42;

        ctx.save();
        ctx.shadowColor = '#64748b';
        ctx.shadowBlur = 6;
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.arc(ax, ay, rad, 0, Math.PI * 2);
        ctx.fill();

        // Asteroid crater detail
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(ax - rad * 0.3, ay - rad * 0.2, rad * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ax + rad * 0.3, ay + rad * 0.3, rad * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 3. Draw Special Item (if active)
      if (specialItemRef.current) {
        const item = specialItemRef.current;
        const ix = item.pos.x * cellSize + cellSize / 2;
        const iy = item.pos.y * cellSize + cellSize / 2;
        const pulse = Math.sin(timestamp / 150) * 0.15 + 1;
        const progress = 1 - item.timer / item.duration;

        ctx.save();
        if (item.type === 'supernova') {
          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 14;
          ctx.fillStyle = '#fde047';
        } else if (item.type === 'shield') {
          ctx.shadowColor = '#c084fc';
          ctx.shadowBlur = 14;
          ctx.fillStyle = '#a855f7';
        } else {
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 14;
          ctx.fillStyle = '#06b6d4';
        }

        // Item body
        ctx.beginPath();
        ctx.arc(ix, iy, (cellSize * 0.38) * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Expiring countdown ring
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ix, iy, cellSize * 0.45, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
        ctx.stroke();

        // Icon inside
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = item.type === 'supernova' ? '★' : item.type === 'shield' ? '🛡️' : '⏳';
        ctx.fillText(label, ix, iy);
        ctx.restore();
      }

      // 4. Draw Food Orb
      const fx = foodRef.current.x * cellSize + cellSize / 2;
      const fy = foodRef.current.y * cellSize + cellSize / 2;
      const foodPulse = Math.sin(timestamp / 200) * 0.18 + 0.95;

      ctx.save();
      ctx.shadowColor = currentLevel.foodColor;
      ctx.shadowBlur = 15;
      ctx.fillStyle = currentLevel.foodColor;
      ctx.beginPath();
      ctx.arc(fx, fy, (cellSize * 0.38) * foodPulse, 0, Math.PI * 2);
      ctx.fill();

      // Inner white star core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(fx, fy, cellSize * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 5. Draw Snake
      const snake = snakeRef.current;
      for (let i = snake.length - 1; i >= 0; i--) {
        const seg = snake[i];
        const sx = seg.x * cellSize + cellSize / 2;
        const sy = seg.y * cellSize + cellSize / 2;
        const isHead = i === 0;

        ctx.save();
        if (isHead) {
          ctx.shadowColor = currentLevel.colorHead;
          ctx.shadowBlur = 12;
          ctx.fillStyle = currentLevel.colorHead;

          // Head circle
          ctx.beginPath();
          ctx.arc(sx, sy, cellSize * 0.46, 0, Math.PI * 2);
          ctx.fill();

          // Animated glowing eyes looking toward direction
          const dir = currentDirRef.current;
          const eyeDist = cellSize * 0.22;
          const eyeOffset = cellSize * 0.18;

          // Perp vector for eyes
          const px = -dir.y * eyeOffset;
          const py = dir.x * eyeOffset;
          const ex1 = sx + dir.x * eyeDist + px;
          const ey1 = sy + dir.y * eyeDist + py;
          const ex2 = sx + dir.x * eyeDist - px;
          const ey2 = sy + dir.y * eyeDist - py;

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ex1, ey1, cellSize * 0.1, 0, Math.PI * 2);
          ctx.arc(ex2, ey2, cellSize * 0.1, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(ex1 + dir.x * 1.5, ey1 + dir.y * 1.5, cellSize * 0.05, 0, Math.PI * 2);
          ctx.arc(ex2 + dir.x * 1.5, ey2 + dir.y * 1.5, cellSize * 0.05, 0, Math.PI * 2);
          ctx.fill();

          // Shield aura if active
          if (shieldActive) {
            ctx.strokeStyle = '#c084fc';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#c084fc';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(sx, sy, cellSize * 0.65, 0, Math.PI * 2);
            ctx.stroke();
          }
        } else {
          // Body segment with gradient tapering
          const ratio = i / snake.length;
          const size = cellSize * (0.42 - ratio * 0.12);
          ctx.shadowColor = currentLevel.colorBodyStart;
          ctx.shadowBlur = 6;
          ctx.fillStyle = currentLevel.colorBodyStart;
          ctx.beginPath();
          ctx.arc(sx, sy, Math.max(3, size), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 6. Draw Particles
      particlesRef.current = particlesRef.current.filter(p => p.alpha > 0);
      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        if (p.alpha > 0) {
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      active = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameOver, isPaused, levelIndex, slowMoActive, shieldActive, combo, score, updateScore]);

  const currentLevel = LEVELS[levelIndex] || LEVELS[0];

  return (
    <div className="flex flex-col items-center select-none text-white w-full max-w-md mx-auto">
      {/* HUD Header */}
      <div className="w-full flex items-center justify-between px-2 mb-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold font-mono tracking-tight text-white">{score}</span>
            {combo > 1 && (
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-300 animate-pulse">
                {combo}x COMBO
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400 font-mono">RECORDE: {highScore}</span>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-xs font-medium text-purple-300">{currentLevel.name}</span>
          <div className="flex items-center gap-1 mt-0.5">
            {Array.from({ length: INITIAL_LIVES }).map((_, i) => (
              <span
                key={i}
                className={`text-xs transition-opacity ${i < lives ? 'text-red-400 opacity-100' : 'text-slate-600 opacity-40'}`}
              >
                ❤️
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {shieldActive && (
            <span className="text-xs bg-purple-900/60 border border-purple-500/50 text-purple-300 px-2 py-0.5 rounded-full animate-pulse">
              🛡️
            </span>
          )}
          {slowMoActive && (
            <span className="text-xs bg-cyan-900/60 border border-cyan-500/50 text-cyan-300 px-2 py-0.5 rounded-full font-mono">
              {(slowMoRemaining / 1000).toFixed(0)}s
            </span>
          )}
          <button
            onClick={() => {
              const muted = gameAudio.toggleMute();
              setIsMuted(muted);
            }}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            title={isMuted ? 'Ativar Som' : 'Silenciar'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
          <button
            onClick={() => setIsPaused(p => !p)}
            className="p-1.5 px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            {isPaused ? '▶' : '⏸'}
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div
        className="relative w-full aspect-square rounded-xl overflow-hidden border border-purple-500/30 shadow-lg shadow-purple-900/20"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <canvas
          ref={canvasRef}
          width={440}
          height={440}
          className="w-full h-full block bg-black"
        />

        {/* Game Over Screen */}
        {gameOver && (
          <div className="game-overlay absolute inset-0 bg-black/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <h3 className="text-2xl font-bold text-red-400 mb-1">Fim de Missão</h3>
            <p className="text-sm text-slate-300 mb-4">{playerName}, o cosmo te desafiou!</p>
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 w-full max-w-xs mb-5">
              <div className="flex justify-between items-center text-sm py-1">
                <span className="text-slate-400">Pontuação</span>
                <span className="font-bold text-lg text-white font-mono">{score}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1 border-t border-slate-700/60">
                <span className="text-slate-400">Recorde Pessoal</span>
                <span className="font-bold text-sm text-purple-300 font-mono">{highScore}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1 border-t border-slate-700/60">
                <span className="text-slate-400">Setor Alcançado</span>
                <span className="font-medium text-xs text-green-400">{currentLevel.name}</span>
              </div>
            </div>
            <div className="flex gap-3 w-full max-w-xs">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-semibold transition-colors"
              >
                Sair
              </button>
              <button
                onClick={resetGame}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-purple-600 to-green-600 hover:from-purple-500 hover:to-green-500 rounded-lg text-sm font-bold shadow-lg transition-transform active:scale-95"
              >
                Jogar de Novo
              </button>
            </div>
          </div>
        )}

        {/* Pause Overlay */}
        {isPaused && !gameOver && (
          <div className="game-overlay absolute inset-0 bg-black/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-4">
            <h3 className="text-xl font-bold text-white mb-2">Jogo Pausado</h3>
            <p className="text-xs text-slate-400 mb-4">Pressione P ou o botão para continuar</p>
            <button
              onClick={() => setIsPaused(false)}
              className="py-2 px-6 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-bold shadow transition-transform active:scale-95"
            >
              Continuar
            </button>
          </div>
        )}
      </div>

      {/* Virtual D-Pad for Mobile & Quick Controls */}
      <div className="w-full mt-3 flex flex-col items-center gap-1">
        <div className="flex justify-center">
          <button
            onClick={() => queueDirection({ x: 0, y: -1 })}
            className="w-12 h-11 bg-slate-800/80 active:bg-purple-600/60 border border-slate-700 rounded-t-lg flex items-center justify-center text-slate-200 text-lg active:scale-95 transition-all shadow"
            aria-label="Cima"
          >
            ▲
          </button>
        </div>
        <div className="flex justify-center gap-6">
          <button
            onClick={() => queueDirection({ x: -1, y: 0 })}
            className="w-12 h-11 bg-slate-800/80 active:bg-purple-600/60 border border-slate-700 rounded-l-lg flex items-center justify-center text-slate-200 text-lg active:scale-95 transition-all shadow"
            aria-label="Esquerda"
          >
            ◀
          </button>
          <button
            onClick={() => queueDirection({ x: 1, y: 0 })}
            className="w-12 h-11 bg-slate-800/80 active:bg-purple-600/60 border border-slate-700 rounded-r-lg flex items-center justify-center text-slate-200 text-lg active:scale-95 transition-all shadow"
            aria-label="Direita"
          >
            ▶
          </button>
        </div>
        <div className="flex justify-center">
          <button
            onClick={() => queueDirection({ x: 0, y: 1 })}
            className="w-12 h-11 bg-slate-800/80 active:bg-purple-600/60 border border-slate-700 rounded-b-lg flex items-center justify-center text-slate-200 text-lg active:scale-95 transition-all shadow"
            aria-label="Baixo"
          >
            ▼
          </button>
        </div>
      </div>

      {/* Guide text */}
      <div className="text-[11px] text-slate-400 text-center mt-2">
        Teclado: <span className="text-slate-300 font-medium">Setas</span> ou{' '}
        <span className="text-slate-300 font-medium">W A S D</span> · Deslize na tela ou use o direcional
      </div>
    </div>
  );
};

export default CosmicSnakeGame;
