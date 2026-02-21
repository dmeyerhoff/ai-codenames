import type { Card, Player, Team, Clue, ChatMessage } from '../types/game';
import { getBoardStateForSpymaster, getBoardStateForOperatives, getBoardGrid } from '../engine/boardGenerator';

export const GAME_RULES = `## Codenames Rules

The game is played with a **5x5 grid** of 25 cards, each containing a single word.

**Teams:** Two teams (Red and Blue), each with a Spymaster and Operatives.
- **Spymaster:** Knows the secret identity of every card. Gives one-word clues followed by a number.
- **Operatives:** Guess which words belong to their team based on the Spymaster's clue.

**Card Types:**
- **Agent Cards:** Belong to Blue or Red team
- **Bystanders:** Neutral. Guessing one ends your turn immediately.
- **Assassin:** One black card. If guessed, your team LOSES instantly.

**Clue Format:** One word + a number (e.g., "Animal: 3" means 3 words relate to "Animal")

**Guessing:**
- Correct agent → keep guessing
- Bystander → turn ends
- Enemy agent → turn ends (you helped them!)
- Assassin → game over, you lose

**+1 Rule:** Operatives can make one extra guess beyond the number given.

**Spymaster Rules:** No part of a board word, no table talk, English only.

**Captain System:** One operative is Captain per turn. Captain makes final call on guesses. If disagreement drags, captain can end discussion and guess.`;

function formatGrid(board: Card[]): string {
  const grid = getBoardGrid(board);
  const maxLen = Math.max(...board.map(c => c.word.length));
  return grid.map(row =>
    '| ' + row.map(w => w.padEnd(maxLen)).join(' | ') + ' |'
  ).join('\n');
}

function getTeamRoster(players: Player[], team: Team): string {
  const teamPlayers = players.filter(p => p.team === team);
  const spy = teamPlayers.find(p => p.role === 'spymaster')!;
  const ops = teamPlayers.filter(p => p.role === 'operative');
  return `Spymaster: ${spy.name}\nOperatives: ${ops.map(o => o.name + (o.isCaptain ? ' (Captain)' : '')).join(', ')}`;
}

export function buildSpymasterPrompt(
  player: Player,
  board: Card[],
  players: Player[],
  conversationHistory?: string,
): string {
  const state = getBoardStateForSpymaster(board);
  const team = player.team;
  const otherTeam = team === 'blue' ? 'red' : 'blue';

  let prompt = ``;

  prompt += `## Your Role
You are the ${team.toUpperCase()} team's SPYMASTER (${player.name}).

Your team:
${getTeamRoster(players, team)}

Opponent team:
${getTeamRoster(players, otherTeam)}

## Board
${formatGrid(board)}

## Board State (Secret - Only You Can See This)

Remaining cards:
- ${team.charAt(0).toUpperCase() + team.slice(1)} agents (${state.remaining[team].length}): ${state.remaining[team].join(', ') || 'None'}
- ${otherTeam.charAt(0).toUpperCase() + otherTeam.slice(1)} agents (${state.remaining[otherTeam].length}): ${state.remaining[otherTeam].join(', ') || 'None'}
- Bystanders (${state.remaining.bystander.length}): ${state.remaining.bystander.join(', ') || 'None'}
- Assassin (${state.remaining.assassin.length}): ${state.remaining.assassin.join(', ') || 'None'}

Revealed cards:
- ${team.charAt(0).toUpperCase() + team.slice(1)} agents: ${state.revealed[team].join(', ') || 'None'}
- ${otherTeam.charAt(0).toUpperCase() + otherTeam.slice(1)} agents: ${state.revealed[otherTeam].join(', ') || 'None'}
- Bystanders: ${state.revealed.bystander.join(', ') || 'None'}
- Assassin: ${state.revealed.assassin.join(', ') || 'None'}`;

  if (conversationHistory) {
    prompt += `\n\n## Previous Round's Operative Discussion\n${conversationHistory}`;
  }

  prompt += `\n\n## Your Task
Give a clue to your operatives. Format your response EXACTLY like this:

Target Words: [List the exact words you are targeting, and verify their alignment]
CLUE: [single word]: [number]
Reasoning: [Explain briefly why this clue connects to your target words, and crucially, explain why you are confident it avoids associating with the opponent's agents, bystanders, or the assassin.]

STRATEGIC GUIDELINES:
1. Board State Awareness: Always check the score and compare your remaining agents to the opponent's.
2. The "Hail Mary" Play: If the opponent is 1 or 2 words away from winning and you are far behind, you should take massive risks. In this desperate scenario, give a single clue that targets ALL of your remaining words. A weak or abstract connection that gives your team a 1% chance to win is better than a safe clue that mathematically guarantees a loss.

CRITICAL RULES:
1. Your clue MUST NOT be any word (or derivation of a word) that is currently visible on the board.
2. Your clue MUST target words that are currently on the board. Do not hallucinate words that are not on the board.
3. Prioritize direct definitions and strong, obvious associations over weak, lateral, or multi-step logical jumps.`;

  return prompt;
}



export function buildConversationPrompt(
  player: Player,
  board: Card[],
  players: Player[],
  clue: Clue,
  conversationSoFar: ChatMessage[],
  isStarter: boolean,
  previousTeamSummaries: string[],
): string {
  const state = getBoardStateForOperatives(board);
  const team = player.team;

  let prompt = ``;

  prompt += `## Phase: TEAM CONVERSATION

You are ${player.name}, a ${team.toUpperCase()} team OPERATIVE.${player.isCaptain ? ' You are CAPTAIN.' : ''}

Your team:
${getTeamRoster(players, team)}

Clue from spymaster: "${clue.word}: ${clue.number}"

## Score State
- Blue Team: ${state.revealed.blue.length} / 9 agents found
- Red Team: ${state.revealed.red.length} / 8 agents found

Unknown cards currently on board: ${state.unknown.join(', ')}

`;



  if (previousTeamSummaries.length > 0) {
    prompt += `## Your Team's Previous Thoughts (From Past Rounds)
${previousTeamSummaries.map(s => `- ${s}`).join('\n')}

`;
  }

  if (isStarter) {
    prompt += `You are starting the team discussion as captain. Share your thinking on the best guesses and ask your teammates for their input. Be conversational and natural.
Note: Be extremely conservative with using your "+1" bonus guess. Only use it to catch up on previously missed clues if you are 100% certain. Otherwise, pass your turn to avoid hitting the assassin or enemy agents.\n`;
  } else {
    prompt += `Guidelines:
- Give explicit verbal agreement if you want the captain to go ahead with guessing
- If you disagree, be argumentative and persuasive
- If you think more discussion is needed, say so
- Be extremely conservative about extending to a +1 bonus guess. Advise the captain to pass unless you are highly certain.

STRATEGIC GUIDELINES:
1. Score Literacy: Compare your team's progress to the opponent's. 
2. Calculated Risk: While usually conservative, if the opponent is at 8/9 (one word from winning) and your team is at 4/8, being "safe" is effectively surrendering. In desperate endgame scenarios, you should be willing to guess on weaker connections. A risky guess that might be right is better than passing and letting the opponent win on their next turn.
`;
  }

  const validMessages = conversationSoFar.filter(msg => {
    const text = msg.content?.trim();
    if (!text) return false;
    if (/^(guess:\s*[a-zA-Z]+|pass|clue:\s*.*)$/i.test(text)) return false;
    return true;
  });

  if (validMessages.length > 0) {
    prompt += `\n## Conversation So Far\n`;
    for (const msg of validMessages) {
      prompt += `\n${msg.playerName} says:\n${msg.content}\n`;
    }
  }

  prompt += `\n## Important
CRITICAL: Do not output any meta-commentary, do not acknowledge these instructions, and do not wrap your dialogue in quotation marks. Output ONLY what you say to your team. Keep it concise (2-4 short paragraphs max).
CRITICAL RULE: You MUST ONLY discuss words that are explicitly in the 'Unknown cards' list. DO NOT hallucinate words that are not there.`;

  return prompt;
}

export function buildGuessingPrompt(
  player: Player,
  board: Card[],
  players: Player[],
  clue: Clue,
  conversationMessages: ChatMessage[],
  previousGuesses: { word: string; result: string }[],
  guessesRemaining: number,
  plusOneAvailable: boolean,
  previousTeamSummaries: string[],
): string {
  const state = getBoardStateForOperatives(board);
  const team = player.team;

  let prompt = ``;

  prompt += `## Phase: GUESSING

You are ${player.name}, CAPTAIN of the ${team.toUpperCase()} team.

Your team:
${getTeamRoster(players, team)}

Clue: "${clue.word}: ${clue.number}"

## Score State
- Blue Team: ${state.revealed.blue.length} / 9 agents found
- Red Team: ${state.revealed.red.length} / 8 agents found

Unknown cards remaining: ${state.unknown.join(', ')}
`;

  if (previousTeamSummaries.length > 0) {
    prompt += `\n## Your Team's Previous Thoughts (From Past Rounds)
${previousTeamSummaries.map(s => `- ${s}`).join('\n')}
`;
  }

  const validMessages = conversationMessages.filter(msg => {
    const text = msg.content?.trim();
    if (!text) return false;
    if (/^(guess:\s*[a-zA-Z]+|pass|clue:\s*.*)$/i.test(text)) return false;
    return true;
  });

  if (validMessages.length > 0) {
    prompt += `\n## Team Conversation Log\n`;
    for (const msg of validMessages) {
      prompt += `\n${msg.playerName} says:\n${msg.content}\n`;
    }
  }

  if (previousGuesses.length > 0) {
    prompt += `\nPrevious guesses this turn:\n`;
    for (const g of previousGuesses) {
      prompt += `- ${g.word} → ${g.result}\n`;
    }
  }

  prompt += `\nYou have ${guessesRemaining} guess(es) remaining${plusOneAvailable ? ' (plus the +1 bonus guess still available)' : ''}.

CRITICAL RULES:
1. The word you guess MUST be exactly from the 'Unknown cards remaining' list. Do NOT hallucinate words.
2. If this is your final (+1 bonus) guess and you are not extremely confident, you should strongly consider passing rather than risking a blind guess that might hit a bystander or enemy agent.

Based on your team's discussion, provide your NEXT SINGLE GUESS.

STRATEGIC GUIDELINES:
1. Endgame Urgency: If the opponent only needs 1 or 2 more words to win, your "conservative" nature should shift to "desperate." 
2. The "Loss Clock": If you pass the turn and the opponent is likely to win, you have lost. Therefore, in a losing board state, a low-confidence guess is better than no guess. Only pass if you are genuinely afraid of hitting the assassin or if you truly believe the opponent won't win next turn.

Format: GUESS: [WORD]

Then briefly explain why, conversationally. If you want to stop guessing and pass the turn, say: PASS`;

  return prompt;
}

export function buildReactionPrompt(
  player: Player,
  players: Player[],
  guesses: { word: string; result: string }[],
  clue: Clue,
  conversationMessages: ChatMessage[],
  previousReactions: ChatMessage[],
): string {
  const team = player.team;

  let prompt = ``;

  prompt += `## Phase: GUESS REACTION

You are ${player.name}, a ${team.toUpperCase()} team OPERATIVE. Your team just finished guessing for the clue "${clue.word}: ${clue.number}".

Your team:
${getTeamRoster(players, team)}

`;

  const validMessages = conversationMessages.filter(msg => {
    const text = msg.content?.trim();
    if (!text) return false;
    if (/^(guess:\s*[a-zA-Z]+|pass|clue:\s*.*)$/i.test(text)) return false;
    return true;
  });

  if (validMessages.length > 0) {
    prompt += `## Team Conversation Log\n`;
    for (const msg of validMessages) {
      prompt += `\n${msg.playerName} says:\n${msg.content}\n`;
    }
    prompt += `\n`;
  }

  prompt += `Results:
${guesses.map((g, i) => `${i + 1}. ${g.word} → ${g.result}`).join('\n')}

`;

  const validReactions = previousReactions.filter(msg => msg.content?.trim());
  if (validReactions.length > 0) {
    prompt += `## Previous Reactions So Far\n`;
    for (const msg of validReactions) {
      prompt += `\n${msg.playerName} says:\n${msg.content}\n`;
    }
    prompt += `\n`;
  }

  prompt += `Give a very short reaction (1-2 sentences max). Be natural, highly conversational, and opinionated. 
If your team guessed an opponent's card or the assassin, be highly critical and playfully roast or flame whoever championed that bad guess (especially if it wasn't you).
Celebrate good guesses, commiserate on bystanders, or reflect on the results. No headers or formatting.`;

  return prompt;
}
