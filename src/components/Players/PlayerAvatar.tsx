import { motion } from 'framer-motion';
import type { Player } from '../../types/game';
import ProviderLogo from './ProviderLogo';
import { AVAILABLE_MODELS } from '../../config/models';

interface Props {
  player: Player;
  isActive: boolean;
  size?: 'sm' | 'md';
}

export default function PlayerAvatar({ player, isActive, size = 'md' }: Props) {
  const sizeClasses = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  const logoSize = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';
  const aiModel = AVAILABLE_MODELS.find(m => m.id === player.model);

  return (
    <motion.div
      animate={isActive ? { scale: [1, 1.1, 1] } : { scale: 1 }}
      transition={{ repeat: isActive ? Infinity : 0, duration: 1.5 }}
      className={`
        ${sizeClasses} rounded-full flex items-center justify-center
        border-2 shadow-md relative bg-white
        ${isActive ? 'ring-2 ring-[#3B7DD8] ring-offset-2 ring-offset-white' : ''}
      `}
      style={{
        borderColor: player.color,
      }}
    >
      {aiModel ? (
        <ProviderLogo provider={aiModel.provider} className={logoSize} />
      ) : (
        <span className="text-xl">🤖</span>
      )}
      {player.isCaptain && (
        <span className="absolute -top-1 -right-1 text-xs drop-shadow-md">👑</span>
      )}
    </motion.div>
  );
}
