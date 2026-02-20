import { useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { speak, stopSpeaking } from '../services/tts';

export function useTTS() {
  const ttsEnabled = useGameStore(s => s.ttsEnabled);
  const speed = useGameStore(s => s.speed);

  const speakText = useCallback(async (text: string, voiceId: string) => {
    if (!ttsEnabled) return;
    const truncated = text.length > 200 ? text.slice(0, 200) + '...' : text;
    await speak(truncated, voiceId, speed);
  }, [ttsEnabled, speed]);

  return { speakText, stopSpeaking, ttsEnabled };
}
