import React, { useState, useEffect, useCallback, useRef } from 'react';
import { gameAudio } from './gameAudio';

// --- Constants ---
const GRID_WIDTH = 13;
const GRID_HEIGHT = 11;
const BOMB_TIMER = 2400; // ms
const EXPLOSION_DURATION = 500; // ms
const TICK_RATE = 50; // 20 FPS logic ticks
const INITIAL_LIVES = 3;

// Directions
const DIRECTIONS = [
  { x: 0, y: -1 }, // Up
  { x: 0, y: 1 },  // Down
  { x: -1, y: 0 }, // Left
  { x: 1, y: 0 },  // Right
];

type Grid = number[][]; // 0: empty, 1: indestructible wall, 2: destructible crate
type Position = { x: number; y: number };
type PowerUpType = 'bomb' | 'fire' | 'speed' | 'shield';

interface PowerUp {
  x: number;
  y: number;
  type: PowerUpType;
}

interface Bomb {
  id: number;
  pos: Position;
  timer: number;
  owner: 'player' | 'ai';
  range: number;
}

interface Explosion {
  id: number;
  pos: Position;
  timer: number;
  owner: 'player' | 'ai';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
}

type GameState = 'playing' | 'round_won' | 'round_lost' | 'match_over';

// Level Themes
const ROUND_THEMES = [
  { name: 'Base Lunar Alpha', alienName: 'Drone Sentinela', alienColor: '#38bdf8', wallColor: '#334155', crateColor: '#78350f' },
  { name: 'Laboratório Cibernético', alienName: 'Alien Cyborg', alienColor: '#a855f7', wallColor: '#1e293b', crateColor: '#831843' },
  { name: 'Reator Subterrâneo', alienName: 'Demolidor Voraz', alienColor: '#f97316', wallColor: '#27272a', crateColor: '#9a3412' },
  { name: 'Nave-Mãe Alien', alienName: 'Soberano Cósmico', alienColor: '#ef4444', wallColor: '#09090b', crateColor: '#581c87' },
];

const generateLevel = (): { grid: Grid; powerUps: PowerUp[] } => {
  const grid: Grid = Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill(0));
  const powerUps: PowerUp[] = [];

  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      // Outer borders & pillar pattern
      if (y === 0 || y === GRID_HEIGHT - 1 || x === 0 || x === GRID_WIDTH - 1 || (x % 2 === 0 && y % 2 === 0)) {
        grid[y][x] = 1; // Indestructible
      } else if (Math.random() < 0.78) {
        grid[y][x] = 2; // Destructible crate

        // 35% chance to hide a powerup inside crate
        if (Math.random() < 0.35) {
          const types: PowerUpType[] = ['bomb', 'fire', 'speed', 'shield'];
          const pType = types[Math.floor(Math.random() * types.length)];
          powerUps.push({ x, y, type: pType });
        }
      }
    }
  }

  // Clear spawn zones for Player (top-left) and Alien (bottom-right)
  grid[1][1] = 0; grid[1][2] = 0; grid[2][1] = 0;
  grid[GRID_HEIGHT - 2][GRID_WIDTH - 2] = 0;
  grid[GRID_HEIGHT - 2][GRID_WIDTH - 3] = 0;
  grid[GRID_HEIGHT - 3][GRID_WIDTH - 2] = 0;

  // Filter out powerups that fell on cleared spawn zones
  const safePowerups = powerUps.filter(p => grid[p.y][p.x] === 2);

  return { grid, powerUps: safePowerups };
};

interface BomberAlienProps {
  playerName: string;
  onClose: () => void;
}

const BomberAlienGame: React.FC<BomberAlienProps> = ({ playerName, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Game States
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('labirinto_bomber_highscore') || '0', 10) || 0;
    } catch {
      return 0;
    }
  });
  const [playerLives, setPlayerLives] = useState(INITIAL_LIVES);
  const [gameState, setGameState] = useState<GameState>('playing');
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(() => gameAudio.getMuted());

  // Player Stats / Powerups
  const [playerMaxBombs, setPlayerMaxBombs] = useState(1);
  const [playerBombRange, setPlayerBombRange] = useState(1);
  const [playerSpeedLevel, setPlayerSpeedLevel] = useState(1);
  const [playerHasShield, setPlayerHasShield] = useState(false);

  // Entities & Board Refs
  const gridRef = useRef<Grid>([]);
  const hiddenPowerUpsRef = useRef<PowerUp[]>([]);
  const activePowerUpsRef = useRef<PowerUp[]>([]);
  const bombsRef = useRef<Bomb[]>([]);
  const explosionsRef = useRef<Explosion[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  // Positions (smooth sub-tile or tile coordinates)
  const playerPosRef = useRef<Position>({ x: 1, y: 1 });
  const aiPosRef = useRef<Position>({ x: GRID_WIDTH - 2, y: GRID_HEIGHT - 2 });
  const aiBombCooldownRef = useRef(0);
  const aiMoveCooldownRef = useRef(0);
  const aiTargetRef = useRef<Position | null>(null);

  // Player movement timers
  const playerMoveCooldownRef = useRef(0);
  const keysPressedRef = useRef<{ [key: string]: boolean }>({});
  const animationFrameRef = useRef<number | null>(null);

  // Update High Score
  const updateScore = useCallback((newScore: number) => {
    setScore(newScore);
    if (newScore > highScore) {
      setHighScore(newScore);
      try {
        localStorage.setItem('labirinto_bomber_highscore', newScore.toString());
      } catch {}
    }
  }, [highScore]);

  // Start New Round
  const startNewRound = useCallback(() => {
    const { grid, powerUps } = generateLevel();
    gridRef.current = grid;
    hiddenPowerUpsRef.current = powerUps;
    activePowerUpsRef.current = [];
    bombsRef.current = [];
    explosionsRef.current = [];
    particlesRef.current = [];

    playerPosRef.current = { x: 1, y: 1 };
    aiPosRef.current = { x: GRID_WIDTH - 2, y: GRID_HEIGHT - 2 };
    aiBombCooldownRef.current = 1500;
    aiMoveCooldownRef.current = 0;

    setGameState('playing');
  }, []);

  // Full Game Reset
  const resetGame = useCallback(() => {
    setPlayerLives(INITIAL_LIVES);
    setScore(0);
    setLevel(1);
    setPlayerMaxBombs(1);
    setPlayerBombRange(1);
    setPlayerSpeedLevel(1);
    setPlayerHasShield(false);
    startNewRound();
  }, [startNewRound]);

  // Initial Level Setup
  useEffect(() => {
    startNewRound();
  }, [startNewRound]);

  // Place Bomb
  const placeBomb = useCallback((owner: 'player' | 'ai') => {
    if (gameState !== 'playing' || isPaused) return;

    const pos = owner === 'player' ? playerPosRef.current : aiPosRef.current;
    const existing = bombsRef.current.some(b => b.pos.x === pos.x && b.pos.y === pos.y);
    if (existing) return;

    // Check max bombs count
    const ownerBombs = bombsRef.current.filter(b => b.owner === owner).length;
    const maxAllowed = owner === 'player' ? playerMaxBombs : Math.min(2, Math.floor(level / 2) + 1);
    if (ownerBombs >= maxAllowed) return;

    const range = owner === 'player' ? playerBombRange : Math.min(3, 1 + Math.floor(level / 3));

    bombsRef.current.push({
      id: Date.now() + Math.random(),
      pos: { ...pos },
      timer: BOMB_TIMER,
      owner,
      range,
    });

    gameAudio.playBombPlace();
  }, [gameState, isPaused, playerMaxBombs, playerBombRange, level]);

  // Emit blast particles
  const emitBlastParticles = (x: number, y: number) => {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1.5;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        color: Math.random() < 0.5 ? '#f59e0b' : '#ef4444',
        size: Math.random() * 4 + 2,
      });
    }
  };

  // Move Player with collision and corner sliding
  const tryMovePlayer = useCallback((dx: number, dy: number) => {
    if (gameState !== 'playing' || isPaused) return;

    const p = playerPosRef.current;
    const targetX = p.x + dx;
    const targetY = p.y + dy;

    // Boundary check
    if (targetX < 0 || targetX >= GRID_WIDTH || targetY < 0 || targetY >= GRID_HEIGHT) return;

    const grid = gridRef.current;
    // Check wall or crate
    if (grid[targetY][targetX] !== 0) return;

    // Check bomb collision (allow walking off current bomb, but prevent walking onto a bomb)
    const bombAtTarget = bombsRef.current.some(b => b.pos.x === targetX && b.pos.y === targetY);
    if (bombAtTarget) return;

    // Update position
    playerPosRef.current = { x: targetX, y: targetY };

    // Check for powerups at new position
    const pIndex = activePowerUpsRef.current.findIndex(pu => pu.x === targetX && pu.y === targetY);
    if (pIndex !== -1) {
      const pu = activePowerUpsRef.current[pIndex];
      activePowerUpsRef.current.splice(pIndex, 1);
      gameAudio.playPowerUp();

      if (pu.type === 'bomb') {
        setPlayerMaxBombs(m => Math.min(5, m + 1));
      } else if (pu.type === 'fire') {
        setPlayerBombRange(r => Math.min(5, r + 1));
      } else if (pu.type === 'speed') {
        setPlayerSpeedLevel(s => Math.min(4, s + 1));
      } else if (pu.type === 'shield') {
        setPlayerHasShield(true);
      }
      updateScore(score + 50);
    }
  }, [gameState, isPaused, score, updateScore]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        setIsPaused(prev => !prev);
        return;
      }
      keysPressedRef.current[e.key] = true;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        placeBomb('player');
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
  }, [placeBomb]);

  // Main Logic Game Loop
  useEffect(() => {
    let active = true;

    const gameLoop = (timestamp: number) => {
      if (!active) return;

      const canvas = canvasRef.current;
      if (!canvas) {
        animationFrameRef.current = requestAnimationFrame(gameLoop);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const W = canvas.width;
      const H = canvas.height;
      const cellW = W / GRID_WIDTH;
      const cellH = H / GRID_HEIGHT;

      if (gameState === 'playing' && !isPaused) {
        // 1. Player Continuous Movement Tick
        const moveInterval = Math.max(90, 150 - playerSpeedLevel * 15);
        if (timestamp - playerMoveCooldownRef.current > moveInterval) {
          const keys = keysPressedRef.current;
          if (keys['ArrowUp'] || keys['w'] || keys['W']) {
            tryMovePlayer(0, -1);
            playerMoveCooldownRef.current = timestamp;
          } else if (keys['ArrowDown'] || keys['s'] || keys['S']) {
            tryMovePlayer(0, 1);
            playerMoveCooldownRef.current = timestamp;
          } else if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
            tryMovePlayer(-1, 0);
            playerMoveCooldownRef.current = timestamp;
          } else if (keys['ArrowRight'] || keys['d'] || keys['D']) {
            tryMovePlayer(1, 0);
            playerMoveCooldownRef.current = timestamp;
          }
        }

        // 2. AI Intelligence Logic Tick
        const aiInterval = Math.max(160, 320 - level * 25);
        if (timestamp - aiMoveCooldownRef.current > aiInterval) {
          aiMoveCooldownRef.current = timestamp;

          const aiPos = aiPosRef.current;
          const playerPos = playerPosRef.current;
          const grid = gridRef.current;
          const bombs = bombsRef.current;

          // Danger Map Calculation (all tiles that will explode)
          const dangerMap = new Set<string>();
          bombs.forEach(b => {
            dangerMap.add(`${b.pos.x},${b.pos.y}`);
            DIRECTIONS.forEach(dir => {
              for (let i = 1; i <= b.range; i++) {
                const tx = b.pos.x + dir.x * i;
                const ty = b.pos.y + dir.y * i;
                if (tx < 0 || tx >= GRID_WIDTH || ty < 0 || ty >= GRID_HEIGHT) break;
                if (grid[ty][tx] === 1) break;
                dangerMap.add(`${tx},${ty}`);
                if (grid[ty][tx] === 2) break;
              }
            });
          });

          const isCurrentDangerous = dangerMap.has(`${aiPos.x},${aiPos.y}`);

          // Available adjacent moves
          const validMoves: Position[] = [];
          DIRECTIONS.forEach(dir => {
            const nx = aiPos.x + dir.x;
            const ny = aiPos.y + dir.y;
            if (nx >= 0 && nx < GRID_WIDTH && ny >= 0 && ny < GRID_HEIGHT) {
              if (grid[ny][nx] === 0 && !bombs.some(b => b.pos.x === nx && b.pos.y === ny)) {
                validMoves.push({ x: nx, y: ny });
              }
            }
          });

          if (isCurrentDangerous) {
            // Priority 1: EVADE! Find a move not in danger map
            const safeMoves = validMoves.filter(p => !dangerMap.has(`${p.x},${p.y}`));
            if (safeMoves.length > 0) {
              // Pick safe move that maximizes distance from bombs
              aiPosRef.current = safeMoves[Math.floor(Math.random() * safeMoves.length)];
            }
          } else {
            // Not in danger: Tactical choice
            // Check if player is near or adjacent to a crate to bomb
            let shouldBomb = false;

            // Check if placing a bomb right now allows an escape route!
            const simulatedBombDanger = new Set(dangerMap);
            simulatedBombDanger.add(`${aiPos.x},${aiPos.y}`);
            const aiRange = Math.min(3, 1 + Math.floor(level / 3));
            DIRECTIONS.forEach(dir => {
              for (let i = 1; i <= aiRange; i++) {
                const tx = aiPos.x + dir.x * i;
                const ty = aiPos.y + dir.y * i;
                if (tx < 0 || tx >= GRID_WIDTH || ty < 0 || ty >= GRID_HEIGHT || grid[ty][tx] === 1) break;
                simulatedBombDanger.add(`${tx},${ty}`);
                if (grid[ty][tx] === 2) break;
              }
            });

            const hasEscape = validMoves.some(m => !simulatedBombDanger.has(`${m.x},${m.y}`));

            if (hasEscape && timestamp > aiBombCooldownRef.current) {
              // If near destructible crate or close to player, drop bomb
              const nearCrate = DIRECTIONS.some(d => {
                const cx = aiPos.x + d.x;
                const cy = aiPos.y + d.y;
                return cx >= 0 && cx < GRID_WIDTH && cy >= 0 && cy < GRID_HEIGHT && grid[cy][cx] === 2;
              });
              const distToPlayer = Math.abs(aiPos.x - playerPos.x) + Math.abs(aiPos.y - playerPos.y);

              if (nearCrate || distToPlayer <= 2) {
                shouldBomb = true;
              }
            }

            if (shouldBomb) {
              placeBomb('ai');
              aiBombCooldownRef.current = timestamp + Math.max(2000, 4200 - level * 200);
            } else if (validMoves.length > 0) {
              // Move towards player or powerup
              const safeMoves = validMoves.filter(p => !dangerMap.has(`${p.x},${p.y}`));
              const movesToChoose = safeMoves.length > 0 ? safeMoves : validMoves;

              // Sort by distance to player
              movesToChoose.sort((a, b) => {
                const da = Math.abs(a.x - playerPos.x) + Math.abs(a.y - playerPos.y);
                const db = Math.abs(b.x - playerPos.x) + Math.abs(b.y - playerPos.y);
                return da - db;
              });

              // Add a slight randomness for variety
              if (Math.random() < 0.25 && movesToChoose.length > 1) {
                aiPosRef.current = movesToChoose[1];
              } else {
                aiPosRef.current = movesToChoose[0];
              }
            }
          }
        }

        // 3. Update Bombs and trigger Explosions
        const remainingBombs: Bomb[] = [];
        const newExplosions: Explosion[] = [];

        bombsRef.current.forEach(bomb => {
          bomb.timer -= 16;
          if (bomb.timer <= 0) {
            // Detonate!
            gameAudio.playExplosion();
            emitBlastParticles((bomb.pos.x + 0.5) * cellW, (bomb.pos.y + 0.5) * cellH);
            newExplosions.push({ id: Math.random(), pos: bomb.pos, timer: EXPLOSION_DURATION, owner: bomb.owner });

            // Propagate in 4 directions
            DIRECTIONS.forEach(dir => {
              for (let i = 1; i <= bomb.range; i++) {
                const ex = bomb.pos.x + dir.x * i;
                const ey = bomb.pos.y + dir.y * i;
                if (ex < 0 || ex >= GRID_WIDTH || ey < 0 || ey >= GRID_HEIGHT) break;

                // Stop at indestructible wall
                if (gridRef.current[ey][ex] === 1) break;

                newExplosions.push({ id: Math.random(), pos: { x: ex, y: ey }, timer: EXPLOSION_DURATION, owner: bomb.owner });

                // If destructible crate, destroy it and reveal hidden powerup
                if (gridRef.current[ey][ex] === 2) {
                  gridRef.current[ey][ex] = 0;
                  emitBlastParticles((ex + 0.5) * cellW, (ey + 0.5) * cellH);

                  const hiddenIdx = hiddenPowerUpsRef.current.findIndex(pu => pu.x === ex && pu.y === ey);
                  if (hiddenIdx !== -1) {
                    activePowerUpsRef.current.push(hiddenPowerUpsRef.current[hiddenIdx]);
                    hiddenPowerUpsRef.current.splice(hiddenIdx, 1);
                  }
                  break; // Explosion stops at crate
                }
              }
            });
          } else {
            remainingBombs.push(bomb);
          }
        });

        bombsRef.current = remainingBombs;

        // 4. Update Explosions & Damage Check
        const currentExplosions = [...explosionsRef.current, ...newExplosions]
          .map(ex => ({ ...ex, timer: ex.timer - 16 }))
          .filter(ex => ex.timer > 0);

        explosionsRef.current = currentExplosions;

        // Check if Player or AI caught in explosion
        const pPos = playerPosRef.current;
        const aiPos = aiPosRef.current;

        const playerInBlast = currentExplosions.some(ex => ex.pos.x === pPos.x && ex.pos.y === pPos.y);
        const aiInBlast = currentExplosions.some(ex => ex.pos.x === aiPos.x && ex.pos.y === aiPos.y);

        if (playerInBlast) {
          if (playerHasShield) {
            setPlayerHasShield(false);
            emitBlastParticles((pPos.x + 0.5) * cellW, (pPos.y + 0.5) * cellH);
          } else if (playerLives > 1) {
            setPlayerLives(l => l - 1);
            setGameState('round_lost');
            gameAudio.playCrash();
            setTimeout(startNewRound, 1800);
          } else {
            setPlayerLives(0);
            setGameState('match_over');
            gameAudio.playGameOver();
          }
        } else if (aiInBlast) {
          updateScore(score + 150 * level);
          setLevel(l => l + 1);
          setGameState('round_won');
          gameAudio.playVictory();
          setTimeout(startNewRound, 2000);
        }
      }

      // --- RENDERING CANVAS ---
      ctx.clearRect(0, 0, W, H);
      const currentTheme = ROUND_THEMES[(level - 1) % ROUND_THEMES.length];

      // Draw Grid Tiles
      const grid = gridRef.current;
      for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
          const cell = grid[y]?.[x] ?? 0;
          const rx = x * cellW;
          const ry = y * cellH;

          if (cell === 1) {
            // Indestructible Titanium Pillar
            ctx.fillStyle = currentTheme.wallColor;
            ctx.fillRect(rx + 1, ry + 1, cellW - 2, cellH - 2);
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(rx + 1.5, ry + 1.5, cellW - 3, cellH - 3);

            // Pillar center core
            ctx.fillStyle = '#64748b';
            ctx.beginPath();
            ctx.arc(rx + cellW / 2, ry + cellH / 2, Math.min(cellW, cellH) * 0.18, 0, Math.PI * 2);
            ctx.fill();
          } else if (cell === 2) {
            // Destructible Crystal Crate
            ctx.fillStyle = currentTheme.crateColor;
            ctx.fillRect(rx + 1, ry + 1, cellW - 2, cellH - 2);

            // Crate diamond cross
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(rx + 2, ry + 2);
            ctx.lineTo(rx + cellW - 2, ry + cellH - 2);
            ctx.moveTo(rx + cellW - 2, ry + 2);
            ctx.lineTo(rx + 2, ry + cellH - 2);
            ctx.stroke();
          } else {
            // Floor
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(rx, ry, cellW, cellH);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(rx, ry, cellW, cellH);
          }
        }
      }

      // Draw Active Powerups
      activePowerUpsRef.current.forEach(pu => {
        const px = pu.x * cellW + cellW / 2;
        const py = pu.y * cellH + cellH / 2;
        const pulse = Math.sin(timestamp / 160) * 0.12 + 1;

        ctx.save();
        ctx.shadowBlur = 10;
        if (pu.type === 'bomb') {
          ctx.shadowColor = '#3b82f6';
          ctx.fillStyle = '#2563eb';
        } else if (pu.type === 'fire') {
          ctx.shadowColor = '#f97316';
          ctx.fillStyle = '#ea580c';
        } else if (pu.type === 'speed') {
          ctx.shadowColor = '#eab308';
          ctx.fillStyle = '#ca8a04';
        } else {
          ctx.shadowColor = '#a855f7';
          ctx.fillStyle = '#9333ea';
        }

        ctx.beginPath();
        ctx.arc(px, py, Math.min(cellW, cellH) * 0.35 * pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const symbol = pu.type === 'bomb' ? '💣' : pu.type === 'fire' ? '🔥' : pu.type === 'speed' ? '⚡' : '🛡️';
        ctx.fillText(symbol, px, py);
        ctx.restore();
      });

      // Draw Bombs
      bombsRef.current.forEach(b => {
        const bx = b.pos.x * cellW + cellW / 2;
        const by = b.pos.y * cellH + cellH / 2;
        const progress = b.timer / BOMB_TIMER;
        const pulse = Math.sin(timestamp / (70 + progress * 100)) * 0.15 + 1;

        ctx.save();
        ctx.shadowColor = b.owner === 'player' ? '#a855f7' : '#ef4444';
        ctx.shadowBlur = 12;

        // Bomb body
        ctx.fillStyle = '#1e1b4b';
        ctx.beginPath();
        ctx.arc(bx, by, Math.min(cellW, cellH) * 0.36 * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Bomb fuse spark
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(bx + 4, by - cellH * 0.3, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Explosions
      explosionsRef.current.forEach(ex => {
        const exx = ex.pos.x * cellW;
        const exy = ex.pos.y * cellH;
        const alpha = ex.timer / EXPLOSION_DURATION;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(exx + 1, exy + 1, cellW - 2, cellH - 2);

        // Core white flame
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(exx + cellW / 2, exy + cellH / 2, Math.min(cellW, cellH) * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Player (Astronaut)
      const p = playerPosRef.current;
      const px = p.x * cellW + cellW / 2;
      const py = p.y * cellH + cellH / 2;
      const pSize = Math.min(cellW, cellH) * 0.38;

      ctx.save();
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 10;
      // Suit
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(px, py, pSize, 0, Math.PI * 2);
      ctx.fill();

      // Visor
      ctx.fillStyle = '#064e3b';
      ctx.beginPath();
      ctx.ellipse(px, py - 1, pSize * 0.55, pSize * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6ee7b7';
      ctx.beginPath();
      ctx.arc(px - 2, py - 2, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Shield effect
      if (playerHasShield) {
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, pSize * 1.35, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // Draw AI Alien
      const ai = aiPosRef.current;
      const aix = ai.x * cellW + cellW / 2;
      const aiy = ai.y * cellH + cellH / 2;
      const aiSize = Math.min(cellW, cellH) * 0.38;

      ctx.save();
      ctx.shadowColor = currentTheme.alienColor;
      ctx.shadowBlur = 10;
      ctx.fillStyle = currentTheme.alienColor;
      ctx.beginPath();
      ctx.arc(aix, aiy, aiSize, 0, Math.PI * 2);
      ctx.fill();

      // Alien central eye
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(aix, aiy - 1, aiSize * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(aix, aiy - 1, aiSize * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Draw Particles
      particlesRef.current = particlesRef.current.filter(pt => pt.alpha > 0);
      particlesRef.current.forEach(pt => {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= 0.04;
        if (pt.alpha > 0) {
          ctx.save();
          ctx.globalAlpha = pt.alpha;
          ctx.fillStyle = pt.color;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);
    return () => {
      active = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameState, isPaused, level, playerSpeedLevel, tryMovePlayer, placeBomb, score, updateScore, playerHasShield, playerLives, startNewRound]);

  const currentTheme = ROUND_THEMES[(level - 1) % ROUND_THEMES.length];

  return (
    <div className="flex flex-col items-center select-none text-white w-full max-w-md mx-auto">
      {/* HUD Header */}
      <div className="w-full flex items-center justify-between px-2 mb-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold font-mono tracking-tight text-white">{score}</span>
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
              R{level}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">RECORDE: {highScore}</span>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-xs font-semibold text-orange-400">{currentTheme.alienName}</span>
          <div className="flex items-center gap-1 mt-0.5">
            {Array.from({ length: INITIAL_LIVES }).map((_, i) => (
              <span
                key={i}
                className={`text-xs transition-opacity ${i < playerLives ? 'text-red-400 opacity-100' : 'text-slate-600 opacity-40'}`}
              >
                ❤️
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-xs">
            <span title="Bombas Simultâneas">💣{playerMaxBombs}</span>
            <span title="Alcance da Explosão">🔥{playerBombRange}</span>
            {playerHasShield && <span title="Escudo Ativo">🛡️</span>}
          </div>
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
      <div className="relative w-full aspect-[13/11] rounded-xl overflow-hidden border border-orange-500/30 shadow-lg shadow-orange-900/20">
        <canvas
          ref={canvasRef}
          width={455}
          height={385}
          className="w-full h-full block bg-slate-950"
        />

        {/* State Overlays */}
        {gameState !== 'playing' && (
          <div className="game-overlay absolute inset-0 bg-black/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            {gameState === 'match_over' ? (
              <>
                <h3 className="text-2xl font-bold text-red-500 mb-1">Missão Abortada</h3>
                <p className="text-sm text-slate-300 mb-4">{playerName}, o invasor alienígena dominou o setor!</p>
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 w-full max-w-xs mb-5">
                  <div className="flex justify-between items-center text-sm py-1">
                    <span className="text-slate-400">Pontos</span>
                    <span className="font-bold text-lg text-white font-mono">{score}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm py-1 border-t border-slate-700/60">
                    <span className="text-slate-400">Recorde</span>
                    <span className="font-bold text-sm text-orange-400 font-mono">{highScore}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm py-1 border-t border-slate-700/60">
                    <span className="text-slate-400">Setor</span>
                    <span className="font-medium text-xs text-green-400">{currentTheme.name}</span>
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
                    className="flex-1 py-2.5 px-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 rounded-lg text-sm font-bold shadow-lg transition-transform active:scale-95"
                  >
                    Jogar de Novo
                  </button>
                </div>
              </>
            ) : gameState === 'round_won' ? (
              <div className="space-y-2">
                <span className="text-4xl">🏆</span>
                <h3 className="text-2xl font-bold text-green-400">Vitória no Setor {level - 1}!</h3>
                <p className="text-sm text-slate-300">Preparando para o próximo desafio alienígena...</p>
              </div>
            ) : (
              <div className="space-y-2">
                <span className="text-4xl">💥</span>
                <h3 className="text-2xl font-bold text-yellow-400">Você foi atingido!</h3>
                <p className="text-sm text-slate-300">Reiniciando posição na arena...</p>
              </div>
            )}
          </div>
        )}

        {isPaused && gameState === 'playing' && (
          <div className="game-overlay absolute inset-0 bg-black/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-4">
            <h3 className="text-xl font-bold text-white mb-2">Jogo Pausado</h3>
            <p className="text-xs text-slate-400 mb-4">Pressione P para continuar</p>
            <button
              onClick={() => setIsPaused(false)}
              className="py-2 px-6 bg-orange-600 hover:bg-orange-500 rounded-lg text-sm font-bold shadow transition-transform active:scale-95"
            >
              Continuar
            </button>
          </div>
        )}
      </div>

      {/* Ergonomic Mobile Controls (D-pad + Large Bomb Button) */}
      <div className="w-full mt-3 flex items-center justify-between px-3">
        {/* Directional Pad */}
        <div className="flex flex-col items-center gap-1">
          <button
            onPointerDown={() => tryMovePlayer(0, -1)}
            className="w-11 h-10 bg-slate-800/90 active:bg-orange-600/70 border border-slate-700 rounded-t-lg flex items-center justify-center text-slate-200 text-sm shadow active:scale-95"
            aria-label="Cima"
          >
            ▲
          </button>
          <div className="flex gap-4">
            <button
              onPointerDown={() => tryMovePlayer(-1, 0)}
              className="w-11 h-10 bg-slate-800/90 active:bg-orange-600/70 border border-slate-700 rounded-l-lg flex items-center justify-center text-slate-200 text-sm shadow active:scale-95"
              aria-label="Esquerda"
            >
              ◀
            </button>
            <button
              onPointerDown={() => tryMovePlayer(1, 0)}
              className="w-11 h-10 bg-slate-800/90 active:bg-orange-600/70 border border-slate-700 rounded-r-lg flex items-center justify-center text-slate-200 text-sm shadow active:scale-95"
              aria-label="Direita"
            >
              ▶
            </button>
          </div>
          <button
            onPointerDown={() => tryMovePlayer(0, 1)}
            className="w-11 h-10 bg-slate-800/90 active:bg-orange-600/70 border border-slate-700 rounded-b-lg flex items-center justify-center text-slate-200 text-sm shadow active:scale-95"
            aria-label="Baixo"
          >
            ▼
          </button>
        </div>

        {/* Action Button: Drop Bomb */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => placeBomb('player')}
            className="w-16 h-16 rounded-full bg-gradient-to-tr from-red-600 to-orange-500 active:from-red-700 active:to-orange-600 border-2 border-orange-300 shadow-lg shadow-orange-600/30 flex items-center justify-center text-2xl active:scale-90 transition-transform"
            aria-label="Plantar Bomba"
          >
            💣
          </button>
          <span className="text-[11px] font-semibold text-slate-400 mt-1">BOMBA</span>
        </div>
      </div>

      {/* Desktop Helper */}
      <div className="text-[11px] text-slate-400 text-center mt-2">
        Teclado: <span className="text-slate-300 font-medium">Setas</span> ou{' '}
        <span className="text-slate-300 font-medium">W A S D</span> para mover ·{' '}
        <span className="text-slate-300 font-medium">Espaço</span> para bomba
      </div>
    </div>
  );
};

export default BomberAlienGame;
