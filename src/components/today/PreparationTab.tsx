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
      <div style={{
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '240px',
        backgroundColor: '#0f1014'
      }}>
        <div style={{ color: '#9ca3af' }}>Loading checklist...</div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#0f1014',
      minHeight: '100%',
      padding: '16px',
      paddingBottom: '80px'
    }}>
      {/* Essential Gear Header */}
      <div style={{
        padding: '16px',
        borderRadius: '16px',
        backgroundColor: '#1a1c24',
        border: '1px solid #2a2d3a',
        marginBottom: '16px'
      }}>
        <h3 style={{
          fontSize: '13px',
          fontWeight: 600,
          color: '#f9fafb',
          marginBottom: '12px'
        }}>
          Essential Gear
        </h3>

        {['clothing', 'nutrition', 'safety'].map(category => {
          const items = gearItems.filter(item => item.category === category);
          if (items.length === 0) return null;

          return (
            <div key={category} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {items.map(item => (
                  <label
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      backgroundColor: checkedItems.has(item.id) ? '#0f1014' : 'rgba(255, 255, 255, 0.03)',
                      minHeight: '44px'
                    }}
                  >
                    <div
                      onClick={() => toggleItem(item.id)}
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        border: checkedItems.has(item.id) ? 'none' : '2px solid #6b7280',
                        backgroundColor: checkedItems.has(item.id) ? '#22c55e' : 'transparent',
                        flexShrink: 0
                      }}
                    >
                      {checkedItems.has(item.id) && (
                        <span style={{ color: '#000', fontSize: '12px', fontWeight: 700 }}>✓</span>
                      )}
                    </div>
                    <span style={{ fontSize: '18px' }}>{item.icon}</span>
                    <span style={{
                      fontSize: '13px',
                      flex: 1,
                      color: checkedItems.has(item.id) ? '#9ca3af' : '#f9fafb',
                      textDecoration: checkedItems.has(item.id) ? 'line-through' : 'none'
                    }}>
                      {item.name}
                    </span>
                    {item.required && !checkedItems.has(item.id) && (
                      <span style={{
                        fontSize: '10px',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        color: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        fontWeight: 600
                      }}>
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

      {/* Pre-Run Checklist */}
      <div style={{
        padding: '16px',
        borderRadius: '16px',
        backgroundColor: '#1a1c24',
        border: '1px solid #2a2d3a',
        marginBottom: '16px'
      }}>
        <h3 style={{
          fontSize: '13px',
          fontWeight: 600,
          color: '#f9fafb',
          marginBottom: '12px'
        }}>
          Pre-Run Checklist
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {preRunTasks.map(task => (
            <label
              key={task.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                backgroundColor: checkedTasks.has(task.id) ? '#0f1014' : 'rgba(255, 255, 255, 0.03)',
                minHeight: '44px'
              }}
            >
              <div
                onClick={() => toggleTask(task.id)}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: checkedTasks.has(task.id) ? 'none' : '2px solid #6b7280',
                  backgroundColor: checkedTasks.has(task.id) ? '#22c55e' : 'transparent',
                  flexShrink: 0
                }}
              >
                {checkedTasks.has(task.id) && (
                  <span style={{ color: '#000', fontSize: '12px', fontWeight: 700 }}>✓</span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>{task.icon}</span>
                  <span style={{
                    fontSize: '13px',
                    color: checkedTasks.has(task.id) ? '#9ca3af' : '#f9fafb',
                    textDecoration: checkedTasks.has(task.id) ? 'line-through' : 'none'
                  }}>
                    {task.task}
                  </span>
                </div>
                <p style={{
                  fontSize: '10px',
                  color: '#6b7280',
                  margin: '2px 0 0 24px'
                }}>
                  {task.timing}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Safety Check */}
      <div style={{
        padding: '16px',
        borderRadius: '16px',
        backgroundColor: '#1a1c24',
        border: '1px solid #2a2d3a',
        marginBottom: '16px'
      }}>
        <h3 style={{
          fontSize: '13px',
          fontWeight: 600,
          color: '#f9fafb',
          marginBottom: '12px'
        }}>
          Safety Check
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '10px'
        }}>
          <div style={{
            padding: '12px',
            borderRadius: '10px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>📱</div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#ef4444' }}>
              Phone charged
            </div>
          </div>
          <div style={{
            padding: '12px',
            borderRadius: '10px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>📍</div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#ef4444' }}>
              Share location with someone
            </div>
          </div>
          <div style={{
            padding: '12px',
            borderRadius: '10px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>🚨</div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#ef4444' }}>
              Emergency contact set
            </div>
          </div>
          <div style={{
            padding: '12px',
            borderRadius: '10px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>🌤️</div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#ef4444' }}>
              Check weather alerts
            </div>
          </div>
        </div>
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
      { id: 'thermal-top', name: 'Moisture-wicking shirt', icon: '👕', category: 'clothing', required: true },
      { id: 'windproof', name: 'Hydration Vest', icon: '🎒', category: 'clothing', required: true },
      { id: 'gloves', name: 'Cap', icon: '🧢', category: 'clothing', required: true }
    );
  } else if (temp < 18) {
    items.push(
      { id: 'long-sleeve', name: 'Moisture-wicking shirt', icon: '👕', category: 'clothing', required: true },
      { id: 'light-jacket', name: 'Hydration Vest', icon: '🎒', category: 'clothing', required: true },
      { id: 'gloves-opt', name: 'Cap', icon: '🧢', category: 'clothing', required: false }
    );
  } else if (temp < 25) {
    items.push(
      { id: 'short-sleeve', name: 'Moisture-wicking shirt', icon: '👕', category: 'clothing', required: true },
      { id: 'hydration-vest', name: 'Hydration Vest', icon: '🎒', category: 'clothing', required: true },
      { id: 'cap', name: 'Cap', icon: '🧢', category: 'clothing', required: true }
    );
  } else {
    items.push(
      { id: 'light-top', name: 'Moisture-wicking shirt', icon: '👕', category: 'clothing', required: true },
      { id: 'hydration-vest', name: 'Hydration Vest', icon: '🎒', category: 'clothing', required: true },
      { id: 'cap', name: 'Cap', icon: '🧢', category: 'clothing', required: true }
    );
  }

  if (duration > 60) {
    items.push(
      { id: 'hydration', name: `400ml`, icon: '💧', category: 'nutrition', required: true }
    );
  }

  if (duration > 90) {
    items.push(
      { id: 'energy-gels', name: '300ml', icon: '💧', category: 'nutrition', required: true },
      { id: 'carbs', name: '30g', icon: '🍫', category: 'nutrition', required: true }
    );
  }

  items.push(
    { id: 'phone', name: 'Optional motivation', icon: '🎵', category: 'safety', required: false }
  );

  return items;
}

function generatePreRunTasks(workoutType: string, duration: number): PreRunTask[] {
  const tasks: PreRunTask[] = [
    { id: 'hydration', task: 'Eat 2-3 hours before', icon: '🍽️', timing: '2-3 hours before' },
    { id: 'meal', task: 'Light meal around 6:00 AM', icon: '🌅', timing: 'Light meal around 6:00 AM' },
    { id: 'bathroom', task: 'Hydrate 30 min before', icon: '💧', timing: '30 min before' },
    { id: 'water', task: '300-500ml of water', icon: '💦', timing: '300-500ml of water' },
  ];

  if (workoutType.toLowerCase().includes('tempo') || workoutType.toLowerCase().includes('interval')) {
    tasks.push(
      { id: 'warmup', task: 'Warm-up routine', icon: '🏃', timing: '10 minutes before start' },
      { id: 'mental', task: 'Prepare playlist', icon: '🎵', timing: 'Optional' },
      { id: 'music', task: 'Warm-Up Routine (10 min)', icon: '🤸', timing: 'Warm-Up Routine (10 min)' }
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
    <div style={{
      padding: '16px',
      borderRadius: '16px',
      backgroundColor: '#1a1c24',
      border: '1px solid #2a2d3a'
    }}>
      <h3 style={{
        fontSize: '13px',
        fontWeight: 600,
        color: '#f9fafb',
        marginBottom: '12px'
      }}>
        Clothing Guide
      </h3>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '12px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 700,
          fontSize: '16px',
          backgroundColor: color
        }}>
          {temperature}°
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '4px' }}>
            Recommended layers
          </p>
          <p style={{ fontSize: '12px', color: '#f9fafb', margin: 0 }}>
            {layering}
          </p>
        </div>
      </div>

      {timeOfDay === 'night' && (
        <div style={{
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: '#ef4444', marginBottom: '4px' }}>
            🌙 Night Running Safety
          </p>
          <p style={{ fontSize: '10px', color: '#9ca3af', margin: 0 }}>
            Wear reflective gear and carry a light. Stay on well-lit, familiar routes.
          </p>
        </div>
      )}
    </div>
  );
};
