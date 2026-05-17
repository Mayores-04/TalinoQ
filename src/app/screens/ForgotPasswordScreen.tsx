import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, ArrowRight, Mail } from 'lucide-react-native';

import { AuthShell, ScreenFooter } from '@/components/auth/AuthShell';
import { AuthStatus } from '@/components/auth/AuthStatus';
import { AuthTextField } from '@/components/auth/AuthTextField';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { resetPassword } from '@/lib/firebase';

type ForgotPasswordScreenProps = {
  onLogin: () => void;
};

export function ForgotPasswordScreen({ onLogin }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [tone, setTone] = useState<'info' | 'error' | 'success'>('info');

  const normalizedEmail = email.trim();

  const canSubmit = useMemo(() => normalizedEmail.length > 0 && !isBusy, [normalizedEmail, isBusy]);

  const handleReset = async () => {
    if (!canSubmit) return;

    setIsBusy(true);
    setMessage(undefined);

    try {
      await resetPassword(normalizedEmail);
      setTone('success');
      setMessage('Reset link sent. Check your inbox for the next step.');
    } catch (error) {
      setTone('error');
      setMessage(error instanceof Error ? error.message : 'Unable to send reset link right now.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <AuthShell background="plain" footer={<ScreenFooter>Powered by TalinoQ</ScreenFooter>}>
      <View className="gap-5 py-8" style={styles.screen}>
        <Text className="text-center text-4xl font-extrabold text-teal-950">TalinoQ</Text>

        <Card className="gap-5 rounded-3xl p-5">
          <View className="gap-2">
            <Text className="text-2xl font-extrabold text-slate-900">Reset Password</Text>
            <Text className="text-sm leading-6 text-slate-600">
              Enter the email associated with your account and we&apos;ll send a link to reset your
              password.
            </Text>
          </View>

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
            returnKeyType="done"
            textContentType="emailAddress"
            value={email}
          />

          <Button isDisabled={!canSubmit} onPress={handleReset}>
            <ButtonText>{isBusy ? 'Sending Link...' : 'Send Reset Link'}</ButtonText>
            <ButtonIcon as={ArrowRight} />
          </Button>

          <Button action="secondary" variant="ghost" onPress={onLogin} isDisabled={isBusy}>
            <ButtonIcon as={ArrowLeft} color="#334155" size={16} />
            <ButtonText className="text-slate-700">Back to Login</ButtonText>
          </Button>
        </Card>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 440,
  },
});
