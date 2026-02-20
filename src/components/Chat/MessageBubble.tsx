import { motion } from 'framer-motion';
import type { ChatMessage } from '../../types/game';
import { useGameStore } from '../../store/gameStore';
import ProviderLogo from '../Players/ProviderLogo';
import { AVAILABLE_MODELS } from '../../config/models';

interface Props {
  message: ChatMessage;
  isSummaryTab?: boolean;
  isDevTab?: boolean;
}

const TYPE_STYLES: Record<string, string> = {
  internal_monologue: 'italic opacity-70 border-l-2 border-[#B8A880] pl-3',
  conversation: '',
  clue: 'text-xl font-bold text-center',
  guess: 'font-medium bg-white/60 shadow-sm border border-[#D4CDB8]',
  reaction: 'text-sm',
  system: 'text-[#8C7F6A] text-xs text-center italic',
  summary: 'italic font-medium bg-[#FFFBEA]/80 border-l-4 border-l-[#F6D365] text-[#7A6A4F] shadow-sm',
};

const TYPE_LABELS: Record<string, string> = {
  internal_monologue: '💭 thinking...',
  conversation: '💬',
  clue: '🎯 CLUE',
  guess: '🎲 GUESS',
  reaction: '💬',
  system: '',
  summary: '✨ summary',
};

export default function MessageBubble({ message, isSummaryTab, isDevTab }: Props) {
  const player = useGameStore(s => s.players.find(p => p.id === message.playerId));

  if (message.type === 'system') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-1"
      >
        <span className="text-[#8C7F6A] text-xs bg-[#E8E0D0] px-3 py-1 rounded-full border border-[#D4CDB8]">
          {message.content}
        </span>
      </motion.div>
    );
  }

  if (message.type === 'clue') {
    const teamBg = message.team === 'blue' ? 'bg-[#3B7DD8]' : 'bg-[#D94F3B]';
    return (
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="flex justify-center py-3"
      >
        <div className={`${teamBg} rounded-xl px-8 py-4 shadow-lg`}>
          <div className="text-white/70 text-xs uppercase tracking-wider mb-1">
            {message.playerName}'s Clue
          </div>
          <div className="text-white text-2xl font-display tracking-wide">
            {message.content}
          </div>
        </div>
      </motion.div>
    );
  }

  const teamBorder = message.team === 'blue' ? 'border-[#3B7DD8]/20' : 'border-[#D94F3B]/20';

  let displayContent = message.content;
  if (message.type === 'guess' && isSummaryTab) {
    if (message.content.includes('GUESS:')) {
      const match = message.content.match(/GUESS:\s*([A-Za-z]+)/i);
      if (match) displayContent = `GUESS: ${match[1].toUpperCase()}`;
    } else if (message.content.includes('PASS')) {
      displayContent = 'PASS';
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2 py-1 ${message.type === 'internal_monologue' ? 'opacity-60' : ''}`}
    >
      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-sm border bg-white"
        style={{
          borderColor: player?.color || '#666',
        }}
      >
        {player ? (
          (() => {
            const aiModel = AVAILABLE_MODELS.find(m => m.id === player.model);
            return aiModel ? <ProviderLogo provider={aiModel.provider} className="w-4 h-4" /> : '🤖';
          })()
        ) : (
          '🤖'
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0`}>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-bold" style={{ color: player?.color || '#666' }}>
            {message.playerName}
          </span>
          {TYPE_LABELS[message.type] && (
            <span className="text-[10px] text-[#B8A880]">{TYPE_LABELS[message.type]}</span>
          )}
        </div>
        <div
          className={`
            text-sm text-[#3A3428] rounded-lg p-2
            bg-[#F5F0E8]/80 border ${teamBorder}
            ${TYPE_STYLES[message.type] || ''}
          `}
        >
          {isDevTab && message.prompt ? (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[#8B5CF6]">PROMPT SENT</span>
              <pre className="text-[10px] whitespace-pre-wrap font-mono bg-white p-2 rounded border border-[#E5E7EB]">
                {message.prompt}
              </pre>
              <span className="text-xs font-semibold text-[#4A9B5A] mt-2">AI RESPONSE</span>
              {displayContent || (
                <span className="inline-flex gap-1.5 text-[#B8A880] py-1">
                  <span className="bounce-dot text-lg leading-none">·</span>
                  <span className="bounce-dot text-lg leading-none">·</span>
                  <span className="bounce-dot text-lg leading-none">·</span>
                </span>
              )}
            </div>
          ) : (
            displayContent || (
              <span className="inline-flex gap-1.5 text-[#B8A880] py-1">
                <span className="bounce-dot text-lg leading-none">·</span>
                <span className="bounce-dot text-lg leading-none">·</span>
                <span className="bounce-dot text-lg leading-none">·</span>
              </span>
            )
          )}
        </div>
      </div>
    </motion.div>
  );
}
