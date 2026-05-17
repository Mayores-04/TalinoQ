import { useEffect } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { loginWithGoogleIdToken } from '@/lib/firebase';

WebBrowser.maybeCompleteAuthSession();

type UseGoogleSignInOptions = {
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

export function useGoogleSignIn({ onError, onSuccess }: UseGoogleSignInOptions) {
  const googleClientIds = {
    android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  };
  const platformClientId = Platform.select({
    android: googleClientIds.android,
    ios: googleClientIds.ios,
    default: googleClientIds.web,
  });
  const isGoogleConfigured = Boolean(platformClientId);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: googleClientIds.android ?? 'missing-google-android-client-id',
    iosClientId: googleClientIds.ios ?? 'missing-google-ios-client-id',
    webClientId: googleClientIds.web ?? 'missing-google-web-client-id',
  });

  useEffect(() => {
    if (!response) {
      return;
    }

    if (response.type !== 'success') {
      if (response.type === 'cancel' || response.type === 'dismiss') {
        return;
      }

      onError('Google sign-in was not completed.');
      return;
    }

    const idToken = response.params.id_token;

    if (!idToken) {
      onError('Google sign-in did not return an ID token. Check the OAuth client ID setup.');
      return;
    }

    loginWithGoogleIdToken(idToken)
      .then(() => onSuccess('Google sign-in complete. Your TalinoQ session is ready.'))
      .catch((error: unknown) => {
        onError(error instanceof Error ? error.message : 'Unable to sign in with Google.');
      });
  }, [onError, onSuccess, response]);

  return {
    canUseGoogle: Boolean(request && isGoogleConfigured),
    signInWithGoogle: () => promptAsync(),
  };
}
