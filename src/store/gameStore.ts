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
  appendReplayMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, content: string) => void;
  setDurationMs: (msgId: string, durationMs: number) => void;
  switchTeam: () => void;
  setWinner: (team: Team) => void;
  setIsRunning: (v: boolean) => void;
  setSpeed: (s: number) => void;
  setTtsEnabled: (v: boolean) => void;
  incrementConversationRound: () => void;
  resetConversationRound: () => void;
  rotateCaptain: (team: Team) => void;
  toggleRevealedMode: () => void;
  setPlayerModel: (playerId: string, modelId: string, modelName: string) => void;
  setMasterModel: (modelId: string, modelName: string) => void;
  clearWinner: () => void;
  startPlayback: () => void;
  stopPlayback: () => void;
  setPlaybackSpeed: (speed: number) => void;
  loadMatch: (state: Partial<GameState>) => void;
  goToPlaybackIndex: (index: number) => void;
  toggleVideoMode: () => void;
  setIsBoardRevealed: (v: boolean) => void;
  toggleFooterHidden: () => void;
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
    isRevealedMode: false,
    isVideoMode: false,
    isBoardRevealed: true,
    isFooterHidden: false,
    masterModel: { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash' },
    playbackMode: false,
    playbackMessages: [],
    playbackSpeed: 1,
    currentPlaybackIndex: 0,
    originalReplayBoard: [],
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

  appendReplayMessage: (msg) => {
    set(state => ({ messages: [...state.messages, msg] }));
  },

  updateMessage: (id, content) => {
    set(state => ({
      messages: state.messages.map(m => m.id === id ? { ...m, content } : m)
    }));
  },

  setDurationMs: (id, durationMs) => {
    set(state => ({
      messages: state.messages.map(m => m.id === id ? { ...m, durationMs } : m)
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

  toggleVideoMode: () => set(state => {
    const newVideoMode = !state.isVideoMode;
    return {
      isVideoMode: newVideoMode,
      isBoardRevealed: !newVideoMode || state.isRunning,
      isFooterHidden: newVideoMode, // auto hide footer in video mode
    };
  }),

  setIsBoardRevealed: (v) => set({ isBoardRevealed: v }),

  toggleFooterHidden: () => set(state => ({ isFooterHidden: !state.isFooterHidden })),

  setPlayerModel: (playerId, modelId, modelName) => set(state => ({
    players: state.players.map(p =>
      p.id === playerId ? { ...p, model: modelId, name: modelName } : p
    )
  })),

  setMasterModel: (modelId, modelName) => set({ masterModel: { id: modelId, name: modelName } }),

  clearWinner: () => set({ winner: null }),

  startPlayback: () => set({ playbackMode: true, isRunning: true }),

  stopPlayback: () => set({ isRunning: false }),

  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  loadMatch: (state) => {
    if (!state.board || !state.players || !state.messages) return;

    const resetBoard = state.board.map(c => ({ ...c, revealed: false }));

    set({
      ...createInitialState(),
      board: resetBoard,
      originalReplayBoard: resetBoard,
      players: state.players,
      masterModel: state.masterModel || { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash' },
      playbackMessages: state.messages,
      playbackMode: true,
      isRunning: false,
      phase: 'setup',
      currentPlaybackIndex: 0,
      messages: [],
    });
  },

  goToPlaybackIndex: (index) => {
    const state = get();
    if (!state.playbackMode || state.playbackMessages.length === 0) return;

    const clampedIndex = Math.max(0, Math.min(index, state.playbackMessages.length - 1));

    const board = state.originalReplayBoard.map(c => ({ ...c }));
    let blueScore = 0;
    let redScore = 0;
    let winner: import('../types/game').Team | null = null;
    let currentClue: import('../types/game').Clue | null = null;
    let activePlayerId: string | null = null;

    // Generate view up to the clamped index
    // if index is -1, we want 0 messages. Let's say if index >= 0, we slice to clampedIndex + 1.
    // If we want a truly zero state, we need to allow index -1. But 0 is fine, it's just the first message.
    const messages = state.playbackMessages.slice(0, clampedIndex + 1);

    messages.forEach(msg => {
      activePlayerId = msg.playerId;
      if (msg.type === 'clue') {
        const parts = msg.content.split(':');
        if (parts.length >= 2) {
          currentClue = { word: parts[0].trim(), number: parseInt(parts[1].trim(), 10) };
        }
      } else if (msg.type === 'guess_result') {
        const [word] = msg.content.split(':');
        const card = board.find(c => c.word.toUpperCase() === word.toUpperCase() && !c.revealed);
        if (card) {
          card.revealed = true;
          if (card.type === 'blue') blueScore++;
          if (card.type === 'red') redScore++;
        }
      } else if (msg.type === 'system' && msg.content.includes('WINS!')) {
        if (msg.content.includes('BLUE TEAM WINS')) winner = 'blue';
        if (msg.content.includes('RED TEAM WINS')) winner = 'red';
      }
    });

    set({
      board,
      blueScore,
      redScore,
      winner,
      currentClue,
      activePlayerId,
      messages,
      currentPlaybackIndex: clampedIndex
    });
  },
}));
