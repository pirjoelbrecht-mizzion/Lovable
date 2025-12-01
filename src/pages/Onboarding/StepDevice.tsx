/**
 * Step 4: Device Connection
 * User can optionally connect wearable devices for data import
 * Uses OAuth popup flow to connect to Garmin, Oura, Polar, Apple, COROS, Suunto
 */

import { useState } from 'react';
import { OnboardingStepProps } from '@/types/onboarding';
import OnboardingCoachBubble from '@/components/OnboardingCoachBubble';
import { useCoachPrompts } from '@/hooks/useCoachPrompts';
import { WearableProviderName, PROVIDER_DISPLAY_NAMES, PROVIDER_ICONS } from '@/types/wearable';
import { supabase } from '@/lib/supabase';

export default function StepDevice({ profile, update, next, back }: OnboardingStepProps) {
  const { stepPrompts } = useCoachPrompts(profile, 'device');
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<WearableProviderName | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionSuccess, setConnectionSuccess] = useState(false);

  const handleConnect = async (provider: WearableProviderName) => {
    setSelectedProvider(provider);
    setIsConnecting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${provider}-oauth-start`;

      const response = await fetch(functionUrl, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to start OAuth flow for ${provider}`);
      }

      const { authUrl } = await response.json();

      const popup = window.open(authUrl, `${provider}-auth`, 'width=600,height=700');

      const pollTimer = setInterval(() => {
        if (popup?.closed) {
          clearInterval(pollTimer);
          checkConnectionStatus(provider);
        }
      }, 500);

    } catch (err) {
      console.error('Connection failed:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
      setIsConnecting(false);
    }
  };

  const checkConnectionStatus = async (provider: WearableProviderName) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: connection } = await supabase
        .from('wearable_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', provider)
        .eq('connection_status', 'connected')
        .maybeSingle();

      if (connection) {
        update({
          deviceConnected: true,
          deviceType: provider,
        });
        setConnectionSuccess(true);
        setIsConnecting(false);
        setTimeout(() => next(), 1500);
      } else {
        setError('Connection not established. Please try again.');
        setIsConnecting(false);
      }
    } catch (err) {
      console.error('Failed to check connection:', err);
      setError('Failed to verify connection');
      setIsConnecting(false);
    }
  };

  const handleSkip = () => {
    update({ deviceConnected: false });
    next();
  };

  const providers: WearableProviderName[] = ['garmin', 'oura', 'polar', 'apple', 'coros', 'suunto'];

  const devicePrompt = stepPrompts.find(p => p.title === 'device') || {
    text: 'Connect your device for personalized training',
    subtext: 'Import your data for better recommendations'
  };

  return (
    <div className="onboarding-step">
      <OnboardingCoachBubble
        text={devicePrompt.text}
        subtext={devicePrompt.subtext}
        emoji="⌚"
      />

      {!connectionSuccess ? (
        <>
          <div className="grid grid-cols-3 gap-3 mt-6">
            {providers.map((provider) => (
              <button
                key={provider}
                onClick={() => handleConnect(provider)}
                disabled={isConnecting}
                className={`p-4 rounded-xl border-2 transition-all hover:border-blue-400 hover:shadow-md ${
                  selectedProvider === provider && isConnecting
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="text-3xl mb-2">{PROVIDER_ICONS[provider]}</div>
                <div className="font-semibold text-xs">{PROVIDER_DISPLAY_NAMES[provider]}</div>
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}

          {isConnecting && (
            <div className="mt-4 text-center text-sm text-gray-600">
              <div className="animate-spin inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2" />
              {selectedProvider && `Connecting to ${PROVIDER_DISPLAY_NAMES[selectedProvider]}...`}
            </div>
          )}

          <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-gray-600 dark:text-gray-400">
            💡 Connecting a device helps us personalize your training with real HR data and recovery metrics
          </div>

          <button
            onClick={handleSkip}
            disabled={isConnecting}
            className="mt-4 w-full py-3 text-sm text-gray-600 hover:text-gray-800 dark:hover:text-gray-300"
          >
            Skip for now →
          </button>
        </>
      ) : (
        <>
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <div className="font-semibold text-green-700 dark:text-green-300">
                  Connected to {profile.deviceType && PROVIDER_DISPLAY_NAMES[profile.deviceType]}!
                </div>
                <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                  Your training data will sync automatically
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={next}
            className="mt-6 w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
          >
            Continue →
          </button>
        </>
      )}

      <button
        onClick={back}
        className="mt-4 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
      >
        ← Back
      </button>
    </div>
  );
}
