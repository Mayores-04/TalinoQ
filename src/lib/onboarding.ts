import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_COMPLETE_KEY = 'talinoq:onboarding-complete:v1';

export async function hasCompletedOnboarding() {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function markOnboardingComplete() {
  try {
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
  } catch {
    // The current session can still continue if local persistence is unavailable.
  }
}
