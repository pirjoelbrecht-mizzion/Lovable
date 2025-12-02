import { FC } from 'react';

interface Props {
  title: string;
  duration: string;
  distance: string;
  pace: string;
  status?: 'today' | 'upcoming' | 'done';
}

export const TrainingSummaryCard: FC<Props> = ({
  title,
  duration,
  distance,
  pace,
  status = 'today',
}) => {
  return (
    <div className="p-4 rounded-2xl bg-surface1-light dark:bg-surface1-dark shadow-elevated">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-semibold text-primary-light dark:text-primary-dark">
          {title}
        </h2>
        {status === 'today' && (
          <span className="text-xs bg-success text-black px-2 py-1 rounded-full font-medium">
            TODAY
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Duration" value={duration} />
        <Stat label="Distance" value={distance} />
        <Stat label="Pace" value={pace} />
      </div>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col">
    <span className="text-[10px] text-muted-light dark:text-muted-dark uppercase tracking-wide mb-1">
      {label}
    </span>
    <span className="text-sm text-primary-light dark:text-primary-dark font-medium">
      {value}
    </span>
  </div>
);
