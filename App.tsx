import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { AuthFlow, type AuthRoute } from '@/app/screens/AuthFlow';

import './global.css';

export default function App() {
  const [route, setRoute] = useState<AuthRoute>('splash');

  return (
    <SafeAreaProvider>
      <GluestackUIProvider mode="light">
        <AuthFlow route={route} setRoute={setRoute} />
        <StatusBar style="dark" />
      </GluestackUIProvider>
    </SafeAreaProvider>
  );
}
