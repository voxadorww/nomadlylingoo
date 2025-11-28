import { useState, useEffect } from 'react';
import { AuthPage } from './components/AuthPage';
import { OnboardingPage } from './components/OnboardingPage';
import { Dashboard } from './components/Dashboard';
import { LessonPlayer } from './components/LessonPlayer';
import { ProgressPage } from './components/ProgressPage';
import { supabase } from './utils/supabase-client';

type View = 'auth' | 'onboarding' | 'dashboard' | 'lesson' | 'progress';

export default function App() {
  const [view, setView] = useState<View>('auth');
  const [accessToken, setAccessToken] = useState<string>('');
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      setAccessToken(data.session.access_token);
      // Check if user needs onboarding by checking if they have a level set
      // For now, we'll just go to dashboard
      setView('dashboard');
    }
  };

  const handleAuthSuccess = (token: string) => {
    setAccessToken(token);
    setView('onboarding');
  };

  const handleOnboardingComplete = () => {
    setView('dashboard');
  };

  const handleStartLesson = () => {
    setView('lesson');
  };

  const handleLessonComplete = () => {
    setView('dashboard');
  };

  const handleViewProgress = () => {
    setView('progress');
  };

  const handleBackToDashboard = () => {
    setView('dashboard');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAccessToken('');
    setView('auth');
  };

  if (view === 'auth') {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  if (view === 'onboarding') {
    return <OnboardingPage accessToken={accessToken} onComplete={handleOnboardingComplete} />;
  }

  if (view === 'dashboard') {
    return (
      <Dashboard
        accessToken={accessToken}
        onStartLesson={handleStartLesson}
        onViewProgress={handleViewProgress}
        onLogout={handleLogout}
      />
    );
  }

  if (view === 'lesson') {
    return (
      <LessonPlayer
        accessToken={accessToken}
        onComplete={handleLessonComplete}
        onBack={handleBackToDashboard}
      />
    );
  }

  if (view === 'progress') {
    return <ProgressPage accessToken={accessToken} onBack={handleBackToDashboard} />;
  }

  return null;
}
