import { useEffect, useState, type ReactNode } from 'react';

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
import { AppChrome } from '@/components/app/AppChrome';

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
  const [reviewersStudyOpen, setReviewersStudyOpen] = useState(false);
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

  useEffect(() => {
    if (route !== 'reviewers') {
      setReviewersStudyOpen(false);
    }
  }, [route]);

  if (checkingAuth || route === 'splash') {
    return <SplashScreen onDone={() => setSplashFinished(true)} />;
  }

  if (checkingOnboarding || route === 'onboarding') {
    return <OnboardingScreen onDone={finishOnboarding} />;
  }

  const withChrome = (children: ReactNode, options?: { hideHeader?: boolean }) => (
    <AppChrome currentRoute={route} hideHeader={options?.hideHeader} onNavigate={setRoute}>
      {children}
    </AppChrome>
  );

  if (route === 'home') {
    return withChrome(
      <HomeDashboard
        userName={userProfile?.firstName}
        onCreateReviewer={() => setRoute('create-reviewer')}
        onOpenReviewers={() => setRoute('reviewers')}
        onOpenProgress={() => setRoute('progress')}
        onOpenAIChat={() => setRoute('ai-chat')}
        onOpenWeakTopics={() => setRoute('progress')}
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
    return withChrome(
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
    return withChrome(
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
    return withChrome(
      <ReviewersPage
        onBack={() => setRoute('home')}
        onOpenHome={() => setRoute('home')}
        onCreateReviewer={() => setRoute('create-reviewer')}
        onOpenCreate={() => setRoute('create-reviewer')}
        onOpenProgress={() => setRoute('progress')}
        onOpenAIChat={() => setRoute('ai-chat')}
        onStudyModeChange={setReviewersStudyOpen}
      />,
      { hideHeader: reviewersStudyOpen }
    );
  }

  if (route === 'create-reviewer') {
    return withChrome(
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
    return withChrome(
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
    return withChrome(
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
