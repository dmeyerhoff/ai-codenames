import { useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { runGame, stopGame } from '../engine/orchestrator';

export function useGameLoop() {
  const isRunning = useGameStore(s => s.isRunning);
  const phase = useGameStore(s => s.phase);
  const winner = useGameStore(s => s.winner);
  const newGame = useGameStore(s => s.newGame);

  const start = useCallback(() => {
    if (winner) {
      newGame();
      setTimeout(runGame, 100);
    } else {
      runGame();
    }
  }, [winner, newGame]);

  const stop = useCallback(() => {
    stopGame();
  }, []);

  const restart = useCallback(() => {
    stopGame();
    newGame();
    setTimeout(runGame, 100);
  }, [newGame]);

  return { isRunning, phase, winner, start, stop, restart };
}
