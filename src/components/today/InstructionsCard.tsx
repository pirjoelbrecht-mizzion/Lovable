import { FC } from 'react';

interface Props {
  text: string;
  coachTip?: string;
}

export const InstructionsCard: FC<Props> = ({ text, coachTip }) => (
  <div className="p-4 rounded-2xl bg-surface1-light dark:bg-surface1-dark shadow-elevated">
    <h3 className="text-sm font-semibold text-primary-light dark:text-primary-dark mb-2">
      Instructions
    </h3>
    <p className="text-xs text-muted-light dark:text-muted-dark leading-relaxed">
      {text}
    </p>
    {coachTip && (
      <div className="mt-3 pt-3 border-t border-gray-700 dark:border-gray-600">
        <p className="text-xs text-success/90 italic">
          💡 Coach tip: {coachTip}
        </p>
      </div>
    )}
  </div>
);
