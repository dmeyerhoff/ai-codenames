export let isSpeakingFlag = false;
export let currentAudio: HTMLAudioElement | null = null;

export async function speak(text: string, voiceId: string, speed: number = 1): Promise<void> {
  stopSpeaking();

  if (!text) return;

  isSpeakingFlag = true;
  try {
    const res = await fetch('http://localhost:8000/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: voiceId, speed })
    });

    if (!res.ok) throw new Error('TTS Failed');

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    currentAudio = new Audio(url);
    currentAudio.playbackRate = 1.0; // speed handled by backend

    await new Promise<void>((resolve, reject) => {
      if (!currentAudio) return resolve();
      currentAudio.onended = () => {
        isSpeakingFlag = false;
        URL.revokeObjectURL(url);
        resolve();
      };
      currentAudio.onerror = () => {
        isSpeakingFlag = false;
        URL.revokeObjectURL(url);
        resolve();
      };
      currentAudio.play().catch(reject);
    });
  } catch (err) {
    console.error('TTS error', err);
    isSpeakingFlag = false;
  }
}

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  isSpeakingFlag = false;
}

export function isSpeaking(): boolean {
  return isSpeakingFlag;
}
