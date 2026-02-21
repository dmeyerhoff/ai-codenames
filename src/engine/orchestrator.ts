import { useGameStore } from '../store/gameStore';
import { callOpenRouter } from '../services/openrouter';
import { speak, stopSpeaking } from '../services/tts';
import { parseClue, parseGuess, cleanResponse } from './responseParser';
import {
  buildSpymasterPrompt,
  buildConversationPrompt,
  buildGuessingPrompt,
  buildReactionPrompt,
  GAME_RULES,
} from '../config/prompts';
import type { Team } from '../types/game';

const MAX_CONVERSATION_ROUNDS = 4;

function delay(ms: number): Promise<void> {
  const speed = useGameStore.getState().speed;
  return new Promise(resolve => setTimeout(resolve, ms / speed));
}

function isRunning(): boolean {
  const state = useGameStore.getState();
  return state.isRunning && !state.playbackMode;
}

function getStore() {
  return useGameStore.getState();
}

async function speakIfEnabled(text: string, voiceId: string) {
  const { ttsEnabled, speed } = getStore();
  if (ttsEnabled) {
    // Truncate for TTS - speak first ~200 chars
    const truncated = text.length > 200 ? text.slice(0, 200) + '...' : text;
    await speak(truncated, voiceId, speed);
  }
}

async function repairResponseWithGameMaster(
  failedText: string,
  expectedFormat: string,
  msgId: string
): Promise<string> {
  const store = getStore();
  const prompt = `You are a Game Master AI silently repairing an AI's malformed response.

Expected format:
${expectedFormat}

Failed response:
"""
${failedText}
"""

Rewrite their response to be exactly in the expected format. Output ONLY the valid text, with no system commentary.`;

  try {
    store.updateMessage(msgId, '*reformatting output...*');
    const repaired = await callOpenRouter(store.masterModel.id, prompt);
    store.updateMessage(msgId, repaired);
    return repaired;
  } catch (err) {
    console.error('Repair failed', err);
    store.updateMessage(msgId, failedText);
    return failedText;
  }
}

async function safeCallPlayerModel(
  player: import('../types/game').Player,
  prompt: string,
  msgId: string,
  systemPrompt: string,
): Promise<string> {
  const store = getStore();
  const startTime = Date.now();
  try {
    const response = await callOpenRouter(
      player.model,
      prompt,
      (text) => store.updateMessage(msgId, text),
      systemPrompt
    );
    if (!response || response.trim() === '') throw new Error('Empty response');

    store.setDurationMs(msgId, Date.now() - startTime);
    return response;
  } catch (err) {
    console.warn(`[Fallback] ${player.model} failed. Using Game Master fallback.`, err);

    const fallbackPrompt = `The original AI failed to formulate a response. Impersonate them and fulfill this prompt perfectly. Keep it extremely brief and natural. Do not mention that you are a fallback.
    
Original Prompt:
"""
${prompt}
"""`;

    store.updateMessage(msgId, '*connection unstable... rerouting...*');
    await delay(500);
    store.updateMessage(msgId, '');

    const fallbackResponse = await callOpenRouter(
      store.masterModel.id,
      fallbackPrompt,
      (text) => store.updateMessage(msgId, text),
      systemPrompt
    );

    store.setDurationMs(msgId, Date.now() - startTime);
    return fallbackResponse;
  }
}

async function generateMessageSummary(
  playerId: string,
  playerName: string,
  team: Team,
  rawText: string,
  type: 'monologue' | 'chat',
  currentClue: string
) {
  const store = getStore();

  // Insert placeholder synchronously to hold the chronological spot
  const summaryMsgId = store.addMessage({
    playerId,
    playerName,
    team,
    content: '💡 Generating summary...',
    type: 'summary',
  });

  const contextStr = type === 'monologue'
    ? `just finished their private internal monologue`
    : `just sent a message in the team chat`;

  const prompt = `You are the Game Master AI. A ${team} team player (${playerName}) ${contextStr} regarding the clue "${currentClue}".

Here is their exact message/thought process:
"""
${rawText}
"""

Summarize what they are saying or thinking about in EXACTLY 1 short, punchy sentence. 
CRITICAL: You MUST explicitly mention the clue in your summary.
Example: For the clue 'FLY: 2', DeepSeek is considering LONDON and BIRD.
DO NOT use quotes. Just output the summary sentence directly.`;

  try {
    const summary = await callOpenRouter(store.masterModel.id, prompt);
    store.updateMessage(summaryMsgId, `💡 ${summary}`);
  } catch (err) {
    console.error('Failed to generate summary', err);
    store.updateMessage(summaryMsgId, `💡 (Summary generation failed)`);
  }
}

export async function runGame() {
  const store = getStore();
  if (store.playbackMode) return;

  store.setIsRunning(true);

  // Board reveal sequence — flip cards in with staggered animation
  store.setPhase('board_reveal');
  store.setIsBoardRevealed(false);
  await delay(300);
  store.setIsBoardRevealed(true); // triggers the card flip-in animation
  await delay(store.isVideoMode ? 3000 : 1500); // let the staggered card reveals play out

  if (!isRunning()) return;

  store.setPhase('spymaster_thinking');

  try {
    while (isRunning()) {
      await runTeamTurn(getStore().currentTeam);
      if (!isRunning()) break;

      // Check win conditions
      const s = getStore();
      if (s.blueScore >= s.blueTotal) {
        s.setWinner('blue');
        break;
      }
      if (s.redScore >= s.redTotal) {
        s.setWinner('red');
        break;
      }

      // Switch teams
      s.switchTeam();
      await delay(1500);
    }
  } catch (err) {
    console.error('Game error:', err);
    getStore().addMessage({
      playerId: 'system',
      playerName: 'System',
      team: 'blue',
      content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      type: 'system',
    });
    getStore().setIsRunning(false);
  }
}

async function runTeamTurn(team: Team) {
  if (!isRunning()) return;

  const s = getStore();
  const players = s.players;
  const board = s.board;

  // 1. Spymaster gives clue
  s.setPhase('spymaster_thinking');
  const spymaster = players.find(p => p.team === team && p.role === 'spymaster')!;
  s.setActivePlayer(spymaster.id);

  s.addMessage({
    playerId: 'system',
    playerName: 'Game Master',
    team,
    content: `${team.toUpperCase()} TEAM's turn. ${spymaster.name} is thinking of a clue...`,
    type: 'system',
  });

  await delay(1000);

  const spymasterPrompt = buildSpymasterPrompt(spymaster, board, players);

  // Add streaming message placeholder
  const spymasterMsgId = s.addMessage({
    playerId: spymaster.id,
    playerName: spymaster.name,
    team,
    content: '',
    type: 'internal_monologue',
    prompt: spymasterPrompt,
    hidden: false, // Spymaster thinking is always visible
  });

  // Delay starting the AI if in video mode to let the team turn splash + spymaster intro play out
  if (s.isVideoMode) {
    await delay(4500);
  }

  const spymasterResponse = await safeCallPlayerModel(
    spymaster,
    spymasterPrompt,
    spymasterMsgId,
    `You are playing Codenames with other AIs.\n\n${GAME_RULES}`
  );

  // Background summary generation
  generateMessageSummary(spymaster.id, spymaster.name, team, spymasterResponse, 'monologue', 'thinking of clue...');

  let clue = parseClue(spymasterResponse);
  let isIllegal = clue ? board.some(c => !c.revealed && c.word.toUpperCase() === clue!.word.toUpperCase()) : false;

  if (!clue || isIllegal) {
    let repairFormat = 'Target Words: [List]\nCLUE: [WORD]: [NUMBER]\nReasoning: [Explanation]';
    if (isIllegal && clue) {
      repairFormat = `The previous AI provided an illegal clue: "${clue.word}". This word is currently visible on the board. This is strictly against the rules!\nRewrite their response to provide a completely new, valid clue that IS NOT on the board.\n\nExpected Format:\nTarget Words: [List]\nCLUE: [WORD]: [NUMBER]\nReasoning: [Explanation]`;
    }

    const repaired = await repairResponseWithGameMaster(
      spymasterResponse,
      repairFormat,
      spymasterMsgId
    );
    clue = parseClue(repaired);
    isIllegal = clue ? board.some(c => !c.revealed && c.word.toUpperCase() === clue!.word.toUpperCase()) : false;

    if (!clue || isIllegal) {
      const reason = isIllegal ? `provided an illegal clue ("${clue?.word}") that is currently visible on the board` : `failed to provide a valid clue format`;
      s.addMessage({
        playerId: 'system',
        playerName: 'System',
        team,
        content: `Could not parse clue from ${spymaster.name}'s response: ${reason} even after repair attempt. Turn is skipped.`,
        type: 'system',
      });
      return;
    }
  }

  await delay(500);

  // Clue reveal
  s.setPhase('clue_reveal');
  s.setCurrentClue(clue);
  s.setGuessesRemaining(clue.number);
  s.setPlusOneAvailable(true);

  s.addMessage({
    playerId: spymaster.id,
    playerName: spymaster.name,
    team,
    content: `${clue.word}: ${clue.number}`,
    type: 'clue',
  });

  await speakIfEnabled(`${clue.word}, ${clue.number}`, spymaster.voiceId);
  const extraDelay = s.isVideoMode ? 3500 : 2000;
  await delay(extraDelay);

  if (!isRunning()) return;

  // 3. Team conversation
  s.setPhase('team_conversation');
  s.resetConversationRound();

  const operatives = players.filter(p => p.team === team && p.role === 'operative');
  const captain = operatives.find(p => p.isCaptain)!;
  const nonCaptains = operatives.filter(p => !p.isCaptain);

  // Extract previous round summaries for this team
  const turnStartMsg = [...getStore().messages].reverse().find(m => m.content?.includes("thinking of a clue")) || getStore().messages[0];
  const previousTeamSummaries = getStore().messages
    .filter(m => m.timestamp < (turnStartMsg?.timestamp || Date.now()) && m.type === 'summary' && m.team === team)
    .map(m => m.content.replace(/^💡\s*/, ''));

  s.setActivePlayer(captain.id); // highlight captain immediately during splash

  const captainPrompt = buildConversationPrompt(captain, board, players, clue, [], true, previousTeamSummaries);
  const capMsgId = s.addMessage({
    playerId: captain.id,
    playerName: captain.name,
    team,
    content: '',
    type: 'conversation',
    prompt: captainPrompt,
  });

  if (s.isVideoMode) {
    await delay(2500); // wait for OPERATIVES splash + intro animation
  }

  const captainStart = await safeCallPlayerModel(
    captain,
    captainPrompt,
    capMsgId,
    `You are playing Codenames with other AIs.\n\n${GAME_RULES}`
  );

  // Background summary generation
  generateMessageSummary(captain.id, captain.name, team, captainStart, 'chat', `${clue.word}: ${clue.number}`);

  await speakIfEnabled(cleanResponse(captainStart), captain.voiceId);
  if (s.isVideoMode) {
    if (!s.ttsEnabled) {
      await delay(Math.max(captainStart.length * 20, 2000));
    }
  } else {
    await delay(1000);
  }
  s.incrementConversationRound();

  // Non-captains respond in sequence
  for (const op of nonCaptains) {
    if (!isRunning()) return;
    s.setActivePlayer(op.id);
    if (s.isVideoMode) await delay(800); // let scale-up transition settle

    // Limit conversation context strictly to this exact round
    const msgsThisTurn = getStore().messages.filter(m => m.timestamp >= turnStartMsg.timestamp);
    const recentConvo = msgsThisTurn.filter(
      m => m.type === 'conversation' && m.team === team
    );

    const opPrompt = buildConversationPrompt(op, board, players, clue, recentConvo, false, previousTeamSummaries);
    const opMsgId = s.addMessage({
      playerId: op.id,
      playerName: op.name,
      team,
      content: '',
      type: 'conversation',
      prompt: opPrompt,
    });

    const response = await safeCallPlayerModel(
      op,
      opPrompt,
      opMsgId,
      `You are playing Codenames with other AIs.\n\n${GAME_RULES}`
    );

    // Background summary generation
    generateMessageSummary(op.id, op.name, team, response, 'chat', `${clue.word}: ${clue.number}`);

    await speakIfEnabled(cleanResponse(response), op.voiceId);
    if (s.isVideoMode) {
      if (!s.ttsEnabled) {
        await delay(Math.max(response.length * 20, 2000));
      }
    } else {
      await delay(1000);
    }
    s.incrementConversationRound();
  }

  // Optional: one more round if conversation hasn't settled (captain wraps up)
  if (getStore().conversationRound < MAX_CONVERSATION_ROUNDS && isRunning()) {
    s.setActivePlayer(captain.id);
    if (s.isVideoMode) await delay(800);
    const msgsThisTurn = getStore().messages.filter(m => m.timestamp >= turnStartMsg.timestamp);
    const finalConvo = msgsThisTurn.filter(
      m => m.type === 'conversation' && m.team === team
    );

    const finalCapPrompt = buildConversationPrompt(captain, board, players, clue, finalConvo, false, previousTeamSummaries);
    const finalCapMsgId = s.addMessage({
      playerId: captain.id,
      playerName: captain.name,
      team,
      content: '',
      type: 'conversation',
      prompt: finalCapPrompt,
    });

    const finalResponse = await safeCallPlayerModel(
      captain,
      finalCapPrompt,
      finalCapMsgId,
      `You are playing Codenames with other AIs.\n\n${GAME_RULES}`
    );

    // Background summary generation
    generateMessageSummary(captain.id, captain.name, team, finalResponse, 'chat', `${clue.word}: ${clue.number}`);

    if (s.isVideoMode) {
      await speakIfEnabled(cleanResponse(finalResponse), captain.voiceId);
      if (!s.ttsEnabled) {
        await delay(Math.max(finalResponse.length * 20, 2000));
      }
    } else {
      await delay(1000);
    }
  }

  if (!isRunning()) return;

  // 4. Guessing phase
  s.setPhase('guessing');
  const previousGuesses: { word: string; result: string }[] = [];
  let { guessesRemaining, plusOneAvailable } = getStore();

  while ((guessesRemaining > 0 || plusOneAvailable) && isRunning()) {
    s.setActivePlayer(captain.id);

    const currentBoard = getStore().board;
    const validWords = currentBoard.filter(c => !c.revealed).map(c => c.word);
    // Also limit context for guessing prompt
    const curTurnStartMsg = [...getStore().messages].reverse().find(m => m.content?.includes("thinking of a clue")) || getStore().messages[0];
    const msgsThisTurn = getStore().messages.filter(m => m.timestamp >= (curTurnStartMsg?.timestamp || 0));
    const convMessages = msgsThisTurn.filter(
      m => m.type === 'conversation' && m.team === team
    );

    const guessingPrompt = buildGuessingPrompt(
      captain, currentBoard, players, clue, convMessages,
      previousGuesses, guessesRemaining, plusOneAvailable,
      previousTeamSummaries
    );

    const guessMsgId = s.addMessage({
      playerId: captain.id,
      playerName: captain.name,
      team,
      content: '',
      type: 'guess',
      prompt: guessingPrompt,
    });

    const guessResponse = await safeCallPlayerModel(
      captain,
      guessingPrompt,
      guessMsgId,
      `You are playing Codenames with other AIs.\n\n${GAME_RULES}`
    );

    let guess = parseGuess(guessResponse, validWords);

    if (!guess && !/\bPASS\b/i.test(guessResponse)) {
      const repaired = await repairResponseWithGameMaster(
        guessResponse,
        'GUESS: [EXACT WORD FROM BOARD]\nReasoning: [Explanation]\n(Or PASS if you want to pass)',
        guessMsgId
      );
      guess = parseGuess(repaired, validWords);
    }

    if (!guess || guess === 'PASS') {
      s.addMessage({
        playerId: 'system',
        playerName: 'Game Master',
        team,
        content: `${captain.name} decides to pass. Turn ends.`,
        type: 'system',
      });
      break;
    }

    // Reveal the card
    await delay(1000);
    s.revealCard(guess);
    const card = getStore().board.find(c => c.word === guess)!;
    const resultLabel = card.type === team ? `${team.toUpperCase()} Agent` :
      card.type === (team === 'blue' ? 'red' : 'blue') ? `${card.type.toUpperCase()} Agent (opponent!)` :
        card.type === 'assassin' ? 'ASSASSIN!' :
          'Bystander';

    previousGuesses.push({ word: guess, result: resultLabel });

    s.addMessage({
      playerId: 'system',
      playerName: 'Game Master',
      team,
      content: `${guess}:${card.type}:${resultLabel}`,
      type: 'guess_result',
    });

    await speakIfEnabled(`${guess}. ${resultLabel}`, captain.voiceId);
    await delay(1500);

    // Check result
    if (card.type === 'assassin') {
      const winnerTeam = team === 'blue' ? 'red' : 'blue';
      s.setWinner(winnerTeam);
      s.addMessage({
        playerId: 'system',
        playerName: 'Game Master',
        team,
        content: `ASSASSIN HIT! ${winnerTeam.toUpperCase()} TEAM WINS!`,
        type: 'system',
      });
      return;
    }

    if (card.type !== team) {
      // Wrong guess - turn ends
      if (card.type === (team === 'blue' ? 'red' : 'blue')) {
        // Helped the other team
      }
      break;
    }

    // Correct guess
    guessesRemaining--;
    s.setGuessesRemaining(guessesRemaining);

    if (guessesRemaining === 0 && plusOneAvailable) {
      s.setPlusOneAvailable(false);
      plusOneAvailable = false;
      guessesRemaining = 1;
      s.setGuessesRemaining(1);
    } else if (guessesRemaining === 0) {
      break;
    }

    // Check if team has won
    const updatedState = getStore();
    if (team === 'blue' && updatedState.blueScore >= updatedState.blueTotal) {
      s.setWinner('blue');
      return;
    }
    if (team === 'red' && updatedState.redScore >= updatedState.redTotal) {
      s.setWinner('red');
      return;
    }
  }

  if (!isRunning()) return;

  // 5. Reactions
  s.setPhase('guess_reactions');
  const curTurnStartMsgReact = [...getStore().messages].reverse().find(m => m.content?.includes("thinking of a clue")) || getStore().messages[0];
  const msgsThisTurnReact = getStore().messages.filter(m => m.timestamp >= (curTurnStartMsgReact?.timestamp || 0));
  const convMessagesReact = msgsThisTurnReact.filter(
    m => m.type === 'conversation' && m.team === team
  );

  const previousReactions = [];

  for (const op of operatives) {
    if (!isRunning()) return;
    s.setActivePlayer(op.id);
    if (s.isVideoMode) await delay(800); // let scale-up transition settle

    const reactionPrompt = buildReactionPrompt(op, players, previousGuesses, clue, convMessagesReact, previousReactions);
    const reactMsgId = s.addMessage({
      playerId: op.id,
      playerName: op.name,
      team,
      content: '',
      type: 'reaction',
      prompt: reactionPrompt,
    });

    const reaction = await safeCallPlayerModel(
      op,
      reactionPrompt,
      reactMsgId,
      `You are playing Codenames with other AIs.\n\n${GAME_RULES}`
    );

    const savedReactMsg = getStore().messages.find(m => m.id === reactMsgId);
    if (savedReactMsg) {
      previousReactions.push(savedReactMsg);
    }

    await speakIfEnabled(cleanResponse(reaction), op.voiceId);
    if (s.isVideoMode) {
      if (!s.ttsEnabled) {
        await delay(Math.max(reaction.length * 20, 2000));
      }
    } else {
      await delay(800);
    }
  }

  // Rotate captain
  s.rotateCaptain(team);
  await delay(1000);
}

export function stopGame() {
  stopSpeaking();
  getStore().setIsRunning(false);
}
