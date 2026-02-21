import { useGameStore } from '../store/gameStore';
import { speak, stopSpeaking } from '../services/tts';

function delay(ms: number): Promise<void> {
    const speed = useGameStore.getState().playbackSpeed;
    return new Promise(resolve => setTimeout(resolve, ms / speed));
}

async function speakIfEnabled(text: string, voiceId: string | undefined) {
    const { ttsEnabled, playbackSpeed } = useGameStore.getState();
    if (ttsEnabled && voiceId) {
        const truncated = text.length > 200 ? text.slice(0, 200) + '...' : text;
        await speak(truncated, voiceId, playbackSpeed);
    }
}

function cleanResponse(text: string): string {
    return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

export async function runReplay() {
    const store = useGameStore.getState();
    if (store.playbackMessages.length === 0) return;

    // Reset to beginning if we hit play at the very end
    if (store.currentPlaybackIndex >= store.playbackMessages.length - 1) {
        store.goToPlaybackIndex(0);
    }

    store.startPlayback();
    await delay(500);

    while (true) {
        const currentState = useGameStore.getState();
        if (!currentState.isRunning || !currentState.playbackMode) {
            break;
        }

        let index = currentState.currentPlaybackIndex;

        // Advance to next frame
        if (index < currentState.playbackMessages.length - 1) {
            index++;
            currentState.goToPlaybackIndex(index);
        }

        const msg = currentState.playbackMessages[index];

        // TTS
        if (['conversation', 'reaction', 'clue', 'guess'].includes(msg.type) && msg.playerId !== 'system') {
            const player = currentState.players.find(p => p.id === msg.playerId);
            if (player) {
                await speakIfEnabled(cleanResponse(msg.content), player.voiceId);
            }
        }

        // Calculate delay based on the auto-typing duration
        const textLength = msg.content ? msg.content.length : 0;
        const typingDurationMs = msg.durationMs && msg.durationMs > 0
            ? msg.durationMs
            : Math.min(textLength * 30, 3000);

        // Add a small buffer after typing finishes before moving to the next message
        const baseDelay = typingDurationMs + 500;

        await delay(baseDelay);

        if (index >= currentState.playbackMessages.length - 1) {
            break;
        }
    }

    useGameStore.getState().stopPlayback();
}

export function stopReplay() {
    stopSpeaking();
    useGameStore.getState().stopPlayback();
}
