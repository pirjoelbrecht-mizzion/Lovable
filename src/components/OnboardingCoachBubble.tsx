/**
 * Onboarding Coach Bubble Component
 * Displays coach messages in a friendly, animated bubble during onboarding
 * Different from the main CoachBubble which is for AI chat
 */

import { motion } from 'framer-motion';

interface OnboardingCoachBubbleProps {
  text: string;
  subtext?: string;
  emoji?: string;
  variant?: 'default' | 'success' | 'info' | 'tip';
}

export default function OnboardingCoachBubble({
  text,
  subtext,
  emoji = '💬',
  variant = 'default',
}: OnboardingCoachBubbleProps) {
  const variantStyles = {
    default: {
      bg: 'bg-orange-50 dark:bg-neutral-800',
      border: 'border-orange-200 dark:border-neutral-700',
      text: 'text-gray-800 dark:text-gray-100',
      subtext: 'text-gray-600 dark:text-gray-400',
    },
    success: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-700',
      text: 'text-green-900 dark:text-green-100',
      subtext: 'text-green-700 dark:text-green-300',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-700',
      text: 'text-blue-900 dark:text-blue-100',
      subtext: 'text-blue-700 dark:text-blue-300',
    },
    tip: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-200 dark:border-purple-700',
      text: 'text-purple-900 dark:text-purple-100',
      subtext: 'text-purple-700 dark:text-purple-300',
    },
  };

  const styles = variantStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`rounded-2xl ${styles.bg} p-4 shadow-sm border ${styles.border} relative`}
    >
      <div className="flex gap-3">
        <div className="text-2xl flex-shrink-0" style={{ marginTop: -2 }}>
          {emoji}
        </div>
        <div className="flex-1">
          <p className={`text-sm leading-relaxed ${styles.text}`}>{text}</p>
          {subtext && (
            <p className={`text-xs mt-2 leading-relaxed ${styles.subtext}`}>
              {subtext}
            </p>
          )}
        </div>
      </div>

      <motion.div
        className="absolute -bottom-2 left-6 w-4 h-4 transform rotate-45"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{
          background: 'inherit',
          borderRight: 'inherit',
          borderBottom: 'inherit',
        }}
      />
    </motion.div>
  );
}

export function CoachTip({ text, icon = '💡' }: { text: string; icon?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-neutral-800/50 rounded-lg p-2 border border-gray-200 dark:border-neutral-700"
    >
      <span className="text-base flex-shrink-0">{icon}</span>
      <span className="leading-relaxed">{text}</span>
    </motion.div>
  );
}

export function CelebrationBadge({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ type: 'spring', duration: 0.5, bounce: 0.6 }}
      className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-sm font-medium px-3 py-1 rounded-full border border-green-300 dark:border-green-700"
    >
      <span className="text-base">✨</span>
      {message}
    </motion.div>
  );
}

export function CoachLoading({ tip }: { tip?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="text-xl"
      >
        ⚡
      </motion.div>
      <div>
        <div className="font-medium">Setting up your plan...</div>
        {tip && <div className="text-xs mt-1 opacity-75">{tip}</div>}
      </div>
    </motion.div>
  );
}
