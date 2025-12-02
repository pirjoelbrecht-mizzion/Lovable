import { FC } from 'react';

interface Props {
  onComplete?: () => void;
  onEdit?: () => void;
  onSkip?: () => void;
}

export const TodayActions: FC<Props> = ({ onComplete, onEdit, onSkip }) => (
  <div className="flex flex-col gap-2">
    <button
      onClick={onComplete}
      className="py-3 rounded-xl bg-success text-black font-semibold hover:bg-success/90 transition-colors"
    >
      Complete & Feedback
    </button>

    <div className="flex gap-2">
      <button
        onClick={onEdit}
        className="flex-1 py-3 rounded-xl bg-surface3-light dark:bg-surface3-dark text-primary-light dark:text-primary-dark hover:bg-surface3-light/80 dark:hover:bg-surface3-dark/80 transition-colors"
      >
        Edit
      </button>
      {onSkip && (
        <button
          onClick={onSkip}
          className="flex-1 py-3 rounded-xl bg-surface3-light dark:bg-surface3-dark text-muted-light dark:text-muted-dark hover:bg-surface3-light/80 dark:hover:bg-surface3-dark/80 transition-colors"
        >
          Skip
        </button>
      )}
    </div>
  </div>
);
