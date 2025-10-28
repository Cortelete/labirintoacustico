
import React, { useState, useEffect, useCallback, useRef } from 'react';

// --- Constants ---
const GRID_WIDTH = 13;
const GRID_HEIGHT = 11;
const BOMB_TIMER = 2500;
const EXPLOSION_DURATION = 500;
const TICK_RATE = 100;
const INITIAL_LIVES = 3;
const MOVEMENT_INTERVAL = 150; // Interval for analog stick movement
const DIRECTIONS = [
    { x: 0, y: -1 }, // Up
    { x: 0, y: 1 },  // Down
    { x: -1, y: 0 }, // Left
    { x: 1, y: 0 },  // Right
];

// --- Types ---
type Grid = number[][]; // 0: empty, 1: indestructible, 2: destructible
type Position = { x: number; y: number };
type Bomb = { pos: Position; timer: number; owner: 'player' | 'ai' };
type Explosion = { pos: Position; timer: number; owner: 'player' | 'ai' };
type GameState = 'playing' | 'round_won' | 'round_lost' | 'match_over';

// --- Helper ---
const generateLevel = (): Grid => {
    const grid: Grid = Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill(0));
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            if (y === 0 || y === GRID_HEIGHT - 1 || x === 0 || x === GRID_WIDTH - 1 || (x % 2 === 0 && y % 2 === 0)) {
                grid[y][x] = 1;
            } else if (Math.random() < 0.85) {
                grid[y][x] = 2;
            }
        }
    }
    // Clear corners for player and AI
    [1, 2].forEach(i => {
        grid[1][i] = 0; grid[2][1] = 0; // Player
        grid[GRID_HEIGHT - 2][GRID_WIDTH - 1 - i] = 0; // AI
        grid[GRID_HEIGHT - 3][GRID_WIDTH - 2] = 0; // AI
    });
    return grid;
};

// --- Component ---
interface BomberAlienProps {
    playerName: string;
    onClose: () => void;
}

const BomberAlienGame: React.FC<BomberAlienProps> = ({ playerName }) => {
    const [grid, setGrid] = useState<Grid>(() => generateLevel());
    const [playerPos, setPlayerPos] = useState<Position>({ x: 1, y: 1 });
    const [aiPos, setAiPos] = useState<Position>({ x: GRID_WIDTH - 2, y: GRID_HEIGHT - 2 });
    const [bombs, setBombs] = useState<Bomb[]>([]);
    const [explosions, setExplosions] = useState<Explosion[]>([]);
    const [gameState, setGameState] = useState<GameState>('playing');
    const [playerLives, setPlayerLives] = useState(INITIAL_LIVES);
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [stickPos, setStickPos] = useState({ top: '50%', left: '50%' });
    
    const gameLoopRef = useRef<number | null>(null);
    const gameStateRef = useRef(gameState);
    const aiDecisionCooldown = useRef(0);
    const aiBombCooldown = useRef(0);
    const analogStickBaseRef = useRef<HTMLDivElement>(null);
    const moveIntervalRef = useRef<number | null>(null);
    const currentMoveDirectionRef = useRef<string | null>(null);
    
    const playerPosRef = useRef(playerPos);
    const aiPosRef = useRef(aiPos);
    useEffect(() => { playerPosRef.current = playerPos; }, [playerPos]);
    useEffect(() => { aiPosRef.current = aiPos; }, [aiPos]);


    useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

    const startNewRound = useCallback(() => {
        setGrid(generateLevel());
        setPlayerPos({ x: 1, y: 1 });
        setAiPos({ x: GRID_WIDTH - 2, y: GRID_HEIGHT - 2 });
        setBombs([]);
        setExplosions([]);
        setGameState('playing');
    }, []);

    const resetGame = useCallback(() => {
        setPlayerLives(INITIAL_LIVES);
        setScore(0);
        setLevel(1);
        startNewRound();
    }, [startNewRound]);

    const movePlayer = useCallback((dx: number, dy: number) => {
        if (gameStateRef.current !== 'playing') return;
        setPlayerPos(prevPos => {
            const newX = prevPos.x + dx;
            const newY = prevPos.y + dy;
            if (grid[newY]?.[newX] === 0 && !bombs.some(b => b.pos.x === newX && b.pos.y === newY)) {
                return { x: newX, y: newY };
            }
            return prevPos;
        });
    }, [grid, bombs]);
    
    const placeBomb = useCallback(() => {
        if (gameStateRef.current !== 'playing' || bombs.some(b => b.pos.x === playerPosRef.current.x && b.pos.y === playerPosRef.current.y)) return;
        setBombs(prev => [...prev, { pos: playerPosRef.current, timer: BOMB_TIMER, owner: 'player' }]);
    }, [bombs]);
    
    const gameTick = useCallback(() => {
        if (gameStateRef.current !== 'playing') return;
    
        const currentGrid = grid;
        const currentBombs = bombs;
        const currentExplosions = explosions;
        const currentPlayerPos = playerPosRef.current;
        const currentAiPos = aiPosRef.current;
    
        const decisionInterval = Math.max(200, 700 - level * 25);
        aiDecisionCooldown.current -= TICK_RATE;
        if (aiDecisionCooldown.current <= 0) {
            setAiPos(prevAiPos => {
                const isValidMove = (p: Position) =>
                    currentGrid[p.y]?.[p.x] === 0 && !currentBombs.some(b => b.pos.x === p.x && b.pos.y === p.y);
    
                const dangerZones = new Set<string>();
                currentBombs.forEach(bomb => {
                    dangerZones.add(`${bomb.pos.x},${bomb.pos.y}`);
                    DIRECTIONS.forEach(dir => {
                         for (let i = 1; i <= 2; i++) {
                            const blastPos = { x: bomb.pos.x + dir.x * i, y: bomb.pos.y + dir.y * i };
                            if (currentGrid[blastPos.y]?.[blastPos.x] === 1) break;
                            dangerZones.add(`${blastPos.x},${blastPos.y}`);
                            if (currentGrid[blastPos.y]?.[blastPos.x] === 2) break;
                        }
                    });
                });
    
                if (dangerZones.has(`${prevAiPos.x},${prevAiPos.y}`)) {
                    const safeMoves = DIRECTIONS
                        .map(dir => ({ x: prevAiPos.x + dir.x, y: prevAiPos.y + dir.y }))
                        .filter(p => isValidMove(p) && !dangerZones.has(`${p.x},${p.y}`));
                    
                    if (safeMoves.length > 0) return safeMoves[Math.floor(Math.random() * safeMoves.length)];
                    return prevAiPos;
                }
    
                const preferredDirections = DIRECTIONS.sort(() => Math.random() - 0.5)
                    .sort((a,b) => (Math.abs(currentPlayerPos.x - (prevAiPos.x+a.x)) + Math.abs(currentPlayerPos.y - (prevAiPos.y+a.y))) - (Math.abs(currentPlayerPos.x - (prevAiPos.x+b.x)) + Math.abs(currentPlayerPos.y - (prevAiPos.y+b.y))));

                for(const dir of preferredDirections) {
                    const nextPos = {x: prevAiPos.x + dir.x, y: prevAiPos.y + dir.y};
                    if(isValidMove(nextPos)) return nextPos;
                }
                
                return prevAiPos;
            });
            aiDecisionCooldown.current = decisionInterval;
        }
    
        let nextBombs = [...currentBombs];
    
        const aiBombInterval = Math.max(1500, 4000 - level * 150);
        aiBombCooldown.current -= TICK_RATE;
        if (aiBombCooldown.current <= 0 && !nextBombs.some(b => b.pos.x === currentAiPos.x && b.pos.y === currentAiPos.y && b.owner === 'ai')) {
            nextBombs.push({ pos: currentAiPos, timer: BOMB_TIMER, owner: 'ai' });
            aiBombCooldown.current = aiBombInterval;
        }
    
        const explodingBombs: { pos: Position, owner: 'player' | 'ai' }[] = [];
        const bombsAfterTick = nextBombs.map(b => ({ ...b, timer: b.timer - TICK_RATE })).filter(b => {
            if (b.timer <= 0) {
                explodingBombs.push({ pos: b.pos, owner: b.owner });
                return false;
            }
            return true;
        });
    
        const newExplosions: Explosion[] = [];
        let nextGrid = currentGrid;
        if (explodingBombs.length > 0) {
            let tempGrid = currentGrid.map(row => [...row]);
            explodingBombs.forEach(({ pos: bombPos, owner }) => {
                const blastPositions = [bombPos];
                DIRECTIONS.forEach(dir => {
                    for(let i = 1; i <= 2; i++) {
                        const exPos = { x: bombPos.x + dir.x * i, y: bombPos.y + dir.y * i };
                        if (tempGrid[exPos.y]?.[exPos.x] === 1) break;
                        blastPositions.push(exPos);
                        if (tempGrid[exPos.y]?.[exPos.x] === 2) {
                             tempGrid[exPos.y][exPos.x] = 0;
                             break;
                        }
                    }
                });
                blastPositions.forEach(p => newExplosions.push({ pos: p, timer: EXPLOSION_DURATION, owner }));
            });
            nextGrid = tempGrid;
        }
    
        const explosionsAfterTick = [...currentExplosions.map(ex => ({...ex, timer: ex.timer - TICK_RATE })).filter(ex => ex.timer > 0), ...newExplosions];
    
        const playerIsHit = explosionsAfterTick.some(ex => ex.pos.x === currentPlayerPos.x && ex.pos.y === currentPlayerPos.y);
        const aiIsHit = explosionsAfterTick.some(ex => ex.pos.x === currentAiPos.x && ex.pos.y === currentAiPos.y && ex.owner === 'player');
        
        let nextGameState: GameState = gameStateRef.current;
        if (playerIsHit) {
            if (playerLives > 1) {
                setPlayerLives(l => l - 1);
                nextGameState = 'round_lost';
            } else {
                setPlayerLives(0);
                nextGameState = 'match_over';
            }
        } else if (aiIsHit) {
            setScore(s => s + 100 * level);
            setLevel(l => l + 1);
            nextGameState = 'round_won';
        }
    
        setBombs(bombsAfterTick);
        setExplosions(explosionsAfterTick);
        if (explodingBombs.length > 0) {
            setGrid(nextGrid);
        }
        if (nextGameState !== gameStateRef.current) {
            setGameState(nextGameState);
        }
    
    }, [bombs, explosions, grid, level, playerLives]);

    useEffect(() => {
        if (gameState === 'round_won' || gameState === 'round_lost') {
            const timer = setTimeout(startNewRound, 2000);
            return () => clearTimeout(timer);
        }
    }, [gameState, startNewRound]);
    
    useEffect(() => {
        gameLoopRef.current = setInterval(gameTick, TICK_RATE);
        return () => { if (gameLoopRef.current) clearInterval(gameLoopRef.current); };
    }, [gameTick]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (gameStateRef.current !== 'playing') return;
        switch (e.key) {
            case 'ArrowUp': movePlayer(0, -1); break;
            case 'ArrowDown': movePlayer(0, 1); break;
            case 'ArrowLeft': movePlayer(-1, 0); break;
            case 'ArrowRight': movePlayer(1, 0); break;
            case ' ': e.preventDefault(); placeBomb(); break;
        }
    }, [movePlayer, placeBomb]);
    
    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
    
    const handleStickMove = useCallback((e: React.TouchEvent) => {
        e.preventDefault();
        if (gameStateRef.current !== 'playing' || !analogStickBaseRef.current) return;
        const rect = analogStickBaseRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;

        const deltaX = touchX - centerX;
        const deltaY = touchY - centerY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const radius = rect.width / 2;
        const knobRadius = 25;

        const clampedDistance = Math.min(distance, radius - knobRadius);
        const angle = Math.atan2(deltaY, deltaX);

        const knobX = clampedDistance * Math.cos(angle);
        const knobY = clampedDistance * Math.sin(angle);

        setStickPos({
            left: `${knobX + radius}px`,
            top: `${knobY + radius}px`,
        });

        let direction: string | null = null;
        if (distance > radius * 0.2) { // Dead zone
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                direction = deltaX > 0 ? 'right' : 'left';
            } else {
                direction = deltaY > 0 ? 'down' : 'up';
            }
        }

        if (direction !== currentMoveDirectionRef.current) {
            if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
            currentMoveDirectionRef.current = direction;

            if (direction) {
                const move = () => {
                    switch(direction) {
                        case 'up': movePlayer(0, -1); break;
                        case 'down': movePlayer(0, 1); break;
                        case 'left': movePlayer(-1, 0); break;
                        case 'right': movePlayer(1, 0); break;
                    }
                };
                move();
                moveIntervalRef.current = setInterval(move, MOVEMENT_INTERVAL);
            }
        }
    }, [movePlayer]);

    const handleStickEnd = useCallback((e: React.TouchEvent) => {
        e.preventDefault();
        if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
        currentMoveDirectionRef.current = null;
        setStickPos({ left: '50%', top: '50%' });
    }, []);

    return (
        <div className="flex flex-col items-center text-white">
            <div className="w-full flex justify-between items-center mb-2 px-1">
                <div className="text-left">
                    <h3 className="text-sm font-bold text-green-400">{playerName}</h3>
                    <p className="text-sm font-bold text-pink-400">Vidas: {playerLives}</p>
                </div>
                <div className="text-center">
                    <p className="text-sm">Pontos: {score}</p>
                    <p className="text-sm">Rodada: {level}</p>
                </div>
                <h3 className="text-sm font-bold text-red-400">Alien</h3>
            </div>
            <div className="relative w-full aspect-[13/11]">
                <div className="bomber-grid" style={{ gridTemplateColumns: `repeat(${GRID_WIDTH}, 1fr)`}}>
                    {grid.flat().map((cell, i) => (
                        <div key={i} className={`bomber-cell ${cell === 1 ? 'bomber-wall-indestructible' : cell === 2 ? 'bomber-wall-destructible' : 'bomber-floor'}`} />
                    ))}
                    <div className="bomber-player" style={{ left: `${(playerPos.x / GRID_WIDTH) * 100}%`, top: `${(playerPos.y / GRID_HEIGHT) * 100}%`}}/>
                    <div className="bomber-ai" style={{ left: `${(aiPos.x / GRID_WIDTH) * 100}%`, top: `${(aiPos.y / GRID_HEIGHT) * 100}%`}}/>
                    {bombs.map((bomb, i) => (
                        <div key={`b-${i}`} className="bomber-bomb" style={{ left: `${(bomb.pos.x / GRID_WIDTH) * 100}%`, top: `${(bomb.pos.y / GRID_HEIGHT) * 100}%`}}/>
                    ))}
                     {explosions.map((ex, i) => (
                        <div key={`e-${i}`} className="bomber-explosion" style={{ left: `${(ex.pos.x / GRID_WIDTH) * 100}%`, top: `${(ex.pos.y / GRID_HEIGHT) * 100}%`}}/>
                    ))}
                </div>
                {gameState !== 'playing' && (
                    <div className="absolute inset-0 bg-black/80 z-20 flex flex-col justify-center items-center text-center p-4">
                       {gameState === 'match_over' ? (
                            <>
                                <h2 className="text-2xl font-bold text-red-500">Fim de Jogo</h2>
                                <p className="text-slate-300 my-2">O alien te derrotou!</p>
                                <p className="text-lg font-bold mb-4">Pontuação Final: {score}</p>
                                <button onClick={resetGame} className="bg-purple-600 hover:bg-purple-700 transition-colors text-white font-bold py-2 px-6 rounded-lg">
                                    Jogar Novamente
                                </button>
                            </>
                       ) : (
                            <h2 className={`text-2xl font-bold animate-pulse ${gameState === 'round_won' ? 'text-green-400' : 'text-yellow-400'}`}>
                                {gameState === 'round_won' ? `Rodada ${level - 1} Vencida!` : 'Você foi atingido!'}
                            </h2>
                       )}
                    </div>
                )}
            </div>
             <div className="w-full flex justify-between items-center mt-3 px-1">
                <div
                    ref={analogStickBaseRef}
                    className="bomber-analog-stick"
                    onTouchStart={handleStickMove}
                    onTouchMove={handleStickMove}
                    onTouchEnd={handleStickEnd}
                    onTouchCancel={handleStickEnd}
                >
                    <div className="bomber-analog-knob" style={stickPos}></div>
                </div>
                <div className="bomber-action">
                    <button onClick={placeBomb}>💣</button>
                </div>
            </div>
        </div>
    );
};

export default BomberAlienGame;
