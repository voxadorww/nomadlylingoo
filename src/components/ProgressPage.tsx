import { useEffect, useState } from 'react';
import { projectId } from '../utils/supabase/info';
import { ArrowLeft, TrendingUp, BookOpen, Award, Target } from 'lucide-react';

interface ProgressPageProps {
  accessToken: string;
  onBack: () => void;
}

export function ProgressPage({ accessToken, onBack }: ProgressPageProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-91c142be/progress`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Failed to load progress:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-indigo-600">Loading...</div>
      </div>
    );
  }

  const profile = data?.profile;
  const progress = data?.progress;
  const recentQuizzes = data?.recentQuizzes || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
        </div>

        <h1 className="text-indigo-600 mb-8">📊 Your Progress</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-3">
              <Target className="w-8 h-8 text-indigo-600" />
              <div className="text-gray-600">Current Stage</div>
            </div>
            <div className="text-gray-800">Stage {profile?.currentStage || 1}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-3">
              <BookOpen className="w-8 h-8 text-green-600" />
              <div className="text-gray-600">Lessons</div>
            </div>
            <div className="text-gray-800">{profile?.lessonsCompleted || 0} completed</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-3">
              <Award className="w-8 h-8 text-yellow-600" />
              <div className="text-gray-600">Accuracy</div>
            </div>
            <div className="text-gray-800">{Math.round(profile?.overallAccuracy || 0)}%</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="w-8 h-8 text-purple-600" />
              <div className="text-gray-600">Words</div>
            </div>
            <div className="text-gray-800">{progress?.wordsLearned?.length || 0} learned</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-gray-800 mb-4">Recent Quiz Scores</h2>
            {recentQuizzes.length === 0 ? (
              <div className="text-gray-600">No quiz results yet. Complete a lesson to see your scores!</div>
            ) : (
              <div className="space-y-3">
                {recentQuizzes.map((quiz: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="text-gray-600 text-sm">
                      {new Date(quiz.timestamp).toLocaleDateString()}
                    </div>
                    <div className={`px-3 py-1 rounded ${
                      quiz.score >= 75 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {Math.round(quiz.score)}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-gray-800 mb-4">Vocabulary Mastery</h2>
            {!progress?.wordsLearned || progress.wordsLearned.length === 0 ? (
              <div className="text-gray-600">Start learning to build your vocabulary!</div>
            ) : (
              <div className="space-y-2">
                <div className="text-gray-600 mb-3">
                  You've learned {progress.wordsLearned.length} words so far!
                </div>
                <div className="flex flex-wrap gap-2">
                  {progress.wordsLearned.slice(0, 20).map((word: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-sm"
                    >
                      {word}
                    </span>
                  ))}
                  {progress.wordsLearned.length > 20 && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                      +{progress.wordsLearned.length - 20} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-gray-800 mb-4">Learning Journey</h2>
          <div className="space-y-4">
            {[
              { stage: 1, name: 'Vocabulary', description: 'Simple words', icon: '📝' },
              { stage: 2, name: 'Phrases', description: 'Simple phrases', icon: '💬' },
              { stage: 3, name: 'Sentences', description: 'Basic sentences', icon: '📖' },
              { stage: 4, name: 'Dialogues', description: 'Short conversations', icon: '🗣️' },
              { stage: 5, name: 'Topics', description: 'Topic-based lessons', icon: '🎯' },
            ].map((stage) => {
              const currentStage = profile?.currentStage || 1;
              const isComplete = currentStage > stage.stage;
              const isCurrent = currentStage === stage.stage;

              return (
                <div key={stage.stage} className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isComplete
                        ? 'bg-green-500 text-white'
                        : isCurrent
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isComplete ? '✓' : stage.icon}
                  </div>
                  <div className="flex-1">
                    <div className={`${isCurrent ? 'text-indigo-600' : 'text-gray-800'}`}>
                      Stage {stage.stage}: {stage.name}
                    </div>
                    <div className="text-gray-600 text-sm">{stage.description}</div>
                  </div>
                  {isComplete && (
                    <div className="text-green-600">Complete</div>
                  )}
                  {isCurrent && (
                    <div className="text-indigo-600">In Progress</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {progress?.mistakes && progress.mistakes.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-gray-800 mb-4">Recent Mistakes to Review</h2>
            <div className="space-y-2">
              {progress.mistakes.slice(-5).map((mistake: any, index: number) => (
                <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="text-gray-800">{mistake.question}</div>
                  <div className="text-gray-600 text-sm">
                    {new Date(mistake.timestamp).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
