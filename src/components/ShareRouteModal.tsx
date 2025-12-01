import { useState } from 'react';
import { toast } from '@/components/ToastHost';
import { supabase } from '@/lib/supabase';
import type { DbSavedRoute } from '@/lib/database';

type ShareRouteModalProps = {
  route: DbSavedRoute;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const OFFENSIVE_WORDS = [
  'offensive',
  'spam',
  'test123',
];

function validateRouteName(name: string): boolean {
  const lowerName = name.toLowerCase();
  for (const word of OFFENSIVE_WORDS) {
    if (lowerName.includes(word)) {
      return false;
    }
  }
  return true;
}

function sanitizeRouteName(name: string): string {
  return name
    .replace(/[^\w\s-]/gi, '')
    .trim()
    .slice(0, 100);
}

export default function ShareRouteModal({ route, isOpen, onClose, onSuccess }: ShareRouteModalProps) {
  const [routeName, setRouteName] = useState(route.name || '');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>(route.tags || []);
  const [newTag, setNewTag] = useState('');
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim()) && tags.length < 5) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleShare = async () => {
    setError(null);

    if (route.distance_km < 0.2) {
      setError('Route must be at least 200 meters to share');
      return;
    }

    const sanitizedName = sanitizeRouteName(routeName);
    if (!sanitizedName) {
      setError('Please enter a valid route name');
      return;
    }

    if (!validateRouteName(sanitizedName)) {
      setError('Route name contains inappropriate content');
      return;
    }

    setSharing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to share routes');
        setSharing(false);
        return;
      }

      const now = new Date().toISOString();

      const updateData: Partial<DbSavedRoute> = {
        name: sanitizedName,
        tags,
        is_public: true,
        shared_at: now,
        shared_by: user.id,
      };

      const { error: updateError } = await supabase
        .from('saved_routes')
        .update(updateData)
        .eq('id', route.id)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Failed to share route:', updateError);
        setError('Failed to share route. Please try again.');
        setSharing(false);
        return;
      }

      toast('Route shared successfully!', 'success');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error sharing route:', err);
      setError('An unexpected error occurred');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(to bottom right, rgba(22, 24, 41, 0.95), rgba(11, 11, 18, 0.95))',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: 20,
          maxWidth: 500,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: 24, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'white', margin: 0 }}>
            Share Route with Community
          </h2>
          <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 8, marginBottom: 0 }}>
            Your route will be visible to all Mizzion users
          </p>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 8 }}>
              Route Name *
            </label>
            <input
              type="text"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              placeholder="e.g., Central Park Loop"
              maxLength={100}
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 14,
                color: 'white',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 8 }}>
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what makes this route special..."
              rows={3}
              maxLength={500}
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 14,
                color: 'white',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 8 }}>
              Tags (max 5)
            </label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              {tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    background: 'rgba(59, 130, 246, 0.2)',
                    color: '#60a5fa',
                    fontSize: 12,
                    padding: '4px 8px',
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#60a5fa',
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: 14,
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            {tags.length < 5 && (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="Add tag..."
                  maxLength={20}
                  style={{
                    flex: 1,
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 13,
                    color: 'white',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleAddTag}
                  style={{
                    background: 'rgba(59, 130, 246, 0.2)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    color: '#60a5fa',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Add
                </button>
              </div>
            )}
          </div>

          <div
            style={{
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: 10,
              padding: 12,
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 12, color: '#60a5fa', lineHeight: 1.6 }}>
              <strong>Privacy Notice:</strong> Shared routes are visible to all users and include the route path,
              distance, elevation, and surface type. Your name will not be displayed publicly.
            </div>
          </div>

          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 8,
                padding: 12,
                marginBottom: 20,
                color: '#ef4444',
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={onClose}
              disabled={sharing}
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: 'white',
                borderRadius: 12,
                padding: '12px 20px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                opacity: sharing ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleShare}
              disabled={sharing || !routeName.trim()}
              style={{
                flex: 1,
                background: 'linear-gradient(to right, #22c55e, #16a34a)',
                border: 'none',
                color: 'white',
                borderRadius: 12,
                padding: '12px 20px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                opacity: sharing || !routeName.trim() ? 0.5 : 1,
              }}
            >
              {sharing ? 'Sharing...' : 'Share Route'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
