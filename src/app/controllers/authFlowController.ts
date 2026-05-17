import type { AuthRoute } from '@/app/screens/AuthFlow';

export function resolveNextRoute(args: {
  route: AuthRoute;
  hasSeenOnboarding: boolean;
  isAuthenticated: boolean;
  splashFinished: boolean;
}): AuthRoute | null {
  const { route, hasSeenOnboarding, isAuthenticated, splashFinished } = args;

  if (!splashFinished) {
    return null;
  }

  if (route === 'splash') {
    return hasSeenOnboarding ? (isAuthenticated ? 'home' : 'login') : 'onboarding';
  }

  if (isAuthenticated) {
    if (route === 'login' || route === 'register' || route === 'forgot-password') {
      return 'home';
    }

    return null;
  }

  if (
    route === 'home' ||
    route === 'reviewers' ||
    route === 'create-reviewer' ||
    route === 'progress' ||
    route === 'ai-chat' ||
    route === 'profile' ||
    route === 'settings'
  ) {
    return 'login';
  }

  return null;
}
