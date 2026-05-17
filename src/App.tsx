import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import AppNavigator from '@/app/navigation/AppNavigator';

import '../global.css';

export default function App() {
  return (
    <SafeAreaProvider>
      <GluestackUIProvider mode="light">
        <AppNavigator />
        <StatusBar style="dark" />
      </GluestackUIProvider>
    </SafeAreaProvider>
  );
}
