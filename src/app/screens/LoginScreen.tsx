import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { ArrowRight, LockKeyhole, Mail, UserRoundPlus } from 'lucide-react-native';

import { AuthShell } from '@/components/auth/AuthShell';
import { AuthStatus } from '@/components/auth/AuthStatus';
import { AuthTextField } from '@/components/auth/AuthTextField';
import { HorizontalLogo } from '@/components/auth/BrandLogo';
import { Divider, HStack } from '@/components/ui/box';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useGoogleSignIn } from '@/hooks/useGoogleSignIn';
import { continueAsGuest, loginWithEmail } from '@/lib/firebase';

type LoginScreenProps = {
  onForgotPassword: () => void;
  onRegister: () => void;
  onAuthenticated?: () => void;
};

export function LoginScreen({ onForgotPassword, onRegister, onAuthenticated }: LoginScreenProps) {
  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [tone, setTone] = useState<'info' | 'error' | 'success'>('info');

  useEffect(() => {
    Animated.parallel([
      Animated.timing(entranceOpacity, {
        duration: 260,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, [entranceOpacity]);

  const normalizedEmail = email.trim();

  const canSubmit = useMemo(
    () => normalizedEmail.length > 0 && password.length > 0 && !isBusy,
    [normalizedEmail, password, isBusy]
  );

  const showError = useCallback((nextMessage: string) => {
    setTone('error');
    setMessage(nextMessage);
  }, []);

  const showSuccess = useCallback((nextMessage: string) => {
    setTone('success');
    setMessage(nextMessage);
  }, []);

  const { canUseGoogle, signInWithGoogle } = useGoogleSignIn({
    onError: showError,
    onSuccess: showSuccess,
  });

  const handleLogin = async () => {
    if (!canSubmit) return;

    setIsBusy(true);
    setMessage(undefined);

    try {
      await loginWithEmail(normalizedEmail, password);
      showSuccess('Welcome back. Your TalinoQ session is ready.');
      onAuthenticated?.();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Unable to sign in right now.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleGuest = async () => {
    if (isBusy) return;

    setIsBusy(true);
    setMessage(undefined);

    try {
      await continueAsGuest();
      showSuccess('Guest mode is ready. Your data will be saved locally.');
      onAuthenticated?.();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Unable to continue as guest.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleGoogle = async () => {
    if (isBusy) return;

    setMessage(undefined);

    if (!canUseGoogle) {
      showError('Add a Google OAuth client ID in .env to use Google sign-in.');
      return;
    }

    setIsBusy(true);
    try {
      await signInWithGoogle();
      onAuthenticated?.();
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <AuthShell>
      <Animated.View
        className="gap-6 py-8"
        style={[
          styles.screen,
          {
            opacity: entranceOpacity,
          },
        ]}>
        <View className="items-center gap-3">
          <HorizontalLogo />

          <View className="items-center gap-2">
            <Text className="text-center text-2xl font-extrabold text-teal-950">Welcome Back!</Text>
            <Text className="max-w-[280px] text-center text-sm text-slate-600">
              Continue creating reviewers, quizzes, and flashcards for smarter studying.
            </Text>
          </View>
        </View>

        <Card className="gap-5 rounded-3xl p-5">
          <AuthStatus message={message} tone={tone} />

          <AuthTextField
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            icon={Mail}
            keyboardType="email-address"
            label="Email Address"
            onChangeText={setEmail}
            placeholder="name@example.com"
            returnKeyType="next"
            textContentType="emailAddress"
            value={email}
          />

          <AuthTextField
            autoComplete="password"
            icon={LockKeyhole}
            label="Password"
            onChangeText={setPassword}
            placeholder="••••••••"
            returnKeyType="done"
            secureTextEntry
            textContentType="password"
            value={password}
          />

          <View className="-mt-2 items-end">
            <Button variant="link" onPress={onForgotPassword} isDisabled={isBusy}>
              <ButtonText className="text-xs">Forgot Password?</ButtonText>
            </Button>
          </View>

          <Button isDisabled={!canSubmit} onPress={handleLogin}>
            <ButtonText>{isBusy ? 'Signing In...' : 'Login'}</ButtonText>
            <ButtonIcon as={ArrowRight} />
          </Button>

          <HStack className="items-center gap-3">
            <Divider className="flex-1" />
            <Text className="text-[11px] font-semibold uppercase text-slate-500">or</Text>
            <Divider className="flex-1" />
          </HStack>

          <Button action="secondary" variant="outline" onPress={handleGoogle} isDisabled={isBusy}>
            <Text className="mr-1 text-sm font-bold tracking-[2px] text-teal-950">GOOGLE</Text>
            <ButtonText className="text-xs">Continue with Google</ButtonText>
          </Button>

          <Button action="positive" onPress={handleGuest} isDisabled={isBusy}>
            <ButtonIcon as={UserRoundPlus} color="#064e3b" />
            <ButtonText className="text-teal-950">Browse as Guest</ButtonText>
          </Button>
        </Card>

        <HStack className="flex-wrap justify-center gap-1 pt-1">
          <Text className="text-center text-xs text-slate-600">Don&apos;t have an account?</Text>
          <Button variant="link" onPress={onRegister} isDisabled={isBusy}>
            <ButtonText className="text-xs">Sign up for free</ButtonText>
          </Button>
        </HStack>
      </Animated.View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    width: '100%',
  },
});
