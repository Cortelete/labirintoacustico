import React, { useRef, useEffect, useState, useCallback } from 'react';

// --- Constants ---
const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 560;
const INITIAL_LIVES = 3;

const PLAYER_WIDTH = 32;
const PLAYER_HEIGHT = 20;
const PLAYER_SPEED = 5;
const PLAYER_INVULNERABILITY_DURATION = 2000;

const BULLET_WIDTH = 4;
const BULLET_HEIGHT = 12;
const BULLET_SPEED = 7;
const FIRE_COOLDOWN = 350;

const ENEMY_COLS = 8;
const ENEMY_ROWS = 4;
const ENEMY_SIZE = 28;
const ENEMY_GAP = 12;

const PARTICLE_COUNT = 20;
const PARTICLE_LIFESPAN = 500;

const POWERUP_SPEED = 2;
const POWERUP_SIZE = 20;
const POWERUP_SPAWN_CHANCE = 0.15;
const POWERUP_DURATION = 10000;

const LEVELS = [
    { name: "Estreia Estelar", bg: "radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%)", starColor: "#ffffff", playerColor: "#c0c0c0", bulletColor: "#ffffff", enemyColors: ['#ff00ff', '#00ffff'], speedModifier: 1.0 },
    { name: "Palco Lunar", bg: "radial-gradient(ellipse at bottom, #3c2f5b 0%, #201633 100%)", starColor: "#e0d8f5", playerColor: "#c0c0c0", bulletColor: "#d8b4fe", enemyColors: ['#a78bfa', '#c4b5fd'], speedModifier: 1.2 },
    { name: "Tour Solar", bg: "radial-gradient(ellipse at bottom, #7f3d3d 0%, #4a1d1d 100%)", starColor: "#fef08a", playerColor: "#facc15", bulletColor: "#fb923c", enemyColors: ['#f97316', '#f59e0b'], speedModifier: 1.5 },
    { name: "Ritual Alienígena", bg: "radial-gradient(ellipse at bottom, #166534 0%, #052e16 100%)", starColor: "#a7f3d0", playerColor: "#86efac", bulletColor: "#4ade80", enemyColors: ['#34d399', '#10b981'], speedModifier: 1.8 },
    { name: "O Silêncio do Vácuo", bg: "radial-gradient(ellipse at bottom, #1e1b4b 0%, #020617 100%)", starColor: "#a855f7", playerColor: "#e879f9", bulletColor: "#f472b6", enemyColors: ['#c026d3', '#be185d'], speedModifier: 2.2 },
];


// --- Types ---
type GameObject = { x: number; y: number; width: number; height: number; color: string; };
type Particle = { x: number; y: number; radius: number; color: string; velocity: { x: number; y: number }; alpha: number; lifespan: number; };
type GameState = 'playing' | 'gameOver' | 'levelUp';
type PowerUpType = 'doubleShot' | 'shield';
type PowerUp = GameObject & { type: PowerUpType; };

// --- Component ---
interface RockInvadersGameProps {
    playerName: string;
    onClose: () => void;
}

const RockInvadersGame: React.FC<RockInvadersGameProps> = ({ playerName, onClose }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameLoopRef = useRef<number>();
    const lastTimeRef = useRef(0);
    const lastFireTimeRef = useRef(0);

    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(INITIAL_LIVES);
    const [level, setLevel] = useState(1);
    const [gameState, setGameState] = useState<GameState>('playing');
    
    const keysPressed = useRef<{ [key: string]: boolean }>({});
    const playerRef = useRef<GameObject>({ x: 0, y: 0, width: PLAYER_WIDTH, height: PLAYER_HEIGHT, color: '' });
    const bulletsRef = useRef<GameObject[]>([]);
    const enemiesRef = useRef<GameObject[]>([]);
    const particlesRef = useRef<Particle[]>([]);
    const starsRef = useRef<any[]>([]);
    const powerUpsRef = useRef<PowerUp[]>([]);
    const playerStateRef = useRef({ hasDoubleShot: false, doubleShotTimer: 0, hasShield: false, isInvulnerable: false, invulnerabilityTimer: 0 });
    const enemyGridRef = useRef({ x: 0, y: 40, width: 0, direction: 1, speed: 1 });
    const touchInfo = useRef<{ active: boolean; initialX: number; playerInitialX: number }>({ active: false, initialX: 0, playerInitialX: 0 });

    const setupLevel = useCallback((levelNum: number) => {
        const levelIndex = (levelNum - 1) % LEVELS.length;
        const baseConfig = LEVELS[levelIndex];
        const config = {...baseConfig};
        if (levelNum > LEVELS.length) {
            config.speedModifier = baseConfig.speedModifier + (levelNum - LEVELS.length) * 0.25;
        }

        playerRef.current.color = config.playerColor;
        
        bulletsRef.current = [];
        particlesRef.current = [];
        powerUpsRef.current = [];
        enemiesRef.current = [];
        
        const gridWidth = ENEMY_COLS * ENEMY_SIZE + (ENEMY_COLS - 1) * ENEMY_GAP;
        const startX = (CANVAS_WIDTH - gridWidth) / 2;
        
        for (let row = 0; row < ENEMY_ROWS; row++) {
            for (let col = 0; col < ENEMY_COLS; col++) {
                enemiesRef.current.push({
                    x: startX + col * (ENEMY_SIZE + ENEMY_GAP),
                    y: 60 + row * (ENEMY_SIZE + ENEMY_GAP),
                    width: ENEMY_SIZE,
                    height: ENEMY_SIZE,
                    color: config.enemyColors[row % config.enemyColors.length]
                });
            }
        }
        enemyGridRef.current = { x: startX, y: 60, width: gridWidth, direction: 1, speed: 0.5 * config.speedModifier };

        if (starsRef.current.length === 0) {
            for (let i = 0; i < 100; i++) { starsRef.current.push({ x: Math.random() * CANVAS_WIDTH, y: Math.random() * CANVAS_HEIGHT, radius: Math.random() * 1.5, alpha: Math.random() }); }
        }
    }, []);

    const resetGame = useCallback(() => {
        setScore(0);
        setLives(INITIAL_LIVES);
        setLevel(1);
        playerStateRef.current = { hasDoubleShot: false, doubleShotTimer: 0, hasShield: false, isInvulnerable: false, invulnerabilityTimer: 0 };
        playerRef.current.x = (CANVAS_WIDTH - PLAYER_WIDTH) / 2;
        setupLevel(1);
        setGameState('playing');
    }, [setupLevel]);
    
    const createExplosion = (x: number, y: number, color: string) => {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particlesRef.current.push({ x, y, radius: Math.random() * 3 + 1, color, velocity: { x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 6 }, alpha: 1, lifespan: PARTICLE_LIFESPAN });
        }
    };

    const gameLoop = useCallback((timestamp: number) => {
        if (!canvasRef.current) return;
        const deltaTime = timestamp - lastTimeRef.current;
        const ctx = canvasRef.current.getContext('2d')!;
        
        // --- UPDATE ---
        if (gameState === 'playing') {
            if (keysPressed.current['ArrowLeft'] && playerRef.current.x > 0) playerRef.current.x -= PLAYER_SPEED;
            if (keysPressed.current['ArrowRight'] && playerRef.current.x < CANVAS_WIDTH - playerRef.current.width) playerRef.current.x += PLAYER_SPEED;
            
            if (timestamp - lastFireTimeRef.current > FIRE_COOLDOWN) {
                const config = LEVELS[(level - 1) % LEVELS.length];
                if (playerStateRef.current.hasDoubleShot) {
                    bulletsRef.current.push({ x: playerRef.current.x + playerRef.current.width / 2 - BULLET_WIDTH * 2, y: playerRef.current.y, width: BULLET_WIDTH, height: BULLET_HEIGHT, color: config.bulletColor });
                    bulletsRef.current.push({ x: playerRef.current.x + playerRef.current.width / 2 + BULLET_WIDTH, y: playerRef.current.y, width: BULLET_WIDTH, height: BULLET_HEIGHT, color: config.bulletColor });
                } else {
                    bulletsRef.current.push({ x: playerRef.current.x + playerRef.current.width / 2 - BULLET_WIDTH / 2, y: playerRef.current.y, width: BULLET_WIDTH, height: BULLET_HEIGHT, color: config.bulletColor });
                }
                lastFireTimeRef.current = timestamp;
            }

            bulletsRef.current = bulletsRef.current.filter(b => b.y > 0);
            bulletsRef.current.forEach(b => b.y -= BULLET_SPEED);
            
            let edgeReached = false;
            const grid = enemyGridRef.current;
            grid.x += grid.speed * grid.direction;
            if (grid.x < 10 || grid.x + grid.width > CANVAS_WIDTH - 10) edgeReached = true;
            
            for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
                const enemy = enemiesRef.current[i];
                enemy.x += grid.speed * grid.direction;
                if (edgeReached) enemy.y += ENEMY_SIZE / 2;

                // FIX: Check if enemy has passed the player and gone off-screen
                if (enemy.y > CANVAS_HEIGHT) {
                    enemiesRef.current.splice(i, 1); // Remove the invading enemy
                    if (!playerStateRef.current.isInvulnerable) {
                        if (playerStateRef.current.hasShield) {
                            playerStateRef.current.hasShield = false;
                            createExplosion(playerRef.current.x + playerRef.current.width / 2, playerRef.current.y, '#67e8f9'); // Shield break effect
                        } else if (lives > 1) {
                            setLives(l => l - 1);
                            playerStateRef.current.isInvulnerable = true;
                            playerStateRef.current.invulnerabilityTimer = PLAYER_INVULNERABILITY_DURATION;
                            createExplosion(playerRef.current.x + playerRef.current.width / 2, playerRef.current.y + playerRef.current.height / 2, '#FFFFFF');
                        } else {
                            setLives(0);
                            setGameState('gameOver');
                        }
                    }
                    continue; // Enemy is removed, continue to the next one
                }
                
                if (!playerStateRef.current.isInvulnerable && enemy.x < playerRef.current.x + playerRef.current.width && enemy.x + enemy.width > playerRef.current.x && enemy.y < playerRef.current.y + playerRef.current.height && enemy.y + enemy.height > playerRef.current.y) {
                    if (playerStateRef.current.hasShield) {
                        playerStateRef.current.hasShield = false;
                        createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color);
                        enemiesRef.current.splice(i, 1);
                        setScore(s => s + 10);
                    } else if (lives > 1) {
                        setLives(l => l - 1);
                        playerStateRef.current.isInvulnerable = true;
                        playerStateRef.current.invulnerabilityTimer = PLAYER_INVULNERABILITY_DURATION;
                        createExplosion(playerRef.current.x + playerRef.current.width/2, playerRef.current.y + playerRef.current.height/2, '#FFFFFF');
                        enemiesRef.current.splice(i, 1);
                    } else {
                        setLives(0);
                        setGameState('gameOver');
                    }
                }
            }
            if (edgeReached) grid.direction *= -1;

            powerUpsRef.current.forEach(p => p.y += POWERUP_SPEED);
            powerUpsRef.current = powerUpsRef.current.filter(p => p.y < CANVAS_HEIGHT);
            if (playerStateRef.current.hasDoubleShot) {
                playerStateRef.current.doubleShotTimer -= deltaTime;
                if (playerStateRef.current.doubleShotTimer <= 0) playerStateRef.current.hasDoubleShot = false;
            }
            if (playerStateRef.current.isInvulnerable) {
                playerStateRef.current.invulnerabilityTimer -= deltaTime;
                if (playerStateRef.current.invulnerabilityTimer <= 0) playerStateRef.current.isInvulnerable = false;
            }

            for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
                for (let j = enemiesRef.current.length - 1; j >= 0; j--) {
                    const b = bulletsRef.current[i];
                    const e = enemiesRef.current[j];
                    if (b && e && b.x < e.x + e.width && b.x + b.width > e.x && b.y < e.y + e.height && b.y + b.height > e.y) {
                        createExplosion(e.x + e.width / 2, e.y + e.height / 2, e.color);
                        bulletsRef.current.splice(i, 1);
                        enemiesRef.current.splice(j, 1);
                        setScore(s => s + 10 * level);
                        if (Math.random() < POWERUP_SPAWN_CHANCE) {
                            const type = Math.random() < 0.5 ? 'doubleShot' : 'shield';
                            powerUpsRef.current.push({ x: e.x + e.width/2 - POWERUP_SIZE/2, y: e.y, width: POWERUP_SIZE, height: POWERUP_SIZE, type, color: type === 'shield' ? '#67e8f9' : '#fde047' });
                        }
                        break;
                    }
                }
            }
            
            for (let i = powerUpsRef.current.length - 1; i >= 0; i--) {
                const p = powerUpsRef.current[i];
                if (p.x < playerRef.current.x + playerRef.current.width && p.x + p.width > playerRef.current.x && p.y < playerRef.current.y + playerRef.current.height && p.y + p.height > playerRef.current.y) {
                    if (p.type === 'doubleShot') {
                        playerStateRef.current.hasDoubleShot = true;
                        playerStateRef.current.doubleShotTimer = POWERUP_DURATION;
                    } else if (p.type === 'shield') {
                        playerStateRef.current.hasShield = true;
                    }
                    powerUpsRef.current.splice(i, 1);
                }
            }
            
            if (enemiesRef.current.length === 0 && gameState === 'playing') {
                setGameState('levelUp');
                setTimeout(() => {
                    setLevel(l => l + 1);
                    setupLevel(level + 1);
                    setGameState('playing');
                }, 2000);
            }
        }
        
        particlesRef.current = particlesRef.current.filter(p => p.alpha > 0);
        particlesRef.current.forEach(p => { p.x += p.velocity.x; p.y += p.velocity.y; p.alpha -= deltaTime / p.lifespan; });
        
        // --- DRAW ---
        const config = LEVELS[(level - 1) % LEVELS.length];
        const colors = config.bg.match(/#\w{6}/g) || ["#000", "#111"];
        const gradient = ctx.createRadialGradient(CANVAS_WIDTH/2, CANVAS_HEIGHT, 50, CANVAS_WIDTH/2, CANVAS_HEIGHT, CANVAS_HEIGHT);
        gradient.addColorStop(0, colors[0]); gradient.addColorStop(1, colors[1]);
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        starsRef.current.forEach(star => { ctx.beginPath(); ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2); ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha * Math.random()})`; ctx.fill(); });
        bulletsRef.current.forEach(b => { ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.width, b.height); });
        enemiesRef.current.forEach(e => { ctx.fillStyle = e.color; ctx.fillRect(e.x, e.y, e.width, e.height); });
        
        powerUpsRef.current.forEach(p => {
            ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.width, p.height);
            ctx.fillStyle = '#1e293b'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(p.type === 'doubleShot' ? 'D' : 'S', p.x + p.width / 2, p.y + p.height / 2 + 1);
        });

        particlesRef.current.forEach(p => { ctx.save(); ctx.globalAlpha = p.alpha; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill(); ctx.restore(); });

        if (!playerStateRef.current.isInvulnerable || (playerStateRef.current.isInvulnerable && Math.floor(timestamp / 150) % 2 === 0)) {
            ctx.fillStyle = playerRef.current.color;
            ctx.beginPath(); ctx.moveTo(playerRef.current.x, playerRef.current.y + playerRef.current.height); ctx.lineTo(playerRef.current.x + playerRef.current.width / 2, playerRef.current.y); ctx.lineTo(playerRef.current.x + playerRef.current.width, playerRef.current.y + playerRef.current.height); ctx.closePath(); ctx.fill();
        }
        if (playerStateRef.current.hasShield) { ctx.strokeStyle = '#67e8f9'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(playerRef.current.x + playerRef.current.width / 2, playerRef.current.y + playerRef.current.height / 2, playerRef.current.width * 0.7, 0, Math.PI * 2); ctx.stroke(); }
        
        ctx.fillStyle = 'white'; ctx.font = '20px monospace'; ctx.textAlign = 'left'; ctx.fillText(`SCORE: ${score}`, 10, 30);
        ctx.textAlign = 'right'; ctx.fillText(`LEVEL: ${level}`, CANVAS_WIDTH - 10, 30);
        ctx.textAlign = 'left'; ctx.font = '24px monospace'; ctx.fillText('❤️'.repeat(lives), 10, 60);
        
        let powerupY = 55;
        ctx.textAlign = 'right'; ctx.font = '14px monospace';
        if (playerStateRef.current.hasShield) { ctx.fillStyle = '#67e8f9'; ctx.fillText(`SHIELD ATIVO`, CANVAS_WIDTH - 10, powerupY); powerupY += 20; }
        if (playerStateRef.current.hasDoubleShot) { const seconds = (playerStateRef.current.doubleShotTimer / 1000).toFixed(1); ctx.fillStyle = '#fde047'; ctx.fillText(`TIRO DUPLO: ${seconds}s`, CANVAS_WIDTH - 10, powerupY); }
        
        if (gameState === 'levelUp') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.fillStyle = 'white'; ctx.font = '48px monospace'; ctx.textAlign = 'center'; ctx.fillText(`Nível ${level + 1}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        }

        lastTimeRef.current = timestamp;
        if(gameState !== 'gameOver') gameLoopRef.current = requestAnimationFrame(gameLoop);
    }, [gameState, score, lives, level, setupLevel]);

    useEffect(() => {
        playerRef.current = { x: (CANVAS_WIDTH - PLAYER_WIDTH) / 2, y: CANVAS_HEIGHT - PLAYER_HEIGHT - 20, width: PLAYER_WIDTH, height: PLAYER_HEIGHT, color: '#c0c0c0' };
        setupLevel(1);
        
        const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.key] = true; };
        const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.key] = false; };
        
        window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleTouchStart = (e: TouchEvent) => { e.preventDefault(); touchInfo.current = { active: true, initialX: e.touches[0].clientX, playerInitialX: playerRef.current.x, }; };
        const handleTouchMove = (e: TouchEvent) => { e.preventDefault(); if (!touchInfo.current.active) return; const deltaX = e.touches[0].clientX - touchInfo.current.initialX; const rect = canvas.getBoundingClientRect(); const scaleX = canvas.width / rect.width; let newX = touchInfo.current.playerInitialX + (deltaX * scaleX); playerRef.current.x = Math.max(0, Math.min(CANVAS_WIDTH - playerRef.current.width, newX)); };
        const handleTouchEnd = (e: TouchEvent) => { e.preventDefault(); touchInfo.current.active = false; };
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false }); canvas.addEventListener('touchmove', handleTouchMove, { passive: false }); canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

        return () => {
            window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp);
            if (canvas) { canvas.removeEventListener('touchstart', handleTouchStart); canvas.removeEventListener('touchmove', handleTouchMove); canvas.removeEventListener('touchend', handleTouchEnd); }
        };
    }, [setupLevel]);

    useEffect(() => {
        lastTimeRef.current = performance.now();
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return () => { if(gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current); }
    }, [gameLoop]);

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-full">
                <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="rock-invaders-canvas bg-black w-full h-auto" />
                {gameState === 'gameOver' && (
                    <div className="absolute inset-0 bg-black/80 z-20 flex flex-col justify-center items-center text-center p-4">
                        <h2 className="text-3xl font-bold text-pink-500 mb-2 animate-pulse">Fim de Show</h2>
                        <p className="text-slate-300 mb-4">{enemiesRef.current.length === 0 ? `Show de energia, ${playerName}! O cosmos vibra ao som do seu rock!` : `${playerName}, os aliens silenciaram o palco!`}</p>
                        <p className="text-xl font-bold mb-6">Pontuação Final: {score}</p>
                        <button onClick={resetGame} className="bg-pink-600 hover:bg-pink-700 transition-colors text-white font-bold py-2 px-6 rounded-lg shadow-[0_0_15px_rgba(236,72,153,0.8)]">
                            Tocar de Novo
                        </button>
                    </div>
                )}
            </div>
            <p className="mt-2 text-xs text-slate-400">Mova com as setas ou deslizando o dedo.</p>
        </div>
    );
};

export default RockInvadersGame;