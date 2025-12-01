import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { WearableProviderName, PROVIDER_DISPLAY_NAMES, PROVIDER_ICONS, ProviderPrioritySettings } from '../types/wearable';
import { toast } from './ToastHost';

export default function WearablePrioritySettings() {
  const [settings, setSettings] = useState<ProviderPrioritySettings | null>(null);
  const [priorityOrder, setPriorityOrder] = useState<WearableProviderName[]>([
    'garmin', 'oura', 'coros', 'suunto', 'polar', 'apple'
  ]);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('provider_priority_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setSettings(data);
      setPriorityOrder(data.priority_order);
      setAutoSyncEnabled(data.auto_sync_enabled);
    } else {
      await createDefaultSettings();
    }
  }

  async function createDefaultSettings() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('provider_priority_settings')
      .insert({
        user_id: user.id,
        priority_order: priorityOrder,
        auto_sync_enabled: autoSyncEnabled
      })
      .select()
      .single();

    if (!error && data) {
      setSettings(data);
    }
  }

  async function saveSettings() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('provider_priority_settings')
      .upsert({
        user_id: user.id,
        priority_order: priorityOrder,
        auto_sync_enabled: autoSyncEnabled
      });

    if (error) {
      toast('Failed to save settings', 'error');
    } else {
      toast('Settings saved', 'success');
      await loadSettings();
    }
  }

  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newOrder = [...priorityOrder];
    const draggedItem = newOrder[draggedIndex];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, draggedItem);

    setPriorityOrder(newOrder);
    setDraggedIndex(index);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const newOrder = [...priorityOrder];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setPriorityOrder(newOrder);
  }

  function moveDown(index: number) {
    if (index === priorityOrder.length - 1) return;
    const newOrder = [...priorityOrder];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setPriorityOrder(newOrder);
  }

  return (
    <div className="card">
      <h3>Wearable Provider Priority</h3>
      <p className="small" style={{ marginBottom: 16 }}>
        When multiple devices have data for the same day, this order determines which one is used first.
        Drag to reorder or use the arrow buttons.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {priorityOrder.map((provider, index) => (
          <div
            key={provider}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className="card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 12,
              cursor: 'grab',
              backgroundColor: draggedIndex === index ? '#f0f0f0' : 'white',
              border: '1px solid #e0e0e0'
            }}
          >
            <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#666', minWidth: 24 }}>
              {index + 1}
            </div>
            <div style={{ fontSize: '1.2em' }}>
              {PROVIDER_ICONS[provider]}
            </div>
            <div style={{ flex: 1 }}>
              {PROVIDER_DISPLAY_NAMES[provider]}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                className="btn"
                disabled={index === 0}
                onClick={() => moveUp(index)}
                style={{ padding: '4px 8px', fontSize: '0.85em' }}
              >
                ↑
              </button>
              <button
                className="btn"
                disabled={index === priorityOrder.length - 1}
                onClick={() => moveDown(index)}
                style={{ padding: '4px 8px', fontSize: '0.85em' }}
              >
                ↓
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={autoSyncEnabled}
            onChange={(e) => setAutoSyncEnabled(e.target.checked)}
          />
          <span>Enable automatic morning sync (4:00 AM - 8:00 AM)</span>
        </label>
      </div>

      <button className="btn primary" onClick={saveSettings}>
        Save Priority Settings
      </button>
    </div>
  );
}
