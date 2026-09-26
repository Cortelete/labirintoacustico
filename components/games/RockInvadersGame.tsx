import React, { useRef, useEffect, useState, useCallback } from 'react';
import { gameAudio } from './gameAudio';

// --- Constants ---
const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 560;
const INITIAL_LIVES = 3;

const PLAYER_WIDTH = 36;
const PLAYER_HEIGHT = 22;
const PLAYER_SPEED = 6;
const PLAYER_INVULNERABILITY_DURATION = 1800;

const BULLET_WIDTH = 4;
const BULLET_HEIGHT = 14;
const BULLET_SPEED = 8.5;
const FIRE_COOLDOWN = 280;

const ENEMY_COLS = 8;
const ENEMY_ROWS = 4;
const ENEMY_SIZE = 26;
const ENEMY_GAP = 14;

interface LevelConfig {
  name: string;
  speedMultiplier: number;
  fireRateMultiplier: number;
  bgGradStart: string;
  bgGradEnd: string;
  bulletColor: string;
}

const LEVELS: LevelConfig[] = [
  { name: 'Estreia Estelar', speedMultiplier: 1.0, fireRateMultiplier: 1.0, bgGradStart: '#1b1435', bgGradEnd: '#06040d', bulletColor: '#38bdf8' },
  { name: 'Palco Lunar', speedMultiplier: 1.25, fireRateMultiplier: 1.2, bgGradStart: '#2e1065', bgGradEnd: '#090314', bulletColor: '#c084fc' },
  { name: 'Tour Solar', speedMultiplier: 1.5, fireRateMultiplier: 1.4, bgGradStart: '#450a0a', bgGradEnd: '#0c0202', bulletColor: '#f97316' },
  { name: 'Ritual Alienígena', speedMultiplier: 1.8, fireRateMultiplier: 1.6, bgGradStart: '#064e3b', bgGradEnd: '#021a14', bulletColor: '#4ade80' },
  { name: 'O Silêncio do Vácuo', speedMultiplier: 2.1, fireRateMultiplier: 1.9, bgGradStart: '#4a044e', bgGradEnd: '#050106', bulletColor: '#f43f5e' },
];

type PowerUpType = 'doubleShot' | 'pierce' | 'shield' | 'shockwave';

interface PowerUp {
  x: number;
  y: number;
  width: number;
  height: number;
  type: PowerUpType;
  color: string;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 0 | 1 | 2; // 0: Skull (top), 1: Octo (mid), 2: Bat (bot)
  points: number;
  alive: boolean;
  frame: number;
}

interface Bullet {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  isAlien: boolean;
  isPierce?: boolean;
}

interface Bunker {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
  lifespan: number;
}

interface UFO {
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
  speed: number;
  points: number;
}

interface RockInvadersGameProps {
  playerName: string;
  onClose: () => void;
}

const RockInvadersGame: React.FC<RockInvadersGameProps> = ({ playerName, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // States
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('labirinto_rockinvaders_highscore') || '0', 10) || 0;
    } catch {
      return 0;
    }
  });
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<'playing' | 'levelUp' | 'gameOver'>('playing');
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(() => gameAudio.getMuted());
  const [autoFire, setAutoFire] = useState(false);

  // Powerup active states for HUD
  const [hasDoubleShot, setHasDoubleShot] = useState(false);
  const [hasShield, setHasShield] = useState(false);
  const [hasPierce, setHasPierce] = useState(false);

  // Game Logic Refs
  const gameLoopRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const lastFireTimeRef = useRef(0);
  const keysPressedRef = useRef<{ [key: string]: boolean }>({});

  const playerRef = useRef({
    x: (CANVAS_WIDTH - PLAYER_WIDTH) / 2,
    y: CANVAS_HEIGHT - PLAYER_HEIGHT - 25,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
  });

  const playerPowerupsRef = useRef({
    doubleShotTimer: 0,
    pierceTimer: 0,
    hasShield: false,
    invulnerableTimer: 0,
  });

  const bulletsRef = useRef<Bullet[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const enemyGridRef = useRef({ direction: 1, speed: 0.8, dropDown: false });
  const alienLastFireTimeRef = useRef(0);

  const bunkersRef = useRef<Bunker[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<{ x: number; y: number; r: number; alpha: number; speed: number }[]>([]);
  const ufoRef = useRef<UFO>({ x: -60, y: 48, width: 44, height: 20, active: false, speed: 2, points: 200 });
  const nextUfoSpawnTimeRef = useRef(12000);

  // Update High Score
  const updateScore = useCallback((newScore: number) => {
    setScore(newScore);
    if (newScore > highScore) {
      setHighScore(newScore);
      try {
        localStorage.setItem('labirinto_rockinvaders_highscore', newScore.toString());
      } catch {}
    }
  }, [highScore]);

  // Create Bunkers (Rock Amplifiers)
  const initBunkers = () => {
    const list: Bunker[] = [];
    const count = 3;
    const bWidth = 56;
    const bHeight = 24;
    const spacing = (CANVAS_WIDTH - count * bWidth) / (count + 1);

    for (let i = 0; i < count; i++) {
      list.push({
        x: spacing + i * (bWidth + spacing),
        y: CANVAS_HEIGHT - 110,
        width: bWidth,
        height: bHeight,
        hp: 12,
        maxHp: 12,
      });
    }
    bunkersRef.current = list;
  };

  // Setup Level
  const setupLevel = useCallback((lvl: number) => {
    const lvlConfig = LEVELS[(lvl - 1) % LEVELS.length];
    bulletsRef.current = [];
    particlesRef.current = [];
    powerUpsRef.current = [];

    // Setup Enemies
    const enemies: Enemy[] = [];
    const gridW = ENEMY_COLS * ENEMY_SIZE + (ENEMY_COLS - 1) * ENEMY_GAP;
    const startX = (CANVAS_WIDTH - gridW) / 2;
    const startY = 75;

    for (let row = 0; row < ENEMY_ROWS; row++) {
      for (let col = 0; col < ENEMY_COLS; col++) {
        let type: 0 | 1 | 2 = 2; // Bat
        let pts = 10;
        if (row === 0) {
          type = 0; // Skull
          pts = 40;
        } else if (row === 1 || row === 2) {
          type = 1; // Octo
          pts = 20;
        }

        enemies.push({
          x: startX + col * (ENEMY_SIZE + ENEMY_GAP),
          y: startY + row * (ENEMY_SIZE + ENEMY_GAP),
          width: ENEMY_SIZE,
          height: ENEMY_SIZE,
          type,
          points: pts,
          alive: true,
          frame: 0,
        });
      }
    }

    enemiesRef.current = enemies;
    enemyGridRef.current = {
      direction: 1,
      speed: 0.7 * lvlConfig.speedMultiplier,
      dropDown: false,
    };

    initBunkers();

    // Init background stars if needed
    if (starsRef.current.length === 0) {
      const s = [];
      for (let i = 0; i < 70; i++) {
        s.push({
          x: Math.random() * CANVAS_WIDTH,
          y: Math.random() * CANVAS_HEIGHT,
          r: Math.random() * 1.6 + 0.4,
          alpha: Math.random() * 0.7 + 0.3,
          speed: Math.random() * 0.4 + 0.2,
        });
      }
      starsRef.current = s;
    }
  }, []);

  // Reset Game
  const resetGame = useCallback(() => {
    setScore(0);
    setLives(INITIAL_LIVES);
    setLevel(1);
    setHasDoubleShot(false);
    setHasShield(false);
    setHasPierce(false);

    playerRef.current.x = (CANVAS_WIDTH - PLAYER_WIDTH) / 2;
    playerPowerupsRef.current = {
      doubleShotTimer: 0,
      pierceTimer: 0,
      hasShield: false,
      invulnerableTimer: 0,
    };

    setupLevel(1);
    setGameState('playing');
  }, [setupLevel]);

  // Initial trigger
  useEffect(() => {
    setupLevel(1);
  }, [setupLevel]);

  // Explosion particles
  const createExplosion = (x: number, y: number, color: string, count = 16) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4.5 + 1;
      particlesRef.current.push({
        x,
        y,
        radius: Math.random() * 3 + 1,
        color,
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        alpha: 1,
        lifespan: 500,
      });
    }
  };

  // Fire Bullet
  const firePlayerBullet = useCallback((timestamp: number) => {
    if (timestamp - lastFireTimeRef.current < FIRE_COOLDOWN) return;
    lastFireTimeRef.current = timestamp;

    const p = playerRef.current;
    const pu = playerPowerupsRef.current;
    const lvlConfig = LEVELS[(level - 1) % LEVELS.length];

    gameAudio.playLaserShot();

    if (pu.doubleShotTimer > 0) {
      // Dual spread fire
      bulletsRef.current.push(
        { x: p.x + 4, y: p.y, width: BULLET_WIDTH, height: BULLET_HEIGHT, color: lvlConfig.bulletColor, isAlien: false },
        { x: p.x + p.width - 4 - BULLET_WIDTH, y: p.y, width: BULLET_WIDTH, height: BULLET_HEIGHT, color: lvlConfig.bulletColor, isAlien: false }
      );
    } else {
      // Single center bullet
      bulletsRef.current.push({
        x: p.x + p.width / 2 - BULLET_WIDTH / 2,
        y: p.y,
        width: BULLET_WIDTH,
        height: BULLET_HEIGHT,
        color: lvlConfig.bulletColor,
        isAlien: false,
        isPierce: pu.pierceTimer > 0,
      });
    }
  }, [level]);

  // Keyboard Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        setIsPaused(prev => !prev);
        return;
      }
      keysPressedRef.current[e.key] = true;
      if (e.key === ' ') {
        e.preventDefault();
        firePlayerBullet(performance.now());
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [firePlayerBullet]);

  // Touch Drag on Canvas
  const handleTouchMove = (e: React.TouchEvent) => {
    if (gameState !== 'playing' || isPaused || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const scaleX = CANVAS_WIDTH / rect.width;
    const targetX = touchX * scaleX - PLAYER_WIDTH / 2;
    playerRef.current.x = Math.max(0, Math.min(CANVAS_WIDTH - PLAYER_WIDTH, targetX));
  };

  // Main Game Loop
  useEffect(() => {
    let active = true;

    const gameLoop = (timestamp: number) => {
      if (!active) return;

      const canvas = canvasRef.current;
      if (!canvas) {
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      const currentLvlConfig = LEVELS[(level - 1) % LEVELS.length];

      // --- LOGIC UPDATES ---
      if (gameState === 'playing' && !isPaused) {
        const p = playerRef.current;
        const pu = playerPowerupsRef.current;

        // Player movement
        if ((keysPressedRef.current['ArrowLeft'] || keysPressedRef.current['a'] || keysPressedRef.current['A']) && p.x > 0) {
          p.x -= PLAYER_SPEED;
        }
        if ((keysPressedRef.current['ArrowRight'] || keysPressedRef.current['d'] || keysPressedRef.current['D']) && p.x < CANVAS_WIDTH - p.width) {
          p.x += PLAYER_SPEED;
        }

        // Auto Fire option
        if (autoFire) {
          firePlayerBullet(timestamp);
        }

        // Update Powerup timers
        if (pu.doubleShotTimer > 0) {
          pu.doubleShotTimer -= deltaTime;
          if (pu.doubleShotTimer <= 0) setHasDoubleShot(false);
        }
        if (pu.pierceTimer > 0) {
          pu.pierceTimer -= deltaTime;
          if (pu.pierceTimer <= 0) setHasPierce(false);
        }
        if (pu.invulnerableTimer > 0) {
          pu.invulnerableTimer -= deltaTime;
        }

        // 1. Move Player & Alien Bullets
        bulletsRef.current.forEach(b => {
          if (b.isAlien) {
            b.y += 4.5 * currentLvlConfig.fireRateMultiplier;
          } else {
            b.y -= BULLET_SPEED;
          }
        });
        bulletsRef.current = bulletsRef.current.filter(b => b.y > -20 && b.y < CANVAS_HEIGHT + 20);

        // 2. Invaders Movement & Tension Pacing
        const aliveEnemies = enemiesRef.current.filter(e => e.alive);
        const aliveRatio = aliveEnemies.length / (ENEMY_ROWS * ENEMY_COLS);
        // Speed up noticeably as invaders are eliminated
        const invaderSpeed = (enemyGridRef.current.speed + (1 - aliveRatio) * 1.5) * enemyGridRef.current.direction;

        let hitEdge = false;
        aliveEnemies.forEach(e => {
          e.x += invaderSpeed;
          if (e.x <= 8 || e.x + e.width >= CANVAS_WIDTH - 8) {
            hitEdge = true;
          }
        });

        if (hitEdge) {
          enemyGridRef.current.direction *= -1;
          aliveEnemies.forEach(e => {
            e.y += 14;
            // Check if invaders reach defensive perimeter or player
            if (e.y + e.height >= p.y) {
              setLives(0);
              setGameState('gameOver');
              gameAudio.playGameOver();
            }
          });
        }

        // 3. Alien Firing Logic (Now enemies fire back!)
        const alienFireCooldown = Math.max(700, 1800 - level * 160) / currentLvlConfig.fireRateMultiplier;
        if (timestamp - alienLastFireTimeRef.current > alienFireCooldown && aliveEnemies.length > 0) {
          alienLastFireTimeRef.current = timestamp;

          // Pick 1-2 random front-line invaders to shoot
          const shooter = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
          bulletsRef.current.push({
            x: shooter.x + shooter.width / 2 - 2,
            y: shooter.y + shooter.height,
            width: 4,
            height: 10,
            color: '#f43f5e',
            isAlien: true,
          });
          gameAudio.playAlienLaser();
        }

        // 4. UFO / Solo Mothership Spawning
        const ufo = ufoRef.current;
        if (!ufo.active && timestamp > nextUfoSpawnTimeRef.current) {
          ufo.active = true;
          ufo.x = -ufo.width;
          gameAudio.playUfo();
        } else if (ufo.active) {
          ufo.x += ufo.speed;
          if (ufo.x > CANVAS_WIDTH + 20) {
            ufo.active = false;
            nextUfoSpawnTimeRef.current = timestamp + Math.random() * 15000 + 10000;
          }
        }

        // 5. Bullet Collisions
        for (let bi = bulletsRef.current.length - 1; bi >= 0; bi--) {
          const b = bulletsRef.current[bi];
          if (!b) continue;

          // A) Player Bullet hits UFO
          if (!b.isAlien && ufo.active) {
            if (b.x < ufo.x + ufo.width && b.x + b.width > ufo.x && b.y < ufo.y + ufo.height && b.y + b.height > ufo.y) {
              createExplosion(ufo.x + ufo.width / 2, ufo.y + ufo.height / 2, '#facc15', 25);
              updateScore(score + ufo.points);
              gameAudio.playAlienHit();
              ufo.active = false;
              bulletsRef.current.splice(bi, 1);
              continue;
            }
          }

          // B) Player Bullet hits Invader
          if (!b.isAlien) {
            let hitEnemy = false;
            for (let ei = 0; ei < enemiesRef.current.length; ei++) {
              const e = enemiesRef.current[ei];
              if (!e.alive) continue;

              if (b.x < e.x + e.width && b.x + b.width > e.x && b.y < e.y + e.height && b.y + b.height > e.y) {
                e.alive = false;
                hitEnemy = true;
                const eColor = e.type === 0 ? '#c084fc' : e.type === 1 ? '#34d399' : '#f43f5e';
                createExplosion(e.x + e.width / 2, e.y + e.height / 2, eColor, 15);
                gameAudio.playAlienHit();
                updateScore(score + e.points * level);

                // Chance to drop powerup (18%)
                if (Math.random() < 0.18) {
                  const types: PowerUpType[] = ['doubleShot', 'pierce', 'shield', 'shockwave'];
                  const t = types[Math.floor(Math.random() * types.length)];
                  const color = t === 'doubleShot' ? '#38bdf8' : t === 'pierce' ? '#facc15' : t === 'shield' ? '#c084fc' : '#ec4899';
                  powerUpsRef.current.push({ x: e.x + 4, y: e.y, width: 18, height: 18, type: t, color });
                }

                if (!b.isPierce) {
                  bulletsRef.current.splice(bi, 1);
                }
                break;
              }
            }
            if (hitEnemy) continue;
          }

          // C) Bullet hits Bunkers (both player & alien bullets damage bunkers)
          for (const bnk of bunkersRef.current) {
            if (bnk.hp > 0 && b.x < bnk.x + bnk.width && b.x + b.width > bnk.x && b.y < bnk.y + bnk.height && b.y + b.height > bnk.y) {
              bnk.hp -= 1;
              createExplosion(b.x, b.y, '#64748b', 6);
              bulletsRef.current.splice(bi, 1);
              break;
            }
          }

          // D) Alien Bullet hits Player
          if (b.isAlien) {
            if (b.x < p.x + p.width && b.x + b.width > p.x && b.y < p.y + p.height && b.y + b.height > p.y) {
              bulletsRef.current.splice(bi, 1);

              if (pu.invulnerableTimer <= 0) {
                if (pu.hasShield) {
                  pu.hasShield = false;
                  setHasShield(false);
                  createExplosion(p.x + p.width / 2, p.y + p.height / 2, '#c084fc', 20);
                } else if (lives > 1) {
                  setLives(l => l - 1);
                  pu.invulnerableTimer = PLAYER_INVULNERABILITY_DURATION;
                  createExplosion(p.x + p.width / 2, p.y + p.height / 2, '#ef4444', 22);
                  gameAudio.playCrash();
                } else {
                  setLives(0);
                  setGameState('gameOver');
                  gameAudio.playGameOver();
                }
              }
            }
          }
        }

        // 6. Update PowerUps falling
        for (let pi = powerUpsRef.current.length - 1; pi >= 0; pi--) {
          const puItem = powerUpsRef.current[pi];
          puItem.y += 2.5;

          // Collect powerup
          if (puItem.x < p.x + p.width && puItem.x + puItem.width > p.x && puItem.y < p.y + p.height && puItem.y + puItem.height > p.y) {
            gameAudio.playPowerUp();
            if (puItem.type === 'doubleShot') {
              pu.doubleShotTimer = 10000;
              setHasDoubleShot(true);
            } else if (puItem.type === 'pierce') {
              pu.pierceTimer = 8000;
              setHasPierce(true);
            } else if (puItem.type === 'shield') {
              pu.hasShield = true;
              setHasShield(true);
            } else if (puItem.type === 'shockwave') {
              // Clear all alien bullets
              bulletsRef.current = bulletsRef.current.filter(b => !b.isAlien);
              createExplosion(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, '#ec4899', 40);
            }
            powerUpsRef.current.splice(pi, 1);
            continue;
          }

          if (puItem.y > CANVAS_HEIGHT) {
            powerUpsRef.current.splice(pi, 1);
          }
        }

        // 7. Check Wave Cleared (Level Up)
        if (aliveEnemies.length === 0 && gameState === 'playing') {
          setGameState('levelUp');
          gameAudio.playVictory();
          setTimeout(() => {
            setLevel(l => l + 1);
            setupLevel(level + 1);
            setGameState('playing');
          }, 2200);
        }
      }

      // --- RENDERING CANVAS ---
      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      bgGrad.addColorStop(0, currentLvlConfig.bgGradStart);
      bgGrad.addColorStop(1, currentLvlConfig.bgGradEnd);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Starfield
      starsRef.current.forEach(star => {
        star.y += star.speed;
        if (star.y > CANVAS_HEIGHT) star.y = 0;
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw UFO (if active)
      const ufo = ufoRef.current;
      if (ufo.active) {
        ctx.save();
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.ellipse(ufo.x + ufo.width / 2, ufo.y + ufo.height / 2, ufo.width / 2, ufo.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        // Dome
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(ufo.x + ufo.width / 2, ufo.y + ufo.height * 0.35, ufo.height * 0.35, Math.PI, 0);
        ctx.fill();
        ctx.restore();
      }

      // Draw Bunkers (Rock Amplifiers)
      bunkersRef.current.forEach(bnk => {
        if (bnk.hp <= 0) return;
        const hpRatio = bnk.hp / bnk.maxHp;

        ctx.save();
        ctx.fillStyle = hpRatio > 0.6 ? '#475569' : hpRatio > 0.3 ? '#64748b' : '#334155';
        ctx.fillRect(bnk.x, bnk.y, bnk.width, bnk.height);

        // Amp grille mesh
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 1.5;
        for (let gx = bnk.x + 6; gx < bnk.x + bnk.width; gx += 8) {
          ctx.beginPath();
          ctx.moveTo(gx, bnk.y + 3);
          ctx.lineTo(gx, bnk.y + bnk.height - 3);
          ctx.stroke();
        }

        // Damage cracks
        if (hpRatio < 0.7) {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(bnk.x + 10, bnk.y + 4);
          ctx.lineTo(bnk.x + 20, bnk.y + 18);
          ctx.stroke();
        }
        ctx.restore();
      });

      // Draw Invaders
      enemiesRef.current.forEach(e => {
        if (!e.alive) return;
        ctx.save();

        if (e.type === 0) {
          // Distortion Skull (Row 0)
          ctx.shadowColor = '#c084fc';
          ctx.shadowBlur = 8;
          ctx.fillStyle = '#a855f7';
          // Skull dome
          ctx.beginPath();
          ctx.arc(e.x + e.width / 2, e.y + e.height * 0.4, e.width * 0.38, 0, Math.PI * 2);
          ctx.fill();
          // Jaw
          ctx.fillRect(e.x + e.width * 0.3, e.y + e.height * 0.6, e.width * 0.4, e.height * 0.28);
          // Eye sockets
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(e.x + e.width * 0.38, e.y + e.height * 0.42, 3, 0, Math.PI * 2);
          ctx.arc(e.x + e.width * 0.62, e.y + e.height * 0.42, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (e.type === 1) {
          // Cyber Octo (Rows 1 & 2)
          ctx.shadowColor = '#34d399';
          ctx.shadowBlur = 8;
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.arc(e.x + e.width / 2, e.y + e.height * 0.4, e.width * 0.36, Math.PI, 0);
          ctx.lineTo(e.x + e.width * 0.85, e.y + e.height * 0.85);
          ctx.lineTo(e.x + e.width * 0.15, e.y + e.height * 0.85);
          ctx.closePath();
          ctx.fill();
          // Eyes
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(e.x + e.width * 0.36, e.y + e.height * 0.45, 2.5, 0, Math.PI * 2);
          ctx.arc(e.x + e.width * 0.64, e.y + e.height * 0.45, 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Void Bat (Row 3)
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = 8;
          ctx.fillStyle = '#f43f5e';
          ctx.beginPath();
          ctx.moveTo(e.x + e.width / 2, e.y + e.height * 0.8);
          ctx.lineTo(e.x + e.width, e.y + e.height * 0.2);
          ctx.lineTo(e.x + e.width * 0.7, e.y + e.height * 0.5);
          ctx.lineTo(e.x + e.width / 2, e.y + e.height * 0.3);
          ctx.lineTo(e.x + e.width * 0.3, e.y + e.height * 0.5);
          ctx.lineTo(e.x, e.y + e.height * 0.2);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      });

      // Draw Bullets
      bulletsRef.current.forEach(b => {
        ctx.save();
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, b.width, b.height);
        ctx.restore();
      });

      // Draw Falling PowerUps
      powerUpsRef.current.forEach(pu => {
        ctx.save();
        ctx.shadowColor = pu.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = pu.color;
        ctx.beginPath();
        ctx.arc(pu.x + pu.width / 2, pu.y + pu.height / 2, pu.width / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = pu.type === 'doubleShot' ? '2X' : pu.type === 'pierce' ? '⚡' : pu.type === 'shield' ? '🛡️' : '💣';
        ctx.fillText(label, pu.x + pu.width / 2, pu.y + pu.height / 2);
        ctx.restore();
      });

      // Draw Particles
      particlesRef.current = particlesRef.current.filter(pt => pt.alpha > 0);
      particlesRef.current.forEach(pt => {
        pt.x += pt.velocity.x;
        pt.y += pt.velocity.y;
        pt.alpha -= deltaTime / pt.lifespan;
        if (pt.alpha > 0) {
          ctx.save();
          ctx.globalAlpha = pt.alpha;
          ctx.fillStyle = pt.color;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      // Draw Player Ship (Supersonic Flying-V Guitar)
      const p = playerRef.current;
      const pu = playerPowerupsRef.current;
      const isBlinking = pu.invulnerableTimer > 0 && Math.floor(timestamp / 120) % 2 === 0;

      if (!isBlinking) {
        ctx.save();
        ctx.shadowColor = '#ec4899';
        ctx.shadowBlur = 12;

        // Flying-V Guitar Wings
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(p.x + p.width / 2, p.y); // Nose/Headstock
        ctx.lineTo(p.x + p.width, p.y + p.height); // Right wing tip
        ctx.lineTo(p.x + p.width * 0.7, p.y + p.height * 0.7); // Inner right notch
        ctx.lineTo(p.x + p.width / 2, p.y + p.height * 0.5); // Center bridge
        ctx.lineTo(p.x + p.width * 0.3, p.y + p.height * 0.7); // Inner left notch
        ctx.lineTo(p.x, p.y + p.height); // Left wing tip
        ctx.closePath();
        ctx.fill();

        // Neon Pickguard core
        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.moveTo(p.x + p.width / 2, p.y + 4);
        ctx.lineTo(p.x + p.width * 0.65, p.y + p.height * 0.7);
        ctx.lineTo(p.x + p.width * 0.35, p.y + p.height * 0.7);
        ctx.closePath();
        ctx.fill();

        // Thruster exhaust flame
        const flamePulse = Math.sin(timestamp / 50) * 3 + 6;
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(p.x + p.width * 0.4, p.y + p.height * 0.7);
        ctx.lineTo(p.x + p.width * 0.6, p.y + p.height * 0.7);
        ctx.lineTo(p.x + p.width / 2, p.y + p.height * 0.7 + flamePulse);
        ctx.closePath();
        ctx.fill();

        // Shield dome if active
        if (pu.hasShield) {
          ctx.strokeStyle = '#c084fc';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#c084fc';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(p.x + p.width / 2, p.y + p.height / 2, p.width * 0.75, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);
    return () => {
      active = false;
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameState, isPaused, level, autoFire, firePlayerBullet, score, updateScore, setupLevel]);

  const currentLvlConfig = LEVELS[(level - 1) % LEVELS.length];

  return (
    <div className="flex flex-col items-center select-none text-white w-full max-w-md mx-auto">
      {/* HUD Header */}
      <div className="w-full flex items-center justify-between px-2 mb-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold font-mono tracking-tight text-white">{score}</span>
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-400">
              FASE {level}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">RECORDE: {highScore}</span>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-xs font-semibold text-pink-400">{currentLvlConfig.name}</span>
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

        <div className="flex items-center gap-1.5">
          {hasDoubleShot && <span className="text-xs bg-sky-950 text-sky-400 border border-sky-600 px-1.5 py-0.5 rounded">2X</span>}
          {hasPierce && <span className="text-xs bg-amber-950 text-amber-400 border border-amber-600 px-1.5 py-0.5 rounded">⚡</span>}
          {hasShield && <span className="text-xs bg-purple-950 text-purple-400 border border-purple-600 px-1.5 py-0.5 rounded">🛡️</span>}
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
            className="p-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            {isPaused ? '▶' : '⏸'}
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div
        className="relative w-full aspect-[6/7] rounded-xl overflow-hidden border border-pink-500/30 shadow-lg shadow-pink-900/20"
        onTouchMove={handleTouchMove}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full block bg-slate-950"
        />

        {/* Level Up Banner */}
        {gameState === 'levelUp' && (
          <div className="game-overlay absolute inset-0 bg-black/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <span className="text-4xl mb-2">🎸</span>
            <h3 className="text-2xl font-bold text-pink-400">Palco Conquistado!</h3>
            <p className="text-sm text-slate-300">Avançando para o {LEVELS[level % LEVELS.length].name}...</p>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState === 'gameOver' && (
          <div className="game-overlay absolute inset-0 bg-black/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <h3 className="text-3xl font-bold text-pink-500 mb-1">Fim de Show</h3>
            <p className="text-sm text-slate-300 mb-4">{playerName}, os invasores abafaram o som!</p>
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 w-full max-w-xs mb-5">
              <div className="flex justify-between items-center text-sm py-1">
                <span className="text-slate-400">Pontuação</span>
                <span className="font-bold text-lg text-white font-mono">{score}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1 border-t border-slate-700/60">
                <span className="text-slate-400">Recorde Pessoal</span>
                <span className="font-bold text-sm text-pink-300 font-mono">{highScore}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1 border-t border-slate-700/60">
                <span className="text-slate-400">Turnê Cósmica</span>
                <span className="font-medium text-xs text-green-400">{currentLvlConfig.name}</span>
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
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 rounded-lg text-sm font-bold shadow-lg transition-transform active:scale-95"
              >
                Tocar de Novo
              </button>
            </div>
          </div>
        )}

        {isPaused && gameState === 'playing' && (
          <div className="game-overlay absolute inset-0 bg-black/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-4">
            <h3 className="text-xl font-bold text-white mb-2">Show Pausado</h3>
            <p className="text-xs text-slate-400 mb-4">Pressione P para continuar</p>
            <button
              onClick={() => setIsPaused(false)}
              className="py-2 px-6 bg-pink-600 hover:bg-pink-500 rounded-lg text-sm font-bold shadow transition-transform active:scale-95"
            >
              Continuar
            </button>
          </div>
        )}
      </div>

      {/* Ergonomic Mobile Controls */}
      <div className="w-full mt-3 flex items-center justify-between px-3">
        {/* Left / Right Buttons */}
        <div className="flex gap-3">
          <button
            onPointerDown={() => { keysPressedRef.current['ArrowLeft'] = true; }}
            onPointerUp={() => { keysPressedRef.current['ArrowLeft'] = false; }}
            onPointerLeave={() => { keysPressedRef.current['ArrowLeft'] = false; }}
            className="w-14 h-12 bg-slate-800/90 active:bg-pink-600/70 border border-slate-700 rounded-xl flex items-center justify-center text-slate-200 text-lg shadow active:scale-95"
            aria-label="Esquerda"
          >
            ◀
          </button>
          <button
            onPointerDown={() => { keysPressedRef.current['ArrowRight'] = true; }}
            onPointerUp={() => { keysPressedRef.current['ArrowRight'] = false; }}
            onPointerLeave={() => { keysPressedRef.current['ArrowRight'] = false; }}
            className="w-14 h-12 bg-slate-800/90 active:bg-pink-600/70 border border-slate-700 rounded-xl flex items-center justify-center text-slate-200 text-lg shadow active:scale-95"
            aria-label="Direita"
          >
            ▶
          </button>
        </div>

        {/* Auto Fire Toggle & Shot Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoFire(f => !f)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
              autoFire ? 'bg-pink-600 border-pink-400 text-white' : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}
          >
            AUTO 🔥
          </button>
          <button
            onClick={() => firePlayerBullet(performance.now())}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-pink-600 to-purple-500 active:from-pink-700 active:to-purple-600 border-2 border-pink-300 shadow-lg shadow-pink-600/30 flex items-center justify-center text-xl active:scale-90 transition-transform"
            aria-label="Atirar"
          >
            ⚡
          </button>
        </div>
      </div>

      {/* Desktop Helper */}
      <div className="text-[11px] text-slate-400 text-center mt-2">
        Teclado: <span className="text-slate-300 font-medium">Setas</span> ou{' '}
        <span className="text-slate-300 font-medium">A / D</span> para mover ·{' '}
        <span className="text-slate-300 font-medium">Espaço</span> para atirar
      </div>
    </div>
  );
};

export default RockInvadersGame;
