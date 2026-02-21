import Header from './components/Layout/Header';
import GameBoard from './components/Board/GameBoard';
import ScoreBar from './components/Board/ScoreBar';
import PlayerPanel from './components/Players/PlayerPanel';
import MasterPanel from './components/Players/MasterPanel';
import ChatPanel from './components/Chat/ChatPanel';
import GameControls from './components/Controls/GameControls';
import CinematicOverlay from './components/Game/CinematicOverlay';
import ComponentShowcase from './components/Showcase/ComponentShowcase';
import { useGameStore } from './store/gameStore';
import { runGame, stopGame } from './engine/orchestrator';
import { runReplay, stopReplay } from './engine/replayOrchestrator';
import { runPromo, stopPromo } from './engine/promoOrchestrator';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

// Check for showcase mode via URL param
const isShowcaseMode = new URLSearchParams(window.location.search).get('showcase') === 'true';

export default function App() {
  if (isShowcaseMode) return <ComponentShowcase />;

  const winner = useGameStore(s => s.winner);
  const currentTeam = useGameStore(s => s.currentTeam);
  const phase = useGameStore(s => s.phase);
  const newGame = useGameStore(s => s.newGame);
  const messages = useGameStore(s => s.messages);
  const clearWinner = useGameStore(s => s.clearWinner);
  const isVideoMode = useGameStore(s => s.isVideoMode);
  const isFooterHidden = useGameStore(s => s.isFooterHidden);
  const toggleFooterHidden = useGameStore(s => s.toggleFooterHidden);
  const [isChatOpen, setIsChatOpen] = useState(!isVideoMode);

  // Auto-start promo mode from URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('promo') === 'true') {
      setTimeout(runPromo, 500);
    }
  }, []);

  // Global Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        const state = useGameStore.getState();
        if (state.isRunning) {
          state.promoMode ? stopPromo() : state.playbackMode ? stopReplay() : stopGame();
        } else {
          if (state.winner) {
            state.newGame();
            setTimeout(runGame, 100);
          } else {
            state.playbackMode ? runReplay() : runGame();
          }
        }
      } else if (e.key === 'p') {
        const state = useGameStore.getState();
        if (!state.isRunning) {
          runPromo();
        }
      } else if (e.code === 'Escape' || e.key === 'q') {
        stopPromo();
        stopGame();
        stopReplay();
        setTimeout(() => useGameStore.getState().newGame(), 100);
      } else if (e.key === 'f') {
        toggleFooterHidden();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleFooterHidden]);

  // Keep chat closed in video mode (subtitles handled by CinematicOverlay)
  useEffect(() => {
    if (isVideoMode) {
      setIsChatOpen(false);
    }
  }, [isVideoMode]);

  // Derive ambient background state classes
  const ambientBgClass = phase === 'setup' || phase === 'game_over'
    ? 'bg-transparent'
    : currentTeam === 'blue'
      ? 'bg-ambient-blue'
      : 'bg-ambient-red';

  const phaseStateClass = phase.includes('thinking')
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
      <CinematicOverlay />
      {/* Ambient Full-screen Overlay */}
      <div className={`absolute inset-0 pointer-events-none transition-colors duration-1000 z-0 ${ambientBgClass}`} />

      {/* Cinematic Vignette */}
      {isVideoMode && (
        <div className="absolute inset-0 pointer-events-none z-[40] shadow-[inset_0_0_200px_rgba(0,0,0,0.8)]" />
      )}

      {!isVideoMode && (
        <div className="relative z-10 flex-none">
          <Header />
        </div>
      )}

      <div className="flex-1 flex gap-3 px-3 pb-3 min-h-0 pt-3 relative z-10 overflow-hidden">
        {/* Left sidebar - Blue Team (hidden in video mode, overlay handles it) */}
        {!isVideoMode && (
          <div className="w-48 h-full relative p-1 -m-1 flex-shrink-0 flex flex-col gap-3 z-20 hidden md:flex">
            <PlayerPanel team="blue" />
            <MasterPanel />
          </div>
        )}

        {/* Center - Board */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
          <div className="flex-none">
            <ScoreBar />
          </div>

          <div className="flex-1 min-h-0 flex items-center justify-center p-2 sm:p-4 overflow-y-auto scrollbar-thin">
            <GameBoard />
          </div>

          {/* Legacy ghost clue removed in favor of CinematicOverlay */}

          {!isFooterHidden && (
            <div className="flex-none mt-auto pt-2 z-10 w-full max-w-4xl mx-auto">
              <GameControls />
            </div>
          )}
        </div>

        {/* Right sidebar - Red Team (hidden in video mode, overlay handles it) */}
        {!isVideoMode && (
          <div className="w-48 h-full relative p-1 -m-1 flex-shrink-0 flex flex-col gap-3 z-20 hidden md:flex">
            <PlayerPanel team="red" />
          </div>
        )}

        {/* Chat Panel - hidden entirely in video mode (subtitles handled by CinematicOverlay) */}
        {!isVideoMode && (
          <>
            <AnimatePresence initial={false}>
              {isChatOpen && (
                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 50, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="absolute z-30 flex flex-col min-h-0 overflow-hidden right-5 bottom-20 w-80 h-[28rem] bg-white/90 border border-[#D4CDB8] shadow-lg rounded-xl"
                >
                  <ChatPanel />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Floating Chat Toggle */}
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="absolute bottom-5 right-5 z-50 bg-white/95 hover:bg-white text-[#3A3428] font-bold py-2 px-4 rounded-xl border border-[#D4CDB8] shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
              title="Toggle Chat"
            >
              {isChatOpen ? '💬 Hide Chat' : '💬 Show Chat'}
            </button>
          </>
        )}
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
                <button
                  onClick={clearWinner}
                  className="w-full py-2 font-bold text-[#8C7F6A]/60 hover:text-[#8C7F6A] transition-colors text-sm uppercase tracking-widest mt-2"
                >
                  Close Overlay
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
