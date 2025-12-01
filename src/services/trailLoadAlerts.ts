/**
 * Trail Load Alert Service
 *
 * Monitors training progression for trail runners and generates
 * coach alerts when unsafe load increases are detected.
 */

import {
  calculateWeeklyLoads,
  getLoadConfig,
  getSafetyWarning,
  isTrailRunner,
  type WeeklyLoad,
} from '@/utils/trailLoad';
import { saveCoachMessage, getOrCreateActiveConversation } from '@/lib/coachMessages';
import type { UserProfile } from '@/types/onboarding';

export interface TrailLoadAlert {
  type: 'warning' | 'caution' | 'info';
  title: string;
  message: string;
  weekData: WeeklyLoad;
  timestamp: string;
}

export async function checkTrailLoadProgression(
  weekData: Array<{ week: string; distance: number; vertical: number }>,
  profile: Partial<UserProfile> | null
): Promise<TrailLoadAlert | null> {
  if (!isTrailRunner(profile)) {
    return null;
  }

  if (weekData.length < 2) {
    return null;
  }

  const config = getLoadConfig(profile);
  const loads = calculateWeeklyLoads(weekData, config);
  const currentWeek = loads[loads.length - 1];
  const combinedChange = currentWeek.combinedChangePercent || 0;

  if (combinedChange < 10 && !currentWeek.overDist && !currentWeek.overVert) {
    return null;
  }

  const warning = getSafetyWarning(currentWeek);
  if (!warning) return null;

  let type: 'warning' | 'caution' | 'info' = 'info';
  let title = 'Training Load Notice';

  if (combinedChange >= 15) {
    type = 'warning';
    title = 'High Injury Risk - Excessive Load Increase';
  } else if (combinedChange > 10) {
    type = 'caution';
    title = 'Load Increase Alert';
  } else if (currentWeek.overDist || currentWeek.overVert) {
    type = 'caution';
    title = 'Load Increase Alert';
  }

  return {
    type,
    title,
    message: warning,
    weekData: currentWeek,
    timestamp: new Date().toISOString(),
  };
}

export async function sendTrailLoadAlertToCoach(
  alert: TrailLoadAlert,
  profile: Partial<UserProfile> | null
): Promise<boolean> {
  try {
    const conversationId = await getOrCreateActiveConversation('training-load');

    const config = getLoadConfig(profile);
    const contextData = {
      alertType: alert.type,
      weekDistance: alert.weekData.distance,
      weekVertical: alert.weekData.vertical,
      combinedLoad: alert.weekData.combinedLoad,
      distanceChange: alert.weekData.distChangePercent,
      verticalChange: alert.weekData.vertChangePercent,
      combinedChange: alert.weekData.combinedChangePercent,
      verticalToKmRatio: config.verticalToKmRatio,
    };

    const coachMessage = generateCoachResponse(alert, config);

    await saveCoachMessage(conversationId, 'assistant', coachMessage, contextData);

    return true;
  } catch (error) {
    console.error('Error sending trail load alert to coach:', error);
    return false;
  }
}

function generateCoachResponse(alert: TrailLoadAlert, config: any): string {
  const { weekData } = alert;

  let response = `📊 **Trail Load Analysis**\n\n`;
  response += `I noticed your training load increased significantly this week:\n\n`;

  response += `**This Week:**\n`;
  response += `- Distance: ${weekData.distance.toFixed(1)} km\n`;
  response += `- Vertical: ${weekData.vertical.toFixed(0)} m\n`;
  response += `- Combined Load: ${weekData.combinedLoad.toFixed(1)} km-equivalent\n\n`;

  if (weekData.distChangePercent !== undefined) {
    response += `**Week-over-Week Changes:**\n`;
    response += `- Distance: ${weekData.distChangePercent > 0 ? '+' : ''}${weekData.distChangePercent.toFixed(1)}%\n`;
    response += `- Vertical: ${weekData.vertChangePercent! > 0 ? '+' : ''}${weekData.vertChangePercent!.toFixed(1)}%\n`;
    response += `- Combined: ${weekData.combinedChangePercent! > 0 ? '+' : ''}${weekData.combinedChangePercent!.toFixed(1)}%\n\n`;
  }

  response += `**Recommendation:**\n`;

  const combinedChange = weekData.combinedChangePercent || 0;

  if (combinedChange >= 15) {
    response += `🚨 Your total training load increased by ${combinedChange.toFixed(1)}%, which is significantly above safe limits and poses HIGH injury risk! Here's what you must do:\n\n`;
    response += `1. **IMMEDIATE ACTION:** Take a rest day or very easy recovery run tomorrow\n`;
    response += `2. **Cut volume:** Reduce your next 2-3 workouts by 30-40%\n`;
    response += `3. **Monitor closely:** Watch for pain, excessive fatigue, elevated resting HR\n`;
    response += `4. **Recovery focus:** Prioritize sleep, nutrition, stretching, and foam rolling\n`;
    response += `5. **Next 2-3 weeks:** Keep weekly load stable or slightly reduced before attempting increases\n\n`;
    response += `Remember: For trail running, both distance AND vertical matter. A ${config.verticalToKmRatio}m climb equals about 1km of flat running in terms of load.`;
  } else if (combinedChange > 10) {
    response += `⚠️ Your total training load increased by ${combinedChange.toFixed(1)}%, which is above the recommended 10% limit. Here's what I suggest:\n\n`;
    response += `1. **Reduce next workout:** Cut your next planned session by 15-20%\n`;
    response += `2. **Add recovery:** Consider an extra easy day or rest day this week\n`;
    response += `3. **Monitor fatigue:** Pay attention to sleep quality, resting HR, and muscle soreness\n`;
    response += `4. **Next 2 weeks:** Keep weekly load stable before attempting further increases\n\n`;
    response += `Remember: For trail running, both distance AND vertical matter. A ${config.verticalToKmRatio}m climb equals about 1km of flat running in terms of load.`;
  } else if (weekData.overDist && weekData.overVert) {
    response += `Both distance and vertical increased significantly. Consider:\n\n`;
    response += `1. Holding current volume steady for 1-2 weeks\n`;
    response += `2. Focusing on quality over quantity in your next sessions\n`;
    response += `3. Ensuring adequate recovery between hard efforts\n`;
    response += `4. When ready to progress, increase ONE metric at a time (distance OR vertical, not both)`;
  } else if (weekData.overDist) {
    response += `Your distance jumped significantly while vertical stayed manageable. Next week:\n\n`;
    response += `1. Hold distance at current level\n`;
    response += `2. You can continue adding vertical if desired\n`;
    response += `3. Focus on maintaining consistent easy pace\n`;
    response += `4. Add extra stretching/mobility work`;
  } else if (weekData.overVert) {
    response += `Your vertical gain increased sharply. Remember:\n\n`;
    response += `1. Vertical meters are deceptively taxing on muscles and joints\n`;
    response += `2. Hold vertical steady next week while you can maintain or slightly increase distance\n`;
    response += `3. Incorporate more quad-strengthening exercises\n`;
    response += `4. Focus on downhill running technique to reduce impact`;
  }

  response += `\n\n💬 How are you feeling? Any signs of fatigue or soreness I should know about?`;

  return response;
}

export function shouldShowTrailLoadAlert(
  lastAlertTimestamp: string | null,
  currentWeek: WeeklyLoad
): boolean {
  if (!lastAlertTimestamp) return true;

  const lastAlert = new Date(lastAlertTimestamp);
  const daysSinceLastAlert = (Date.now() - lastAlert.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceLastAlert < 7) {
    return false;
  }

  return currentWeek.overCombined || currentWeek.overDist || currentWeek.overVert;
}
