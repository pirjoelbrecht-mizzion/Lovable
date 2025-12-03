import { FC, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface GearItem {
  id: string;
  name: string;
  icon: string;
  category: 'clothing' | 'nutrition' | 'safety' | 'tech';
  required: boolean;
}

interface PreRunTask {
  id: string;
  task: string;
  icon: string;
  timing: string;
}

interface Props {
  temperature: number;
  duration: number;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  uvIndex: number;
  workoutType: string;
  onChecklistComplete: (complete: boolean) => void;
}

export const PreparationTab: FC<Props> = ({
  temperature,
  duration,
  timeOfDay,
  uvIndex,
  workoutType,
  onChecklistComplete,
}) => {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [checkedTasks, setCheckedTasks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const gearItems = generateGearList(temperature, duration, timeOfDay, uvIndex);
  const preRunTasks = generatePreRunTasks(workoutType, duration);

  useEffect(() => {
    loadChecklist();
  }, []);

  useEffect(() => {
    saveChecklist();
    const requiredCount = gearItems.filter(item => item.required).length;
    const checkedRequiredCount = gearItems.filter(
      item => item.required && checkedItems.has(item.id)
    ).length;
    onChecklistComplete(checkedRequiredCount === requiredCount);
  }, [checkedItems]);

  const loadChecklist = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('workout_preparation')
        .select('checked_items, checked_tasks')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (data) {
        setCheckedItems(new Set(data.checked_items || []));
        setCheckedTasks(new Set(data.checked_tasks || []));
      }
    } catch (error) {
      console.error('Failed to load checklist:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveChecklist = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      await supabase
        .from('workout_preparation')
        .upsert({
          user_id: user.id,
          date: today,
          checked_items: Array.from(checkedItems),
          checked_tasks: Array.from(checkedTasks),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,date',
        });
    } catch (error) {
      console.error('Failed to save checklist:', error);
    }
  };

  const toggleItem = (itemId: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
        triggerHaptic();
      }
      return next;
    });
  };

  const toggleTask = (taskId: string) => {
    setCheckedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
        triggerHaptic();
      }
      return next;
    });
  };

  const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const requiredMissing = gearItems.filter(
    item => item.required && !checkedItems.has(item.id)
  );

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center h-64">
        <div className="text-muted-light dark:text-muted-dark">Loading checklist...</div>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4 pb-8">
      {requiredMissing.length > 0 && (
        <div className="p-4 rounded-2xl" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444' }}>
          <div className="flex items-start gap-2">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: '#ef4444' }}>Forgot something?</p>
              <p className="text-xs" style={{ color: '#9ca3af' }}>
                You have {requiredMissing.length} essential item{requiredMissing.length > 1 ? 's' : ''} unchecked
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="p-5 rounded-2xl shadow-xl" style={{ backgroundColor: '#252628' }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: '#f9fafb' }}>
          Pre-Run Checklist
        </h3>
        <div className="space-y-2">
          {preRunTasks.map(task => (
            <label
              key={task.id}
              className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors"
              style={{
                minHeight: '44px',
                backgroundColor: checkedTasks.has(task.id) ? '#1a1b1e' : 'rgba(255, 255, 255, 0.05)'
              }}
            >
              <div
                className="w-5 h-5 rounded flex items-center justify-center cursor-pointer"
                style={{
                  border: checkedTasks.has(task.id) ? 'none' : '2px solid #6b7280',
                  backgroundColor: checkedTasks.has(task.id) ? '#22c55e' : 'transparent'
                }}
                onClick={() => toggleTask(task.id)}
              >
                {checkedTasks.has(task.id) && <span style={{ color: '#fff', fontSize: '12px' }}>✓</span>}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span>{task.icon}</span>
                  <span
                    className="text-sm"
                    style={{
                      color: checkedTasks.has(task.id) ? '#9ca3af' : '#f9fafb',
                      textDecoration: checkedTasks.has(task.id) ? 'line-through' : 'none'
                    }}
                  >
                    {task.task}
                  </span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>{task.timing}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="p-5 rounded-2xl shadow-xl" style={{ backgroundColor: '#252628' }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: '#f9fafb' }}>
          Essential Gear
        </h3>

        {['clothing', 'nutrition', 'safety', 'tech'].map(category => {
          const items = gearItems.filter(item => item.category === category);
          if (items.length === 0) return null;

          return (
            <div key={category} className="mb-4 last:mb-0">
              <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: '#6b7280' }}>
                {category}
              </p>
              <div className="space-y-2">
                {items.map(item => (
                  <label
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                    style={{
                      minHeight: '44px',
                      backgroundColor: checkedItems.has(item.id) ? '#1a1b1e' : 'rgba(255, 255, 255, 0.05)'
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center cursor-pointer"
                      style={{
                        border: checkedItems.has(item.id) ? 'none' : '2px solid #6b7280',
                        backgroundColor: checkedItems.has(item.id) ? '#22c55e' : 'transparent'
                      }}
                      onClick={() => toggleItem(item.id)}
                    >
                      {checkedItems.has(item.id) && <span style={{ color: '#fff', fontSize: '12px' }}>✓</span>}
                    </div>
                    <span className="text-xl">{item.icon}</span>
                    <span
                      className="text-sm flex-1"
                      style={{
                        color: checkedItems.has(item.id) ? '#9ca3af' : '#f9fafb',
                        textDecoration: checkedItems.has(item.id) ? 'line-through' : 'none'
                      }}
                    >
                      {item.name}
                    </span>
                    {item.required && !checkedItems.has(item.id) && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                        Required
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <WeatherClothingGuide temperature={temperature} timeOfDay={timeOfDay} />
    </div>
  );
};

function generateGearList(
  temp: number,
  duration: number,
  timeOfDay: string,
  uvIndex: number
): GearItem[] {
  const items: GearItem[] = [];

  if (temp < 10) {
    items.push(
      { id: 'thermal-top', name: 'Thermal base layer', icon: '🧥', category: 'clothing', required: true },
      { id: 'windproof', name: 'Windproof jacket', icon: '🧥', category: 'clothing', required: true },
      { id: 'gloves', name: 'Running gloves', icon: '🧤', category: 'clothing', required: true },
      { id: 'hat', name: 'Warm hat/beanie', icon: '🎩', category: 'clothing', required: true }
    );
  } else if (temp < 18) {
    items.push(
      { id: 'long-sleeve', name: 'Long sleeve top', icon: '👕', category: 'clothing', required: true },
      { id: 'light-jacket', name: 'Light jacket', icon: '🧥', category: 'clothing', required: false },
      { id: 'gloves-opt', name: 'Light gloves (optional)', icon: '🧤', category: 'clothing', required: false }
    );
  } else if (temp < 25) {
    items.push(
      { id: 'short-sleeve', name: 'Breathable shirt', icon: '👕', category: 'clothing', required: true },
      { id: 'sun-protection', name: 'Sunscreen (optional)', icon: '🧴', category: 'safety', required: false }
    );
  } else {
    items.push(
      { id: 'light-top', name: 'Light, breathable top', icon: '👕', category: 'clothing', required: true },
      { id: 'sunglasses', name: 'Sunglasses', icon: '🕶️', category: 'safety', required: true },
      { id: 'cap', name: 'Running cap/visor', icon: '🧢', category: 'clothing', required: true },
      { id: 'sunscreen', name: 'Sunscreen SPF 50+', icon: '🧴', category: 'safety', required: true }
    );
  }

  if (duration > 60) {
    items.push(
      { id: 'hydration', name: `${Math.ceil(duration / 30) * 250}ml water`, icon: '💧', category: 'nutrition', required: true }
    );
  }

  if (duration > 90) {
    items.push(
      { id: 'energy-gels', name: 'Energy gels/chews', icon: '🍫', category: 'nutrition', required: true },
      { id: 'electrolytes', name: 'Electrolyte tablets', icon: '💊', category: 'nutrition', required: false }
    );
  }

  if (timeOfDay === 'night' || timeOfDay === 'evening') {
    items.push(
      { id: 'headlamp', name: 'Headlamp/light', icon: '🔦', category: 'safety', required: true },
      { id: 'reflective', name: 'Reflective vest', icon: '🦺', category: 'safety', required: true }
    );
  }

  items.push(
    { id: 'phone', name: 'Phone (charged)', icon: '📱', category: 'tech', required: true },
    { id: 'id', name: 'ID/emergency contact', icon: '🪪', category: 'safety', required: true },
    { id: 'watch', name: 'GPS watch (charged)', icon: '⌚', category: 'tech', required: false }
  );

  return items;
}

function generatePreRunTasks(workoutType: string, duration: number): PreRunTask[] {
  const tasks: PreRunTask[] = [
    { id: 'hydration', task: 'Pre-hydrate (500ml)', icon: '💧', timing: '2 hours before' },
    { id: 'fuel', task: 'Light meal/snack', icon: '🍌', timing: '2-3 hours before' },
    { id: 'bathroom', task: 'Bathroom break', icon: '🚽', timing: 'Just before' },
  ];

  if (workoutType.toLowerCase().includes('tempo') || workoutType.toLowerCase().includes('interval')) {
    tasks.push(
      { id: 'warmup', task: 'Dynamic warm-up routine', icon: '🤸', timing: '10 min before' },
      { id: 'mental', task: 'Mental preparation', icon: '🧘', timing: '5 min before' }
    );
  } else {
    tasks.push(
      { id: 'stretch', task: 'Light dynamic stretching', icon: '🤸', timing: '5 min before' }
    );
  }

  if (duration > 60) {
    tasks.push(
      { id: 'route', task: 'Download route for offline use', icon: '🗺️', timing: 'Before leaving' }
    );
  }

  return tasks;
}

const WeatherClothingGuide: FC<{ temperature: number; timeOfDay: string }> = ({
  temperature,
  timeOfDay,
}) => {
  let layering = '';
  let color = '';

  if (temperature < 10) {
    layering = 'Base layer + Mid layer + Wind shell + Accessories';
    color = '#60a5fa';
  } else if (temperature < 18) {
    layering = 'Base layer + Light jacket (optional)';
    color = '#34d399';
  } else if (temperature < 25) {
    layering = 'Single breathable layer';
    color = '#fbbf24';
  } else {
    layering = 'Minimal, light-colored clothing + Sun protection';
    color = '#f87171';
  }

  return (
    <div className="p-5 rounded-2xl shadow-xl" style={{ backgroundColor: '#252628' }}>
      <h3 className="text-sm font-semibold mb-3" style={{ color: '#f9fafb' }}>
        Clothing Guide
      </h3>
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
          style={{ backgroundColor: color }}
        >
          {temperature}°
        </div>
        <div className="flex-1">
          <p className="text-xs mb-1" style={{ color: '#9ca3af' }}>Recommended layers</p>
          <p className="text-sm" style={{ color: '#f9fafb' }}>{layering}</p>
        </div>
      </div>

      {timeOfDay === 'night' && (
        <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: '#ef4444' }}>🌙 Night Running Safety</p>
          <p className="text-xs" style={{ color: '#9ca3af' }}>
            Wear reflective gear and carry a light. Stay on well-lit, familiar routes.
          </p>
        </div>
      )}
    </div>
  );
};
