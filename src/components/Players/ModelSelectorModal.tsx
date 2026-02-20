import { motion, AnimatePresence } from 'framer-motion';
import { AVAILABLE_MODELS, type AIModel } from '../../config/models';
import { useGameStore } from '../../store/gameStore';
import { useState, useMemo } from 'react';
import ProviderLogo from './ProviderLogo';

interface Props {
    playerId: string | null;
    onClose: () => void;
}

export default function ModelSelectorModal({ playerId, onClose }: Props) {
    const players = useGameStore(s => s.players);
    const setPlayerModel = useGameStore(s => s.setPlayerModel);
    const player = players.find(p => p.id === playerId);

    const [searchQuery, setSearchQuery] = useState('');
    const [minContext, setMinContext] = useState<number>(0);
    const [maxInputCost, setMaxInputCost] = useState<number>(100);
    const [maxOutputCost, setMaxOutputCost] = useState<number>(100);
    const [sortBy, setSortBy] = useState<string>('az');
    const [allowDuplicates, setAllowDuplicates] = useState<boolean>(false);

    // Select Mode state
    const [isSelectMode, setIsSelectMode] = useState<boolean>(false);
    const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(new Set());

    const filteredModels = useMemo(() => {
        return AVAILABLE_MODELS.filter(model => {
            const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                model.provider.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesContext = model.contextWindowK >= minContext;
            const matchesInputCost = model.inputCostM <= maxInputCost;
            const matchesOutputCost = model.outputCostM <= maxOutputCost;

            return matchesSearch && matchesContext && matchesInputCost && matchesOutputCost;
        }).sort((a, b) => {
            switch (sortBy) {
                case 'az':
                    return a.name.localeCompare(b.name);
                case 'za':
                    return b.name.localeCompare(a.name);
                case 'input-asc':
                    return a.inputCostM - b.inputCostM;
                case 'input-desc':
                    return b.inputCostM - a.inputCostM;
                case 'output-asc':
                    return a.outputCostM - b.outputCostM;
                case 'output-desc':
                    return b.outputCostM - a.outputCostM;
                case 'context-asc':
                    return a.contextWindowK - b.contextWindowK;
                case 'context-desc':
                    return b.contextWindowK - a.contextWindowK;
                default:
                    return a.name.localeCompare(b.name);
            }
        });
    }, [searchQuery, minContext, maxInputCost, maxOutputCost, sortBy]);

    if (!playerId || !player) return null;

    const handleSelect = (model: AIModel) => {
        if (isSelectMode) {
            setSelectedModelIds(prev => {
                const next = new Set(prev);
                if (next.has(model.id)) next.delete(model.id);
                else next.add(model.id);
                return next;
            });
            return;
        }
        setPlayerModel(playerId, model.id, model.name);
        onClose();
    };

    const getAvailablePool = () => {
        if (isSelectMode && selectedModelIds.size > 0) {
            return filteredModels.filter(m => selectedModelIds.has(m.id));
        }
        return filteredModels;
    };

    const handleRandomize = () => {
        let pool = getAvailablePool();
        if (pool.length === 0) return;

        let available = [...pool];
        if (!allowDuplicates) {
            const usedIds = new Set(players.filter(p => p.id !== playerId).map(p => p.model));
            available = available.filter(m => !usedIds.has(m.id));
            if (available.length === 0) {
                alert("Not enough unique models match your filters/selection!");
                return;
            }
        }

        const randomIndex = Math.floor(Math.random() * available.length);
        const chosen = available[randomIndex];
        setPlayerModel(playerId, chosen.id, chosen.name);
        onClose();
    };

    const randomizeGroup = (playerIdsToUpdate: string[]) => {
        let pool = getAvailablePool();
        if (pool.length === 0) return;

        let available = [...pool];
        if (!allowDuplicates) {
            if (available.length < playerIdsToUpdate.length) {
                alert(`Only ${available.length} models match your selection, but you need ${playerIdsToUpdate.length}. Please select more models or allow repeats.`);
                return;
            }

            // Shuffle
            for (let i = available.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [available[i], available[j]] = [available[j], available[i]];
            }

            playerIdsToUpdate.forEach((id, index) => {
                setPlayerModel(id, available[index].id, available[index].name);
            });

        } else {
            playerIdsToUpdate.forEach((id) => {
                const randomIndex = Math.floor(Math.random() * available.length);
                setPlayerModel(id, available[randomIndex].id, available[randomIndex].name);
            });
        }

        onClose();
    };

    const handleRandomizeTeam = () => {
        const teamIds = players.filter(p => p.team === player.team).map(p => p.id);
        randomizeGroup(teamIds);
    };

    const handleRandomizeAll = () => {
        const allIds = players.map(p => p.id);
        randomizeGroup(allIds);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    onClick={e => e.stopPropagation()}
                    className="bg-[#F8F5F0] border border-[#D4CDB8] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-4 border-b border-[#D4CDB8] flex items-center justify-between bg-white relative z-10 shadow-sm">
                        <div>
                            <h3 className="text-[#3A3428] font-bold text-lg leading-tight">Select AI Model</h3>
                            <p className="text-sm text-[#8C7F6A]">
                                Change model for <strong className={player.team === 'blue' ? 'text-[#3B7DD8]' : 'text-[#D94F3B]'}>{player.name}</strong> ({player.role})
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center hover:bg-[#E8E0D0] text-[#8C7F6A] hover:text-[#3A3428] rounded-full transition-colors"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="bg-white px-4 py-3 border-b border-[#D4CDB8] space-y-3 z-10 shrink-0">
                        <input
                            type="text"
                            placeholder="Search by name or provider..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full px-3 py-2 bg-[#F8F5F0] border border-[#D4CDB8] rounded-lg text-sm text-[#3A3428] placeholder-[#B8A880] focus:outline-none focus:ring-2 focus:ring-[#3B7DD8]/50"
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-[#8C7F6A]">Min Context</label>
                                <select
                                    value={minContext}
                                    onChange={e => setMinContext(Number(e.target.value))}
                                    className="bg-[#F8F5F0] border border-[#D4CDB8] rounded flex-1 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#3B7DD8]/50"
                                >
                                    <option value={0}>Any Context</option>
                                    <option value={100}>≥ 100K tokens</option>
                                    <option value={200}>≥ 200K tokens</option>
                                    <option value={500}>≥ 500K tokens</option>
                                    <option value={1000}>≥ 1M tokens</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-[#8C7F6A]">Max Input Cost</label>
                                <select
                                    value={maxInputCost}
                                    onChange={e => setMaxInputCost(Number(e.target.value))}
                                    className="bg-[#F8F5F0] border border-[#D4CDB8] rounded flex-1 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#3B7DD8]/50"
                                >
                                    <option value={100}>Any Cost</option>
                                    <option value={0.5}>≤ $0.50 / 1M</option>
                                    <option value={1.0}>≤ $1.00 / 1M</option>
                                    <option value={2.0}>≤ $2.00 / 1M</option>
                                    <option value={5.0}>≤ $5.00 / 1M</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-[#8C7F6A]">Max Output Cost</label>
                                <select
                                    value={maxOutputCost}
                                    onChange={e => setMaxOutputCost(Number(e.target.value))}
                                    className="bg-[#F8F5F0] border border-[#D4CDB8] rounded flex-1 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#3B7DD8]/50"
                                >
                                    <option value={100}>Any Cost</option>
                                    <option value={0.5}>≤ $0.50 / 1M</option>
                                    <option value={1.0}>≤ $1.00 / 1M</option>
                                    <option value={2.0}>≤ $2.00 / 1M</option>
                                    <option value={5.0}>≤ $5.00 / 1M</option>
                                    <option value={10.0}>≤ $10.00 / 1M</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-[#8C7F6A]">Sort By</label>
                                <select
                                    value={sortBy}
                                    onChange={e => setSortBy(e.target.value)}
                                    className="bg-[#F8F5F0] border border-[#D4CDB8] rounded flex-1 px-2 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-[#3B7DD8]/50"
                                >
                                    <option value="az">A-Z</option>
                                    <option value="za">Z-A</option>
                                    <option value="input-asc">Input ↑</option>
                                    <option value="input-desc">Input ↓</option>
                                    <option value="output-asc">Output ↑</option>
                                    <option value="output-desc">Output ↓</option>
                                    <option value="context-asc">Context ↑</option>
                                    <option value="context-desc">Context ↓</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-2 pt-2 border-t border-[#E8E0D0]/50 gap-2">
                            <div className="text-xs text-[#8C7F6A] flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span>Found {filteredModels.length} {filteredModels.length === 1 ? 'model' : 'models'}</span>
                                <span className="text-[#D4CDB8] hidden sm:inline">|</span>
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={allowDuplicates}
                                        onChange={e => setAllowDuplicates(e.target.checked)}
                                        className="accent-[#3B7DD8]"
                                    />
                                    <span>Repeats</span>
                                </label>
                                <span className="text-[#D4CDB8] hidden sm:inline">|</span>
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isSelectMode}
                                        onChange={e => setIsSelectMode(e.target.checked)}
                                        className="accent-[#3B7DD8]"
                                    />
                                    <span className={isSelectMode ? 'font-bold text-[#3B7DD8]' : ''}>Select Mode</span>
                                </label>
                                {isSelectMode && (
                                    <span className="text-[#3B7DD8] font-bold">
                                        ({selectedModelIds.size} picked)
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-1.5 justify-end w-full sm:w-auto mt-2 sm:mt-0">
                                <button
                                    onClick={handleRandomize}
                                    disabled={getAvailablePool().length === 0}
                                    title="Randomize THIS player"
                                    className={`
                                        px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm
                                        ${getAvailablePool().length > 0
                                            ? 'bg-[#3A3428] text-[#F8F5F0] hover:bg-[#2A251C]'
                                            : 'bg-[#D4CDB8] text-[#8C7F6A] cursor-not-allowed opacity-50'
                                        }
                                    `}
                                >
                                    🎲 1
                                </button>
                                <button
                                    onClick={handleRandomizeTeam}
                                    disabled={getAvailablePool().length === 0}
                                    title={`Randomize ${player.team.toUpperCase()} TEAM`}
                                    className={`
                                        px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm
                                        ${getAvailablePool().length > 0
                                            ? (player.team === 'blue' ? 'bg-[#3B7DD8] text-white hover:bg-[#2B5EA0]' : 'bg-[#D94F3B] text-white hover:bg-[#B33A28]')
                                            : 'bg-[#D4CDB8] text-[#8C7F6A] cursor-not-allowed opacity-50'
                                        }
                                    `}
                                >
                                    🎲 Team
                                </button>
                                <button
                                    onClick={handleRandomizeAll}
                                    disabled={getAvailablePool().length === 0}
                                    title="Randomize ALL players"
                                    className={`
                                        px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm
                                        ${getAvailablePool().length > 0
                                            ? 'bg-gradient-to-r from-[#3B7DD8] to-[#D94F3B] text-white hover:brightness-90'
                                            : 'bg-[#D4CDB8] text-[#8C7F6A] cursor-not-allowed opacity-50'
                                        }
                                    `}
                                >
                                    🎲 All
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* List */}
                    <div className="overflow-y-auto p-2 scrollbar-thin flex-1 bg-[#F8F5F0]/50 relative">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {filteredModels.map(model => {
                                const isCurrentlyActiveForPlayer = player.model === model.id && !isSelectMode;
                                const isHandPicked = selectedModelIds.has(model.id);

                                return (
                                    <button
                                        key={model.id}
                                        onClick={() => handleSelect(model)}
                                        className={`
                                        w-full text-left flex flex-col p-3 rounded-xl transition-all
                                        border group relative
                                        ${isCurrentlyActiveForPlayer || (isSelectMode && isHandPicked)
                                                ? 'bg-white border-[#3B7DD8]/50 ring-1 ring-[#3B7DD8]/30 shadow-sm z-10'
                                                : 'bg-transparent border-transparent hover:bg-white hover:border-[#D4CDB8] hover:shadow-sm'
                                            }
                                        ${isSelectMode && !isHandPicked ? 'opacity-70 hover:opacity-100' : ''}
                                        `}
                                    >
                                        {isSelectMode && (
                                            <div className="absolute top-3 right-3 flex items-center justify-center">
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isHandPicked ? 'bg-[#3B7DD8] border-[#3B7DD8] text-white' : 'border-[#B8A880] bg-white group-hover:border-[#3B7DD8]'
                                                    }`}>
                                                    {isHandPicked && <span className="text-[10px] leading-none">✓</span>}
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between w-full mb-1 border-b border-[#E8E0D0]/50 pb-1 pr-6">
                                            <div className={`font-bold text-sm ${(isCurrentlyActiveForPlayer || isHandPicked) ? 'text-[#3B7DD8]' : 'text-[#3A3428] group-hover:text-[#3B7DD8]'}`}>
                                                {model.name}
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-[#E8E0D0] text-[#8C7F6A] shadow-sm">
                                                <ProviderLogo provider={model.provider} className="w-3 h-3 opacity-70" />
                                                <span>{model.provider}</span>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-end w-full mt-1">
                                            <div className="text-xs text-[#8C7F6A] flex flex-col gap-0.5">
                                                <div className="flex items-center gap-1">
                                                    <span title="Context Window">🧠</span> {model.contextWindowK >= 1000 ? `${model.contextWindowK / 1000}M` : `${model.contextWindowK}K`} tokens
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span title="Cost">💸</span> Input: ${model.inputCostM.toFixed(2)}/M | Output: ${model.outputCostM.toFixed(2)}/M
                                                </div>
                                            </div>
                                            {isCurrentlyActiveForPlayer && (
                                                <div className="text-[10px] text-white bg-[#3B7DD8] px-2 py-0.5 rounded font-bold uppercase tracking-wider mb-0.5 shadow">
                                                    Active
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {filteredModels.length === 0 && (
                            <div className="text-center p-8 text-[#8C7F6A]">
                                No models match your current filters.
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
