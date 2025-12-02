import { FC } from 'react';

interface Props {
  pace: string;
  explanation?: string;
  confidence?: number;
}

export const PaceSuggestionCard: FC<Props> = ({ pace, explanation, confidence }) => {
  return (
    <div className="p-4 rounded-2xl bg-surface1-light dark:bg-surface1-dark shadow-elevated">
      <h3 className="text-sm font-semibold text-primary-light dark:text-primary-dark mb-2">
        Today's Suggested Pace
      </h3>

      <p className="text-2xl font-bold text-success mt-1">{pace}</p>

      {explanation && (
        <p className="text-xs text-muted-light dark:text-muted-dark mt-2">
          {explanation}
        </p>
      )}

      {confidence !== undefined && (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-700 dark:bg-gray-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-success rounded-full transition-all"
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-light dark:text-muted-dark">
            {Math.round(confidence * 100)}%
          </span>
        </div>
      )}
    </div>
  );
};
