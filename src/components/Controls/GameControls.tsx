import { useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { runGame, stopGame } from '../../engine/orchestrator';
import { runReplay, stopReplay } from '../../engine/replayOrchestrator';

export default function GameControls() {
  const isRunning = useGameStore(s => s.isRunning);
  const phase = useGameStore(s => s.phase);
  const speed = useGameStore(s => s.speed);
  const ttsEnabled = useGameStore(s => s.ttsEnabled);
  const winner = useGameStore(s => s.winner);
  const isRevealedMode = useGameStore(s => s.isRevealedMode);
  const isVideoMode = useGameStore(s => s.isVideoMode);
  const toggleRevealedMode = useGameStore(s => s.toggleRevealedMode);
  const toggleVideoMode = useGameStore(s => s.toggleVideoMode);
  const setSpeed = useGameStore(s => s.setSpeed);
  const setTtsEnabled = useGameStore(s => s.setTtsEnabled);
  const newGame = useGameStore(s => s.newGame);
  const playbackMode = useGameStore(s => s.playbackMode);
  const playbackMessages = useGameStore(s => s.playbackMessages);
  const currentPlaybackIndex = useGameStore(s => s.currentPlaybackIndex);
  const goToPlaybackIndex = useGameStore(s => s.goToPlaybackIndex);
  const playbackSpeed = useGameStore(s => s.playbackSpeed);
  const setPlaybackSpeed = useGameStore(s => s.setPlaybackSpeed);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportMatch = () => {
    const state = useGameStore.getState();
    const exportData = {
      board: state.board,
      players: state.players,
      messages: state.messages,
      masterModel: state.masterModel
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `match-replay-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportMatch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        stopGame(); // Stop any active real game orchestrator before loading
        stopReplay(); // Stop any active replay before loading

        // Wait a tiny bit for async loops to halt, then violently overwrite the game state.
        setTimeout(() => {
          useGameStore.getState().loadMatch(data);

          // Add a visual notification to the chat that the import succeeded
          useGameStore.getState().addMessage({
            playerId: 'system',
            playerName: 'System',
            team: 'blue',
            content: `✅ Successfully loaded replay from "${file.name}". Ready to play!`,
            type: 'system',
          });
        }, 150);
      } catch (err) {
        console.error("Failed to parse match replay file", err);
        alert("Invalid match replay file");
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStart = () => {
    if (playbackMode) {
      if (!isRunning) {
        if (winner) {
          // Need to reset to start of timeline if we hit play at the end.
          goToPlaybackIndex(0);
        }
        runReplay();
      }
      return;
    }

    const store = useGameStore.getState();
    if (store.isVideoMode && !store.isBoardRevealed) {
      store.setIsBoardRevealed(true);
      // Wait for the word reveal animation to finish before starting the game
      setTimeout(() => {
        if (winner) {
          newGame();
          setTimeout(runGame, 100);
        } else {
          runGame();
        }
      }, 1500); // 1.5s delay to let the nice fade in happen
      return;
    }

    if (winner) {
      newGame();
      setTimeout(runGame, 100);
    } else {
      runGame();
    }
  };

  const handlePause = () => {
    if (playbackMode) {
      stopReplay();
    } else {
      stopGame();
    }
  };

  const handleQuit = () => {
    stopGame();
    stopReplay();
    setTimeout(() => newGame(), 100);
  };

  const handleToggleReveal = () => {
    if (!isRevealedMode) {
      const confirm = window.confirm("👁️ Are you sure you want to reveal the cards? This will degrade your experience if you are playing along!");
      if (!confirm) return;
    }
    toggleRevealedMode();
  };

  const isGameStarted = playbackMode ? true : (phase !== 'setup' && !winner);

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white/50 rounded-xl border border-[#D4CDB8] shadow-sm">
      {/* Play/Pause */}
      {!isRunning ? (
        <button
          onClick={handleStart}
          className="px-4 py-2 bg-[#4A9B5A] hover:bg-[#3D8A4D] text-white rounded-lg font-bold text-sm transition-colors shadow-sm whitespace-nowrap"
        >
          {playbackMode ? (currentPlaybackIndex >= playbackMessages.length - 1 ? '🔄 Restart Replay' : '▶ Play Replay') : winner ? '🔄 New Game' : isGameStarted ? '▶ Resume' : '▶ Start'}
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
          className="px-3 py-2 bg-[#D94F3B] hover:bg-[#C4422F] text-white rounded-lg font-bold text-sm transition-colors shadow-sm whitespace-nowrap"
        >
          {playbackMode ? '⏹ Close Replay' : '⏹ Quit'}
        </button>
      )}

      {/* Replay Scrubber */}
      {playbackMode && playbackMessages.length > 0 && (
        <div className="flex items-center gap-2 flex-1 mx-4 bg-[#F4F1E1] px-3 py-1.5 rounded-lg border border-[#D4CDB8]">
          <button
            onClick={() => {
              stopReplay();
              goToPlaybackIndex(currentPlaybackIndex - 1);
            }}
            disabled={currentPlaybackIndex <= 0}
            className="px-2 py-1 bg-[#E8E0D0] hover:bg-[#D4CDB8] disabled:opacity-30 rounded text-xs transition-colors"
            title="Previous Step"
          >
            ⏮
          </button>

          <input
            type="range"
            min={0}
            max={playbackMessages.length - 1}
            value={currentPlaybackIndex}
            onChange={(e) => {
              stopReplay();
              goToPlaybackIndex(parseInt(e.target.value, 10));
            }}
            className="flex-1 h-2 bg-[#D4CDB8] rounded-lg appearance-none cursor-pointer accent-[#4A9B5A]"
          />

          <button
            onClick={() => {
              stopReplay();
              goToPlaybackIndex(currentPlaybackIndex + 1);
            }}
            disabled={currentPlaybackIndex >= playbackMessages.length - 1}
            className="px-2 py-1 bg-[#E8E0D0] hover:bg-[#D4CDB8] disabled:opacity-30 rounded text-xs transition-colors"
            title="Next Step"
          >
            ⏭
          </button>

          <span className="text-[10px] text-[#8C7F6A] font-bold min-w-[3rem] text-center font-mono">
            {currentPlaybackIndex + 1} / {playbackMessages.length}
          </span>
        </div>
      )}

      {/* Speed & TTS */}
      <div className={`flex items-center gap-1 ${playbackMode && playbackMessages.length > 0 ? '' : 'ml-auto'}`}>
        {[1, 1.5, 2, 3, 5].map(s => (
          <button
            key={s}
            onClick={() => playbackMode ? setPlaybackSpeed(s) : setSpeed(s)}
            className={`px-2 py-1 rounded text-xs font-bold transition-colors ${(playbackMode ? playbackSpeed : speed) === s
              ? 'bg-[#3B7DD8] text-white'
              : 'bg-[#E8E0D0] text-[#8C7F6A] hover:bg-[#D4CDB8]'
              }`}
          >
            {s}x
          </button>
        ))}
        <button
          onClick={() => setTtsEnabled(!ttsEnabled)}
          className={`px-3 py-1 rounded text-xs font-bold transition-colors ml-1 ${ttsEnabled
            ? 'bg-[#7C5BBF] text-white'
            : 'bg-[#E8E0D0] text-[#B8A880]'
            }`}
        >
          {ttsEnabled ? '🔊 TTS' : '🔇 TTS'}
        </button>
      </div>

      {/* Import / Export Match */}
      <input
        type="file"
        accept=".json"
        className="hidden"
        ref={fileInputRef}
        onChange={handleImportMatch}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="px-3 py-1 bg-[#E8E0D0] hover:bg-[#D4CDB8] text-[#8C7F6A] rounded text-xs font-bold transition-colors shadow-sm ml-2"
        title="Import Replay"
      >
        📂 Import
      </button>

      <button
        onClick={handleExportMatch}
        className="px-3 py-1 bg-[#E8E0D0] hover:bg-[#D4CDB8] text-[#8C7F6A] rounded text-xs font-bold transition-colors shadow-sm ml-2"
        title="Export Match Replay"
      >
        💾 Export
      </button>

      {/* Video Mode Toggle */}
      <button
        onClick={toggleVideoMode}
        className={`px-3 py-1 rounded text-xs font-bold transition-colors shadow-sm ml-2 ${isVideoMode ? 'bg-[#9333EA] hover:bg-[#7E22CE] text-white' : 'bg-[#E8E0D0] hover:bg-[#D4CDB8] text-[#8C7F6A]'
          }`}
        title="Toggle Video Mode (Cinematic)"
      >
        {isVideoMode ? '🎥 Video: ON' : '🍿 Video: OFF'}
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
