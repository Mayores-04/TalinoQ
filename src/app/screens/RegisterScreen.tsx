import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArrowRight, LockKeyhole, Mail, ShieldCheck, User } from 'lucide-react-native';

import { AuthShell } from '@/components/auth/AuthShell';
import { AuthStatus } from '@/components/auth/AuthStatus';
import { AuthTextField } from '@/components/auth/AuthTextField';
import { BrandLogo } from '@/components/auth/BrandLogo';
import { Box, Divider, HStack } from '@/components/ui/box';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useGoogleSignIn } from '@/hooks/useGoogleSignIn';
import { registerWithEmail } from '@/lib/firebase';

type RegisterScreenProps = {
  onLogin: () => void;
  onAuthenticated?: () => void;
};

export function RegisterScreen({ onLogin, onAuthenticated }: RegisterScreenProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [tone, setTone] = useState<'info' | 'error' | 'success'>('info');

  const normalizedName = fullName.trim();
  const normalizedEmail = email.trim();
  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const canSubmit = useMemo(
    () =>
      normalizedName.length > 1 &&
      normalizedEmail.length > 0 &&
      password.length >= 6 &&
      password === confirmPassword &&
      !isBusy,
    [normalizedName, normalizedEmail, password, confirmPassword, isBusy]
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

  const handleRegister = async () => {
    if (!canSubmit) return;

    setIsBusy(true);
    setMessage(undefined);

    try {
      await registerWithEmail(normalizedName, normalizedEmail, password);
      showSuccess('Account created. You can continue learning with TalinoQ.');
      onAuthenticated?.();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Unable to create account right now.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleGoogle = async () => {
    if (isBusy) return;

    setMessage(undefined);

    if (!canUseGoogle) {
      showError('Add a Google OAuth client ID in .env to register with Google.');
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
    <AuthShell centerContent={false}>
      <View className="gap-5 py-8" style={styles.screen}>
        <View className="items-center">
          <BrandLogo compact showMascot={false} />
        </View>

        <View className="gap-4">
          <HStack className="items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-xs font-extrabold uppercase text-teal-950">Create Account</Text>
              <Text className="mt-1 text-2xl font-extrabold text-slate-900">
                Start reviewing smarter
              </Text>
              <Text className="mt-1 text-sm text-slate-600">
                Save reviewers, sync progress, and continue studying anytime.
              </Text>
            </View>

            <HStack className="gap-2 pt-2">
              <Box className="h-2.5 w-8 rounded-full bg-teal-800" />
              <Box className="h-2.5 w-8 rounded-full bg-emerald-300" />
            </HStack>
          </HStack>

          <Card className="gap-5 rounded-3xl border-t-4 border-t-teal-800 p-5">
            <AuthStatus message={message} tone={tone} />

            <AuthTextField
              autoCapitalize="words"
              icon={User}
              label="Full Name"
              onChangeText={setFullName}
              placeholder="Juan Dela Cruz"
              returnKeyType="next"
              textContentType="name"
              value={fullName}
            />

            <AuthTextField
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              icon={Mail}
              keyboardType="email-address"
              label="Email Address"
              onChangeText={setEmail}
              placeholder="hello@talinoq.edu"
              returnKeyType="next"
              textContentType="emailAddress"
              value={email}
            />

            <Divider className="border-t border-dashed border-slate-200 bg-transparent" />

            <View className="gap-4">
              <HStack className="items-center gap-2">
                <ShieldCheck color="#475569" size={14} />
                <Text className="text-[11px] font-semibold uppercase text-slate-500">Security</Text>
              </HStack>

              <AuthTextField
                autoComplete="new-password"
                icon={LockKeyhole}
                label="Password"
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                returnKeyType="next"
                secureTextEntry
                textContentType="newPassword"
                value={password}
              />

              <AuthTextField
                autoComplete="new-password"
                icon={ShieldCheck}
                isInvalid={passwordMismatch}
                label="Confirm Password"
                onChangeText={setConfirmPassword}
                placeholder="Repeat your password"
                returnKeyType="done"
                secureTextEntry
                textContentType="newPassword"
                value={confirmPassword}
              />

              {passwordMismatch ? (
                <Text className="-mt-2 text-xs text-red-600">Passwords do not match.</Text>
              ) : null}
            </View>

            <Button isDisabled={!canSubmit} className="mt-2" onPress={handleRegister}>
              <ButtonText>{isBusy ? 'Creating Account...' : 'Create Account'}</ButtonText>
              <ButtonIcon as={ArrowRight} />
            </Button>
          </Card>
        </View>

        <HStack className="flex-wrap justify-center gap-1">
          <Text className="text-center text-xs text-slate-600">Already have an account?</Text>
          <Button variant="link" onPress={onLogin} isDisabled={isBusy}>
            <ButtonText className="text-xs">Login</ButtonText>
          </Button>
        </HStack>

        <HStack className="items-center gap-3">
          <Divider className="flex-1" />
          <Text className="text-[11px] font-semibold uppercase text-slate-500">
            or register with
          </Text>
          <Divider className="flex-1" />
        </HStack>

        <Button action="secondary" variant="outline" onPress={handleGoogle} isDisabled={isBusy}>
          <Text className="text-sm font-bold text-slate-500">G</Text>
          <ButtonText>Google</ButtonText>
        </Button>

        <Text className="px-3 text-center text-[11px] leading-4 text-slate-500">
          By creating an account, you agree to use TalinoQ responsibly and review AI-generated
          answers before studying from them.
        </Text>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    width: '100%',
  },
});
