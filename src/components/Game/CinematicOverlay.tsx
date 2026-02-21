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

    const [showTurnSplash, setShowTurnSplash] = useState(false);
    const [splashText, setSplashText] = useState('');
    const [showTeamTurnSplash, setShowTeamTurnSplash] = useState(false);

    // Dramatic Clue State
    const [showDramaticClue, setShowDramaticClue] = useState(false);

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

    // Derived Spymaster State
    const activeSpymaster = phase === 'spymaster_thinking' ? players.find(p => p.id === activePlayerId && p.role === 'spymaster') : null;
    const aiModel = activeSpymaster ? AVAILABLE_MODELS.find(m => m.id === activeSpymaster.model) : null;

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
                        className="absolute inset-0 bg-black/20 backdrop-blur-[6px] z-0"
                    />
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

            {/* Turn Splash Overlay (Text Only) */}
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

            {/* Spymaster Info (Avatar + Name) - Fluidly moves from splash-relative to top-relative */}
            <AnimatePresence>
                {activeSpymaster && (
                    <motion.div
                        initial={{ opacity: 0, y: 100, scale: 0.8 }}
                        animate={{
                            opacity: 1,
                            y: showTurnSplash ? 0 : -240, // Centered under splash, then moves to top
                            scale: showTurnSplash ? 1.4 : 1.0
                        }}
                        exit={{ opacity: 0, y: -300 }}
                        transition={{ duration: 0.8, type: 'spring', bounce: 0.25 }}
                        className="absolute z-20 flex flex-col items-center justify-center"
                    >
                        {aiModel && <ProviderLogo provider={aiModel.provider} className="w-24 h-24 drop-shadow-2xl mb-4" />}
                        <h3 className={`text-3xl font-black font-display tracking-widest uppercase drop-shadow-lg ${currentTeam === 'blue' ? 'text-blue-300' : 'text-red-300'}`}>
                            {activeSpymaster.name}
                        </h3>
                        <p className="text-white/70 tracking-widest text-sm uppercase font-semibold mt-1 drop-shadow-md">SPYMASTER</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Operative Roster — all operatives visible, moves up after splash like spymaster */}
            <AnimatePresence>
                {isOperativePhase && teamOperatives.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{
                            opacity: 1,
                            y: showTurnSplash ? 0 : -200,
                        }}
                        exit={{ opacity: 0, y: -300 }}
                        transition={{ duration: 0.8, type: 'spring', bounce: 0.25 }}
                        className="absolute z-20 flex items-end justify-center gap-12"
                    >
                        {teamOperatives.map((op, i) => {
                            const isActive = activePlayerId === op.id;
                            const opModel = AVAILABLE_MODELS.find(m => m.id === op.model);
                            const opEmoji = getOperativeEmoji(op.id);

                            return (
                                <motion.div
                                    key={op.id}
                                    initial={{ opacity: 0, y: 40 }}
                                    animate={{
                                        opacity: isActive ? 1 : 0.45,
                                        y: 0,
                                        scale: isActive ? 1.2 : 0.8,
                                    }}
                                    transition={{
                                        duration: 0.5,
                                        type: 'spring',
                                        bounce: 0.2,
                                        delay: showTurnSplash ? i * 0.15 : 0,
                                    }}
                                    className="flex flex-col items-center"
                                >
                                    {/* Logo with pulse for active */}
                                    <motion.div
                                        animate={isActive ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                                        transition={isActive ? { repeat: Infinity, duration: 2, ease: 'easeInOut' } : {}}
                                    >
                                        {opModel && <ProviderLogo provider={opModel.provider} className={isActive ? 'w-24 h-24 drop-shadow-2xl' : 'w-14 h-14 drop-shadow-lg'} />}
                                    </motion.div>

                                    {/* Name + Role */}
                                    <h3 className={`mt-2 font-black font-display tracking-widest uppercase drop-shadow-lg ${isActive ? 'text-xl' : 'text-xs'} ${currentTeam === 'blue' ? 'text-blue-300' : 'text-red-300'}`}>
                                        {op.name}
                                    </h3>
                                    <p className={`text-white/60 tracking-widest uppercase font-semibold drop-shadow-md ${isActive ? 'text-[11px] mt-0.5' : 'text-[9px]'}`}>
                                        {op.isCaptain ? 'CAPTAIN' : 'OPERATIVE'}
                                    </p>

                                    {/* Thinking / phase emoji */}
                                    <motion.span
                                        key={`${op.id}-${opEmoji}`}
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', delay: 0.15 }}
                                        className={isActive ? 'text-2xl mt-1' : 'text-sm mt-0.5'}
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
                        className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-5xl z-30 px-6"
                    >
                        <div
                            ref={subtitleRef}
                            className="bg-black/30 backdrop-blur-md border border-white/15 text-white/90 p-5 rounded-2xl text-sm md:text-base leading-relaxed max-h-[35vh] overflow-y-auto scroll-smooth scrollbar-none space-y-3"
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
                                            {msgModel && <ProviderLogo provider={msgModel.provider} className="w-4 h-4 opacity-70" />}
                                            <span className={`text-xs font-bold tracking-widest uppercase ${currentTeam === 'blue' ? 'text-blue-300/80' : 'text-red-300/80'}`}>
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
                        <span className="text-white/60 text-sm font-bold tracking-[0.3em] uppercase">{phaseInfo.label}</span>
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
                            className="bg-black/30 backdrop-blur-md border border-white/15 text-white/90 p-6 rounded-2xl text-base md:text-lg italic font-medium leading-relaxed max-h-[60vh] overflow-y-auto scroll-smooth scrollbar-none text-center"
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
