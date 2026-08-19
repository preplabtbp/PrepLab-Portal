import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Trophy, Play, RotateCcw, Beaker, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from './ui';

interface EasterEggGameProps {
  onClose: () => void;
}

const GRID_SIZE = 20;
const INITIAL_SPEED = 150;

type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const generateFood = (snake: Point[]): Point => {
  let newFood: Point;
  while (true) {
    newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    // Ensure food doesn't spawn on the snake
    const isOnSnake = snake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
    if (!isOnSnake) break;
  }
  return newFood;
};

export const EasterEggGame: React.FC<EasterEggGameProps> = ({ onClose }) => {
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Point>({ x: 15, y: 10 });
  const [dir, setDir] = useState<Direction>('RIGHT');
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [score, setScore] = useState(0);
  const [highScore, setHighscore] = useState(() => {
    return parseInt(localStorage.getItem('lab_snake_highscore') || '0', 10);
  });

  const dirRef = useRef<Direction>(dir);

  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setFood(generateFood([{ x: 10, y: 10 }]));
    setDir('RIGHT');
    dirRef.current = 'RIGHT';
    setScore(0);
    setIsGameOver(false);
    setIsPaused(false);
  };

  const changeDirection = useCallback((newDir: Direction) => {
    if (newDir === 'UP' && dirRef.current !== 'DOWN') dirRef.current = 'UP';
    if (newDir === 'DOWN' && dirRef.current !== 'UP') dirRef.current = 'DOWN';
    if (newDir === 'LEFT' && dirRef.current !== 'RIGHT') dirRef.current = 'LEFT';
    if (newDir === 'RIGHT' && dirRef.current !== 'LEFT') dirRef.current = 'RIGHT';
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for arrow keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
      
      switch (e.key) {
        case 'ArrowUp': changeDirection('UP'); break;
        case 'ArrowDown': changeDirection('DOWN'); break;
        case 'ArrowLeft': changeDirection('LEFT'); break;
        case 'ArrowRight': changeDirection('RIGHT'); break;
        case ' ':
        case 'Enter':
          if (isGameOver) resetGame();
          else setIsPaused(prev => !prev);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeDirection, isGameOver]);

  useEffect(() => {
    if (isPaused || isGameOver) return;

    const moveSnake = () => {
      setSnake(prev => {
        const head = prev[0];
        const newHead = { ...head };

        setDir(dirRef.current);
        
        switch (dirRef.current) {
          case 'UP': newHead.y -= 1; break;
          case 'DOWN': newHead.y += 1; break;
          case 'LEFT': newHead.x -= 1; break;
          case 'RIGHT': newHead.x += 1; break;
        }

        // Check Wall Collision
        if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
          setIsGameOver(true);
          return prev;
        }

        // Check Self Collision
        if (prev.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
          setIsGameOver(true);
          return prev;
        }

        const newSnake = [newHead, ...prev];

        // Check Food Collision
        if (newHead.x === food.x && newHead.y === food.y) {
          setScore(s => {
            const newScore = s + 10;
            if (newScore > highScore) {
              setHighscore(newScore);
              localStorage.setItem('lab_snake_highscore', newScore.toString());
            }
            return newScore;
          });
          setFood(generateFood(newSnake));
        } else {
          newSnake.pop(); // Remove tail if no food eaten
        }

        return newSnake;
      });
    };

    // Calculate speed based on score (gets faster)
    const currentSpeed = Math.max(50, INITIAL_SPEED - Math.floor(score / 30) * 10);
    const interval = setInterval(moveSnake, currentSpeed);
    return () => clearInterval(interval);
  }, [isPaused, isGameOver, food, score, highScore]);

  // Touch handlers for mobile swipe
  const touchStartRef = useRef<{ x: number, y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    
    // Prevent default to stop scrolling while swiping on the game board
    if (e.cancelable) e.preventDefault();
    
    const touchEndX = e.touches[0].clientX;
    const touchEndY = e.touches[0].clientY;
    
    const dx = touchEndX - touchStartRef.current.x;
    const dy = touchEndY - touchStartRef.current.y;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > 30) {
        changeDirection(dx > 0 ? 'RIGHT' : 'LEFT');
        touchStartRef.current = null;
      }
    } else {
      if (Math.abs(dy) > 30) {
        changeDirection(dy > 0 ? 'DOWN' : 'UP');
        touchStartRef.current = null;
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-800 border border-slate-700 rounded-3xl p-6 shadow-2xl w-full max-w-sm sm:max-w-md relative flex flex-col items-center"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-700/50 p-2 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6 w-full">
          <h2 className="text-2xl font-display font-bold text-teal-400 flex items-center justify-center gap-2">
            <Beaker className="w-6 h-6" /> Lab Snake
          </h2>
          <div className="flex justify-between items-center mt-4 px-4 bg-slate-700/50 py-2 rounded-xl border border-slate-600/50">
            <div className="text-slate-300 font-mono">Score: <span className="text-white font-bold">{score}</span></div>
            <div className="text-slate-300 font-mono flex items-center gap-1">
              <Trophy className="w-4 h-4 text-amber-400" /> <span className="text-white font-bold">{highScore}</span>
            </div>
          </div>
        </div>

        {/* Game Board */}
        <div 
          className="relative bg-slate-900 border-2 border-slate-700 rounded-xl overflow-hidden w-full aspect-square touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => touchStartRef.current = null}
        >
          {/* Grid Background */}
          <div 
            className="absolute inset-0 opacity-10 pointer-events-none" 
            style={{ 
              backgroundImage: 'linear-gradient(to right, #475569 1px, transparent 1px), linear-gradient(to bottom, #475569 1px, transparent 1px)',
              backgroundSize: `${100/GRID_SIZE}% ${100/GRID_SIZE}%`
            }} 
          />

          {/* Snake */}
          {snake.map((segment, index) => {
            const isHead = index === 0;
            return (
              <div
                key={`${segment.x}-${segment.y}-${index}`}
                className={`absolute rounded-sm transition-all duration-75 ${isHead ? 'bg-teal-400 z-10' : 'bg-teal-500/80 z-0'}`}
                style={{
                  width: `${100 / GRID_SIZE}%`,
                  height: `${100 / GRID_SIZE}%`,
                  left: `${(segment.x / GRID_SIZE) * 100}%`,
                  top: `${(segment.y / GRID_SIZE) * 100}%`,
                }}
              >
                {isHead && (
                  <div className="w-full h-full relative">
                    <div className="absolute w-1 h-1 bg-slate-900 rounded-full top-1 left-1" />
                    <div className="absolute w-1 h-1 bg-slate-900 rounded-full top-1 right-1" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Food */}
          <div
            className="absolute flex items-center justify-center z-0 animate-pulse"
            style={{
              width: `${100 / GRID_SIZE}%`,
              height: `${100 / GRID_SIZE}%`,
              left: `${(food.x / GRID_SIZE) * 100}%`,
              top: `${(food.y / GRID_SIZE) * 100}%`,
            }}
          >
            <div className="w-3/4 h-3/4 bg-amber-400 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
          </div>

          {/* Overlays */}
          {isGameOver && (
            <div className="absolute inset-0 bg-rose-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
              <h3 className="text-3xl font-bold text-white mb-2 font-display">GAME OVER</h3>
              <p className="text-rose-200 mb-6 font-mono">Final Score: {score}</p>
              <Button onClick={resetGame} variant="primary" className="bg-white text-rose-900 hover:bg-slate-100 font-bold gap-2">
                <RotateCcw className="w-4 h-4" /> Try Again
              </Button>
            </div>
          )}

          {isPaused && !isGameOver && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
              <Button onClick={() => setIsPaused(false)} variant="primary" className="bg-teal-500 hover:bg-teal-400 font-bold gap-2 text-white px-8 py-4 rounded-full shadow-[0_0_20px_rgba(20,184,166,0.4)]">
                <Play className="w-5 h-5 fill-current" /> PLAY
              </Button>
              <p className="text-slate-400 mt-4 text-sm max-w-[200px] text-center">Swipe or use Arrow Keys to move</p>
            </div>
          )}
        </div>

        {/* Mobile D-Pad Controls */}
        <div className="mt-6 grid grid-cols-3 gap-2 w-48 sm:hidden">
          <div />
          <button onClick={() => changeDirection('UP')} className="bg-slate-700/50 hover:bg-slate-600 p-4 rounded-xl flex items-center justify-center active:scale-95 transition-transform"><ArrowUp className="w-6 h-6 text-white" /></button>
          <div />
          <button onClick={() => changeDirection('LEFT')} className="bg-slate-700/50 hover:bg-slate-600 p-4 rounded-xl flex items-center justify-center active:scale-95 transition-transform"><ArrowLeft className="w-6 h-6 text-white" /></button>
          <button onClick={() => changeDirection('DOWN')} className="bg-slate-700/50 hover:bg-slate-600 p-4 rounded-xl flex items-center justify-center active:scale-95 transition-transform"><ArrowDown className="w-6 h-6 text-white" /></button>
          <button onClick={() => changeDirection('RIGHT')} className="bg-slate-700/50 hover:bg-slate-600 p-4 rounded-xl flex items-center justify-center active:scale-95 transition-transform"><ArrowRight className="w-6 h-6 text-white" /></button>
        </div>

      </motion.div>
    </div>
  );
};
