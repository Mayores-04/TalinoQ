import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  firebaseAuth,
  signOutUser,
  subscribeToUserProfile,
  type UserProfile,
} from '@/lib/firebase';
import { hasCompletedOnboarding, markOnboardingComplete } from '@/lib/onboarding';

export function useAuthSession() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [splashFinished, setSplashFinished] = useState(false);

  useEffect(() => {
    let isMounted = true;

    hasCompletedOnboarding().then((isComplete) => {
      if (!isMounted) {
        return;
      }

      setHasSeenOnboarding(isComplete);
      setCheckingOnboarding(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!firebaseAuth) {
      setCheckingAuth(false);
      setIsAuthenticated(false);
      return;
    }

    const unsub = onAuthStateChanged(firebaseAuth, (user) => {
      setCurrentUser(user);
      setIsAuthenticated(Boolean(user));
      setCheckingAuth(false);
    });

    return unsub;
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setUserProfile(null);
      return;
    }

    return subscribeToUserProfile(currentUser, setUserProfile);
  }, [currentUser]);

  const finishOnboarding = useCallback(async () => {
    setHasSeenOnboarding(true);
    await markOnboardingComplete();
  }, []);

  const logout = useCallback(async () => {
    await signOutUser();
  }, []);

  return {
    checkingAuth,
    checkingOnboarding,
    currentUser,
    finishOnboarding,
    hasSeenOnboarding,
    isAuthenticated,
    logout,
    setSplashFinished,
    splashFinished,
    userProfile,
  };
}
