import { useState, useEffect } from 'react';
import { projectId } from '../utils/supabase/info';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

interface LessonPlayerProps {
  accessToken: string;
  onComplete: () => void;
  onBack: () => void;
}

export function LessonPlayer({ accessToken, onComplete, onBack }: LessonPlayerProps) {
  const [loading, setLoading] = useState(true);
  const [lessonId, setLessonId] = useState('');
  const [lesson, setLesson] = useState<any>(null);
  const [currentView, setCurrentView] = useState<'content' | 'quiz' | 'results'>('content');
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [results, setResults] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    generateLesson();
  }, []);

  const generateLesson = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-91c142be/generate-lesson`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();
      if (!response.ok) {
        console.error('Failed to generate lesson - response:', data);
        throw new Error(data.error || 'Failed to generate lesson');
      }

      setLessonId(data.lessonId);
      setLesson(data.lesson);
      setQuizAnswers(new Array(data.lesson.quiz.length).fill(-1));
    } catch (err: any) {
      console.error('Failed to generate lesson:', err);
      alert(`Failed to generate lesson: ${err.message || err}. Please check the console for details.`);
      onBack();
    } finally {
      setLoading(false);
    }
  };

  const submitQuiz = async () => {
    if (quizAnswers.includes(-1)) {
      alert('Please answer all questions before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-91c142be/submit-quiz`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ lessonId, answers: quizAnswers }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit quiz');
      }

      setResults(data);
      setCurrentView('results');
    } catch (err) {
      console.error('Failed to submit quiz:', err);
      alert('Failed to submit quiz. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-indigo-600 mb-2">🤖 AI is generating your personalized lesson...</div>
          <div className="text-gray-600">This may take a few moments</div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (!lesson) return null;

    const stage = lesson.stage;

    if (stage === 1) {
      return (
        <div className="space-y-6">
          {lesson.content.map((item: any, index: number) => (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-indigo-600">{item.word}</span>
                <span className="text-gray-600">→</span>
                <span className="text-gray-800">{item.translation}</span>
              </div>
              <div className="text-gray-600 text-sm mb-2">
                🗣️ {item.pronunciation}
              </div>
              <div className="text-gray-700 italic">
                "{item.example}"
              </div>
            </div>
          ))}
        </div>
      );
    } else if (stage === 2) {
      return (
        <div className="space-y-6">
          {lesson.content.map((item: any, index: number) => (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-indigo-600">{item.phrase}</span>
                <span className="text-gray-600">→</span>
                <span className="text-gray-800">{item.translation}</span>
              </div>
              <div className="text-gray-600 text-sm mb-2">
                🗣️ {item.pronunciation}
              </div>
              <div className="text-gray-700">
                <strong>When to use:</strong> {item.context}
              </div>
            </div>
          ))}
        </div>
      );
    } else if (stage === 3) {
      return (
        <div className="space-y-6">
          {lesson.content.map((item: any, index: number) => (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="text-indigo-600 mb-2">{item.pattern}</div>
              <div className="bg-gray-50 p-4 rounded mb-2">
                <div className="text-gray-800 mb-1">{item.example}</div>
                <div className="text-gray-600 text-sm">→ {item.translation}</div>
              </div>
              <div className="text-gray-700 text-sm">
                💡 {item.explanation}
              </div>
            </div>
          ))}
        </div>
      );
    } else if (stage === 4) {
      return (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-600 mb-4">📍 {lesson.content.context}</div>
          <div className="space-y-4">
            {lesson.content.dialogue.map((line: any, index: number) => (
              <div key={index} className="border-l-4 border-indigo-600 pl-4">
                <div className="text-gray-600 text-sm">{line.speaker}</div>
                <div className="text-gray-800">{line.spanish}</div>
                <div className="text-gray-600 text-sm italic">{line.english}</div>
              </div>
            ))}
          </div>
        </div>
      );
    } else if (stage === 5) {
      return (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-indigo-600 mb-4">📚 Vocabulary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {lesson.content.vocabulary.map((item: any, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-gray-800">{item.word}</span>
                  <span className="text-gray-600">→</span>
                  <span className="text-gray-600">{item.translation}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-indigo-600 mb-4">💬 Useful Phrases</h3>
            <div className="space-y-2">
              {lesson.content.phrases.map((item: any, index: number) => (
                <div key={index} className="border-l-4 border-purple-600 pl-4">
                  <div className="text-gray-800">{item.phrase}</div>
                  <div className="text-gray-600 text-sm">{item.translation}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-indigo-600 mb-4">📖 Reading Practice</h3>
            <div className="bg-gray-50 p-4 rounded">
              <div className="text-gray-800 mb-3">{lesson.content.paragraph.spanish}</div>
              <div className="text-gray-600 text-sm italic">{lesson.content.paragraph.english}</div>
            </div>
          </div>
        </div>
      );
    }
  };

  const renderQuiz = () => {
    if (!lesson) return null;

    return (
      <div className="space-y-6">
        {lesson.quiz.map((question: any, qIndex: number) => (
          <div key={qIndex} className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-800 mb-4">
              {qIndex + 1}. {question.question}
            </div>
            <div className="space-y-2">
              {question.options.map((option: string, oIndex: number) => (
                <button
                  key={oIndex}
                  onClick={() => {
                    const newAnswers = [...quizAnswers];
                    newAnswers[qIndex] = oIndex;
                    setQuizAnswers(newAnswers);
                  }}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                    quizAnswers[qIndex] === oIndex
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ))}

        <button
          onClick={submitQuiz}
          disabled={submitting}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Submitting...' : 'Submit Quiz'}
        </button>
      </div>
    );
  };

  const renderResults = () => {
    if (!results) return null;

    const passed = results.passed;

    return (
      <div className="space-y-6">
        <div className={`bg-white rounded-lg shadow p-8 text-center ${passed ? 'border-4 border-green-500' : 'border-4 border-yellow-500'}`}>
          <div className="text-6xl mb-4">{passed ? '🎉' : '💪'}</div>
          <h2 className="text-gray-800 mb-2">
            {passed ? '¡Excelente! Great Job!' : '¡Casi! Almost There!'}
          </h2>
          <div className="text-gray-800 mb-4">Your Score: {Math.round(results.score)}%</div>
          {passed ? (
            <div className="text-gray-600 mb-4">
              You've passed! {results.newStage > lesson.stage && `You've advanced to Stage ${results.newStage}!`}
            </div>
          ) : (
            <div className="text-gray-600 mb-4">
              Keep practicing! You need 75% or higher to advance.
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-800 mb-4">Quiz Results</h3>
          <div className="space-y-4">
            {results.results.map((result: any, index: number) => (
              <div key={index} className="border-l-4 border-gray-200 pl-4">
                <div className="flex items-start gap-2">
                  {result.isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-1" />
                  )}
                  <div className="flex-1">
                    <div className="text-gray-800">{result.question}</div>
                    {!result.isCorrect && (
                      <div className="text-red-600 text-sm mt-1">
                        Correct answer: {lesson.quiz[index].options[result.correctAnswer]}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onComplete}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={currentView === 'results' ? onComplete : onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            {currentView === 'results' ? 'Dashboard' : 'Back'}
          </button>
          {lesson && currentView !== 'results' && (
            <div className="text-gray-600">Stage {lesson.stage}</div>
          )}
        </div>

        {lesson && (
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg shadow p-6 mb-6">
            <h1 className="mb-2">{lesson.title}</h1>
            {lesson.topic && (
              <div className="text-indigo-100">Topic: {lesson.topic}</div>
            )}
          </div>
        )}

        {currentView === 'content' && (
          <>
            {renderContent()}
            <div className="mt-6">
              <button
                onClick={() => setCurrentView('quiz')}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Continue to Quiz
              </button>
            </div>
          </>
        )}

        {currentView === 'quiz' && renderQuiz()}

        {currentView === 'results' && renderResults()}
      </div>
    </div>
  );
}
