import { FC } from 'react';

interface Props {
  items: string[];
  temperature?: number;
  conditions?: string;
}

export const GearSuggestionCard: FC<Props> = ({ items, temperature, conditions }) => {
  return (
    <div className="p-4 rounded-2xl bg-surface1-light dark:bg-surface1-dark shadow-elevated">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-primary-light dark:text-primary-dark">
          Gear Suggestions
        </h3>
        {temperature !== undefined && (
          <span className="text-xs text-muted-light dark:text-muted-dark">
            {temperature}°C
          </span>
        )}
      </div>

      {conditions && (
        <p className="text-xs text-muted-light dark:text-muted-dark mb-2">
          Conditions: {conditions}
        </p>
      )}

      <ul className="text-xs text-muted-light dark:text-muted-dark space-y-1.5">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <span className="text-success mt-0.5">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
