const KEY = "mizzion:userProfile";

export type UserProfile = {
  paceBase: number;
  heartRateBase: number;
  age?: number;
  hrResting?: number;
  hrThreshold?: number;
  hrMax?: number;
  zones?: {
    Z1: [number, number];
    Z2: [number, number];
    Z3: [number, number];
    Z4: [number, number];
    Z5: [number, number];
  };
};

const DEFAULTS: UserProfile = {
  paceBase: 9.0,
  heartRateBase: 145,
  age: 30,
  hrResting: 54,
  hrThreshold: 165,
};

export function loadUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const defaults = { ...DEFAULTS };
      localStorage.setItem(KEY, JSON.stringify(defaults)); // ensure it exists
      return defaults;
    }
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveUserProfile(next: UserProfile) {
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function updateUserProfile(partial: Partial<UserProfile>) {
  const current = loadUserProfile();
  const next = { ...current, ...partial };
  saveUserProfile(next);
  return next;
}
