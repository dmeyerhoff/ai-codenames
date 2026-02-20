import type { Player } from '../types/game';

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  contextWindowK: number; // in thousands of tokens
  inputCostM: number;     // per million input tokens
  outputCostM: number;    // per million output tokens
}

export const AVAILABLE_MODELS: AIModel[] = [
  { id: 'moonshotai/kimi-k2.5', name: 'Kimi K2.5', provider: 'MoonshotAI', contextWindowK: 262, inputCostM: 0.23, outputCostM: 3.00 },
  { id: 'moonshotai/kimi-k2-0905', name: 'Kimi k2', provider: 'MoonshotAI', contextWindowK: 131, inputCostM: 0.40, outputCostM: 2.00 },
  { id: 'stepfun/step-3.5-flash', name: 'Step 3.5 Flash', provider: 'StepFun', contextWindowK: 256, inputCostM: 0.10, outputCostM: 0.30 },
  { id: 'deepseek/deepseek-v3.2', name: 'DeepSeek V3.2', provider: 'DeepSeek', contextWindowK: 164, inputCostM: 0.26, outputCostM: 0.38 },
  { id: 'openai/gpt-5.2', name: 'GPT-5.2', provider: 'OpenAI', contextWindowK: 400, inputCostM: 1.75, outputCostM: 14.00 },
  { id: 'openai/gpt-5-nano', name: 'GPT-5 Nano', provider: 'OpenAI', contextWindowK: 400, inputCostM: 0.05, outputCostM: 0.40 },
  { id: 'google/gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', provider: 'Google', contextWindowK: 1050, inputCostM: 2.00, outputCostM: 12.00 },
  { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', provider: 'Google', contextWindowK: 1050, inputCostM: 0.50, outputCostM: 3.00 },
  { id: 'x-ai/grok-4', name: 'Grok 4', provider: 'xAI', contextWindowK: 256, inputCostM: 3.00, outputCostM: 15.00 },
  { id: 'x-ai/grok-4.1-fast', name: 'Grok 4.1 Fast', provider: 'xAI', contextWindowK: 2000, inputCostM: 0.20, outputCostM: 0.50 },
  { id: 'minimax/minimax-m2.5', name: 'MiniMax M2.5', provider: 'MiniMax', contextWindowK: 197, inputCostM: 0.30, outputCostM: 1.10 },
  { id: 'z-ai/glm-5', name: 'GLM-5', provider: 'Zhipu', contextWindowK: 205, inputCostM: 0.30, outputCostM: 2.55 },
  { id: 'z-ai/glm-4.7-flash', name: 'GLM-4.7 Flash', provider: 'Zhipu', contextWindowK: 203, inputCostM: 0.06, outputCostM: 0.40 },
  { id: 'qwen/qwen3-235b-a22b-2507', name: 'Qwen 3 (235B)', provider: 'Qwen', contextWindowK: 262, inputCostM: 0.071, outputCostM: 0.10 },
  { id: 'qwen/qwen3.5-397b-a17b', name: 'Qwen 3.5 (397B)', provider: 'Qwen', contextWindowK: 262, inputCostM: 0.15, outputCostM: 1.00 },
  { id: 'qwen/qwen3.5-plus-02-15', name: 'Qwen 3.5 Plus', provider: 'Qwen', contextWindowK: 1000, inputCostM: 0.40, outputCostM: 2.40 },
  { id: 'anthropic/claude-opus-4.6', name: 'Claude Opus 4.6', provider: 'Anthropic', contextWindowK: 1000, inputCostM: 5.00, outputCostM: 25.00 },
  { id: 'anthropic/claude-sonnet-4.6', name: 'Claude Sonnet 4.6', provider: 'Anthropic', contextWindowK: 1000, inputCostM: 3.00, outputCostM: 15.00 },
  { id: 'mistralai/mistral-small-3.2-24b-instruct', name: 'Mistral Small 3.2', provider: 'Mistral', contextWindowK: 131, inputCostM: 0.06, outputCostM: 0.18 },
];


// ═══════════════════════════════════════════════════════
// MODEL PRESETS - Switch between DEMO (original) and TEST (budget)
// Change the active preset by toggling the export at the bottom
// ═══════════════════════════════════════════════════════

// DEMO PRESET: Original pre-test models (~$2-5 per game)
const DEMO_PLAYERS: Player[] = [
  // Blue Team
  {
    id: 'blue-spy',
    name: 'GPT-5.2',
    model: 'openai/gpt-5.2',
    team: 'blue',
    role: 'spymaster',
    color: '#10B981',
    voiceId: 'en-US-AriaNeural',
    isCaptain: false,
  },
  {
    id: 'blue-op1',
    name: 'Claude Sonnet 4.5',
    model: 'anthropic/claude-sonnet-4.5',
    team: 'blue',
    role: 'operative',
    color: '#D97706',
    voiceId: 'en-US-GuyNeural',
    isCaptain: true,
  },
  {
    id: 'blue-op2',
    name: 'Gemini 3 Pro',
    model: 'google/gemini-3-pro-preview',
    team: 'blue',
    role: 'operative',
    color: '#8B5CF6',
    voiceId: 'en-GB-SoniaNeural',
    isCaptain: false,
  },
  {
    id: 'blue-op3',
    name: 'DeepSeek V3.2',
    model: 'deepseek/deepseek-v3.2',
    team: 'blue',
    role: 'operative',
    color: '#06B6D4',
    voiceId: 'en-GB-RyanNeural',
    isCaptain: false,
  },
  // Red Team
  {
    id: 'red-spy',
    name: 'Claude Opus 4.5',
    model: 'anthropic/claude-opus-4.5',
    team: 'red',
    role: 'spymaster',
    color: '#F472B6',
    voiceId: 'en-AU-NatashaNeural',
    isCaptain: false,
  },
  {
    id: 'red-op1',
    name: 'Gemini 3 Flash',
    model: 'google/gemini-3-flash-preview',
    team: 'red',
    role: 'operative',
    color: '#F59E0B',
    voiceId: 'en-AU-WilliamNeural',
    isCaptain: true,
  },
  {
    id: 'red-op2',
    name: 'Kimi K2.5',
    model: 'moonshotai/kimi-k2.5',
    team: 'red',
    role: 'operative',
    color: '#EF4444',
    voiceId: 'en-CA-ClaraNeural',
    isCaptain: false,
  },
  {
    id: 'red-op3',
    name: 'Grok 4.1',
    model: 'x-ai/grok-4.1-fast',
    team: 'red',
    role: 'operative',
    color: '#A78BFA',
    voiceId: 'en-CA-LiamNeural',
    isCaptain: false,
  },
];

// TEST PRESET: Budget-friendly models (~$0.20-0.50 per game)
const TEST_PLAYERS: Player[] = [
  // Blue Team
  {
    id: 'blue-spy',
    name: 'Gemini 3 Flash',
    model: 'google/gemini-3-flash-preview',
    team: 'blue',
    role: 'spymaster',
    color: '#10B981',
    voiceId: 'en-US-AriaNeural',
    isCaptain: false,
  },
  {
    id: 'blue-op1',
    name: 'DeepSeek V3.2',
    model: 'deepseek/deepseek-v3.2',
    team: 'blue',
    role: 'operative',
    color: '#D97706',
    voiceId: 'en-US-GuyNeural',
    isCaptain: true,
  },
  {
    id: 'blue-op2',
    name: 'Gemini 3 Flash B',
    model: 'google/gemini-3-flash-preview',
    team: 'blue',
    role: 'operative',
    color: '#8B5CF6',
    voiceId: 'en-GB-SoniaNeural',
    isCaptain: false,
  },
  {
    id: 'blue-op3',
    name: 'DeepSeek V3.2 B',
    model: 'deepseek/deepseek-v3.2',
    team: 'blue',
    role: 'operative',
    color: '#06B6D4',
    voiceId: 'en-GB-RyanNeural',
    isCaptain: false,
  },
  // Red Team
  {
    id: 'red-spy',
    name: 'DeepSeek V3.2 C',
    model: 'deepseek/deepseek-v3.2',
    team: 'red',
    role: 'spymaster',
    color: '#F472B6',
    voiceId: 'en-AU-NatashaNeural',
    isCaptain: false,
  },
  {
    id: 'red-op1',
    name: 'Gemini 3 Flash C',
    model: 'google/gemini-3-flash-preview',
    team: 'red',
    role: 'operative',
    color: '#F59E0B',
    voiceId: 'en-AU-WilliamNeural',
    isCaptain: true,
  },
  {
    id: 'red-op2',
    name: 'DeepSeek V3.2 D',
    model: 'deepseek/deepseek-v3.2',
    team: 'red',
    role: 'operative',
    color: '#EF4444',
    voiceId: 'en-CA-ClaraNeural',
    isCaptain: false,
  },
  {
    id: 'red-op3',
    name: 'Gemini 3 Flash D',
    model: 'google/gemini-3-flash-preview',
    team: 'red',
    role: 'operative',
    color: '#A78BFA',
    voiceId: 'en-CA-LiamNeural',
    isCaptain: false,
  },
];

// ═══════════════════════════════════════════════════════
// ACTIVE PRESET: Change this line to switch between presets
// ═══════════════════════════════════════════════════════
const USE_DEMO = false; // Set to true for original models, false for budget testing

export const PLAYERS: Player[] = USE_DEMO ? DEMO_PLAYERS : TEST_PLAYERS;

export function getTeamPlayers(team: 'blue' | 'red') {
  return PLAYERS.filter(p => p.team === team);
}

export function getSpymaster(team: 'blue' | 'red') {
  return PLAYERS.find(p => p.team === team && p.role === 'spymaster')!;
}

export function getOperatives(team: 'blue' | 'red') {
  return PLAYERS.filter(p => p.team === team && p.role === 'operative');
}

export function getCaptain(team: 'blue' | 'red') {
  return PLAYERS.find(p => p.team === team && p.role === 'operative' && p.isCaptain)!;
}
