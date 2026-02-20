import Header from './components/Layout/Header';
import GameBoard from './components/Board/GameBoard';
import ScoreBar from './components/Board/ScoreBar';
import PlayerPanel from './components/Players/PlayerPanel';
import ChatPanel from './components/Chat/ChatPanel';
import GameControls from './components/Controls/GameControls';
import { useGameStore } from './store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export default function App() {
  const winner = useGameStore(s => s.winner);
  const currentClue = useGameStore(s => s.currentClue);
  const currentTeam = useGameStore(s => s.currentTeam);
  const phase = useGameStore(s => s.phase);
  const newGame = useGameStore(s => s.newGame);
  const messages = useGameStore(s => s.messages);
  const [isChatOpen, setIsChatOpen] = useState(true);

  // Derive ambient background state classes
  const ambientBgClass = phase === 'setup' || phase === 'game_over'
    ? 'bg-transparent'
    : currentTeam === 'blue'
      ? 'bg-ambient-blue'
      : 'bg-ambient-red';

  const phaseStateClass = phase.includes('thinking') || phase.includes('reflecting')
    ? 'state-thinking'
    : phase.includes('conversation') || phase === 'guess_reactions'
      ? 'state-chatting'
      : phase === 'guessing'
        ? 'state-guessing'
        : phase === 'clue_reveal'
          ? 'state-clue'
          : '';

  const handleExportLog = () => {
    const logText = messages.map(m => `[${m.team.toUpperCase()} - ${m.type.toUpperCase()}] ${m.playerName}: ${m.content}`).join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `match-log-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestart = () => {
    newGame();
  };

  return (
    <div className={`h-screen table-bg text-[#3A3428] flex flex-col overflow-hidden relative ${phaseStateClass}`} style={{ fontFamily: "'Nunito', sans-serif" }}>
      {/* Ambient Full-screen Overlay */}
      <div className={`absolute inset-0 pointer-events-none transition-colors duration-1000 z-0 ${ambientBgClass}`} />

      <div className="relative z-10 flex-none">
        <Header />
      </div>

      <div className="flex-1 flex gap-3 px-3 pb-3 min-h-0 pt-3 relative z-10">
        {/* Left sidebar - Teams */}
        <div className="w-48 flex-shrink-0 flex flex-col gap-3 h-full relative z-20 hidden md:flex p-1 -m-1">
          <PlayerPanel team="blue" />
          <PlayerPanel team="red" />
        </div>

        {/* Center - Board */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
          <div className="flex-none">
            <ScoreBar />
          </div>

          <div className="flex-1 min-h-0 flex items-center justify-center p-2 sm:p-4 overflow-y-auto scrollbar-thin">
            <GameBoard />
          </div>

          {/* Current Clue Display */}
          <AnimatePresence>
            {currentClue && (
              <>
                {/* Ghost Clue in center */}
                <motion.div
                  key="ghost-clue"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0.5, 1.5, 1.8]
                  }}
                  transition={{ duration: 2, ease: "easeOut", times: [0, 0.15, 1] }}
                  className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
                >
                  <span className={`
                    inline-block px-12 py-6 rounded-full font-black text-4xl sm:text-6xl tracking-widest shadow-2xl font-display
                    ${currentTeam === 'blue'
                      ? 'bg-[#3B7DD8] text-white border-4 border-[#2B5EA0]'
                      : 'bg-[#D94F3B] text-white border-4 border-[#B33A28]'
                    }
                  `}>
                    {currentClue.word}: {currentClue.number}
                  </span>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <div className="flex-none mt-auto pt-2 z-10">
            <GameControls />
          </div>
        </div>

        {/* Right sidebar - Chat */}
        <AnimatePresence initial={false}>
          {isChatOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0, marginLeft: 0 }}
              animate={{ width: 'clamp(18rem, 24rem, 24rem)', opacity: 1, marginLeft: 12 }}
              exit={{ width: 0, opacity: 0, marginLeft: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="flex-shrink-0 bg-white/70 rounded-xl border border-[#D4CDB8] shadow-sm flex flex-col min-h-0 overflow-hidden"
            >
              <div className="w-72 lg:w-96 flex flex-col h-full">
                <ChatPanel />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Chat Toggle */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="absolute bottom-5 right-5 z-50 bg-white/95 hover:bg-white text-[#3A3428] font-bold py-2.5 px-5 rounded-xl border border-[#D4CDB8] shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
        >
          {isChatOpen ? 'Hide Chat ➡' : '⬅ Show Chat'}
        </button>
      </div>

      {/* Winner overlay */}
      <AnimatePresence>
        {winner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.3, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className={`
                text-center p-12 rounded-3xl shadow-2xl bg-white max-w-md w-full mx-4
                ${winner === 'blue'
                  ? 'border-4 border-[#3B7DD8]'
                  : 'border-4 border-[#D94F3B]'
                }
              `}
            >
              <div className="text-6xl mb-4 animate-bounce">🏆</div>
              <h2 className={`text-4xl font-display ${winner === 'blue' ? 'text-[#3B7DD8]' : 'text-[#D94F3B]'}`}>
                {winner.toUpperCase()} TEAM WINS!
              </h2>
              <p className="text-[#8C7F6A] mt-2 text-lg mb-8">What a match! Analyze the log or play again.</p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleRestart}
                  className="w-full py-4 rounded-xl font-bold tracking-wider text-white shadow-md transition-transform hover:scale-105 active:scale-95 text-lg"
                  style={{ backgroundColor: winner === 'blue' ? '#3B7DD8' : '#D94F3B' }}
                >
                  PLAY AGAIN
                </button>
                <button
                  onClick={handleExportLog}
                  className="w-full py-3 rounded-xl font-bold text-[#8C7F6A] bg-[#E8E0D0] hover:bg-[#D4CDB8] transition-colors"
                >
                  EXPORT MATCH LOG
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
