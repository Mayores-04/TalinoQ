import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type ScrollViewProps,
  type ViewProps,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { APP_SCREEN_CLASS, APP_SCROLL_CONTENT_CLASS } from '@/styles/appTheme';

type AppScreenProps = ViewProps & {
  avoidKeyboard?: boolean;
  children: React.ReactNode;
  contentClassName?: string;
  edges?: Edge[];
  scroll?: boolean;
  scrollProps?: ScrollViewProps;
};

export function AppScreen({
  avoidKeyboard,
  children,
  className = '',
  contentClassName = '',
  edges = [],
  scroll,
  scrollProps,
  ...props
}: AppScreenProps & { className?: string }) {
  const body = scroll ? (
    <ScrollView
      className="flex-1"
      contentContainerClassName={`${APP_SCROLL_CONTENT_CLASS} ${contentClassName}`}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...scrollProps}>
      {children}
    </ScrollView>
  ) : (
    <View className={`flex-1 ${contentClassName}`}>{children}</View>
  );

  const content = avoidKeyboard ? (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
      {body}
    </KeyboardAvoidingView>
  ) : (
    body
  );

  return (
    <SafeAreaView className={`${APP_SCREEN_CLASS} ${className}`} edges={edges} {...props}>
      {content}
    </SafeAreaView>
  );
}
