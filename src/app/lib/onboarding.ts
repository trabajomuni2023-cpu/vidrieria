const ONBOARDING_KEY = 'vidrieria_onboarding_seen_v1';

export function hasSeenOnboarding() {
  if (typeof window === 'undefined') {
    return true;
  }

  return window.localStorage.getItem(ONBOARDING_KEY) === 'true';
}

export function markOnboardingSeen() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(ONBOARDING_KEY, 'true');
}

export function resetOnboarding() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(ONBOARDING_KEY);
}
