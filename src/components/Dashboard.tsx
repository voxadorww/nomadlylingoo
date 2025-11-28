import { useEffect, useState } from 'react';
import { projectId } from '../utils/supabase/info';
import { BookOpen, Award, TrendingUp, Target } from 'lucide-react';

interface DashboardProps {
  accessToken: string;
  onStartLesson: () => void;
  onViewProgress: () => void;
  onLogout: () => void;
}

export function Dashboard({ accessToken, onStartLesson, onViewProgress, onLogout }: DashboardProps) {
  const [profile, setProfile] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-91c142be/profile`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();
      setProfile(data.profile);
      setProgress(data.progress);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStageInfo = (stage: number) => {
    const stages = [
      { name: 'Vocabulary', description: 'Learning simple words', icon: '📝' },
      { name: 'Phrases', description: 'Simple phrases', icon: '💬' },
      { name: 'Sentences', description: 'Basic sentences', icon: '📖' },
      { name: 'Dialogues', description: 'Short conversations', icon: '🗣️' },
      { name: 'Topics', description: 'Topic-based lessons', icon: '🎯' },
    ];
    return stages[stage - 1] || stages[0];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-indigo-600">Loading...</div>
      </div>
    );
  }

  const stageInfo = getStageInfo(profile?.currentStage || 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-indigo-600 mb-1">🇪🇸 SpanishAI</h1>
            <p className="text-gray-600">Welcome back, {profile?.name}!</p>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-8 h-8 text-indigo-600" />
              <span className="text-gray-600 text-sm">Current Stage</span>
            </div>
            <div className="text-gray-800">{stageInfo.icon} {stageInfo.name}</div>
            <div className="text-gray-600 text-sm mt-1">{stageInfo.description}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <BookOpen className="w-8 h-8 text-green-600" />
              <span className="text-gray-600 text-sm">Lessons</span>
            </div>
            <div className="text-gray-800">{profile?.lessonsCompleted || 0}</div>
            <div className="text-gray-600 text-sm mt-1">Completed</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <Award className="w-8 h-8 text-yellow-600" />
              <span className="text-gray-600 text-sm">Accuracy</span>
            </div>
            <div className="text-gray-800">{Math.round(profile?.overallAccuracy || 0)}%</div>
            <div className="text-gray-600 text-sm mt-1">Average score</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-purple-600" />
              <span className="text-gray-600 text-sm">Words</span>
            </div>
            <div className="text-gray-800">{progress?.wordsLearned?.length || 0}</div>
            <div className="text-gray-600 text-sm mt-1">Learned</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-gray-800 mb-4">Ready for your next lesson?</h2>
            <p className="text-gray-600 mb-6">
              Continue your journey with an AI-generated lesson tailored to your progress.
            </p>
            <button
              onClick={onStartLesson}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Start New Lesson
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-gray-800 mb-4">Track Your Progress</h2>
            <p className="text-gray-600 mb-6">
              View detailed statistics about your learning journey and see how far you've come.
            </p>
            <button
              onClick={onViewProgress}
              className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors"
            >
              View Progress
            </button>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-8">
          <h2 className="text-gray-800 mb-4">Your Learning Path</h2>
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5].map((stage) => {
              const info = getStageInfo(stage);
              const isComplete = (profile?.currentStage || 1) > stage;
              const isCurrent = (profile?.currentStage || 1) === stage;
              
              return (
                <div key={stage} className="flex-1 text-center">
                  <div
                    className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 ${
                      isComplete
                        ? 'bg-green-500 text-white'
                        : isCurrent
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isComplete ? '✓' : info.icon}
                  </div>
                  <div className={`text-sm ${isCurrent ? 'text-indigo-600' : 'text-gray-600'}`}>
                    {info.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
