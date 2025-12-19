export function integrateStrengthTraining(_input: any) {
  return {
    modifiedPlan: _input.weeklyPlan,
    meAssignment: null,
    loadRegulation: {
      shouldAdjust: false,
      adjustmentType: null,
      adjustmentPercent: null,
      reason: 'Normal training - no adjustments needed',
      exitCriteria: [],
    },
    changes: [],
    coachingNotes: [],
  };
}

export function shouldPromptSorenessCheck(_lastSession: Date | null, _lastRecord: Date | null) {
  return { shouldPrompt: false, type: 'immediate' as const };
}

export function getStrengthCoachingMessage(_regulation: any, _assignment: any, _phase: any) {
  return 'Strength training integrated with your adaptive plan.';
}
