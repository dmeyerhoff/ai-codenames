import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { ChatMessage } from '../../types/game';
import { useGameStore } from '../../store/gameStore';
import ProviderLogo from '../Players/ProviderLogo';
import { AVAILABLE_MODELS } from '../../config/models';
import AutotypedText from './AutotypedText';

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
  const playbackMode = useGameStore(s => s.playbackMode);
  const currentPlaybackIndex = useGameStore(s => s.currentPlaybackIndex);
  const playbackMessages = useGameStore(s => s.playbackMessages);

  const [liveDurationMs, setLiveDurationMs] = useState(0);

  useEffect(() => {
    // Only track time for AI generated messages
    const isAiMessage = message.type !== 'system' && message.type !== 'summary' && message.playerId !== 'system';

    // If it already has a completed durationMs or it's not an AI message, don't run the timer
    if (message.durationMs || !isAiMessage) {
      if (liveDurationMs !== 0) setLiveDurationMs(0);
      return;
    }

    // Tick the live timer every 100ms
    const interval = setInterval(() => {
      setLiveDurationMs(Date.now() - message.timestamp);
    }, 100);

    return () => clearInterval(interval);
  }, [message.durationMs, message.timestamp, message.type, message.playerId]);

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

  if (message.type === 'guess_result') {
    const parts = message.content.split(':');
    const word = parts[0];
    const type = parts[1];
    const label = parts.slice(2).join(':');

    let bgClass = 'bg-[#D4CDB8]';
    if (type === 'blue') bgClass = 'bg-[#3B7DD8]';
    else if (type === 'red') bgClass = 'bg-[#D94F3B]';
    else if (type === 'assassin') bgClass = 'bg-[#2A2A2A]';

    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0, rotateX: 90 }}
        animate={{ scale: 1, opacity: 1, rotateX: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="flex justify-center py-4"
      >
        <div className={`${bgClass} rounded-xl px-8 py-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/20 flex flex-col items-center min-w-[200px]`}>
          <div className="text-white/80 text-[10px] font-bold tracking-[0.2em] mb-1 uppercase text-center">
            {label}
          </div>
          <div className="text-white text-2xl font-display tracking-widest uppercase">
            {word}
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

  // Extract <thought> blocks (legacy) or new "Reasoning:" postfix
  let thoughtContent = '';
  if (displayContent.includes('<thought>')) {
    const thoughtMatch = displayContent.match(/<thought>([\s\S]*?)<\/thought>/i);
    if (thoughtMatch) {
      thoughtContent = thoughtMatch[1].trim();
      displayContent = displayContent.replace(/<thought>[\s\S]*?<\/thought>/ig, '').trim();
    }
  } else if (/Reasoning:/i.test(displayContent)) {
    const reasoningMatch = displayContent.match(/Reasoning:\s*([\s\S]*?)$/i);
    if (reasoningMatch) {
      thoughtContent = reasoningMatch[1].trim();
      displayContent = displayContent.replace(/Reasoning:\s*[\s\S]*?$/i, '').trim();
    }
  }

  // Determine if this is the currently "active" message in playback mode
  // If we scrubbed past it, we just display it statically.
  const isCurrentlyPlaying = playbackMode &&
    playbackMessages.length > 0 &&
    playbackMessages[currentPlaybackIndex]?.id === message.id;

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
          {message.durationMs ? (
            <span className="text-[10px] text-[#8C7F6A] opacity-75 ml-auto mr-1">
              {(message.durationMs / 1000).toFixed(1)}s
            </span>
          ) : liveDurationMs > 0 ? (
            <span className="text-[10px] text-[#8C7F6A] opacity-75 ml-auto mr-1 animate-pulse">
              {(liveDurationMs / 1000).toFixed(1)}s
            </span>
          ) : null}
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
              <pre className="text-[10px] whitespace-pre-wrap font-mono bg-white p-2 rounded border border-[#E5E7EB] max-h-60 overflow-y-auto">
                {message.prompt}
              </pre>
              <span className="text-xs font-semibold text-[#4A9B5A] mt-2">AI RESPONSE</span>

              {thoughtContent && (
                <details className="mt-1 mb-2 bg-white/50 rounded border border-[#E5E7EB]">
                  <summary className="text-xs font-semibold text-[#7E6E5C] cursor-pointer p-1.5 hover:bg-white/80 transition-colors">
                    View Internal Thinking
                  </summary>
                  <pre className="text-[10px] whitespace-pre-wrap font-mono p-2 border-t border-[#E5E7EB] text-[#6B5A46] bg-white/30 truncate-thinking">
                    {thoughtContent}
                  </pre>
                </details>
              )}

              {displayContent ? (
                <AutotypedText
                  text={displayContent}
                  durationMs={message.durationMs}
                  enabled={isCurrentlyPlaying}
                />
              ) : (
                <span className="inline-flex gap-1.5 text-[#B8A880] py-1">
                  <span className="bounce-dot text-lg leading-none">·</span>
                  <span className="bounce-dot text-lg leading-none">·</span>
                  <span className="bounce-dot text-lg leading-none">·</span>
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col">
              {thoughtContent && !isSummaryTab && (
                <details className="mb-2 bg-white/40 rounded border border-[#E8E0D0]">
                  <summary className="text-[10px] font-semibold text-[#9C8F7E] cursor-pointer p-1.5 hover:bg-white/60 transition-colors">
                    Show Provider Reasoning
                  </summary>
                  <pre className="text-[10px] whitespace-pre-wrap font-mono p-2 border-t border-[#E8E0D0] text-[#7A6A4F]">
                    {thoughtContent}
                  </pre>
                </details>
              )}
              {displayContent ? (
                <AutotypedText
                  text={displayContent}
                  durationMs={message.durationMs}
                  enabled={isCurrentlyPlaying}
                />
              ) : (
                <span className="inline-flex gap-1.5 text-[#B8A880] py-1">
                  <span className="bounce-dot text-lg leading-none">·</span>
                  <span className="bounce-dot text-lg leading-none">·</span>
                  <span className="bounce-dot text-lg leading-none">·</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
