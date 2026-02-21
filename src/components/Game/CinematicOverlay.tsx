import { useGameStore } from '../../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import ProviderLogo from '../Players/ProviderLogo';
import { AVAILABLE_MODELS } from '../../config/models';

export default function CinematicOverlay() {
    const isVideoMode = useGameStore(s => s.isVideoMode);
    const phase = useGameStore(s => s.phase);
    const currentTeam = useGameStore(s => s.currentTeam);
    const currentClue = useGameStore(s => s.currentClue);
    const activePlayerId = useGameStore(s => s.activePlayerId);
    const players = useGameStore(s => s.players);
    const messages = useGameStore(s => s.messages);

    const [showTurnSplash, setShowTurnSplash] = useState(false);
    const [splashText, setSplashText] = useState('');

    // Dramatic Clue State
    const [showDramaticClue, setShowDramaticClue] = useState(false);

    // Monitor Phase changes for Turn Splashes
    useEffect(() => {
        if (!isVideoMode) return;

        if (phase === 'spymaster_thinking') {
            setSplashText(`${currentTeam.toUpperCase()} SPYMASTER`);
            setShowTurnSplash(true);
            const t = setTimeout(() => setShowTurnSplash(false), 2000);
            return () => clearTimeout(t);
        } else if (phase === 'team_conversation') {
            setSplashText(`${currentTeam.toUpperCase()} OPERATIVES`);
            setShowTurnSplash(true);
            const t = setTimeout(() => setShowTurnSplash(false), 2000);
            return () => clearTimeout(t);
        } else {
            setShowTurnSplash(false);
        }
    }, [phase, currentTeam, isVideoMode]);

    // Monitor Clue changes for Dramatic Clue Reveal
    useEffect(() => {
        if (!isVideoMode || !currentClue) return;

        // Only show the dramatic clue when it's first revealed
        if (phase === 'clue_reveal') {
            setShowDramaticClue(true);
            const t = setTimeout(() => setShowDramaticClue(false), 3000);
            return () => clearTimeout(t);
        } else {
            setShowDramaticClue(false);
        }
    }, [currentClue, phase, isVideoMode]);

    // Derived Spymaster State
    const activeSpymaster = phase === 'spymaster_thinking' ? players.find(p => p.id === activePlayerId && p.role === 'spymaster') : null;
    const aiModel = activeSpymaster ? AVAILABLE_MODELS.find(m => m.id === activeSpymaster.model) : null;

    // Get active Spymaster thinking text
    const spymasterMessages = activeSpymaster ? messages.filter(m => m.playerId === activeSpymaster.id && m.type !== 'system') : [];
    const latestMessage = spymasterMessages.length > 0 ? spymasterMessages[spymasterMessages.length - 1] : null;

    if (!isVideoMode) return null;

    return (
        <div className="pointer-events-none fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden">

            {/* Turn Splash Overlay */}
            <AnimatePresence>
                {showTurnSplash && (
                    <motion.div
                        initial={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className={`absolute inset-0 flex items-center justify-center backdrop-blur-sm z-10 ${!activeSpymaster ? 'bg-black/40' : ''}`}
                    >
                        <motion.h2
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: activeSpymaster ? -150 : 0, opacity: 1 }}
                            exit={{ y: activeSpymaster ? -200 : 50, opacity: 0 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className={`text-6xl md:text-8xl font-black tracking-[0.2em] font-display text-transparent bg-clip-text drop-shadow-2xl uppercase ${currentTeam === 'blue'
                                ? 'bg-gradient-to-r from-blue-400 to-blue-600'
                                : 'bg-gradient-to-r from-red-400 to-red-600'
                                }`}
                        >
                            {splashText}
                        </motion.h2>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Central Spymaster Avatar (stays entire thinking phase) */}
            <AnimatePresence>
                {activeSpymaster && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
                        transition={{ delay: 0.5, duration: 0.8, type: 'spring' }}
                        className={`absolute z-20 flex flex-col items-center justify-center rounded-3xl p-8 border-4 shadow-2xl backdrop-blur-md ${currentTeam === 'blue'
                            ? 'bg-[#3B7DD8]/20 border-[#3B7DD8]/50 shadow-blue-500/20'
                            : 'bg-[#D94F3B]/20 border-[#D94F3B]/50 shadow-red-500/20'
                            }`}
                    >
                        {aiModel && <ProviderLogo provider={aiModel.provider} className="w-24 h-24 drop-shadow-lg mb-4" />}
                        <h3 className={`text-3xl font-black font-display tracking-widest uppercase ${currentTeam === 'blue' ? 'text-blue-300' : 'text-red-300'}`}>
                            {activeSpymaster.name}
                        </h3>
                        <p className="text-white/70 tracking-widest text-sm uppercase font-semibold mt-1">SPYMASTER</p>

                        {/* Thinking Subtitle inside the Spymaster container */}
                        {latestMessage && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-6 w-80 text-center"
                            >
                                <div className="bg-black/60 border border-white/20 text-white p-4 rounded-xl text-sm italic font-medium leading-relaxed shadow-inner backdrop-blur-lg">
                                    "{latestMessage.content}"
                                    <span className="inline-flex ml-1 text-white/50">
                                        <span className="bounce-dot text-[14px]">.</span>
                                        <span className="bounce-dot text-[14px]">.</span>
                                        <span className="bounce-dot text-[14px]">.</span>
                                    </span>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Dramatic Clue Reveal Overlay */}
            <AnimatePresence>
                {showDramaticClue && currentClue && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.5, y: -200 }} // Shrinks up towards the score bar
                        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                        className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md"
                    >
                        <div className={`p-10 rounded-3xl border-4 shadow-[0_0_100px_rgba(0,0,0,0.5)] ${currentTeam === 'blue'
                            ? 'bg-[#3B7DD8]/90 border-[#2B5EA0] shadow-blue-500/50'
                            : 'bg-[#D94F3B]/90 border-[#B33A28] shadow-red-500/50'
                            }`}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.3, type: 'spring' }}
                                className="text-center"
                            >
                                <h3 className="text-white/80 text-2xl font-bold tracking-widest uppercase mb-2">TARGET CLUE</h3>
                                <div className="text-8xl md:text-[8rem] font-black text-white font-display uppercase tracking-widest drop-shadow-lg flex items-baseline justify-center gap-6">
                                    <span>{currentClue.word}</span>
                                    <span className="text-5xl text-white/50">:</span>
                                    <span className="text-9xl text-white/90">{currentClue.number}</span>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
