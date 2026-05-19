import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
  type ViewProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

type AuthShellProps = ViewProps & {
  background?: 'gradient' | 'plain';
  children: React.ReactNode;
  footer?: React.ReactNode;
  padded?: boolean;
  centerContent?: boolean;
};

export function AuthShell({
  background = 'gradient',
  children,
  footer,
  padded = true,
  centerContent = true,
}: AuthShellProps) {
  const contentClasses = [
    'flex-grow',
    centerContent ? 'justify-center' : '',
    padded ? 'px-5 py-6' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName={contentClasses}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View className="w-full max-w-[440px] self-center">{children}</View>
          {footer ? <View className="mt-auto">{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  if (background === 'plain') {
    return <View className="flex-1 bg-tq-surface">{content}</View>;
  }

  return (
    <LinearGradient
      colors={['#f8fafc', '#ecfdf5', '#f8fafc']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}>
      {content}
    </LinearGradient>
  );
}

export function ScreenFooter({ children }: { children: React.ReactNode }) {
  return (
    <View className="items-center pb-5 pt-8">
      <Text className="text-center text-[10px] font-semibold uppercase tracking-[5px] text-tq-muted">
        {children}
      </Text>
    </View>
  );
}
