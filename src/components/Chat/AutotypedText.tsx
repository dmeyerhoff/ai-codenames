import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';

interface Props {
    text: string;
    durationMs?: number;
    enabled: boolean;
}

export default function AutotypedText({ text, durationMs, enabled }: Props) {
    const [displayedText, setDisplayedText] = useState(enabled ? '' : text);
    const currentIndex = useRef(0);
    const lastTick = useRef(performance.now());
    const timeAccumulator = useRef(0);

    useEffect(() => {
        if (!enabled) {
            setDisplayedText(text);
            return;
        }

        if (!text) return;

        // Reset if text actually changed to a new string completely
        if (text !== displayedText && !text.startsWith(displayedText)) {
            currentIndex.current = 0;
            timeAccumulator.current = 0;
            setDisplayedText('');
        }

        lastTick.current = performance.now();
        let animationFrameId: number;

        const tick = (now: number) => {
            animationFrameId = requestAnimationFrame(tick);

            const dt = now - lastTick.current;
            lastTick.current = now;

            const state = useGameStore.getState();
            if (!state.isRunning) {
                return; // Paused: don't accumulate time
            }

            const currentSpeed = state.playbackMode ? state.playbackSpeed : state.speed;
            const totalTimeMs = durationMs && durationMs > 0 ? durationMs : Math.min(text.length * 30, 3000);

            // Adjust msPerChar taking speed into account
            const baseMsPerChar = totalTimeMs / text.length;
            const msPerChar = Math.max(5, baseMsPerChar / currentSpeed);

            timeAccumulator.current += dt;

            // Only advance if enough time has passed for at least 1 character
            if (timeAccumulator.current >= msPerChar) {
                const charsToType = Math.floor(timeAccumulator.current / msPerChar);
                timeAccumulator.current = timeAccumulator.current % msPerChar;

                currentIndex.current = Math.min(currentIndex.current + charsToType, text.length);
                setDisplayedText(text.slice(0, currentIndex.current));

                if (currentIndex.current >= text.length) {
                    cancelAnimationFrame(animationFrameId);
                }
            }
        };

        animationFrameId = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(animationFrameId);
    }, [text, durationMs, enabled]);

    return <span>{displayedText}</span>;
}
