import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useColorScheme } from 'nativewind';

export type ModeType = 'light' | 'dark' | 'system';

type GluestackUIProviderProps = {
  children: React.ReactNode;
  mode?: ModeType;
};

export function GluestackUIProvider({ children, mode = 'light' }: GluestackUIProviderProps) {
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    try {
      setColorScheme(mode as any);
    } catch (e) {
      // If nativewind/tailwind isn't configured for manual class-based toggling,
      // avoid throwing so the app can continue to load. The view below uses
      // `dark:` classes so pages still render when darkMode is enabled.
      // Silently ignore and let CSS/system handle the color scheme.
      console.warn('setColorScheme unavailable or failed:', e);
    }
  }, [mode, setColorScheme]);

  return <View className="flex-1 bg-white dark:bg-black">{children}</View>;
}
