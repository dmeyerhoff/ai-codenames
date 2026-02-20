export type Team = 'blue' | 'red';
export type CardType = 'blue' | 'red' | 'bystander' | 'assassin';
export type PlayerRole = 'spymaster' | 'operative';

export interface Card {
  word: string;
  type: CardType;
  revealed: boolean;
  position: number;
}

export interface Player {
  id: string;
  name: string;
  model: string;
  team: Team;
  role: PlayerRole;
  color: string;
  voiceId: string;
  isCaptain: boolean;
}

export interface Clue {
  word: string;
  number: number;
  reasoning?: string;
}

export interface Guess {
  word: string;
  result: CardType | null;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  team: Team;
  content: string;
  type: 'internal_monologue' | 'conversation' | 'clue' | 'guess' | 'reaction' | 'system' | 'summary';
  prompt?: string;
  hidden?: boolean;
  timestamp: number;
}

export type GamePhase =
  | 'setup'
  | 'spymaster_thinking'
  | 'clue_reveal'
  | 'operatives_reflecting'
  | 'team_conversation'
  | 'guessing'
  | 'guess_reactions'
  | 'switch_team'
  | 'game_over';

export interface GameState {
  board: Card[];
  players: Player[];
  currentTeam: Team;
  phase: GamePhase;
  currentClue: Clue | null;
  guessesRemaining: number;
  plusOneAvailable: boolean;
  messages: ChatMessage[];
  activePlayerId: string | null;
  blueScore: number;
  redScore: number;
  blueTotal: number;
  redTotal: number;
  winner: Team | null;
  roundNumber: number;
  isRunning: boolean;
  speed: number;
  ttsEnabled: boolean;
  conversationRound: number;
  operativeReflections: Record<string, string>;
  isRevealedMode: boolean;
  thinkingPhaseEnabled: boolean;
}
