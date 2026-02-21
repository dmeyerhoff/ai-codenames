import { useGameStore } from '../store/gameStore';
import { speak, stopSpeaking } from '../services/tts';
import { PROMO_BOARD, PROMO_SCRIPT } from '../config/promoScript';
import { DEMO_PLAYERS } from '../config/models';

function delay(ms: number): Promise<void> {
  const speed = useGameStore.getState().speed;
  return new Promise(resolve => setTimeout(resolve, ms / speed));
}

function getStore() {
  return useGameStore.getState();
}

function shouldContinue(): boolean {
  return getStore().isRunning;
}

async function speakIfEnabled(text: string, voiceId: string) {
  const { ttsEnabled, speed } = getStore();
  if (ttsEnabled) {
    const truncated = text.length > 200 ? text.slice(0, 200) + '...' : text;
    await speak(truncated, voiceId, speed);
  }
}

async function simulateTyping(msgId: string, text: string, msPerChar: number = 25) {
  const store = getStore();
  const speed = store.speed;
  for (let i = 0; i <= text.length; i++) {
    if (!shouldContinue()) return;
    useGameStore.getState().updateMessage(msgId, text.slice(0, i));
    await new Promise(resolve => setTimeout(resolve, msPerChar / speed));
  }
  // Mark message as completed so conversation feed picks it up
  useGameStore.getState().setDurationMs(msgId, text.length * msPerChar);
}

function getPlayer(playerId: string) {
  return getStore().players.find(p => p.id === playerId)!;
}

export async function runPromo() {
  const store = getStore();

  // 1. Setup: load promo board and demo players
  store.setIsRunning(true);
  store.setPromoMode(true);

  // Set the board and players directly
  useGameStore.setState({
    board: PROMO_BOARD.map(c => ({ ...c })),
    players: [...DEMO_PLAYERS],
    currentTeam: 'blue',
    messages: [],
    blueScore: 0,
    redScore: 0,
    blueTotal: 9,
    redTotal: 8,
    winner: null,
    roundNumber: 1,
    currentClue: null,
    guessesRemaining: 0,
    activePlayerId: null,
    conversationRound: 0,
  });

  // Enable video mode
  if (!getStore().isVideoMode) {
    store.toggleVideoMode();
  }

  // 2. Board reveal
  store.setPhase('board_reveal');
  store.setIsBoardRevealed(false);
  await delay(300);
  store.setIsBoardRevealed(true);
  await delay(3500);
  if (!shouldContinue()) return;

  // 3. Spymaster thinking
  const spymaster = getPlayer('blue-spy');
  store.setPhase('spymaster_thinking');
  store.setActivePlayer(spymaster.id);

  // Wait for team splash + spymaster intro animation
  await delay(4500);
  if (!shouldContinue()) return;

  const thinkingMsgId = store.addMessage({
    playerId: spymaster.id,
    playerName: spymaster.name,
    team: 'blue',
    content: '',
    type: 'internal_monologue',
  });

  // Simulate streaming text + speak simultaneously
  await Promise.all([
    simulateTyping(thinkingMsgId, PROMO_SCRIPT.spymasterReasoning, 30),
    speakIfEnabled(PROMO_SCRIPT.spymasterReasoning, spymaster.voiceId),
  ]);

  await delay(500);
  if (!shouldContinue()) return;

  // 4. Clue reveal
  store.setPhase('clue_reveal');
  store.setCurrentClue(PROMO_SCRIPT.blueClue);
  store.setGuessesRemaining(PROMO_SCRIPT.blueClue.number);
  store.setPlusOneAvailable(true);

  const clueText = `${PROMO_SCRIPT.blueClue.word}: ${PROMO_SCRIPT.blueClue.number}`;
  store.addMessage({
    playerId: spymaster.id,
    playerName: spymaster.name,
    team: 'blue',
    content: clueText,
    type: 'clue',
  });

  await speakIfEnabled(`${PROMO_SCRIPT.blueClue.word}, ${PROMO_SCRIPT.blueClue.number}`, spymaster.voiceId);
  await delay(3500);
  if (!shouldContinue()) return;

  // 5. Team conversation
  store.setPhase('team_conversation');
  store.resetConversationRound();

  // Set captain active immediately for the OPERATIVES splash
  store.setActivePlayer('blue-op1');
  await delay(2500); // wait for OPERATIVES splash + intro animation

  for (const msg of PROMO_SCRIPT.conversation) {
    if (!shouldContinue()) return;
    const player = getPlayer(msg.playerId);
    store.setActivePlayer(player.id);
    await delay(800); // let scale-up transition settle

    const convMsgId = store.addMessage({
      playerId: player.id,
      playerName: player.name,
      team: 'blue',
      content: '',
      type: 'conversation',
    });

    await Promise.all([
      simulateTyping(convMsgId, msg.content, 20),
      speakIfEnabled(msg.content, player.voiceId),
    ]);

    store.incrementConversationRound();
    await delay(1500);
  }

  if (!shouldContinue()) return;

  // 6. First guess - SPY (correct)
  const captain = getPlayer('blue-op1');
  store.setPhase('guessing');
  store.setActivePlayer(captain.id);

  const guess1 = PROMO_SCRIPT.guesses[0];

  store.addMessage({
    playerId: captain.id,
    playerName: captain.name,
    team: 'blue',
    content: `I'll guess ${guess1.word}.`,
    type: 'guess',
  });

  await delay(1200); // anticipation pause for guess announcement popup
  store.revealCard(guess1.word);

  store.addMessage({
    playerId: 'system',
    playerName: 'Game Master',
    team: 'blue',
    content: `${guess1.word}:${guess1.type}:${guess1.type === 'blue' ? 'BLUE Agent' : 'Bystander'}`,
    type: 'guess_result',
  });

  await speakIfEnabled(`${guess1.word}. ${guess1.type === 'blue' ? 'Blue Agent' : 'Bystander'}`, captain.voiceId);
  await delay(750);
  if (!shouldContinue()) return;

  // 7. Reaction to first guess
  store.setPhase('guess_reactions');
  const reactor1 = getPlayer(guess1.reactionPlayerId);
  store.setActivePlayer(reactor1.id);

  const react1MsgId = store.addMessage({
    playerId: reactor1.id,
    playerName: reactor1.name,
    team: 'blue',
    content: '',
    type: 'reaction',
  });

  await Promise.all([
    simulateTyping(react1MsgId, guess1.reaction, 20),
    speakIfEnabled(guess1.reaction, reactor1.voiceId),
  ]);

  await delay(1500);
  if (!shouldContinue()) return;

  // 8. Second guess - CAPITAL (bystander)
  const guess2 = PROMO_SCRIPT.guesses[1];
  store.setPhase('guessing');
  store.setActivePlayer(captain.id);
  store.setGuessesRemaining(2);

  store.addMessage({
    playerId: captain.id,
    playerName: captain.name,
    team: 'blue',
    content: `I'll guess ${guess2.word}.`,
    type: 'guess',
  });

  await delay(1200); // anticipation pause for guess announcement popup
  store.revealCard(guess2.word);

  store.addMessage({
    playerId: 'system',
    playerName: 'Game Master',
    team: 'blue',
    content: `${guess2.word}:${guess2.type}:Bystander`,
    type: 'guess_result',
  });

  await speakIfEnabled(`${guess2.word}. Bystander`, captain.voiceId);
  await delay(750);
  if (!shouldContinue()) return;

  // 9. Reaction to bystander hit
  store.setPhase('guess_reactions');
  const reactor2 = getPlayer(guess2.reactionPlayerId);
  store.setActivePlayer(reactor2.id);

  const react2MsgId = store.addMessage({
    playerId: reactor2.id,
    playerName: reactor2.name,
    team: 'blue',
    content: '',
    type: 'reaction',
  });

  await Promise.all([
    simulateTyping(react2MsgId, guess2.reaction, 20),
    speakIfEnabled(guess2.reaction, reactor2.voiceId),
  ]);

  await delay(2000);
  if (!shouldContinue()) return;

  // 10. Switch to red team — cliffhanger teaser
  store.switchTeam();
  const redSpymaster = getPlayer('red-spy');
  store.setPhase('spymaster_thinking');
  store.setActivePlayer(redSpymaster.id);

  // Wait for RED TEAM splash + spymaster intro
  await delay(4500);
  if (!shouldContinue()) return;

  const teaserMsgId = store.addMessage({
    playerId: redSpymaster.id,
    playerName: redSpymaster.name,
    team: 'red',
    content: '',
    type: 'internal_monologue',
  });

  await Promise.all([
    simulateTyping(teaserMsgId, PROMO_SCRIPT.redTeaser, 30),
    speakIfEnabled(PROMO_SCRIPT.redTeaser, redSpymaster.voiceId),
  ]);

  await delay(3000);

  // 11. Done
  store.setIsRunning(false);
  store.setPromoMode(false);
}

export function stopPromo() {
  stopSpeaking();
  const store = getStore();
  store.setIsRunning(false);
  store.setPromoMode(false);
}
