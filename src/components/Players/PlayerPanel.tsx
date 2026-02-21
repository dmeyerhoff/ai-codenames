import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/gameStore';
import type { Team } from '../../types/game';
import PlayerAvatar from './PlayerAvatar';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import ModelSelectorModal from './ModelSelectorModal';
import { AVAILABLE_MODELS } from '../../config/models';
import ProviderLogo from './ProviderLogo';

interface Props {
  team: Team;
}

export default function PlayerPanel({ team }: Props) {
  const players = useGameStore(useShallow(s => s.players.filter(p => p.team === team)));
  const activePlayerId = useGameStore(s => s.activePlayerId);
  const currentTeam = useGameStore(s => s.currentTeam);
  const phase = useGameStore(s => s.phase);
  const messages = useGameStore(s => s.messages);
  const isVideoMode = useGameStore(s => s.isVideoMode);
  const isActiveTeam = currentTeam === team;

  // Local state to hold the preview text for a minimum duration
  const [activePreview, setActivePreview] = useState<{ text: string, playerId: string, isThinking: boolean } | null>(null);

  const [selectingPlayerId, setSelectingPlayerId] = useState<string | null>(null);

  const teamColor = team === 'blue' ? 'border-[#3B7DD8]/30' : 'border-[#D94F3B]/30';
  const teamBg = team === 'blue' ? 'bg-[#3B7DD8]/5' : 'bg-[#D94F3B]/5';
  const teamLabel = team === 'blue' ? 'text-[#3B7DD8]' : 'text-[#D94F3B]';

  const spymaster = players.find(p => p.role === 'spymaster')!;
  const operatives = players.filter(p => p.role === 'operative');

  const getPlayerStateEmoji = (playerId: string) => {
    if (activePlayerId !== playerId) return null;
    switch (phase) {
      case 'spymaster_thinking':
        return '💭';
      case 'team_conversation':
      case 'guess_reactions':
        return '💬';
      case 'guessing':
        return '🎲';
      case 'clue_reveal':
        return '🎯';
      default:
        return '⏳';
    }
  };

  useEffect(() => {
    // Determine current preview for the active player
    let currentText: string | null = null;
    let isThinking = false;

    if (activePlayerId) {
      const playerMessages = messages.filter(m => m.playerId === activePlayerId && m.type !== 'system');
      if (playerMessages.length > 0) {
        const latest = playerMessages[playerMessages.length - 1];
        const words = latest.content.split(' ');
        currentText = words.length <= 10 ? latest.content : words.slice(0, 10).join(' ') + '...';
        // Only show animated dots if the action is still ongoing (thinking phase)
        isThinking = phase.includes('thinking');
      }
    }

    if (currentText && activePlayerId) {
      setActivePreview({ text: currentText, playerId: activePlayerId, isThinking });
    } else if (activePreview && !currentText) {
      // If we lose the text (e.g., active player changes or phase clears),
      // we hold it for a minimum amount of time to ensure it is readable.
      // We start a timer when text goes away, but if new text arrives, it will immediately overwrite.
      const timer = setTimeout(() => {
        setActivePreview(null);
      }, 2500); // 2.5s minimum readability guarantee after exit

      return () => clearTimeout(timer);
    }
  }, [messages, activePlayerId, phase]);

  const renderPlayer = (player: typeof spymaster, roleLabel: string) => {
    const isPlayerActive = activePlayerId === player.id;
    const hasPreview = activePreview?.playerId === player.id;
    const canSelectModel = phase === 'setup';
    const aiModel = AVAILABLE_MODELS.find(m => m.id === player.model);

    return (
      <div key={player.id} className="relative py-1">
        <button
          onClick={() => canSelectModel && setSelectingPlayerId(player.id)}
          disabled={!canSelectModel}
          className={`w-full flex items-center gap-3 text-left transition-colors group ${isVideoMode
              ? `p-3 rounded-2xl bg-black/20 backdrop-blur-md border border-white/10 shadow-xl ${isPlayerActive ? 'ring-2 ring-white/30 bg-black/40' : 'hover:bg-black/30'}`
              : `rounded-lg ${canSelectModel ? 'hover:bg-[#E8E0D0]/50 p-1 -m-1' : ''}`
            }`}
        >
          <PlayerAvatar player={player} isActive={isPlayerActive || selectingPlayerId === player.id} size={isVideoMode ? 'md' : 'sm'} />
          <div className="min-w-0 flex-1 relative">
            <div className={`flex items-center relative font-medium ${isVideoMode ? 'text-white text-sm' : 'text-[#3A3428] text-xs'}`}>
              <span className="truncate max-w-[100px] drop-shadow-sm">{player.name}</span>
              <span className="ml-1 text-sm flex-none drop-shadow-sm">{getPlayerStateEmoji(player.id)}</span>
              {player.isCaptain && <span className="ml-1 flex-none text-[#D94F3B] text-[10px] font-bold">CPT</span>}
            </div>
            <div className={`flex items-center justify-between pr-2 mt-0.5 ${isVideoMode ? 'text-white/60 text-xs' : 'text-[#B8A880] text-[10px]'}`}>
              <div className="flex items-center gap-1.5">
                {aiModel && <ProviderLogo provider={aiModel.provider} className="w-3.5 h-3.5 opacity-60" />}
                <span className="drop-shadow-sm">{roleLabel}</span>
              </div>
              {canSelectModel && (
                <span className={`opacity-0 group-hover:opacity-100 transition-opacity font-bold uppercase tracking-wider ${isVideoMode ? 'text-white/80' : 'text-[#B8A880]'}`}>
                  Swap
                </span>
              )}
            </div>

            {/* Chat Bubble Preview */}
            <AnimatePresence>
              {hasPreview && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: -10 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className={`
                  absolute left-full ml-6 -top-2 z-50 w-48 text-[11px] leading-tight
                  bg-white text-[#3A3428] p-2 rounded-2xl rounded-tl-none
                  shadow-lg border-2 origin-top-left
                  ${player.team === 'blue' ? 'border-[#3B7DD8]/50' : 'border-[#D94F3B]/50'}
                  pointer-events-none
                `}
                >
                  <div className={`
                  absolute -left-2 top-0 w-3 h-3 bg-white 
                  border-l-2 border-b-2 transform -skew-x-[20deg] rotate-45
                  ${player.team === 'blue' ? 'border-[#3B7DD8]/50' : 'border-[#D94F3B]/50'}
                `} />
                  <div className="relative z-10 italic whitespace-normal break-words">
                    "{activePreview.text}"
                    {activePreview.isThinking && (
                      <span className="inline-flex ml-1 text-[#8C7F6A]">
                        <span className="bounce-dot text-[14px]">.</span>
                        <span className="bounce-dot text-[14px]">.</span>
                        <span className="bounce-dot text-[14px]">.</span>
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </button>
      </div>
    );
  };

  return (
    <div className={isVideoMode ? 'flex flex-col gap-3' : `rounded-xl border ${teamColor} bg-white/60 ${teamBg} p-3 shadow-sm ${isActiveTeam ? 'ring-2 ring-offset-1 ' + (team === 'blue' ? 'ring-[#3B7DD8]/40' : 'ring-[#D94F3B]/40') : ''}`}>
      {!isVideoMode && (
        <h3 className={`${teamLabel} font-display text-xs uppercase tracking-wider mb-3`}>
          {team} Team {isActiveTeam && '⬤'}
        </h3>
      )}

      <div className={isVideoMode ? "space-y-3" : "space-y-2"}>
        {renderPlayer(spymaster, 'Spymaster')}

        <div className={isVideoMode ? "pt-1" : "border-t border-[#E8E0D0] pt-2"}>
          {operatives.map(op => renderPlayer(op, 'Operative'))}
        </div>
      </div>

      <ModelSelectorModal
        playerId={selectingPlayerId}
        onClose={() => setSelectingPlayerId(null)}
      />
    </div>
  );
}
