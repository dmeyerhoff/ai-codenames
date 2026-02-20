import { useGameStore } from '../../store/gameStore';
import Card from './Card';

export default function GameBoard() {
  const board = useGameStore(s => s.board);

  return (
    <div className="w-full h-full max-w-4xl flex items-center justify-center mx-auto min-h-0 min-w-0">
      <div className="grid grid-cols-5 grid-rows-5 gap-1.5 sm:gap-2.5 h-full max-w-full aspect-[4/3] auto-rows-fr w-full sm:w-auto">
        {board.map((card) => (
          <Card key={card.word} card={card} />
        ))}
      </div>
    </div>
  );
}
