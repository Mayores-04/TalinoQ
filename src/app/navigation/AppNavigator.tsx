import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { firebaseAuth } from '../../lib/firebase';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import { SplashScreen } from '@/app/screens/SplashScreen';

export default function AppNavigator() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    if (!firebaseAuth) {
      setCheckingAuth(false);
      setIsSignedIn(false);
      return;
    }

    const unsub = onAuthStateChanged(firebaseAuth, (user) => {
      setIsSignedIn(Boolean(user));
      setCheckingAuth(false);
    });

    return unsub;
  }, []);

  if (checkingAuth) {
    return <SplashScreen onDone={() => setCheckingAuth(false)} />;
  }

  return <View style={{ flex: 1 }}>{isSignedIn ? <MainTabs /> : <AuthStack />}</View>;
}
