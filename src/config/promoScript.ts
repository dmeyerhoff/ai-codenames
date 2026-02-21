import type { Card, CardType } from '../types/game';

interface PromoConversationMessage {
  playerId: string;
  content: string;
}

interface PromoGuess {
  word: string;
  type: CardType;
  reaction: string;
  reactionPlayerId: string;
}

export interface PromoScript {
  blueClue: { word: string; number: number };
  spymasterReasoning: string;
  conversation: PromoConversationMessage[];
  guesses: PromoGuess[];
  redTeaser: string;
}

// Board from analyzed match data
export const PROMO_BOARD: Card[] = [
  { word: 'WAKE', type: 'red', revealed: false, position: 0 },
  { word: 'COLD', type: 'blue', revealed: false, position: 1 },
  { word: 'SUIT', type: 'blue', revealed: false, position: 2 },
  { word: 'PIRATE', type: 'red', revealed: false, position: 3 },
  { word: 'DAY', type: 'red', revealed: false, position: 4 },
  { word: 'ROME', type: 'red', revealed: false, position: 5 },
  { word: 'GAS', type: 'bystander', revealed: false, position: 6 },
  { word: 'RAY', type: 'bystander', revealed: false, position: 7 },
  { word: 'STAFF', type: 'blue', revealed: false, position: 8 },
  { word: 'EGYPT', type: 'red', revealed: false, position: 9 },
  { word: 'FORK', type: 'assassin', revealed: false, position: 10 },
  { word: 'ICE', type: 'blue', revealed: false, position: 11 },
  { word: 'SPOT', type: 'blue', revealed: false, position: 12 },
  { word: 'SPY', type: 'blue', revealed: false, position: 13 },
  { word: 'MODEL', type: 'blue', revealed: false, position: 14 },
  { word: 'DATE', type: 'bystander', revealed: false, position: 15 },
  { word: 'TICKET', type: 'red', revealed: false, position: 16 },
  { word: 'BUFFALO', type: 'bystander', revealed: false, position: 17 },
  { word: 'IRON', type: 'blue', revealed: false, position: 18 },
  { word: 'SPACE', type: 'red', revealed: false, position: 19 },
  { word: 'SADDLE', type: 'bystander', revealed: false, position: 20 },
  { word: 'STRING', type: 'bystander', revealed: false, position: 21 },
  { word: 'LAB', type: 'red', revealed: false, position: 22 },
  { word: 'LEMONADE', type: 'blue', revealed: false, position: 23 },
  { word: 'CAPITAL', type: 'bystander', revealed: false, position: 24 },
];

export const PROMO_SCRIPT: PromoScript = {
  blueClue: { word: 'AGENT', number: 3 },

  spymasterReasoning:
    `Targeting SPY, STAFF, and IRON. "Agent" connects SPY for secret agent, STAFF for staffing agent, and IRON — the weapon an undercover agent carries. Confidently avoids our assassin FORK.`,

  conversation: [
    {
      playerId: 'blue-op1',
      content:
        `Alright team, "AGENT: 3." SPY is an absolute slam dunk for a secret agent, and STAFF works perfectly for personnel. For our third, I'm strongly leaning towards CAPITAL — like a financial agent or capital agent.`,
    },
    {
      playerId: 'blue-op2',
      content:
        `I agree with SPY and STAFF, but I'd push back heavily on CAPITAL. What about IRON? Undercover agents "pack iron" in thriller novels, which fits the espionage theme much better.`,
    },
    {
      playerId: 'blue-op3',
      content:
        `IRON is way too much of a lateral stretch for this board! Financial agents handle CAPITAL all the time in the real world. Captain, let's lock in SPY first, and then go straight for CAPITAL.`,
    },
  ],

  guesses: [
    {
      word: 'SPY',
      type: 'blue',
      reaction: 'Nice start! SPY was the safest bet on the board.',
      reactionPlayerId: 'blue-op2',
    },
    {
      word: 'CAPITAL',
      type: 'bystander',
      reaction: 'Ouch, a bystander! I completely led us into a trap with that financial angle.',
      reactionPlayerId: 'blue-op3',
    },
  ],

  redTeaser:
    `Blue tripping up on Capital gives us the perfect opening to take the lead. Looking at Pirate, Space, and Wake, I can link all of them beautifully with a single nautical concept...`,
};
