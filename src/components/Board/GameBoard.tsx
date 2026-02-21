import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import Card from './Card';

export default function GameBoard() {
  const board = useGameStore(s => s.board);
  const phase = useGameStore(s => s.phase);
  const isVideoMode = useGameStore(s => s.isVideoMode);
  const [scannedIndex, setScannedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!isVideoMode) {
      setScannedIndex(null);
      return;
    }

    if (phase === 'spymaster_thinking') {
      const interval = setInterval(() => {
        const unrevealed = board.map((c, i) => ({ ...c, originalIndex: i })).filter(c => !c.revealed);
        if (unrevealed.length > 0) {
          if (Math.random() < 0.2) {
            setScannedIndex(null);
          } else {
            const randomObj = unrevealed[Math.floor(Math.random() * unrevealed.length)];
            setScannedIndex(randomObj.originalIndex);
          }
        } else {
          setScannedIndex(null);
        }
      }, 700);
      return () => clearInterval(interval);
    } else {
      setScannedIndex(null);
    }
  }, [phase, isVideoMode, board]);

  return (
    <div className="w-full h-full max-w-4xl flex items-center justify-center mx-auto min-h-0 min-w-0">
      <div className="grid grid-cols-5 grid-rows-5 gap-1.5 sm:gap-2.5 h-full max-w-full aspect-[4/3] auto-rows-fr w-full sm:w-auto">
        {board.map((card, i) => (
          <Card key={card.word} card={card} isScanned={scannedIndex === i} />
        ))}
      </div>
    </div>
  );
}
