import { useState } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface OnboardingPageProps {
  accessToken: string;
  onComplete: () => void;
}

export function OnboardingPage({ accessToken, onComplete }: OnboardingPageProps) {
  const [level, setLevel] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const levels = [
    { value: 'none', label: 'None', description: 'I don\'t know any Spanish' },
    { value: 'beginner', label: 'Beginner', description: 'I know a few words and phrases' },
    { value: 'low-beginner', label: 'Low Beginner', description: 'I can understand basic conversations' },
  ];

  const handleSubmit = async () => {
    if (!level) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-91c142be/onboard`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ level }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete onboarding');
      }

      onComplete();
    } catch (err: any) {
      console.error('Onboarding error:', err);
      setError(err.message || 'Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-indigo-600 mb-2">Welcome to SpanishAI! 🎉</h1>
          <p className="text-gray-600">Let's personalize your learning journey</p>
        </div>

        <div className="mb-8">
          <h2 className="text-gray-800 mb-4">What's your current Spanish level?</h2>
          
          <div className="space-y-4">
            {levels.map((lvl) => (
              <button
                key={lvl.value}
                onClick={() => setLevel(lvl.value)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  level === lvl.value
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-gray-800">{lvl.label}</div>
                    <div className="text-gray-600 text-sm">{lvl.description}</div>
                  </div>
                  {level === lvl.value && (
                    <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!level || loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Loading...' : 'Start Learning'}
        </button>
      </div>
    </div>
  );
}
