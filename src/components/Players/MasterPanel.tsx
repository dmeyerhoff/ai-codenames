import { useGameStore } from '../../store/gameStore';
import { useState } from 'react';
import ModelSelectorModal from './ModelSelectorModal';
import { AVAILABLE_MODELS } from '../../config/models';
import ProviderLogo from './ProviderLogo';

export default function MasterPanel() {
    const masterModel = useGameStore(s => s.masterModel);
    const phase = useGameStore(s => s.phase);
    const [isSelecting, setIsSelecting] = useState(false);

    const canSelectModel = phase === 'setup';
    const aiModel = AVAILABLE_MODELS.find(m => m.id === masterModel.id);

    return (
        <div className="rounded-xl border border-[#D4CDB8] bg-white/60 p-3 shadow-sm mt-auto">
            <h3 className="text-[#8B5CF6] font-display text-xs uppercase tracking-wider mb-2">
                System 🤖
            </h3>

            <div className="relative py-1">
                <button
                    onClick={() => canSelectModel && setIsSelecting(true)}
                    disabled={!canSelectModel}
                    className={`w-full flex items-center gap-2 text-left rounded-lg transition-colors group ${canSelectModel ? 'hover:bg-[#E8E0D0]/50 p-1 -m-1' : ''
                        }`}
                >
                    <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-sm border bg-white border-[#8B5CF6]">
                        {aiModel ? <ProviderLogo provider={aiModel.provider} className="w-4 h-4" /> : '🤖'}
                    </div>

                    <div className="min-w-0 flex-1 relative">
                        <div className="text-[#3A3428] text-xs font-medium flex items-center relative">
                            <span className="truncate max-w-[100px]">{masterModel.name}</span>
                        </div>
                        <div className="text-[#B8A880] text-[10px] flex items-center justify-between pr-2 mt-0.5">
                            <div className="flex items-center gap-1.5">
                                {aiModel && <ProviderLogo provider={aiModel.provider} className="w-3.5 h-3.5 opacity-60" />}
                                <span className="text-[#8B5CF6]">Game Master</span>
                            </div>
                            {canSelectModel && (
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity font-bold uppercase tracking-wider text-[#B8A880]">
                                    Swap
                                </span>
                            )}
                        </div>
                    </div>
                </button>
            </div>

            {isSelecting && (
                <ModelSelectorModal
                    playerId="master"
                    onClose={() => setIsSelecting(false)}
                />
            )}
        </div>
    );
}
