import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

export default function ScoreBar() {
  const blueScore = useGameStore(s => s.blueScore);
  const redScore = useGameStore(s => s.redScore);
  const blueTotal = useGameStore(s => s.blueTotal);
  const redTotal = useGameStore(s => s.redTotal);
  const currentClue = useGameStore(s => s.currentClue);
  const currentTeam = useGameStore(s => s.currentTeam);

  return (
    <div className="flex items-center gap-4 px-4 py-2.5 bg-white/40 rounded-xl mx-1 mb-1 border border-[#D4CDB8] min-h-[60px]">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[#3B7DD8] font-display text-sm">BLUE</span>
          <span className="text-[#3B7DD8] text-sm font-bold">{blueScore}/{blueTotal}</span>
        </div>
        <div className="h-2 bg-[#E8E0D0] rounded-full overflow-hidden border border-[#D4CDB8]">
          <motion.div
            className="h-full bg-[#3B7DD8] rounded-full"
            animate={{ width: `${(blueScore / blueTotal) * 100}%` }}
            transition={{ type: 'spring', stiffness: 100 }}
          />
        </div>
      </div>

      <div className="flex-shrink-0 flex items-center justify-center min-w-[60px]">
        <AnimatePresence mode="popLayout">
          {currentClue ? (
            <motion.div
              key="clue"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className={`px-4 py-1 rounded-full font-black text-xs sm:text-sm tracking-widest shadow-md whitespace-nowrap border-2 font-display ${currentTeam === 'blue'
                  ? 'bg-[#3B7DD8] text-white border-[#2B5EA0]'
                  : 'bg-[#D94F3B] text-white border-[#B33A28]'
                }`}
            >
              {currentClue.word}: {currentClue.number}
            </motion.div>
          ) : (
            <motion.div
              key="vs"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="text-[#B8A880] font-display text-lg"
            >
              VS
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[#D94F3B] font-display text-sm">RED</span>
          <span className="text-[#D94F3B] text-sm font-bold">{redScore}/{redTotal}</span>
        </div>
        <div className="h-2 bg-[#E8E0D0] rounded-full overflow-hidden border border-[#D4CDB8]">
          <motion.div
            className="h-full bg-[#D94F3B] rounded-full"
            animate={{ width: `${(redScore / redTotal) * 100}%` }}
            transition={{ type: 'spring', stiffness: 100 }}
          />
        </div>
      </div>
    </div>
  );
}
