import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
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
  const content = (
    <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        style={styles.fill}>
        <ScrollView
          style={styles.fill}
          contentContainerStyle={[
            styles.scrollContent,
            centerContent ? styles.centerContent : undefined,
            padded ? styles.paddedContent : undefined,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.contentWrapper}>{children}</View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  if (background === 'plain') {
    return <View style={[styles.fill, styles.plainBackground]}>{content}</View>;
  }

  return (
    <LinearGradient
      colors={['#f8fafc', '#ecfdf5', '#f8fafc']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.fill}>
      {content}
    </LinearGradient>
  );
}

export function ScreenFooter({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.screenFooter}>
      <Text style={styles.screenFooterText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  plainBackground: {
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  centerContent: {
    justifyContent: 'center',
  },
  paddedContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  contentWrapper: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 440,
  },
  footer: {
    marginTop: 'auto',
  },
  screenFooter: {
    alignItems: 'center',
    paddingBottom: 20,
    paddingTop: 32,
  },
  screenFooterText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 5,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
