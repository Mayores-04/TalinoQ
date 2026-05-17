import { useEffect } from 'react';

import { ForgotPasswordScreen } from '@/app/screens/ForgotPasswordScreen';
import { HomeDashboard } from '@/app/pages/HomeDashboard';
import { AIChatPage } from '@/app/pages/AIChatPage';
import { CreateReviewerFlow } from '@/app/pages/CreateReviewerFlow';
import { LoginScreen } from '@/app/screens/LoginScreen';
import { OnboardingScreen } from '@/app/screens/OnboardingScreen';
import { ProgressAnalyticsPage } from '@/app/pages/ProgressAnalyticsPage';
import { RegisterScreen } from '@/app/screens/RegisterScreen';
import { SplashScreen } from '@/app/screens/SplashScreen';
import { ReviewersPage } from '@/app/pages/ReviewersPage';
import { UserProfilePage } from '@/app/pages/UserProfilePage';
import { SettingsPage } from './Settings';
import { resolveNextRoute } from '@/app/controllers/authFlowController';
import { useAuthSession } from '@/app/sessions/useAuthSession';

export type AuthRoute =
  | 'splash'
  | 'onboarding'
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'home'
  | 'reviewers'
  | 'create-reviewer'
  | 'progress'
  | 'ai-chat'
  | 'profile'
  | 'settings';

type AuthFlowProps = {
  route: AuthRoute;
  setRoute: (route: AuthRoute) => void;
};

export function AuthFlow({ route, setRoute }: AuthFlowProps) {
  const {
    checkingAuth,
    checkingOnboarding,
    currentUser,
    finishOnboarding,
    hasSeenOnboarding,
    isAuthenticated,
    logout,
    setSplashFinished,
    splashFinished,
    userProfile,
  } = useAuthSession();

  useEffect(() => {
    const nextRoute = resolveNextRoute({
      route,
      hasSeenOnboarding,
      isAuthenticated,
      splashFinished,
    });

    if (nextRoute) {
      setRoute(nextRoute);
    }
  }, [hasSeenOnboarding, isAuthenticated, route, setRoute, splashFinished]);

  if (checkingAuth || route === 'splash') {
    return <SplashScreen onDone={() => setSplashFinished(true)} />;
  }

  if (checkingOnboarding || route === 'onboarding') {
    return <OnboardingScreen onDone={finishOnboarding} />;
  }

  if (route === 'home') {
    return (
      <HomeDashboard
        userName={userProfile?.firstName}
        onCreateReviewer={() => setRoute('create-reviewer')}
        onOpenReviewers={() => setRoute('reviewers')}
        onOpenProgress={() => setRoute('progress')}
        onOpenAIChat={() => setRoute('ai-chat')}
        onOpenWeakTopics={() => console.log('Open weak topics')}
      />
    );
  }

  if (route === 'register') {
    return <RegisterScreen onLogin={() => setRoute('login')} />;
  }

  if (route === 'forgot-password') {
    return <ForgotPasswordScreen onLogin={() => setRoute('login')} />;
  }

  if (route === 'settings') {
    return (
      <SettingsPage
        userProfile={userProfile}
        onBack={() => setRoute('home')}
        onOpenHome={() => setRoute('home')}
        onOpenProfile={() => setRoute('profile')}
        onOpenReviewers={() => setRoute('reviewers')}
        onOpenCreate={() => setRoute('create-reviewer')}
        onOpenProgress={() => setRoute('progress')}
        onOpenAIChat={() => setRoute('ai-chat')}
        onSignOut={async () => {
          await logout();
        }}
      />
    );
  }

  if (route === 'profile') {
    return (
      <UserProfilePage
        currentUser={currentUser}
        userProfile={userProfile}
        onBack={() => setRoute('settings')}
        onSignOut={async () => {
          await logout();
        }}
      />
    );
  }

  if (route === 'reviewers') {
    return (
      <ReviewersPage
        onBack={() => setRoute('home')}
        onOpenHome={() => setRoute('home')}
        onCreateReviewer={() => setRoute('create-reviewer')}
        onOpenCreate={() => setRoute('create-reviewer')}
        onOpenProgress={() => setRoute('progress')}
        onOpenAIChat={() => setRoute('ai-chat')}
      />
    );
  }

  if (route === 'create-reviewer') {
    return (
      <CreateReviewerFlow
        onBack={() => setRoute('home')}
        onOpenHome={() => setRoute('home')}
        onOpenReviewers={() => setRoute('reviewers')}
        onOpenProgress={() => setRoute('progress')}
        onOpenAIChat={() => setRoute('ai-chat')}
      />
    );
  }

  if (route === 'progress') {
    return (
      <ProgressAnalyticsPage
        onBack={() => setRoute('home')}
        onOpenHome={() => setRoute('home')}
        onOpenReviewers={() => setRoute('reviewers')}
        onOpenCreate={() => setRoute('create-reviewer')}
        onOpenAIChat={() => setRoute('ai-chat')}
      />
    );
  }

  if (route === 'ai-chat') {
    return (
      <AIChatPage
        onBack={() => setRoute('home')}
        onOpenHome={() => setRoute('home')}
        onOpenReviewers={() => setRoute('reviewers')}
        onOpenCreate={() => setRoute('create-reviewer')}
        onOpenProgress={() => setRoute('progress')}
      />
    );
  }

  return (
    <LoginScreen
      onForgotPassword={() => setRoute('forgot-password')}
      onRegister={() => setRoute('register')}
    />
  );
}
