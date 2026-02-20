import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import MessageBubble from './MessageBubble';
import ProviderLogo from '../Players/ProviderLogo';
import { AVAILABLE_MODELS } from '../../config/models';

export default function ChatPanel() {
  const messages = useGameStore(s => s.messages);
  const activePlayerId = useGameStore(s => s.activePlayerId);
  const phase = useGameStore(s => s.phase);
  const players = useGameStore(s => s.players);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<'all' | 'blue' | 'red' | 'summary' | 'dev'>('all');
  const [autoScroll, setAutoScroll] = useState(true);

  const activePlayer = players.find(p => p.id === activePlayerId);
  const showTypingIndicator = activePlayer && phase !== 'setup' && phase !== 'game_over';

  // Auto-scroll logic
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, autoScroll]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isNearBottom);
  };

  const filteredMessages = messages.filter(msg => {
    if (msg.hidden && activeTab !== 'dev') return false;

    if (activeTab === 'all') return true;
    if (activeTab === 'summary') {
      return msg.type === 'system' || msg.type === 'clue' || msg.type === 'guess' || msg.type === 'summary' || msg.type === 'reaction';
    }
    if (activeTab === 'dev') {
      return !!msg.prompt;
    }
    return msg.team === activeTab || msg.type === 'system';
  });

  const handleDownloadPrompts = () => {
    const rawData = messages
      .filter(m => m.prompt)
      .map(m => `========================================================\n[${m.team.toUpperCase()} - ${m.playerName} - ${m.type.toUpperCase()}]\n\nPROMPT:\n${m.prompt}\n\nRESPONSE:\n${m.content}\n\n`)
      .join('');
    const blob = new Blob([rawData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codenames-ai-prompts-${new Date().toISOString().replace(/:/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <div className="px-3 pt-2 border-b border-[#D4CDB8] flex flex-col gap-2 bg-white/50">
        <h3 className="text-[#3A3428] font-display text-sm tracking-wide px-1 flex justify-between items-center">
          <span>Game Log</span>
          {activeTab === 'dev' && (
            <button
              onClick={handleDownloadPrompts}
              className="px-2 py-1 text-[10px] bg-[#3A3428] text-[#F4F1E1] rounded hover:bg-[#4A433A] transition-colors font-bold tracking-wider"
            >
              DOWNLOAD PROMPTS
            </button>
          )}
        </h3>
        <div className="flex text-[11px]">
          {(['all', 'blue', 'red', 'summary', 'dev'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setAutoScroll(true); }}
              className={`flex-1 pb-1.5 px-1 font-bold border-b-2 transition-colors uppercase tracking-wider ${activeTab === tab
                ? (tab === 'blue' ? 'border-[#3B7DD8] text-[#3B7DD8]' : tab === 'red' ? 'border-[#D94F3B] text-[#D94F3B]' : tab === 'dev' ? 'border-[#8B5CF6] text-[#8B5CF6]' : 'border-[#4A9B5A] text-[#4A9B5A]')
                : 'border-transparent text-[#8C7F6A] hover:text-[#3A3428]'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-thin pb-24"
      >
        {filteredMessages.length === 0 && (
          <div className="text-[#B8A880] text-sm text-center py-8">
            {messages.length === 0 ? 'Press Start to begin the game...' : 'No messages in this tab yet.'}
          </div>
        )}
        {filteredMessages.map(msg => (
          <MessageBubble key={msg.id} message={msg} isSummaryTab={activeTab === 'summary'} isDevTab={activeTab === 'dev'} />
        ))}
        {showTypingIndicator && (
          <div className="flex items-center gap-2 py-2 px-1 text-xs text-[#8C7F6A] animate-pulse">
            <span className="flex items-center justify-center">
              {(() => {
                const aiModel = AVAILABLE_MODELS.find(m => m.id === activePlayer.model);
                return aiModel ? <ProviderLogo provider={aiModel.provider} className="w-5 h-5 opacity-60" /> : '🤖';
              })()}
            </span>
            <span className="italic">
              {activePlayer.name} is {phase.includes('thinking') || phase.includes('reflecting') ? 'thinking' : 'typing'}...
            </span>
          </div>
        )}
        <div ref={bottomRef} className="h-1 text-transparent" />
      </div>

      {!autoScroll && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
          <button
            onClick={() => setAutoScroll(true)}
            className="pointer-events-auto bg-[#3B7DD8] text-white text-xs font-bold px-4 py-1.5 flex items-center gap-1 rounded-full shadow-lg border border-[#2B5EA0] hover:bg-[#2B5EA0] transition-colors"
          >
            <span>↓</span> New Messages
          </button>
        </div>
      )}
    </div>
  );
}
