import React, { useState, useEffect, useRef, useCallback } from 'react';

// Game constants
const GRID_SIZE = 20;
const INITIAL_SPEED = 200;

const LEVEL_THRESHOLDS = [
    { score: 10, name: 'Planeta Lava', speed: 150, className: 'level-2' },
    { score: 25, name: 'Cinturão de Meteoros', speed: 100, className: 'level-3' },
    { score: 45, name: 'Estação Alienígena', speed: 70, className: 'level-4' },
    { score: 70, name: 'Buraco Negro', speed: 50, className: 'level-5' }
];

const INITIAL_SNAKE = [{ x: 10, y: 10 }];

const getRandomCoord = () => ({
    x: Math.floor(Math.random() * GRID_SIZE),
    y: Math.floor(Math.random() * GRID_SIZE)
});

interface CosmicSnakeGameProps {
    playerName: string;
    onClose: () => void;
}

const CosmicSnakeGame: React.FC<CosmicSnakeGameProps> = ({ playerName, onClose }) => {
    const [snake, setSnake] = useState(INITIAL_SNAKE);
    const [food, setFood] = useState(getRandomCoord());
    const [direction, setDirection] = useState<{ x: number; y: number }>({ x: 1, y: 0 }); // Right
    const [speed, setSpeed] = useState(INITIAL_SPEED);
    const [gameOver, setGameOver] = useState(false);
    const [score, setScore] = useState(0);
    const [levelInfo, setLevelInfo] = useState({ name: 'Nebulosa Neon', className: 'level-1' });

    // Fix: In a browser environment, setInterval returns a number, not a NodeJS.Timeout.
    const gameLoopRef = useRef<number | null>(null);
    const directionRef = useRef(direction);
    const touchStartRef = useRef<{ x: number, y: number } | null>(null);

    const resetGame = useCallback(() => {
        setSnake(INITIAL_SNAKE);
        setFood(getRandomCoord());
        setDirection({ x: 1, y: 0 });
        directionRef.current = { x: 1, y: 0 };
        setSpeed(INITIAL_SPEED);
        setScore(0);
        setGameOver(false);
        setLevelInfo({ name: 'Nebulosa Neon', className: 'level-1' });
    }, []);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        const { x, y } = directionRef.current;
        switch (e.key) {
            case 'ArrowUp':
                if (y === 0) directionRef.current = { x: 0, y: -1 };
                break;
            case 'ArrowDown':
                if (y === 0) directionRef.current = { x: 0, y: 1 };
                break;
            case 'ArrowLeft':
                if (x === 0) directionRef.current = { x: -1, y: 0 };
                break;
            case 'ArrowRight':
                if (x === 0) directionRef.current = { x: 1, y: 0 };
                break;
        }
    }, []);

    const handleTouchStart = useCallback((e: TouchEvent) => {
        e.preventDefault();
        touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, []);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        e.preventDefault();
        if (!touchStartRef.current) return;
        
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const deltaX = touchEndX - touchStartRef.current.x;
        const deltaY = touchEndY - touchStartRef.current.y;
        
        const { x, y } = directionRef.current;
        
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX > 0 && x === 0) {
                directionRef.current = { x: 1, y: 0 };
            } else if (deltaX < 0 && x === 0) {
                directionRef.current = { x: -1, y: 0 };
            }
        } else {
            if (deltaY > 0 && y === 0) {
                directionRef.current = { x: 0, y: 1 };
            } else if (deltaY < 0 && y === 0) {
                directionRef.current = { x: 0, y: -1 };
            }
        }
        
        touchStartRef.current = null;
    }, []);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        const gameArea = document.getElementById('game-area');
        if (gameArea) {
            gameArea.addEventListener('touchstart', handleTouchStart, { passive: false });
            gameArea.addEventListener('touchmove', handleTouchMove, { passive: false });
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            if (gameArea) {
                gameArea.removeEventListener('touchstart', handleTouchStart);
                gameArea.removeEventListener('touchmove', handleTouchMove);
            }
            if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        };
    }, [handleKeyDown, handleTouchStart, handleTouchMove]);

    const gameTick = useCallback(() => {
        if (gameOver) return;

        setDirection(directionRef.current);
        
        setSnake(prevSnake => {
            const newSnake = [...prevSnake];
            const head = { ...newSnake[0] };
            head.x += directionRef.current.x;
            head.y += directionRef.current.y;

            if (head.x >= GRID_SIZE || head.x < 0 || head.y >= GRID_SIZE || head.y < 0) {
                setGameOver(true);
                return prevSnake;
            }

            for (let i = 1; i < newSnake.length; i++) {
                if (head.x === newSnake[i].x && head.y === newSnake[i].y) {
                    setGameOver(true);
                    return prevSnake;
                }
            }

            newSnake.unshift(head);

            if (head.x === food.x && head.y === food.y) {
                setScore(s => s + 1);
                
                let newFoodPos;
                do {
                    newFoodPos = getRandomCoord();
                } while (newSnake.some(segment => segment.x === newFoodPos.x && segment.y === newFoodPos.y));
                setFood(newFoodPos);

            } else {
                newSnake.pop();
            }

            return newSnake;
        });
    }, [food.x, food.y, gameOver]);

    useEffect(() => {
        if (!gameOver) {
            gameLoopRef.current = setInterval(gameTick, speed);
        } else if (gameLoopRef.current) {
            clearInterval(gameLoopRef.current);
        }
        return () => {
            if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        };
    }, [gameTick, gameOver, speed]);
    
    useEffect(() => {
        const newLevel = LEVEL_THRESHOLDS.slice().reverse().find(l => score >= l.score);
        if (newLevel) {
            setLevelInfo({ name: newLevel.name, className: newLevel.className });
            setSpeed(newLevel.speed);
        } else {
            setLevelInfo({ name: 'Nebulosa Neon', className: 'level-1' });
            setSpeed(INITIAL_SPEED);
        }
    }, [score]);


    return (
        <div className="flex flex-col items-center text-white">
            <div className="w-full flex justify-between items-center mb-4 px-2">
                <h3 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-green-400 text-transparent bg-clip-text">
                    Pontuação: {score}
                </h3>
                <div className="text-right">
                    <p className="font-semibold text-sm">{levelInfo.name}</p>
                    <p className="text-xs text-slate-400">Nível {levelInfo.className.split('-')[1]}</p>
                </div>
            </div>
            <div 
                id="game-area"
                className={`relative grid grid-cols-20 grid-rows-20 w-full aspect-square bg-black/50 border-2 rounded-lg overflow-hidden transition-all duration-500 ${levelInfo.className}`}
                style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`, gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)` }}
            >
                {gameOver && (
                    <div className="absolute inset-0 bg-black/80 z-20 flex flex-col justify-center items-center text-center p-4">
                        <h2 className="text-2xl font-bold text-red-500 mb-2">Game Over</h2>
                        <p className="text-slate-300 mb-4">{playerName}, você foi engolido pelo cosmos!</p>
                        <p className="text-xl font-bold mb-6">Pontuação Final: {score}</p>
                        <button onClick={resetGame} className="bg-green-500 hover:bg-green-600 transition-colors text-white font-bold py-2 px-6 rounded-lg">
                            Tentar Novamente
                        </button>
                    </div>
                )}
                
                {snake.map((segment, index) => (
                    <div
                        key={index}
                        className={`snake-segment ${index === 0 ? 'snake-head' : ''}`}
                        style={{ gridColumn: segment.x + 1, gridRow: segment.y + 1, transform: `scale(${1 + (snake.length - index) * 0.01})` }}
                    />
                ))}

                <div
                    className="food-orb"
                    style={{ gridColumn: food.x + 1, gridRow: food.y + 1 }}
                />
            </div>
            <p className="mt-4 text-xs text-slate-400 text-center">Use as setas do teclado ou deslize o dedo na tela para mover.</p>
        </div>
    );
};

export default CosmicSnakeGame;
