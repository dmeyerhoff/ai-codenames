import { useGameStore } from '../../store/gameStore';
import { motion } from 'framer-motion';

const PHASE_LABELS: Record<string, string> = {
  setup: 'Ready to Play',
  spymaster_thinking: 'Spymaster Thinking...',
  clue_reveal: 'Clue Revealed!',
  operatives_reflecting: 'Operatives Reflecting...',
  team_conversation: 'Team Discussion',
  guessing: 'Guessing Phase',
  guess_reactions: 'Reactions',
  switch_team: 'Switching Teams...',
  game_over: 'Game Over!',
};

export default function Header() {
  const currentTeam = useGameStore(s => s.currentTeam);
  const roundNumber = useGameStore(s => s.roundNumber);
  const winner = useGameStore(s => s.winner);
  const phase = useGameStore(s => s.phase);

  return (
    <header className="text-center py-3 px-4 bg-white/40 border-b border-[#D4CDB8] flex-none">
      <div className="flex items-center justify-center gap-4">
        <h1 className="text-xl font-display tracking-wide">
          <span className="text-[#D94F3B]">AI</span>
          <span className="text-[#3A3428]"> CODENAMES</span>
        </h1>

        <div className="h-5 w-px bg-[#D4CDB8]" />

        <p className="text-[#8C7F6A] text-xs">
          {winner ? (
            <span className={`font-bold ${winner === 'blue' ? 'text-[#3B7DD8]' : 'text-[#D94F3B]'}`}>
              {winner.toUpperCase()} TEAM WINS!
            </span>
          ) : (
            <>
              <span className="text-[#B8A880] font-semibold">R{roundNumber}</span>
              {' · '}
              <span className={`font-bold ${currentTeam === 'blue' ? 'text-[#3B7DD8]' : 'text-[#D94F3B]'}`}>
                {currentTeam.toUpperCase()}
              </span>
            </>
          )}
        </p>

        <div className="h-5 w-px bg-[#D4CDB8]" />

        <motion.span
          key={phase}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[10px] text-[#B8A880] font-semibold uppercase tracking-widest"
        >
          {PHASE_LABELS[phase] || phase}
        </motion.span>
      </div>
    </header>
  );
}
