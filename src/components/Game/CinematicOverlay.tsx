import { useGameStore } from '../../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
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
    const activeContextSlide = useGameStore(s => s.activeContextSlide);

    const [showTurnSplash, setShowTurnSplash] = useState(false);
    const [splashText, setSplashText] = useState('');
    const [showTeamTurnSplash, setShowTeamTurnSplash] = useState(false);

    // Dramatic Clue State
    const [showDramaticClue, setShowDramaticClue] = useState(false);

    // Guess Announcement State
    const [guessAnnouncement, setGuessAnnouncement] = useState<{ word: string; result: 'pending' | 'correct' | 'wrong' } | null>(null);
    const lastGuessCountRef = useRef(0);

    // Monitor Phase changes for Turn Splashes
    useEffect(() => {
        if (!isVideoMode) return;

        if (phase === 'spymaster_thinking') {
            // Show "BLUE/RED TEAM TURN" first, then "BLUE/RED SPYMASTER"
            setShowTeamTurnSplash(true);
            const t1 = setTimeout(() => {
                setShowTeamTurnSplash(false);
            }, 2000);
            const t2 = setTimeout(() => {
                setSplashText(`${currentTeam.toUpperCase()} SPYMASTER`);
                setShowTurnSplash(true);
            }, 2200);
            const t3 = setTimeout(() => setShowTurnSplash(false), 4200);
            return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
        } else if (phase === 'team_conversation') {
            setSplashText(`${currentTeam.toUpperCase()} OPERATIVES`);
            setShowTurnSplash(true);
            const t = setTimeout(() => setShowTurnSplash(false), 2000);
            return () => clearTimeout(t);
        } else {
            setShowTurnSplash(false);
            setShowTeamTurnSplash(false);
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

    // Detect new guess messages → trigger announcement popup
    useEffect(() => {
        if (!isVideoMode) return;
        const guessMessages = messages.filter(m => m.type === 'guess');
        if (guessMessages.length > lastGuessCountRef.current) {
            const latestGuess = guessMessages[guessMessages.length - 1];
            // Extract the word from "I'll guess WORD."
            const match = latestGuess.content.match(/guess\s+(\w+)/i);
            const word = match ? match[1] : latestGuess.content;
            setGuessAnnouncement({ word, result: 'pending' });
            lastGuessCountRef.current = guessMessages.length;
        }
    }, [messages, isVideoMode]);

    // Detect guess result → flash correct/wrong, then dismiss quickly
    useEffect(() => {
        if (!isVideoMode || !guessAnnouncement || guessAnnouncement.result !== 'pending') return;
        const resultMessages = messages.filter(m => m.type === 'guess_result');
        const latestResult = resultMessages.length > 0 ? resultMessages[resultMessages.length - 1] : null;
        if (latestResult && latestResult.content.includes(guessAnnouncement.word)) {
            const isCorrect = latestResult.content.includes(currentTeam);
            setGuessAnnouncement(prev => prev ? { ...prev, result: isCorrect ? 'correct' : 'wrong' } : null);
            const t = setTimeout(() => setGuessAnnouncement(null), 300);
            return () => clearTimeout(t);
        }
    }, [messages, isVideoMode, guessAnnouncement, currentTeam]);

    // Clear guess announcement when phase changes away from guessing
    useEffect(() => {
        if (phase !== 'guessing') {
            setGuessAnnouncement(null);
        }
    }, [phase]);

    // Derived Spymaster State
    const activeSpymaster = phase === 'spymaster_thinking' ? players.find(p => p.id === activePlayerId && p.role === 'spymaster') : null;

    // Get active Spymaster thinking text
    const spymasterMessages = activeSpymaster ? messages.filter(m => m.playerId === activeSpymaster.id && m.type !== 'system') : [];
    const latestMessage = spymasterMessages.length > 0 ? spymasterMessages[spymasterMessages.length - 1] : null;

    // Derived Operative State — all operatives for current team, persistent during operative phases
    const isOperativePhase = phase === 'team_conversation' || phase === 'guessing' || phase === 'guess_reactions';
    const teamOperatives = isOperativePhase ? players.filter(p => p.team === currentTeam && p.role === 'operative') : [];

    // Get the current-phase message for an operative (filters by phase-appropriate type)
    const getOperativeCurrentMessage = (playerId: string) => {
        const phaseType = phase === 'team_conversation' ? 'conversation'
            : phase === 'guessing' ? 'guess'
                : phase === 'guess_reactions' ? 'reaction'
                    : null;
        if (!phaseType) return null;
        const msgs = messages.filter(m => m.playerId === playerId && m.type === phaseType);
        return msgs.length > 0 ? msgs[msgs.length - 1] : null;
    };

    // Team conversation feed — all completed messages from current team operatives in current phase
    const teamConversationMessages = isOperativePhase
        ? messages.filter(m => {
            if (m.type === 'system' || m.hidden) return false;
            const isTeamOperative = teamOperatives.some(op => op.id === m.playerId);
            if (!isTeamOperative) return false;
            // Only show messages from the current phase type
            if (phase === 'team_conversation' && m.type === 'conversation') return true;
            if (phase === 'guessing' && m.type === 'guess') return true;
            if (phase === 'guess_reactions' && m.type === 'reaction') return true;
            return false;
        }).filter(m => m.durationMs) // only completed messages
        : [];

    // Operative emoji based on current phase activity
    const getOperativeEmoji = (opId: string) => {
        const currentMsg = getOperativeCurrentMessage(opId);
        if (activePlayerId === opId) {
            // Active operative: thinking if no completed msg yet, phase emoji when done
            if (!currentMsg || !currentMsg.durationMs) return '💭';
            return phaseInfo.emoji;
        }
        // Inactive: check if they already spoke in this phase
        if (currentMsg?.durationMs) return '✅';
        return '⏳';
    };

    // Phase context emoji
    const getPhaseEmoji = (): { emoji: string; label: string } => {
        switch (phase) {
            case 'spymaster_thinking': return { emoji: '💭', label: 'THINKING' };
            case 'clue_reveal': return { emoji: '🎯', label: 'CLUE' };
            case 'team_conversation': return { emoji: '💬', label: 'DISCUSSING' };
            case 'guessing': return { emoji: '🎲', label: 'GUESSING' };
            case 'guess_reactions': return { emoji: '🎉', label: 'REACTING' };
            default: return { emoji: '⏳', label: '' };
        }
    };
    const phaseInfo = getPhaseEmoji();

    // Auto-scroll ref for subtitles (shared — spymaster/operative are mutually exclusive)
    const subtitleRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (subtitleRef.current) {
            subtitleRef.current.scrollTop = subtitleRef.current.scrollHeight;
        }
    }, [latestMessage?.content, messages.length]);

    // Spymaster model for centered display
    const aiModel = activeSpymaster ? AVAILABLE_MODELS.find(m => m.id === activeSpymaster.model) : null;

    // Operative sidebar — only during operative phases
    const sidebarSide = currentTeam === 'blue' ? 'left' : 'right';

    if (!isVideoMode) return null;

    return (
        <div className="pointer-events-none fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden">

            {/* Background Blur layer - persists while thinking, dramatic clue, or operative intro splash */}
            <AnimatePresence>
                {(phase.includes('thinking') || showDramaticClue || (isOperativePhase && showTurnSplash)) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-[6px] z-0"
                    />
                )}
            </AnimatePresence>

            {/* High-Impact Context Slides */}
            <AnimatePresence mode="wait">
                {activeContextSlide && (
                    <motion.div
                        key={activeContextSlide.title}
                        initial={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 0.9, filter: 'blur(20px)' }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute inset-0 flex items-center justify-center z-[150] bg-black/80 backdrop-blur-xl"
                    >
                        <div className="text-center px-10 max-w-5xl">
                            <motion.h1
                                initial={{ y: 40, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2, duration: 0.8 }}
                                className="text-6xl md:text-8xl font-black font-display tracking-[0.1em] text-white uppercase drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] leading-tight"
                            >
                                {activeContextSlide.title}
                            </motion.h1>
                            {activeContextSlide.subtitle && (
                                <motion.p
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 0.7 }}
                                    transition={{ delay: 0.5, duration: 0.8 }}
                                    className="mt-8 text-2xl md:text-3xl font-bold tracking-[0.3em] text-blue-200 uppercase"
                                >
                                    {activeContextSlide.subtitle}
                                </motion.p>
                            )}
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: '100%' }}
                                transition={{ delay: 1, duration: activeContextSlide.duration ? (activeContextSlide.duration / 1000) - 1 : 2 }}
                                className="h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent mt-12 opacity-50"
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Board Reveal / Game Start Splash */}
            <AnimatePresence>
                {phase === 'board_reveal' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, filter: 'blur(10px)' }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0 flex items-center justify-center z-10 bg-black/40 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 1.5, opacity: 0 }}
                            transition={{ duration: 0.6, type: 'spring', bounce: 0.3 }}
                            className="text-center"
                        >
                            <motion.h2
                                initial={{ y: 30, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2, duration: 0.5 }}
                                className="text-7xl md:text-9xl font-black tracking-[0.3em] font-display text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-amber-200 drop-shadow-[0_0_30px_rgba(255,255,255,0.5)] uppercase"
                            >
                                GAME START
                            </motion.h2>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.6 }}
                                transition={{ delay: 0.6, duration: 0.4 }}
                                className="text-white/60 text-lg tracking-[0.5em] uppercase mt-4 font-semibold"
                            >
                                8 AI Models Enter
                            </motion.p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Team Turn Splash — "BLUE/RED TEAM TURN" before spymaster intro */}
            <AnimatePresence>
                {showTeamTurnSplash && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, filter: 'blur(10px)' }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0 flex items-center justify-center z-10 bg-black/40 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 1.2, opacity: 0 }}
                            transition={{ duration: 0.5, type: 'spring', bounce: 0.25 }}
                            className="text-center"
                        >
                            <motion.h2
                                initial={{ y: 30, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.15, duration: 0.5 }}
                                className={`text-7xl md:text-9xl font-black tracking-[0.2em] font-display uppercase drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] ${currentTeam === 'blue'
                                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-blue-500 to-blue-300'
                                    : 'text-transparent bg-clip-text bg-gradient-to-r from-red-300 via-red-500 to-red-300'
                                    }`}
                            >
                                {currentTeam.toUpperCase()} TEAM
                            </motion.h2>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.7 }}
                                transition={{ delay: 0.4, duration: 0.4 }}
                                className="text-white/60 text-2xl tracking-[0.5em] uppercase mt-4 font-bold"
                            >
                                TURN
                            </motion.p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Turn Splash Overlay (Text Only — "BLUE SPYMASTER" / "BLUE OPERATIVES") */}
            <AnimatePresence>
                {showTurnSplash && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }}
                        transition={{ duration: 0.6, ease: 'easeInOut' }}
                        className="absolute inset-x-0 top-[10%] flex justify-center z-10"
                    >
                        <motion.h2
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -50, opacity: 0 }}
                            transition={{ delay: 0.1, duration: 0.5 }}
                            className={`text-6xl md:text-8xl font-black tracking-[0.2em] font-display text-transparent bg-clip-text drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] uppercase ${currentTeam === 'blue'
                                ? 'bg-gradient-to-r from-blue-400 to-blue-600'
                                : 'bg-gradient-to-r from-red-400 to-red-600'
                                }`}
                        >
                            {splashText}
                        </motion.h2>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Spymaster Info (Avatar + Name) — Fluidly moves from center splash to top */}
            <AnimatePresence>
                {activeSpymaster && (
                    <motion.div
                        initial={{ opacity: 0, y: 100, scale: 0.8 }}
                        animate={{
                            opacity: 1,
                            y: showTurnSplash ? 0 : -240,
                            scale: showTurnSplash ? 1.4 : 1.0
                        }}
                        exit={{ opacity: 0, y: -300 }}
                        transition={{ duration: 0.8, type: 'spring', bounce: 0.25 }}
                        className="absolute z-20 flex flex-col items-center justify-center"
                    >
                        {aiModel && <ProviderLogo provider={aiModel.provider} className="w-24 h-24 drop-shadow-2xl mb-4" />}
                        <h3 className={`text-4xl font-black font-display tracking-widest uppercase drop-shadow-lg ${currentTeam === 'blue' ? 'text-blue-300' : 'text-red-300'}`}>
                            {activeSpymaster.name}
                        </h3>
                        <p className="text-white/70 tracking-widest text-base uppercase font-semibold mt-1 drop-shadow-md">SPYMASTER</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Operative Cards — centered splash, then sidebar */}
            <AnimatePresence>
                {isOperativePhase && showTurnSplash && teamOperatives.length > 0 && (
                    <motion.div
                        key={`ops-splash-${currentTeam}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.4 }}
                        className="absolute inset-0 z-20 flex flex-row items-center justify-center gap-12"
                    >
                        {teamOperatives.map((op, i) => {
                            const opModel = AVAILABLE_MODELS.find(m => m.id === op.model);
                            return (
                                <motion.div
                                    key={op.id}
                                    initial={{ opacity: 0, y: 40, scale: 0.8 }}
                                    animate={{ opacity: 1, y: 0, scale: 1.2 }}
                                    transition={{ duration: 0.5, type: 'spring', bounce: 0.2, delay: i * 0.15 }}
                                    className={`flex flex-col items-center p-3 rounded-2xl bg-black/40 backdrop-blur-md border border-white/20 shadow-xl ${currentTeam === 'blue' ? 'cinematic-active-pulse-blue' : 'cinematic-active-pulse-red'
                                        }`}
                                >
                                    {opModel && <ProviderLogo provider={opModel.provider} className="w-24 h-24 drop-shadow-2xl" />}
                                    <h3 className={`mt-2 text-xl font-black font-display tracking-wider uppercase drop-shadow-lg ${currentTeam === 'blue' ? 'text-blue-300' : 'text-red-300'
                                        }`}>{op.name}</h3>
                                    <p className="text-white/60 tracking-widest uppercase font-semibold drop-shadow-md text-sm mt-0.5">
                                        {op.isCaptain ? 'CAPTAIN' : 'OPERATIVE'}
                                    </p>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Operative Sidebar — after splash */}
            <AnimatePresence>
                {isOperativePhase && !showTurnSplash && teamOperatives.length > 0 && (
                    <motion.div
                        key={`ops-sidebar-${currentTeam}`}
                        initial={{ opacity: 0, x: sidebarSide === 'left' ? -60 : 60 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: sidebarSide === 'left' ? -60 : 60 }}
                        transition={{ duration: 0.5, type: 'spring', bounce: 0.2 }}
                        className={`absolute top-0 bottom-0 z-20 flex flex-col gap-4 items-center justify-center ${sidebarSide === 'left' ? 'left-4' : 'right-4'
                            }`}
                    >
                        {teamOperatives.map((op, i) => {
                            const isActive = activePlayerId === op.id;
                            const opModel = AVAILABLE_MODELS.find(m => m.id === op.model);
                            const opEmoji = getOperativeEmoji(op.id);

                            return (
                                <motion.div
                                    key={op.id}
                                    initial={{ opacity: 0, x: sidebarSide === 'left' ? -30 : 30 }}
                                    animate={{
                                        opacity: isActive ? 1 : 0.4,
                                        x: 0,
                                        scale: isActive ? 1.05 : 0.9,
                                    }}
                                    transition={{ duration: 0.4, type: 'spring', bounce: 0.2, delay: i * 0.1 }}
                                    className={`flex flex-col items-center p-3 rounded-2xl ${isActive
                                        ? `bg-black/40 backdrop-blur-md border border-white/20 shadow-xl ${currentTeam === 'blue' ? 'cinematic-active-pulse-blue' : 'cinematic-active-pulse-red'
                                        }`
                                        : 'bg-black/15 backdrop-blur-sm border border-white/5'
                                        }`}
                                >
                                    <motion.div
                                        animate={isActive ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                                        transition={isActive ? { repeat: Infinity, duration: 2, ease: 'easeInOut' } : {}}
                                    >
                                        {opModel && (
                                            <ProviderLogo
                                                provider={opModel.provider}
                                                className={isActive ? 'w-16 h-16 drop-shadow-2xl' : 'w-10 h-10 drop-shadow-lg'}
                                            />
                                        )}
                                    </motion.div>
                                    <h3 className={`mt-2 font-black font-display tracking-wider uppercase drop-shadow-lg ${isActive ? 'text-base' : 'text-xs'
                                        } ${currentTeam === 'blue' ? 'text-blue-300' : 'text-red-300'}`}>
                                        {op.name}
                                    </h3>
                                    <p className={`text-white/60 tracking-widest uppercase font-semibold drop-shadow-md ${isActive ? 'text-xs mt-0.5' : 'text-[10px]'
                                        }`}>
                                        {op.isCaptain ? 'CAPTAIN' : 'OPERATIVE'}
                                    </p>
                                    <motion.span
                                        key={`${op.id}-${opEmoji}`}
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', delay: 0.15 }}
                                        className={isActive ? 'text-lg mt-1' : 'text-xs mt-0.5'}
                                    >
                                        {opEmoji}
                                    </motion.span>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Team Conversation Feed (bottom subtitle area) */}
            <AnimatePresence>
                {isOperativePhase && teamConversationMessages.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        transition={{ duration: 0.5, type: 'spring' }}
                        className="absolute inset-0 flex items-center justify-center z-30 px-6"
                    >
                        <div
                            ref={subtitleRef}
                            className="bg-black/40 border border-white/15 text-white/90 p-6 rounded-2xl text-base md:text-lg leading-relaxed max-h-[60vh] w-full max-w-3xl overflow-y-auto scroll-smooth scrollbar-none space-y-3"
                        >
                            {teamConversationMessages.map(msg => {
                                const msgModel = AVAILABLE_MODELS.find(m => m.id === players.find(p => p.id === msg.playerId)?.model);
                                return (
                                    <motion.div
                                        key={msg.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            {msgModel && <ProviderLogo provider={msgModel.provider} className="w-5 h-5 opacity-70" />}
                                            <span className={`text-sm font-bold tracking-widest uppercase ${currentTeam === 'blue' ? 'text-blue-300/80' : 'text-red-300/80'}`}>
                                                {msg.playerName}
                                            </span>
                                        </div>
                                        <p className="text-white/85 italic pl-6">
                                            <span className="opacity-40">"</span>
                                            {msg.content}
                                            <span className="opacity-40">"</span>
                                        </p>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Phase Context Indicator (top-right) */}
            <AnimatePresence>
                {phase !== 'setup' && phase !== 'game_over' && phase !== 'board_reveal' && (
                    <motion.div
                        key={phase}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                        className="absolute top-6 right-8 z-30 flex items-center gap-3"
                    >
                        <span className="text-5xl drop-shadow-lg">{phaseInfo.emoji}</span>
                        <span className="text-white/60 text-base font-bold tracking-[0.3em] uppercase">{phaseInfo.label}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom Subtitle Thinking Area (Spymaster) */}
            <AnimatePresence>
                {activeSpymaster && latestMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        transition={{ duration: 0.5, type: 'spring' }}
                        className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-5xl z-30 px-6"
                    >
                        <div
                            ref={subtitleRef}
                            className="bg-black/30 backdrop-blur-md border border-white/15 text-white/90 p-6 rounded-2xl text-lg md:text-xl italic font-medium leading-relaxed max-h-[60vh] overflow-y-auto scroll-smooth scrollbar-none text-center"
                        >
                            <span className="opacity-50 mr-2">"</span>
                            {latestMessage.content}
                            <span className="inline-flex ml-1 text-white/50">
                                <span className="bounce-dot text-[18px]">.</span>
                                <span className="bounce-dot text-[18px]">.</span>
                                <span className="bounce-dot text-[18px]">.</span>
                            </span>
                            <span className="opacity-50 ml-1">"</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Guess Announcement Overlay — lightweight, no blur */}
            <AnimatePresence>
                {guessAnnouncement && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="absolute inset-0 flex items-center justify-center z-[55] bg-black/10"
                    >
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.8, opacity: 0, y: -40 }}
                            transition={{ duration: 0.4, type: 'spring', bounce: 0.25 }}
                            className="text-center"
                        >
                            {/* Label */}
                            <motion.p
                                key={guessAnnouncement.result}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 0.8, y: 0 }}
                                className="text-white/80 text-lg tracking-[0.4em] uppercase font-bold mb-3 drop-shadow-lg"
                            >
                                {guessAnnouncement.result === 'pending' ? 'GUESSING...' : guessAnnouncement.result === 'correct' ? 'CORRECT!' : 'MISS!'}
                            </motion.p>

                            {/* The guess word card */}
                            <motion.div
                                animate={guessAnnouncement.result === 'pending'
                                    ? { scale: [1, 1.02, 1] }
                                    : { scale: 1 }
                                }
                                transition={guessAnnouncement.result === 'pending'
                                    ? { repeat: Infinity, duration: 1.5, ease: 'easeInOut' }
                                    : {}
                                }
                                className={`px-10 py-6 rounded-2xl border-2 shadow-2xl ${guessAnnouncement.result === 'pending'
                                    ? 'border-white/25 bg-black/50'
                                    : guessAnnouncement.result === 'correct'
                                        ? 'border-green-400/50 bg-green-500/15 shadow-[0_0_40px_rgba(34,197,94,0.3)]'
                                        : 'border-amber-400/50 bg-amber-500/15 shadow-[0_0_40px_rgba(245,158,11,0.3)]'
                                    }`}
                            >
                                <h2 className={`text-6xl md:text-7xl font-black font-display uppercase tracking-widest drop-shadow-lg ${guessAnnouncement.result === 'pending'
                                    ? 'text-white'
                                    : guessAnnouncement.result === 'correct'
                                        ? 'text-green-300'
                                        : 'text-amber-300'
                                    }`}>
                                    {guessAnnouncement.word}
                                </h2>
                            </motion.div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Dramatic Clue Reveal Overlay */}
            <AnimatePresence>
                {showDramaticClue && currentClue && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.5, y: -200 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                        className="absolute inset-0 flex items-center justify-center z-[60]"
                    >
                        <div className={`p-10 rounded-3xl border-4 shadow-[0_0_100px_rgba(0,0,0,0.5)] backdrop-blur-2xl ${currentTeam === 'blue'
                            ? 'bg-[#3B7DD8]/80 border-[#2B5EA0] shadow-blue-500/50'
                            : 'bg-[#D94F3B]/80 border-[#B33A28] shadow-red-500/50'
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
