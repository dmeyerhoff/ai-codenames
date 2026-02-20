import { useGameStore } from '../../store/gameStore';
import { runGame, stopGame } from '../../engine/orchestrator';

export default function GameControls() {
  const isRunning = useGameStore(s => s.isRunning);
  const phase = useGameStore(s => s.phase);
  const speed = useGameStore(s => s.speed);
  const ttsEnabled = useGameStore(s => s.ttsEnabled);
  const thinkingPhaseEnabled = useGameStore(s => s.thinkingPhaseEnabled);
  const winner = useGameStore(s => s.winner);
  const isRevealedMode = useGameStore(s => s.isRevealedMode);
  const toggleRevealedMode = useGameStore(s => s.toggleRevealedMode);
  const setSpeed = useGameStore(s => s.setSpeed);
  const setTtsEnabled = useGameStore(s => s.setTtsEnabled);
  const setThinkingPhaseEnabled = useGameStore(s => s.setThinkingPhaseEnabled);
  const newGame = useGameStore(s => s.newGame);
  const messages = useGameStore(s => s.messages);

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

  const handleStart = () => {
    if (winner) {
      newGame();
      setTimeout(runGame, 100);
    } else {
      runGame();
    }
  };

  const handlePause = () => {
    stopGame();
  };

  const handleQuit = () => {
    stopGame();
    setTimeout(() => newGame(), 100);
  };

  const handleToggleReveal = () => {
    if (!isRevealedMode) {
      const confirm = window.confirm("👁️ Are you sure you want to reveal the cards? This will degrade your experience if you are playing along!");
      if (!confirm) return;
    }
    toggleRevealedMode();
  };

  const isGameStarted = phase !== 'setup' && !winner;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white/50 rounded-xl border border-[#D4CDB8] shadow-sm">
      {/* Play/Pause */}
      {!isRunning ? (
        <button
          onClick={handleStart}
          className="px-4 py-2 bg-[#4A9B5A] hover:bg-[#3D8A4D] text-white rounded-lg font-bold text-sm transition-colors shadow-sm"
        >
          {winner ? '🔄 New Game' : isGameStarted ? '▶ Resume' : '▶ Start'}
        </button>
      ) : (
        <button
          onClick={handlePause}
          className="px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-white rounded-lg font-bold text-sm transition-colors shadow-sm"
        >
          ⏸ Pause
        </button>
      )}

      {/* Quit */}
      {isGameStarted && (
        <button
          onClick={handleQuit}
          className="px-3 py-2 bg-[#D94F3B] hover:bg-[#C4422F] text-white rounded-lg font-bold text-sm transition-colors shadow-sm"
        >
          ⏹ Quit
        </button>
      )}

      {/* Speed */}
      <div className="flex items-center gap-1">
        {[1, 1.5, 2, 3].map(s => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`px-2 py-1 rounded text-xs font-bold transition-colors ${speed === s
              ? 'bg-[#3B7DD8] text-white'
              : 'bg-[#E8E0D0] text-[#8C7F6A] hover:bg-[#D4CDB8]'
              }`}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* TTS Toggle */}
      <button
        onClick={() => setTtsEnabled(!ttsEnabled)}
        className={`px-3 py-1 rounded text-xs font-bold transition-colors ${ttsEnabled
          ? 'bg-[#7C5BBF] text-white'
          : 'bg-[#E8E0D0] text-[#B8A880]'
          }`}
      >
        {ttsEnabled ? '🔊 TTS' : '🔇 TTS'}
      </button>

      {/* Thinking Phase Toggle */}
      <button
        onClick={() => setThinkingPhaseEnabled(!thinkingPhaseEnabled)}
        className={`px-3 py-1 rounded text-xs font-bold transition-colors ${thinkingPhaseEnabled
          ? 'bg-[#4B88A2] text-white'
          : 'bg-[#E8E0D0] text-[#B8A880]'
          }`}
        title="Toggle AI Internal Monologue (Thinking Phase)"
      >
        {thinkingPhaseEnabled ? '🧠 Thinking' : '🚫 Thinking'}
      </button>

      {/* Export Log */}
      <button
        onClick={handleExportLog}
        className="px-3 py-1 bg-[#E8E0D0] hover:bg-[#D4CDB8] text-[#8C7F6A] rounded text-xs font-bold transition-colors shadow-sm ml-2"
        title="Export Match Log"
      >
        💾 Export
      </button>

      {/* Reveal Toggle */}
      <button
        onClick={handleToggleReveal}
        className={`px-3 py-1 rounded text-xs font-bold transition-colors shadow-sm ml-2 ${isRevealedMode ? 'bg-[#D94F3B] hover:bg-[#C4422F] text-white' : 'bg-[#E8E0D0] hover:bg-[#D4CDB8] text-[#8C7F6A]'
          }`}
        title="Reveal all card teams"
      >
        {isRevealedMode ? '🙈 Hide Teams' : '👁️ Reveal'}
      </button>

      {/* Phase indicator */}
      <div className="ml-auto text-xs text-[#B8A880] font-semibold">
        {phase.replace(/_/g, ' ').toUpperCase()}
      </div>
    </div>
  );
}
