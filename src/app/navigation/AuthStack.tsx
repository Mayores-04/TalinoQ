import React, { useState } from 'react';
import { View } from 'react-native';
import { LoginScreen } from '@/app/screens/LoginScreen';
import { RegisterScreen } from '@/app/screens/RegisterScreen';
import { ForgotPasswordScreen } from '@/app/screens/ForgotPasswordScreen';
import { SplashScreen } from '@/app/screens/SplashScreen';

export default function AuthStack() {
  const [route, setRoute] = useState<'splash' | 'login' | 'register' | 'forgot-password'>('splash');

  if (route === 'splash') {
    return <SplashScreen onDone={() => setRoute('login')} />;
  }

  if (route === 'register') {
    return <RegisterScreen onLogin={() => setRoute('login')} />;
  }

  if (route === 'forgot-password') {
    return <ForgotPasswordScreen onLogin={() => setRoute('login')} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <LoginScreen
        onForgotPassword={() => setRoute('forgot-password')}
        onRegister={() => setRoute('register')}
      />
    </View>
  );
}
