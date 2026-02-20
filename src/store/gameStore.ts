import { create } from 'zustand';
import type { GameState, ChatMessage, Clue, Team, GamePhase } from '../types/game';
import { PLAYERS } from '../config/models';
import { generateBoard } from '../engine/boardGenerator';

interface GameActions {
  newGame: () => void;
  setPhase: (phase: GamePhase) => void;
  setActivePlayer: (playerId: string | null) => void;
  setCurrentClue: (clue: Clue | null) => void;
  setGuessesRemaining: (n: number) => void;
  setPlusOneAvailable: (v: boolean) => void;
  revealCard: (word: string) => void;
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => string;
  updateMessage: (id: string, content: string) => void;
  switchTeam: () => void;
  setWinner: (team: Team) => void;
  setIsRunning: (v: boolean) => void;
  setSpeed: (s: number) => void;
  setTtsEnabled: (v: boolean) => void;
  incrementConversationRound: () => void;
  resetConversationRound: () => void;
  setOperativeReflection: (playerId: string, reflection: string) => void;
  clearOperativeReflections: () => void;
  rotateCaptain: (team: Team) => void;
  toggleRevealedMode: () => void;
  setPlayerModel: (playerId: string, modelId: string, modelName: string) => void;
  setThinkingPhaseEnabled: (v: boolean) => void;
}

type GameStore = GameState & GameActions;

function createInitialState(): GameState {
  const board = generateBoard();
  return {
    board,
    players: [...PLAYERS],
    currentTeam: 'blue',
    phase: 'setup',
    currentClue: null,
    guessesRemaining: 0,
    plusOneAvailable: true,
    messages: [],
    activePlayerId: null,
    blueScore: 0,
    redScore: 0,
    blueTotal: 9,
    redTotal: 8,
    winner: null,
    roundNumber: 1,
    isRunning: false,
    speed: 1,
    ttsEnabled: true,
    conversationRound: 0,
    operativeReflections: {},
    isRevealedMode: false,
    thinkingPhaseEnabled: true,
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState(),

  newGame: () => set({ ...createInitialState() }),

  setPhase: (phase) => set({ phase }),

  setActivePlayer: (playerId) => set({ activePlayerId: playerId }),

  setCurrentClue: (clue) => set({ currentClue: clue }),

  setGuessesRemaining: (n) => set({ guessesRemaining: n }),

  setPlusOneAvailable: (v) => set({ plusOneAvailable: v }),

  revealCard: (word) => {
    const { board } = get();
    const card = board.find(c => c.word === word);
    if (!card || card.revealed) return;

    const newBoard = board.map(c =>
      c.word === word ? { ...c, revealed: true } : c
    );

    const blueScore = newBoard.filter(c => c.revealed && c.type === 'blue').length;
    const redScore = newBoard.filter(c => c.revealed && c.type === 'red').length;

    set({ board: newBoard, blueScore, redScore });
  },

  addMessage: (msg) => {
    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const message: ChatMessage = { ...msg, id, timestamp: Date.now() };
    set(state => ({ messages: [...state.messages, message] }));
    return id;
  },

  updateMessage: (id, content) => {
    set(state => ({
      messages: state.messages.map(m => m.id === id ? { ...m, content } : m)
    }));
  },

  switchTeam: () => {
    const { currentTeam, roundNumber } = get();
    const nextTeam = currentTeam === 'blue' ? 'red' : 'blue';
    set({
      currentTeam: nextTeam,
      roundNumber: nextTeam === 'blue' ? roundNumber + 1 : roundNumber,
    });
  },

  setWinner: (team) => set({ winner: team, phase: 'game_over' }),

  setIsRunning: (v) => set({ isRunning: v }),

  setSpeed: (s) => set({ speed: s }),

  setTtsEnabled: (v) => set({ ttsEnabled: v }),

  incrementConversationRound: () =>
    set(state => ({ conversationRound: state.conversationRound + 1 })),

  resetConversationRound: () => set({ conversationRound: 0 }),

  setOperativeReflection: (playerId, reflection) =>
    set(state => ({
      operativeReflections: { ...state.operativeReflections, [playerId]: reflection },
    })),

  clearOperativeReflections: () => set({ operativeReflections: {} }),

  rotateCaptain: (team) => {
    const { players } = get();
    const ops = players.filter(p => p.team === team && p.role === 'operative');
    const currentCaptainIdx = ops.findIndex(p => p.isCaptain);
    const nextCaptainIdx = (currentCaptainIdx + 1) % ops.length;

    const newPlayers = players.map(p => {
      if (p.team !== team || p.role !== 'operative') return p;
      return { ...p, isCaptain: p.id === ops[nextCaptainIdx].id };
    });

    set({ players: newPlayers });
  },

  toggleRevealedMode: () => set(state => ({ isRevealedMode: !state.isRevealedMode })),

  setPlayerModel: (playerId, modelId, modelName) => set(state => ({
    players: state.players.map(p =>
      p.id === playerId ? { ...p, model: modelId, name: modelName } : p
    )
  })),

  setThinkingPhaseEnabled: (v) => set({ thinkingPhaseEnabled: v }),
}));
