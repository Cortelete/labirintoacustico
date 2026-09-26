import React, { useRef, useEffect, useState, useCallback } from 'react';
import { gameAudio } from './gameAudio';

// --- Constants ---
const CANVAS_WIDTH = 420;
const CANVAS_HEIGHT = 580;
const LANE_COUNT = 4;
const LANE_WIDTH = CANVAS_WIDTH / LANE_COUNT;
const HIT_ZONE_Y = CANVAS_HEIGHT - 90;
const HIT_ZONE_HEIGHT = 44;
const NOTE_RADIUS = 24;

const LANE_COLORS = ['#22c55e', '#ef4444', '#eab308', '#3b82f6'];
const KEY_LABELS = ['D', 'F', 'J', 'K'];

// Multi-key mapping for accessibility and comfort:
// Lane 0: D, 1, ArrowLeft, A
// Lane 1: F, 2, ArrowDown, S
// Lane 2: J, 3, ArrowUp, K/H
// Lane 3: K, 4, ArrowRight, L
const KEY_TO_LANE: Record<string, number> = {
  'd': 0, '1': 0, 'arrowleft': 0, 'a': 0,
  'f': 1, '2': 1, 'arrowdown': 1, 's': 1,
  'j': 2, '3': 2, 'arrowup': 2, 'h': 2,
  'k': 3, '4': 3, 'arrowright': 3, 'l': 3,
};

// Melodic riffs designed for all 4 fret lanes:
// 0: Green (Low E) | 1: Red (G) | 2: Yellow (A) | 3: Blue (High D)
const TRACK_RIFFS: Record<string, number[][]> = {
  track1: [
    // Fácil: melodic arpeggios that clearly introduce each lane
    [0, 1, 2, 1, 0, 2, 1, 0],
    [0, 0, 1, 2, 3, 2, 1, 0],
    [0, 2, 1, 3, 2, 1, 0, 1],
    [1, 2, 3, 2, 1, 0, 2, 3],
  ],
  track2: [
    // Médio: energetic rock patterns, syncopations and octave leaps
    [0, 1, 2, 3, 2, 1, 0, 2],
    [0, 2, 1, 3, 0, 2, 3, 1],
    [1, 2, 0, 3, 2, 1, 3, 0],
    [3, 2, 1, 0, 1, 2, 3, 2],
    [0, 0, 2, 2, 1, 3, 2, 1],
  ],
  track3: [
    // Difícil: fast shredding guitar solo patterns
    [0, 1, 2, 3, 2, 3, 1, 2],
    [3, 2, 1, 0, 2, 1, 3, 2],
    [0, 3, 1, 2, 0, 2, 3, 1],
    [2, 3, 1, 0, 3, 2, 1, 0],
    [1, 3, 2, 0, 2, 3, 1, 3],
  ],
};

interface SongTrack {
  id: string;
  title: string;
  bpm: number;
  difficulty: 'Fácil' | 'Médio' | 'Difícil';
  noteSpeed: number;
}

const TRACKS: SongTrack[] = [
  { id: 'track1', title: 'Cosmic Journey', bpm: 110, difficulty: 'Fácil', noteSpeed: 5.5 },
  { id: 'track2', title: 'Neon Electric Solo', bpm: 130, difficulty: 'Médio', noteSpeed: 6.8 },
  { id: 'track3', title: 'Hyper-Speed Galactic', bpm: 150, difficulty: 'Difícil', noteSpeed: 8.2 },
];

interface Note {
  id: number;
  lane: number;
  y: number;
  hit: boolean;
  missed: boolean;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface FeedbackPopup {
  text: string;
  color: string;
  id: number;
  x: number;
  y: number;
}

interface CosmicRiffGameProps {
  playerName: string;
  onClose: () => void;
}

const CosmicRiffGame: React.FC<CosmicRiffGameProps> = ({ playerName, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);

  // Track selection
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);
  const currentTrack = TRACKS[selectedTrackIndex];

  // Game State
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('labirinto_cosmicriff_highscore') || '0', 10) || 0;
    } catch {
      return 0;
    }
  });
  const [multiplier, setMultiplier] = useState(1);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [health, setHealth] = useState(100);
  const [isStarPower, setIsStarPower] = useState(false);
  const [gameState, setGameState] = useState<'playing' | 'gameOver' | 'songFinished'>('playing');
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(() => gameAudio.getMuted());
  const [feedback, setFeedback] = useState<FeedbackPopup | null>(null);

  // Performance Stats
  const statsRef = useRef({ perfect: 0, great: 0, good: 0, miss: 0 });

  // Refs for Loop
  const notesRef = useRef<Note[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const lastBeatTimeRef = useRef(0);
  const beatIndexRef = useRef(0);
  const lanePressedRef = useRef<boolean[]>([false, false, false, false]);
  const audioPulseRef = useRef(0);

  // Update High Score
  const updateScore = useCallback((newScore: number) => {
    setScore(newScore);
    if (newScore > highScore) {
      setHighScore(newScore);
      try {
        localStorage.setItem('labirinto_cosmicriff_highscore', newScore.toString());
      } catch {}
    }
  }, [highScore]);

  // Create Spark Particles
  const createParticles = (x: number, y: number, color: string, count = 14) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 2;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        color,
      });
    }
  };

  // Handle Note Hit
  const handleHit = useCallback((laneIndex: number) => {
    if (gameState !== 'playing' || isPaused) return;

    const hitZoneCenter = HIT_ZONE_Y + HIT_ZONE_HEIGHT / 2;
    const hitThreshold = 65; // Tolerance

    // Filter notes in lane
    const candidateNotes = notesRef.current.filter(n => n.lane === laneIndex && !n.hit && !n.missed);

    let hitNote: Note | null = null;
    let minDistance = Infinity;

    candidateNotes.forEach(note => {
      const dist = Math.abs(note.y - hitZoneCenter);
      if (dist < hitThreshold && dist < minDistance) {
        minDistance = dist;
        hitNote = note;
      }
    });

    const targetX = (laneIndex * LANE_WIDTH) + LANE_WIDTH / 2;

    if (hitNote) {
      (hitNote as Note).hit = true;
      createParticles(targetX, hitZoneCenter, LANE_COLORS[laneIndex]);

      let points = 0;
      let text = '';
      let color = '#fff';
      let accuracy: 'perfect' | 'great' | 'good' = 'good';

      if (minDistance < 18) {
        points = 100;
        text = 'PERFEITO!';
        color = '#a855f7';
        accuracy = 'perfect';
        statsRef.current.perfect += 1;
        setHealth(h => Math.min(100, h + 5));
      } else if (minDistance < 38) {
        points = 60;
        text = 'EXCELENTE!';
        color = '#22c55e';
        accuracy = 'great';
        statsRef.current.great += 1;
        setHealth(h => Math.min(100, h + 3));
      } else {
        points = 30;
        text = 'BOM';
        color = '#eab308';
        accuracy = 'good';
        statsRef.current.good += 1;
        setHealth(h => Math.min(100, h + 1));
      }

      gameAudio.playRhythmNote(laneIndex, accuracy);

      setStreak(s => {
        const nextStreak = s + 1;
        if (nextStreak > maxStreak) setMaxStreak(nextStreak);

        // Check Star Power trigger at 30 combo
        if (nextStreak >= 30 && !isStarPower) {
          setIsStarPower(true);
          gameAudio.playStarPower();
        }

        const mult = isStarPower ? 4 : Math.min(4, Math.floor(nextStreak / 10) + 1);
        setMultiplier(mult);
        return nextStreak;
      });

      const effectiveMultiplier = isStarPower ? 4 : multiplier;
      updateScore(score + points * effectiveMultiplier);
      setFeedback({ text, color, id: Date.now(), x: targetX, y: hitZoneCenter - 30 });
    } else {
      // Missed key press without note
      gameAudio.playRhythmMiss();
      setStreak(0);
      setIsStarPower(false);
      setMultiplier(1);
      statsRef.current.miss += 1;
      setHealth(h => {
        const nextH = Math.max(0, h - 3);
        if (nextH === 0) {
          setGameState('gameOver');
          gameAudio.playGameOver();
        }
        return nextH;
      });
      setFeedback({ text: 'ERROU!', color: '#ef4444', id: Date.now(), x: targetX, y: hitZoneCenter - 30 });
    }
  }, [gameState, isPaused, multiplier, isStarPower, maxStreak, score, updateScore]);

  // Keyboard Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        setIsPaused(prev => !prev);
        return;
      }
      if (gameState !== 'playing' || isPaused) return;

      const k = e.key.toLowerCase();
      if (k in KEY_TO_LANE) {
        const idx = KEY_TO_LANE[k];
        lanePressedRef.current[idx] = true;
        handleHit(idx);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k in KEY_TO_LANE) {
        const idx = KEY_TO_LANE[k];
        lanePressedRef.current[idx] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, isPaused, handleHit]);

  // Restart / Reset
  const restartGame = useCallback(() => {
    notesRef.current = [];
    particlesRef.current = [];
    statsRef.current = { perfect: 0, great: 0, good: 0, miss: 0 };
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setMultiplier(1);
    setIsStarPower(false);
    setHealth(100);
    setGameState('playing');
    setIsPaused(false);
    setFeedback(null);
    beatIndexRef.current = 0;
    lastBeatTimeRef.current = performance.now();
  }, []);

  // Main Loop
  useEffect(() => {
    let active = true;

    const loop = (time: number) => {
      if (!active) return;

      const canvas = canvasRef.current;
      if (!canvas) {
        gameLoopRef.current = requestAnimationFrame(loop);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (gameState === 'playing' && !isPaused) {
        // 1. Musical Beat Clock
        const beatInterval = (60000 / currentTrack.bpm) / 2; // eighth notes
        if (time - lastBeatTimeRef.current >= beatInterval) {
          lastBeatTimeRef.current = time;
          const beat = beatIndexRef.current++;

          // Riffs for current track - distributes across all 4 colored lanes
          const riffs = TRACK_RIFFS[currentTrack.id] || TRACK_RIFFS.track1;
          const riffIdx = Math.floor((beat / 8) % riffs.length);
          const currentRiff = riffs[riffIdx];
          const step = beat % currentRiff.length;

          // Rhythmic progression based on difficulty
          let shouldSpawn = false;
          if (currentTrack.difficulty === 'Fácil') {
            shouldSpawn = step % 2 === 0 || step === 3 || step === 7;
          } else if (currentTrack.difficulty === 'Médio') {
            shouldSpawn = step % 2 === 0 || step % 3 === 0 || step === 7;
          } else {
            shouldSpawn = step % 2 === 0 || step % 3 !== 1;
          }

          if (shouldSpawn) {
            const lane = currentRiff[step] % LANE_COUNT;
            notesRef.current.push({
              id: Date.now() + Math.random(),
              lane,
              y: -40,
              hit: false,
              missed: false,
              color: LANE_COLORS[lane],
            });

            // Occasional power chord on fast/medium track downbeats
            if (currentTrack.difficulty !== 'Fácil' && (beat % 16 === 0 || (currentTrack.difficulty === 'Difícil' && beat % 8 === 0))) {
              const chordLane = (lane + 2) % LANE_COUNT;
              if (chordLane !== lane) {
                notesRef.current.push({
                  id: Date.now() + Math.random() + 0.5,
                  lane: chordLane,
                  y: -40,
                  hit: false,
                  missed: false,
                  color: LANE_COLORS[chordLane],
                });
              }
            }
          }

          // Check if track completed after ~200 beats (~1.5 minutes)
          if (beat > 220) {
            setGameState('songFinished');
            gameAudio.playVictory();
          }
        }

        // 2. Update Notes
        const speed = currentTrack.noteSpeed + (streak > 25 ? 0.8 : 0);
        notesRef.current.forEach(note => {
          note.y += speed;

          // Miss detection
          if (note.y > CANVAS_HEIGHT - 30 && !note.hit && !note.missed) {
            note.missed = true;
            gameAudio.playRhythmMiss();
            statsRef.current.miss += 1;
            setStreak(0);
            setIsStarPower(false);
            setMultiplier(1);
            setHealth(h => {
              const nextH = Math.max(0, h - 8);
              if (nextH === 0) {
                setGameState('gameOver');
                gameAudio.playGameOver();
              }
              return nextH;
            });
            setFeedback({
              text: 'ERROU!',
              color: '#ef4444',
              id: Date.now(),
              x: (note.lane * LANE_WIDTH) + LANE_WIDTH / 2,
              y: HIT_ZONE_Y,
            });
          }
        });

        // Cleanup notes
        notesRef.current = notesRef.current.filter(n => n.y < CANVAS_HEIGHT + 30 && !n.hit);

        // 3. Update Particles
        particlesRef.current.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.045;
        });
        particlesRef.current = particlesRef.current.filter(p => p.life > 0);

        audioPulseRef.current = (Math.sin(time / 160) + 1) * 8;
      }

      // --- RENDERING CANVAS ---
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Deep Highway Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      bgGrad.addColorStop(0, '#0f051d');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Star Power Golden Highway Effect
      if (isStarPower) {
        ctx.fillStyle = 'rgba(250, 204, 21, 0.08)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      // Draw Lanes & Fret Dividers
      for (let i = 0; i < LANE_COUNT; i++) {
        const x = i * LANE_WIDTH;
        const isPressed = lanePressedRef.current[i];

        // Lane Glow on press
        if (isPressed) {
          const laneGrad = ctx.createLinearGradient(x, 0, x, CANVAS_HEIGHT);
          laneGrad.addColorStop(0, 'rgba(0,0,0,0)');
          laneGrad.addColorStop(1, `${LANE_COLORS[i]}55`);
          ctx.fillStyle = laneGrad;
          ctx.fillRect(x, 0, LANE_WIDTH, CANVAS_HEIGHT);
        }

        // Fret Divider Lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + LANE_WIDTH, 0);
        ctx.lineTo(x + LANE_WIDTH, CANVAS_HEIGHT);
        ctx.stroke();

        // Hit Target Ring
        const targetCenterX = x + LANE_WIDTH / 2;
        const targetCenterY = HIT_ZONE_Y + HIT_ZONE_HEIGHT / 2;

        ctx.save();
        ctx.shadowColor = isPressed ? '#ffffff' : LANE_COLORS[i];
        ctx.shadowBlur = isPressed ? 18 : 8;

        ctx.beginPath();
        ctx.arc(targetCenterX, targetCenterY, NOTE_RADIUS, 0, Math.PI * 2);
        ctx.lineWidth = isPressed ? 4 : 2.5;
        ctx.strokeStyle = isPressed ? '#ffffff' : LANE_COLORS[i];
        ctx.fillStyle = isPressed ? LANE_COLORS[i] : 'rgba(15, 23, 42, 0.6)';
        ctx.fill();
        ctx.stroke();

        // Key Label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(KEY_LABELS[i], targetCenterX, targetCenterY);
        ctx.restore();
      }

      // Horizontal Frets
      for (let fy = 100; fy < CANVAS_HEIGHT - 60; fy += 90) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, fy);
        ctx.lineTo(CANVAS_WIDTH, fy);
        ctx.stroke();
      }

      // Draw Notes
      notesRef.current.forEach(note => {
        if (note.hit) return;
        const nx = (note.lane * LANE_WIDTH) + LANE_WIDTH / 2;

        ctx.save();
        ctx.shadowColor = note.color;
        ctx.shadowBlur = 14;

        // Note Body
        ctx.fillStyle = note.color;
        ctx.beginPath();
        ctx.arc(nx, note.y, NOTE_RADIUS * 0.85, 0, Math.PI * 2);
        ctx.fill();

        // Inner Core Glass Reflection
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(nx - 4, note.y - 4, NOTE_RADIUS * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Particles
      particlesRef.current.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Feedback Popups
      if (feedback && Date.now() - feedback.id < 600) {
        const age = (Date.now() - feedback.id) / 600;
        ctx.save();
        ctx.globalAlpha = 1 - age;
        ctx.fillStyle = feedback.color;
        ctx.shadowColor = feedback.color;
        ctx.shadowBlur = 10;
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(feedback.text, feedback.x, feedback.y - age * 30);
        ctx.restore();
      }

      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);
    return () => {
      active = false;
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameState, isPaused, currentTrack, streak, isStarPower, feedback]);

  // Touch / Pointer Handling for Mobile Frets
  const handleTouchStart = (lane: number) => {
    lanePressedRef.current[lane] = true;
    handleHit(lane);
  };

  const handleTouchEnd = (lane: number) => {
    lanePressedRef.current[lane] = false;
  };

  // Direct highway canvas tapping
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing' || isPaused) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const scaleX = CANVAS_WIDTH / rect.width;
    const canvasX = clientX * scaleX;
    const lane = Math.min(3, Math.max(0, Math.floor(canvasX / LANE_WIDTH)));
    lanePressedRef.current[lane] = true;
    handleHit(lane);
    setTimeout(() => {
      lanePressedRef.current[lane] = false;
    }, 140);
  };

  const totalHits = statsRef.current.perfect + statsRef.current.great + statsRef.current.good;
  const totalNotes = totalHits + statsRef.current.miss;
  const accuracyPercent = totalNotes > 0 ? ((totalHits / totalNotes) * 100).toFixed(1) : '100.0';

  return (
    <div className="flex flex-col items-center select-none text-white w-full max-w-md mx-auto">
      {/* HUD Header */}
      <div className="w-full flex items-center justify-between px-2 mb-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold font-mono tracking-tight text-white">{score}</span>
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isStarPower ? 'bg-yellow-400 text-black animate-pulse' : 'bg-purple-500/20 text-purple-300'}`}>
              {multiplier}X {isStarPower ? 'OVERDRIVE!' : ''}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">RECORDE: {highScore}</span>
        </div>

        {/* Rock Meter */}
        <div className="flex flex-col items-center w-28">
          <div className="flex justify-between w-full text-[10px] font-mono text-slate-400 mb-0.5">
            <span>ROCK METER</span>
            <span>{health}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-200 ${
                health > 50 ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : health > 25 ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'
              }`}
              style={{ width: `${health}%` }}
            />
          </div>
          <span className="text-[10px] text-purple-300 mt-0.5 font-medium">{currentTrack.title}</span>
        </div>

        <div className="flex items-center gap-1.5">
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
      <div className="relative w-full aspect-[42/58] rounded-xl overflow-hidden border border-purple-500/30 shadow-lg shadow-purple-900/20 touch-none">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full block bg-slate-950 cursor-pointer touch-none"
          onPointerDown={handleCanvasPointerDown}
        />

        {/* Game Over Screen */}
        {gameState === 'gameOver' && (
          <div className="game-overlay absolute inset-0 bg-black/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <h3 className="text-3xl font-bold text-red-500 mb-1">Show Cancelado!</h3>
            <p className="text-sm text-slate-300 mb-4">{playerName}, a plateia desanimou!</p>

            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 w-full max-w-xs mb-5 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Pontuação</span>
                <span className="font-bold text-white font-mono">{score}</span>
              </div>
              <div className="flex justify-between border-t border-slate-700/60 pt-1">
                <span className="text-slate-400">Maior Sequência</span>
                <span className="font-bold text-yellow-400 font-mono">{maxStreak}x</span>
              </div>
              <div className="flex justify-between border-t border-slate-700/60 pt-1">
                <span className="text-slate-400">Precisão Rock</span>
                <span className="font-bold text-purple-300 font-mono">{accuracyPercent}%</span>
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
                onClick={restartGame}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg text-sm font-bold shadow-lg transition-transform active:scale-95"
              >
                Tentar de Novo
              </button>
            </div>
          </div>
        )}

        {/* Victory Screen */}
        {gameState === 'songFinished' && (
          <div className="game-overlay absolute inset-0 bg-black/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <span className="text-4xl mb-1">⭐ ⭐ ⭐ ⭐ ⭐</span>
            <h3 className="text-2xl font-bold text-yellow-400 mb-1">Show Histórico!</h3>
            <p className="text-sm text-slate-300 mb-4">{playerName}, você eletrizou o cosmo!</p>

            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 w-full max-w-xs mb-5 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Pontuação Final</span>
                <span className="font-bold text-white font-mono">{score}</span>
              </div>
              <div className="flex justify-between border-t border-slate-700/60 pt-1">
                <span className="text-slate-400">Precisão Acústica</span>
                <span className="font-bold text-green-400 font-mono">{accuracyPercent}%</span>
              </div>
              <div className="flex justify-between border-t border-slate-700/60 pt-1">
                <span className="text-slate-400">Maior Combo</span>
                <span className="font-bold text-yellow-400 font-mono">{maxStreak}</span>
              </div>
            </div>

            <div className="flex gap-3 w-full max-w-xs">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-semibold transition-colors"
              >
                Concluir
              </button>
              <button
                onClick={restartGame}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-green-600 to-purple-600 hover:from-green-500 hover:to-purple-500 rounded-lg text-sm font-bold shadow-lg transition-transform active:scale-95"
              >
                Bis! (Tocar Novamente)
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
              className="py-2 px-6 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-bold shadow transition-transform active:scale-95"
            >
              Continuar
            </button>
          </div>
        )}
      </div>

      {/* Ergonomic 4-Lane Touch Buttons for Mobile */}
      <div className="w-full mt-3 grid grid-cols-4 gap-2 px-1 touch-none">
        {LANE_COLORS.map((col, idx) => (
          <button
            key={idx}
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              handleTouchStart(idx);
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              handleTouchEnd(idx);
            }}
            onPointerLeave={() => handleTouchEnd(idx)}
            onPointerCancel={() => handleTouchEnd(idx)}
            className="h-14 rounded-xl border flex flex-col items-center justify-center active:scale-95 transition-transform shadow-lg font-bold select-none cursor-pointer touch-none"
            style={{
              backgroundColor: `${col}25`,
              borderColor: col,
              color: col,
            }}
          >
            <span className="text-lg">{KEY_LABELS[idx]}</span>
            <span className="text-[10px] text-slate-300 font-mono">NOTA</span>
          </button>
        ))}
      </div>

      {/* Track Selector & Help */}
      <div className="w-full flex items-center justify-between mt-3 px-1">
        <span className="text-xs text-slate-400">Faixa:</span>
        <div className="flex gap-1.5">
          {TRACKS.map((trk, i) => (
            <button
              key={trk.id}
              onClick={() => {
                setSelectedTrackIndex(i);
                restartGame();
              }}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                selectedTrackIndex === i ? 'bg-purple-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {trk.difficulty}
            </button>
          ))}
        </div>
      </div>

      <div className="text-[11px] text-slate-400 text-center mt-2">
        Teclas: <span className="text-slate-200 font-semibold">D, F, J, K</span> ou <span className="text-slate-200 font-semibold">1, 2, 3, 4</span> · Toque nos botões ou na tela!
      </div>
    </div>
  );
};

export default CosmicRiffGame;
