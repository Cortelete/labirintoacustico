
import React, { useRef, useEffect, useState, useCallback } from 'react';

// --- Constants ---
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const LANE_COUNT = 4;
const LANE_WIDTH = CANVAS_WIDTH / LANE_COUNT;
const HIT_ZONE_Y = CANVAS_HEIGHT - 100;
const HIT_ZONE_HEIGHT = 40;
const NOTE_RADIUS = 25;
const NOTE_SPEED_BASE = 6;

// Colors for the 4 lanes (Green, Red, Yellow, Blue - Classic)
const LANE_COLORS = ['#22c55e', '#ef4444', '#eab308', '#3b82f6'];
const KEY_MAPPINGS = ['d', 'f', 'j', 'k'];
const KEY_LABELS = ['D', 'F', 'J', 'K'];

// --- Types ---
type Note = {
    id: number;
    lane: number;
    y: number;
    hit: boolean;
    missed: boolean;
    color: string;
};

type Particle = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
};

type GameState = 'playing' | 'gameOver';

interface CosmicRiffGameProps {
    playerName: string;
    onClose: () => void;
}

const CosmicRiffGame: React.FC<CosmicRiffGameProps> = ({ playerName, onClose }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameLoopRef = useRef<number | null>(null);
    
    // Game State
    const [score, setScore] = useState(0);
    const [multiplier, setMultiplier] = useState(1);
    const [streak, setStreak] = useState(0);
    const [health, setHealth] = useState(100); // Rock Meter
    const [gameState, setGameState] = useState<GameState>('playing');
    const [feedback, setFeedback] = useState<{ text: string, color: string, id: number } | null>(null);

    // Refs for game loop logic (avoiding stale closures)
    const notesRef = useRef<Note[]>([]);
    const particlesRef = useRef<Particle[]>([]);
    const lastNoteTimeRef = useRef(0);
    const nextNoteIntervalRef = useRef(1000);
    const scoreRef = useRef(0);
    const healthRef = useRef(100);
    const lanePressedRef = useRef<boolean[]>([false, false, false, false]);
    const audioPulseRef = useRef(0); // Simulates audio reactivity

    const createParticles = (x: number, y: number, color: string) => {
        for (let i = 0; i < 10; i++) {
            particlesRef.current.push({
                x,
                y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1.0,
                color
            });
        }
    };

    const handleHit = useCallback((laneIndex: number) => {
        // Find the lowest unhit note in this lane
        const hitZoneCenter = HIT_ZONE_Y + HIT_ZONE_HEIGHT / 2;
        const hitThreshold = 50; // Tolerance pixels

        // Filter notes in this lane that haven't been hit or missed yet
        const candidateNotes = notesRef.current.filter(n => 
            n.lane === laneIndex && !n.hit && !n.missed
        );

        let hitNote = null;
        let minDistance = Infinity;

        // Find closest note to hit zone
        candidateNotes.forEach(note => {
            const distance = Math.abs(note.y - hitZoneCenter);
            if (distance < hitThreshold && distance < minDistance) {
                minDistance = distance;
                hitNote = note;
            }
        });

        if (hitNote) {
            // Hit logic
            (hitNote as Note).hit = true;
            createParticles((laneIndex * LANE_WIDTH) + LANE_WIDTH / 2, hitZoneCenter, LANE_COLORS[laneIndex]);
            
            let points = 0;
            let text = "";
            let color = "#fff";

            if (minDistance < 15) {
                points = 100;
                text = "PERFEITO!";
                color = "#a855f7"; // Purple
                setHealth(h => Math.min(100, h + 5));
            } else if (minDistance < 35) {
                points = 50;
                text = "BOM!";
                color = "#22c55e"; // Green
                setHealth(h => Math.min(100, h + 2));
            } else {
                points = 25;
                text = "OK";
                color = "#eab308"; // Yellow
            }

            setStreak(s => {
                const newStreak = s + 1;
                setMultiplier(Math.floor(newStreak / 10) + 1);
                return newStreak;
            });
            
            setScore(s => s + (points * multiplier));
            setFeedback({ text, color, id: Date.now() });

        } else {
            // Miss logic (pressed key but no note)
            setStreak(0);
            setMultiplier(1);
            setHealth(h => Math.max(0, h - 2));
            setFeedback({ text: "ERROU!", color: "#ef4444", id: Date.now() });
        }
    }, [multiplier]);

    // Input Handling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (gameState !== 'playing') return;
            const laneIndex = KEY_MAPPINGS.indexOf(e.key.toLowerCase());
            if (laneIndex !== -1) {
                lanePressedRef.current[laneIndex] = true;
                handleHit(laneIndex);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const laneIndex = KEY_MAPPINGS.indexOf(e.key.toLowerCase());
            if (laneIndex !== -1) {
                lanePressedRef.current[laneIndex] = false;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [gameState, handleHit]);

    // Game Loop
    useEffect(() => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d')!;

        const loop = (time: number) => {
            if (gameState !== 'playing') return;

            // Clear Canvas with a semi-transparent black for trails or plain clear
            ctx.fillStyle = '#111827'; // Slate 900
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // --- Logic ---

            // Spawn Notes (Rhythmic Simulation)
            // Use Math.sin to simulate "waves" of notes intensity
            const intensity = (Math.sin(time / 2000) + 1) / 2; // 0 to 1
            const spawnRate = 800 - (intensity * 400); // 800ms to 400ms

            if (time - lastNoteTimeRef.current > nextNoteIntervalRef.current) {
                const lane = Math.floor(Math.random() * LANE_COUNT);
                notesRef.current.push({
                    id: Date.now(),
                    lane,
                    y: -50,
                    hit: false,
                    missed: false,
                    color: LANE_COLORS[lane]
                });
                lastNoteTimeRef.current = time;
                nextNoteIntervalRef.current = spawnRate * (Math.random() * 0.5 + 0.8); // Randomize slightly
            }

            // Simulate Audio Pulse for Background
            audioPulseRef.current = (Math.sin(time / 200) + 1) * 10;

            // Update Notes
            notesRef.current.forEach(note => {
                note.y += NOTE_SPEED_BASE + (streak > 20 ? 2 : 0); // Slight speed up on streak

                // Miss detection
                if (note.y > CANVAS_HEIGHT && !note.hit && !note.missed) {
                    note.missed = true;
                    setStreak(0);
                    setMultiplier(1);
                    setHealth(h => {
                        const newH = Math.max(0, h - 10);
                        if (newH === 0) setGameState('gameOver');
                        return newH;
                    });
                }
            });

            // Cleanup Notes
            notesRef.current = notesRef.current.filter(n => n.y < CANVAS_HEIGHT + 50 && !n.hit);

            // Update Particles
            particlesRef.current.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.05;
            });
            particlesRef.current = particlesRef.current.filter(p => p.life > 0);


            // --- Rendering ---

            // Draw Lanes
            for (let i = 0; i < LANE_COUNT; i++) {
                const x = i * LANE_WIDTH;
                
                // Lane Background
                const isPressed = lanePressedRef.current[i];
                const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
                gradient.addColorStop(0, 'rgba(0,0,0,0)');
                gradient.addColorStop(1, isPressed ? `${LANE_COLORS[i]}40` : 'rgba(255,255,255,0.05)');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(x, 0, LANE_WIDTH, CANVAS_HEIGHT);

                // Divider lines
                ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                ctx.beginPath();
                ctx.moveTo(x + LANE_WIDTH, 0);
                ctx.lineTo(x + LANE_WIDTH, CANVAS_HEIGHT);
                ctx.stroke();

                // Hit Target (Bottom Button)
                ctx.beginPath();
                ctx.arc(x + LANE_WIDTH / 2, HIT_ZONE_Y + HIT_ZONE_HEIGHT/2, NOTE_RADIUS, 0, Math.PI * 2);
                ctx.lineWidth = 3;
                ctx.strokeStyle = isPressed ? '#fff' : LANE_COLORS[i];
                ctx.fillStyle = isPressed ? LANE_COLORS[i] : 'rgba(0,0,0,0.5)';
                ctx.fill();
                ctx.stroke();

                // Key Label
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(KEY_LABELS[i], x + LANE_WIDTH / 2, HIT_ZONE_Y + HIT_ZONE_HEIGHT/2);
            }

            // Draw Notes
            notesRef.current.forEach(note => {
                if (note.hit) return; // Don't draw hit notes
                const x = (note.lane * LANE_WIDTH) + LANE_WIDTH / 2;
                
                // Glow
                ctx.shadowBlur = 15;
                ctx.shadowColor = note.color;
                
                ctx.beginPath();
                ctx.arc(x, note.y, NOTE_RADIUS * 0.8, 0, Math.PI * 2);
                ctx.fillStyle = note.color;
                ctx.fill();
                
                // Inner highlight
                ctx.beginPath();
                ctx.arc(x - 5, note.y - 5, NOTE_RADIUS * 0.3, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,0.8)';
                ctx.fill();
                
                ctx.shadowBlur = 0; // Reset shadow
            });

            // Draw Particles
            particlesRef.current.forEach(p => {
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0;
            });

            // Draw Background "Pulse" (Radio Reactive Simulation)
            ctx.save();
            ctx.globalCompositeOperation = 'overlay';
            ctx.fillStyle = `rgba(168, 85, 247, ${audioPulseRef.current / 100})`; // Purple pulse
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.restore();

            gameLoopRef.current = requestAnimationFrame(loop);
        };

        gameLoopRef.current = requestAnimationFrame(loop);
        return () => {
            if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
        };
    }, [gameState, streak]); // Re-bind if gameState changes

    // Mobile Touch Handling
    const handleTouchStart = (e: React.TouchEvent, laneIndex: number) => {
        e.preventDefault();
        if (gameState !== 'playing') return;
        lanePressedRef.current[laneIndex] = true;
        handleHit(laneIndex);
    };
    const handleTouchEnd = (e: React.TouchEvent, laneIndex: number) => {
        e.preventDefault();
        lanePressedRef.current[laneIndex] = false;
    };

    const restartGame = () => {
        notesRef.current = [];
        particlesRef.current = [];
        setScore(0);
        setStreak(0);
        setMultiplier(1);
        setHealth(100);
        setGameState('playing');
        setFeedback(null);
    };

    return (
        <div className="flex flex-col items-center">
            {/* HUD */}
            <div className="w-full flex justify-between items-end mb-2 px-2 text-white font-mono">
                <div className="text-left">
                    <div className="text-xs text-slate-400">SCORE</div>
                    <div className="text-xl font-bold">{score}</div>
                </div>
                <div className="flex flex-col items-center">
                     <div className="text-xl font-bold text-yellow-400">{multiplier}x</div>
                     {feedback && (
                        <div key={feedback.id} className="absolute top-20 text-xl font-bold animate-ping" style={{ color: feedback.color }}>
                            {feedback.text}
                        </div>
                     )}
                </div>
                <div className="text-right w-1/3">
                    <div className="text-xs text-slate-400">ROCK METER</div>
                    <div className="w-full h-4 bg-slate-700 rounded-full overflow-hidden border border-slate-500">
                        <div 
                            className={`h-full transition-all duration-300 ${health > 50 ? 'bg-green-500' : health > 20 ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`}
                            style={{ width: `${health}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Game Container */}
            <div className="relative">
                <canvas 
                    ref={canvasRef} 
                    width={CANVAS_WIDTH} 
                    height={CANVAS_HEIGHT} 
                    className="border-2 border-purple-500/50 rounded-lg shadow-[0_0_20px_rgba(168,85,247,0.4)] max-w-full h-auto"
                />

                {/* Touch Zones (Overlay for Mobile) */}
                <div className="absolute inset-0 flex items-end h-full">
                    {Array.from({ length: LANE_COUNT }).map((_, i) => (
                        <div 
                            key={i}
                            className="flex-1 h-32 active:bg-white/10 transition-colors"
                            onTouchStart={(e) => handleTouchStart(e, i)}
                            onTouchEnd={(e) => handleTouchEnd(e, i)}
                        ></div>
                    ))}
                </div>

                {gameState === 'gameOver' && (
                    <div className="absolute inset-0 bg-black/90 z-20 flex flex-col justify-center items-center text-center p-6 backdrop-blur-sm">
                        <h2 className="text-3xl font-bold text-red-500 mb-2">Show Cancelado!</h2>
                        <p className="text-slate-300 mb-6">{playerName}, a plateia desanimou.</p>
                        
                        <div className="bg-slate-800 p-4 rounded-lg w-full mb-6 border border-slate-700">
                            <p className="text-sm text-slate-400">Pontuação Final</p>
                            <p className="text-4xl font-bold text-white mb-2">{score}</p>
                            <p className="text-sm text-yellow-400">Maior Combo: {multiplier * 10}</p>
                        </div>

                        <div className="flex gap-4 w-full">
                            <button onClick={onClose} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg transition-colors">
                                Sair
                            </button>
                            <button onClick={restartGame} className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg">
                                Tentar de Novo
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Instructions */}
            <div className="mt-4 text-xs text-slate-400 text-center max-w-[300px]">
                <p className="hidden md:block">Use as teclas <span className="text-white font-bold">D, F, J, K</span> para tocar as notas.</p>
                <p className="md:hidden">Toque na parte inferior de cada cor para acertar a nota!</p>
                <p className="mt-1 text-purple-400">Sincronizado visualmente com a rádio 🎵</p>
            </div>
        </div>
    );
};

export default CosmicRiffGame;
