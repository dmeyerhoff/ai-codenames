import { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { DEMO_PLAYERS, AVAILABLE_MODELS } from '../../config/models';
import Card from '../Board/Card';
import ScoreBar from '../Board/ScoreBar';
import MessageBubble from '../Chat/MessageBubble';
import PlayerAvatar from '../Players/PlayerAvatar';
import ProviderLogo from '../Players/ProviderLogo';
import type { Card as CardType, ChatMessage, Player } from '../../types/game';

// All unique providers from the model list
const ALL_PROVIDERS = [...new Set(AVAILABLE_MODELS.map(m => m.provider))];

// Mock cards for each type
const MOCK_CARDS: { label: string; card: CardType }[] = [
  { label: 'Blue (unrevealed)', card: { word: 'OCEAN', type: 'blue', revealed: false, position: 0 } },
  { label: 'Blue (revealed)', card: { word: 'OCEAN', type: 'blue', revealed: true, position: 1 } },
  { label: 'Red (unrevealed)', card: { word: 'FIRE', type: 'red', revealed: false, position: 2 } },
  { label: 'Red (revealed)', card: { word: 'FIRE', type: 'red', revealed: true, position: 3 } },
  { label: 'Bystander (unrevealed)', card: { word: 'CHAIR', type: 'bystander', revealed: false, position: 4 } },
  { label: 'Bystander (revealed)', card: { word: 'CHAIR', type: 'bystander', revealed: true, position: 5 } },
  { label: 'Assassin (unrevealed)', card: { word: 'DEATH', type: 'assassin', revealed: false, position: 6 } },
  { label: 'Assassin (revealed)', card: { word: 'DEATH', type: 'assassin', revealed: true, position: 7 } },
];

// Mock messages for chat bubbles
const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-conv',
    playerId: 'blue-op1',
    playerName: 'Claude Sonnet 4.5',
    team: 'blue',
    content: 'I think OCEAN connects well with the clue "WATER: 3". It\'s the most obvious choice. Let\'s start there and then consider RIVER and POOL.',
    type: 'conversation',
    timestamp: Date.now(),
    durationMs: 4200,
  },
  {
    id: 'msg-clue-blue',
    playerId: 'blue-spy',
    playerName: 'GPT-5.2',
    team: 'blue',
    content: 'WATER: 3',
    type: 'clue',
    timestamp: Date.now(),
    durationMs: 8500,
  },
  {
    id: 'msg-clue-red',
    playerId: 'red-spy',
    playerName: 'Claude Opus 4.5',
    team: 'red',
    content: 'FLAME: 2',
    type: 'clue',
    timestamp: Date.now(),
    durationMs: 6100,
  },
  {
    id: 'msg-guess-correct',
    playerId: 'system',
    playerName: 'System',
    team: 'blue',
    content: 'OCEAN:blue:Correct! Blue team agent found!',
    type: 'guess_result',
    timestamp: Date.now(),
  },
  {
    id: 'msg-guess-wrong',
    playerId: 'system',
    playerName: 'System',
    team: 'red',
    content: 'CHAIR:bystander:Bystander! Turn ends.',
    type: 'guess_result',
    timestamp: Date.now(),
  },
  {
    id: 'msg-guess-assassin',
    playerId: 'system',
    playerName: 'System',
    team: 'red',
    content: 'DEATH:assassin:Assassin! Game over!',
    type: 'guess_result',
    timestamp: Date.now(),
  },
  {
    id: 'msg-think',
    playerId: 'blue-spy',
    playerName: 'GPT-5.2',
    team: 'blue',
    content: 'Looking at the board, I need to connect OCEAN, RIVER, and POOL. The word "WATER" seems like a strong thematic link...',
    type: 'internal_monologue',
    timestamp: Date.now(),
    durationMs: 12300,
  },
  {
    id: 'msg-system',
    playerId: 'system',
    playerName: 'System',
    team: 'blue',
    content: 'Round 2 — Blue Team\'s turn',
    type: 'system',
    timestamp: Date.now(),
  },
  {
    id: 'msg-reaction',
    playerId: 'red-op1',
    playerName: 'Gemini 3 Flash',
    team: 'red',
    content: 'Good pick! That was definitely connected to the clue. Now let\'s try VOLCANO next.',
    type: 'reaction',
    timestamp: Date.now(),
    durationMs: 3100,
  },
  {
    id: 'msg-guess',
    playerId: 'blue-op1',
    playerName: 'Claude Sonnet 4.5',
    team: 'blue',
    content: 'GUESS: OCEAN — This is the most directly connected word to "WATER". I\'m very confident about this one.',
    type: 'guess',
    timestamp: Date.now(),
    durationMs: 2800,
  },
];

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="mb-12">
      <h2 className="text-lg font-display text-[#3A3428] mb-1">{title}</h2>
      {subtitle && <p className="text-xs text-[#8C7F6A] mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </div>
  );
}

export default function ComponentShowcase() {
  const setCurrentClue = useGameStore(s => s.setCurrentClue);

  // Override global overflow:hidden so the page can scroll
  useEffect(() => {
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';
    const root = document.getElementById('root');
    if (root) root.style.overflow = 'auto';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      if (root) root.style.overflow = '';
    };
  }, []);

  // Set up mock store state on mount
  useEffect(() => {
    const store = useGameStore.getState();
    // Load demo players and set some mock scores/clue for ScoreBar
    store.loadMatch({
      players: [...DEMO_PLAYERS],
      currentTeam: 'blue',
      phase: 'setup',
      blueScore: 4,
      redScore: 3,
      blueTotal: 9,
      redTotal: 8,
      roundNumber: 2,
      messages: MOCK_MESSAGES,
    });
    // Set a clue so ScoreBar shows it
    store.setCurrentClue({ word: 'WATER', number: 3 });
  }, []);

  const blueSpymaster = DEMO_PLAYERS.find(p => p.id === 'blue-spy')!;
  const blueOperatives = DEMO_PLAYERS.filter(p => p.team === 'blue' && p.role === 'operative');
  const redSpymaster = DEMO_PLAYERS.find(p => p.id === 'red-spy')!;
  const redOperatives = DEMO_PLAYERS.filter(p => p.team === 'red' && p.role === 'operative');

  const renderAgentCard = (player: Player, roleLabel: string) => {
    const aiModel = AVAILABLE_MODELS.find(m => m.id === player.model);
    return (
      <div key={player.id} className="flex items-center gap-3 rounded-lg bg-white/60 border border-[#D4CDB8] p-2">
        <PlayerAvatar player={player} isActive={false} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center text-xs font-medium text-[#3A3428]">
            <span className="truncate">{player.name}</span>
            {player.isCaptain && <span className="ml-1 text-[#D94F3B] text-[10px] font-bold">CPT</span>}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#B8A880] mt-0.5">
            {aiModel && <ProviderLogo provider={aiModel.provider} className="w-3.5 h-3.5 opacity-60" />}
            <span>{roleLabel}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderCinematicAgent = (player: Player, roleLabel: string, teamColor: string) => {
    const aiModel = AVAILABLE_MODELS.find(m => m.id === player.model);
    return (
      <div key={player.id} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-black/80 backdrop-blur-md border border-white/10">
        <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 bg-white shadow-lg" style={{ borderColor: player.color }}>
          {aiModel ? <ProviderLogo provider={aiModel.provider} className="w-10 h-10" /> : <span className="text-2xl">🤖</span>}
        </div>
        <span className={`text-sm font-bold ${teamColor}`}>{player.name}</span>
        <span className="text-[10px] text-white/60 uppercase tracking-widest">{roleLabel}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F0E8] p-8 overflow-y-auto" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <div className="max-w-4xl mx-auto">
        {/* Page Title */}
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-display text-[#3A3428]">Component Showcase</h1>
          <p className="text-sm text-[#8C7F6A] mt-2">All UI components for screenshots & mockups</p>
        </div>

        {/* 1. Header / Logo */}
        <Section title="Header Logo" subtitle="The AI CODENAMES title text">
          <div className="inline-block bg-white/60 border border-[#D4CDB8] rounded-xl px-6 py-3">
            <h1 className="text-xl font-display tracking-wide">
              <span className="text-[#D94F3B]">AI</span>
              <span className="text-[#3A3428]"> CODENAMES</span>
            </h1>
          </div>
        </Section>

        {/* 2. Team Header Text (Cinematic) */}
        <Section title="Team Header Text (Cinematic Overlay)" subtitle="The gradient text shown during cinematic transitions">
          <div className="flex flex-wrap gap-6">
            <div className="bg-black/80 rounded-2xl px-8 py-6 flex items-center justify-center">
              <span className="text-3xl font-display font-bold bg-gradient-to-r from-blue-300 via-blue-500 to-blue-300 bg-clip-text text-transparent tracking-wider">
                BLUE SPYMASTER
              </span>
            </div>
            <div className="bg-black/80 rounded-2xl px-8 py-6 flex items-center justify-center">
              <span className="text-3xl font-display font-bold bg-gradient-to-r from-blue-300 via-blue-500 to-blue-300 bg-clip-text text-transparent tracking-wider">
                BLUE OPERATIVES
              </span>
            </div>
            <div className="bg-black/80 rounded-2xl px-8 py-6 flex items-center justify-center">
              <span className="text-3xl font-display font-bold bg-gradient-to-r from-red-300 via-red-500 to-red-300 bg-clip-text text-transparent tracking-wider">
                RED SPYMASTER
              </span>
            </div>
            <div className="bg-black/80 rounded-2xl px-8 py-6 flex items-center justify-center">
              <span className="text-3xl font-display font-bold bg-gradient-to-r from-red-300 via-red-500 to-red-300 bg-clip-text text-transparent tracking-wider">
                RED OPERATIVES
              </span>
            </div>
          </div>
        </Section>

        {/* 3. Game Cards */}
        <Section title="Game Cards" subtitle="All card types in unrevealed and revealed states">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {MOCK_CARDS.map(({ label, card }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <div className="w-32 aspect-[4/3]">
                  <Card card={card} />
                </div>
                <span className="text-[10px] text-[#8C7F6A] font-medium">{label}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* 4. Score Bar */}
        <Section title="Score Bar" subtitle="Progress bar with team scores and active clue pill">
          <div className="max-w-lg">
            <ScoreBar />
          </div>
        </Section>

        {/* 5. Chat Bubbles */}
        <Section title="Chat Bubbles" subtitle="All message types as they appear in the chat panel">
          <div className="max-w-md bg-white/70 border border-[#D4CDB8] rounded-xl p-4 space-y-2">
            {MOCK_MESSAGES.map(msg => (
              <div key={msg.id}>
                <div className="text-[9px] text-[#B8A880] font-bold uppercase tracking-wider mb-1 mt-2 first:mt-0">
                  {msg.type.replace('_', ' ')}
                </div>
                <MessageBubble message={msg} />
              </div>
            ))}
          </div>
        </Section>

        {/* 6. Sidebar Agent Cards */}
        <Section title="Sidebar Agent Card" subtitle="Individual player entries as shown in the team sidebar">
          <div className="flex flex-wrap gap-3">
            <div>
              <div className="text-[10px] text-[#3B7DD8] font-bold uppercase tracking-wider mb-2">Blue Team</div>
              <div className="space-y-2 w-52">
                {renderAgentCard(blueSpymaster, 'Spymaster')}
                {blueOperatives.map(op => renderAgentCard(op, 'Operative'))}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#D94F3B] font-bold uppercase tracking-wider mb-2">Red Team</div>
              <div className="space-y-2 w-52">
                {renderAgentCard(redSpymaster, 'Spymaster')}
                {redOperatives.map(op => renderAgentCard(op, 'Operative'))}
              </div>
            </div>
          </div>
        </Section>

        {/* 7. Cinematic Agent Cards */}
        <Section title="Cinematic Agent Card (Video Mode Overlay)" subtitle="Large logo + name overlay as shown in cinematic/video mode">
          <div className="flex flex-wrap gap-4">
            {renderCinematicAgent(blueSpymaster, 'SPYMASTER', 'text-blue-300')}
            {renderCinematicAgent(blueOperatives[0], 'OPERATIVE', 'text-blue-300')}
            {renderCinematicAgent(redSpymaster, 'SPYMASTER', 'text-red-300')}
            {renderCinematicAgent(redOperatives[0], 'OPERATIVE', 'text-red-300')}
          </div>
        </Section>

        {/* 8. Player Avatars */}
        <Section title="Player Avatar" subtitle="Circular avatar with team-colored border and provider logo">
          <div className="flex flex-wrap gap-4 items-end">
            {DEMO_PLAYERS.map(player => (
              <div key={player.id} className="flex flex-col items-center gap-1">
                <PlayerAvatar player={player} isActive={false} size="md" />
                <span className="text-[9px] text-[#8C7F6A] text-center max-w-[60px] truncate">{player.name}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* 9. Provider Logos */}
        <Section title="Provider Logos" subtitle="All AI provider SVG logos">
          <div className="flex flex-wrap gap-6">
            {ALL_PROVIDERS.map(provider => (
              <div key={provider} className="flex flex-col items-center gap-2 bg-white rounded-lg border border-[#D4CDB8] p-3 min-w-[80px]">
                <ProviderLogo provider={provider} className="w-8 h-8" />
                <span className="text-[10px] text-[#8C7F6A] font-medium">{provider}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* 10. Clue Display (Scorebar pill) */}
        <Section title="Clue Pill" subtitle="The clue display as shown in the score bar">
          <div className="flex gap-4 items-center">
            <div className="px-4 py-1 rounded-full font-black text-xs tracking-widest shadow-md whitespace-nowrap border-2 font-display bg-[#3B7DD8] text-white border-[#2B5EA0]">
              WATER: 3
            </div>
            <div className="px-4 py-1 rounded-full font-black text-xs tracking-widest shadow-md whitespace-nowrap border-2 font-display bg-[#D94F3B] text-white border-[#B33A28]">
              FLAME: 2
            </div>
          </div>
        </Section>

        {/* 11. Winner Overlay Badge */}
        <Section title="Winner Overlay" subtitle="The victory announcement shown at game end">
          <div className="flex gap-6">
            <div className="text-center p-8 rounded-3xl shadow-lg bg-white border-4 border-[#3B7DD8] max-w-[240px]">
              <div className="text-4xl mb-2">🏆</div>
              <h2 className="text-2xl font-display text-[#3B7DD8]">BLUE TEAM WINS!</h2>
              <p className="text-[#8C7F6A] mt-1 text-sm">What a match!</p>
            </div>
            <div className="text-center p-8 rounded-3xl shadow-lg bg-white border-4 border-[#D94F3B] max-w-[240px]">
              <div className="text-4xl mb-2">🏆</div>
              <h2 className="text-2xl font-display text-[#D94F3B]">RED TEAM WINS!</h2>
              <p className="text-[#8C7F6A] mt-1 text-sm">What a match!</p>
            </div>
          </div>
        </Section>

        {/* 12. Dramatic Clue Reveal (Cinematic) */}
        <Section title="Dramatic Clue Reveal (Cinematic)" subtitle="The large cinematic clue reveal shown in video mode">
          <div className="flex gap-6">
            <div className="bg-black/80 rounded-2xl p-8 flex flex-col items-center gap-2">
              <span className="text-[10px] text-white/60 uppercase tracking-[0.3em] font-bold">Target Clue</span>
              <span className="text-5xl font-display text-white tracking-wider">
                <span className="text-[#3B7DD8]">WATER</span> : <span className="text-white">3</span>
              </span>
            </div>
            <div className="bg-black/80 rounded-2xl p-8 flex flex-col items-center gap-2">
              <span className="text-[10px] text-white/60 uppercase tracking-[0.3em] font-bold">Target Clue</span>
              <span className="text-5xl font-display text-white tracking-wider">
                <span className="text-[#D94F3B]">FLAME</span> : <span className="text-white">2</span>
              </span>
            </div>
          </div>
        </Section>

        <div className="h-16" />
      </div>
    </div>
  );
}
