import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import type { Card as CardType } from '../../types/game';
import { useGameStore } from '../../store/gameStore';

interface CardProps {
  card: CardType;
  showSpymaster?: boolean;
  isScanned?: boolean;
}

const REVEALED_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  blue: {
    bg: 'bg-[#3B7DD8]',
    border: 'border-[#2B5EA0]',
    text: 'text-white',
  },
  red: {
    bg: 'bg-[#D94F3B]',
    border: 'border-[#B33A28]',
    text: 'text-white',
  },
  bystander: {
    bg: 'bg-[#D4C5A0]',
    border: 'border-[#B8A880]',
    text: 'text-[#4A3F2F]',
  },
  assassin: {
    bg: 'bg-[#2C2C2C]',
    border: 'border-[#1A1A1A]',
    text: 'text-[#FF6B5E]',
  },
};

const SPYMASTER_DOTS: Record<string, string> = {
  blue: 'bg-[#3B7DD8]',
  red: 'bg-[#D94F3B]',
  bystander: 'bg-[#B8A880]',
  assassin: 'bg-[#2C2C2C]',
};

export default function Card({ card, showSpymaster, isScanned }: CardProps) {
  const isRevealedMode = useGameStore(s => s.isRevealedMode);
  const isBoardRevealed = useGameStore(s => s.isBoardRevealed);
  const isVideoMode = useGameStore(s => s.isVideoMode);
  const revealed = card.revealed;
  const style = REVEALED_STYLES[card.type];

  // 3D Hover Effect Physics
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 400, damping: 25 });
  const mouseYSpring = useSpring(y, { stiffness: 400, damping: 25 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["8deg", "-8deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-8deg", "8deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (revealed) return; // Optional: don't tilt as much if flipped, or let it tilt!
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Normalize values between -0.5 and 0.5
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;

    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  // Subtle hints for unrevealed cards if the user toggled the Reveal toggle
  const hintBorder = isRevealedMode && !revealed ? style.border : (isScanned && isVideoMode ? 'border-[#3B7DD8]/50' : 'border-[#D4CDB8]');
  const hintBg = isRevealedMode && !revealed && card.type !== 'bystander'
    ? (card.type === 'blue' ? 'bg-[#3B7DD8]/10' : card.type === 'red' ? 'bg-[#D94F3B]/10' : 'bg-[#2C2C2C]/10')
    : (isScanned && isVideoMode ? 'bg-[#3B7DD8]/5' : 'bg-[#F5F0E8]');

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{
        scale: isScanned && isVideoMode ? 1.05 : 1,
        opacity: 1,
        zIndex: isScanned && isVideoMode ? 5 : 1,
        y: isScanned && isVideoMode ? -5 : 0
      }}
      transition={{
        delay: card.position * 0.02,
        duration: 0.3,
        scale: { type: "spring", stiffness: 400, damping: 25 },
        zIndex: { delay: 0.1 }
      }}
      className="relative w-full h-full perspective-1000 group cursor-pointer"
      whileHover={{ scale: 1.08, zIndex: 10, transition: { duration: 0.05, ease: "easeOut" } }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
      }}
    >
      <motion.div
        animate={{ rotateY: revealed ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 120, damping: 15 }}
        className="absolute inset-0"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front — unrevealed */}
        <div
          className={`absolute inset-0 backface-hidden rounded-lg ${hintBg} border-2 ${hintBorder} shadow-md group-hover:shadow-xl transition-all duration-300 card-glow flex items-center justify-center text-center`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="px-2 relative w-full h-full flex flex-col items-center justify-center">
            <motion.div
              initial={{ rotateX: -180 }}
              animate={{ rotateX: isBoardRevealed ? 0 : -180 }}
              transition={{ duration: 0.6, delay: card.position * 0.05, type: 'spring', bounce: 0.4 }}
              className="font-extrabold text-[#3A3428] text-[11px] sm:text-sm leading-tight tracking-wide uppercase inline-block drop-shadow-sm"
              style={{ backfaceVisibility: 'hidden', transformStyle: 'preserve-3d' }}
            >
              {card.word}
            </motion.div>
            {showSpymaster && (
              <span className={`absolute -bottom-2 right-0 w-2 h-2 rounded-full ${SPYMASTER_DOTS[card.type]}`} />
            )}
          </div>
        </div>

        {/* Back — revealed */}
        <div
          className={`absolute inset-0 backface-hidden rounded-lg ${style.bg} border-2 ${style.border} shadow-lg flex items-center justify-center text-center`}
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="px-2 relative">
            <span className={`font-extrabold ${style.text} text-[11px] sm:text-sm leading-tight tracking-wide uppercase`}>
              {card.word}
            </span>
            {card.type === 'assassin' && (
              <span className="absolute -top-3 -right-2 text-sm">💀</span>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
