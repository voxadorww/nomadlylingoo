import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Create Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Health check endpoint
app.get("/make-server-91c142be/health", (c) => {
  return c.json({ status: "ok" });
});

// Sign up endpoint
app.post("/make-server-91c142be/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log(`Signup error: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    // Create initial profile
    await kv.set(`profile:${data.user.id}`, {
      userId: data.user.id,
      name,
      email,
      level: null,
      currentStage: 1,
      lessonsCompleted: 0,
      overallAccuracy: 0,
      createdAt: new Date().toISOString()
    });

    return c.json({ user: data.user });
  } catch (error) {
    console.log(`Signup error: ${error}`);
    return c.json({ error: 'Failed to sign up' }, 500);
  }
});

// Onboard endpoint
app.post("/make-server-91c142be/onboard", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!user || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { level } = await c.req.json();
    
    const profile = await kv.get(`profile:${user.id}`);
    if (profile) {
      profile.level = level;
      await kv.set(`profile:${user.id}`, profile);
    }

    // Initialize progress
    await kv.set(`progress:${user.id}`, {
      wordsLearned: [],
      mistakes: [],
      completedLessons: []
    });

    return c.json({ success: true });
  } catch (error) {
    console.log(`Onboard error: ${error}`);
    return c.json({ error: 'Failed to onboard' }, 500);
  }
});

// Get profile endpoint
app.get("/make-server-91c142be/profile", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!user || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profile = await kv.get(`profile:${user.id}`);
    const progress = await kv.get(`progress:${user.id}`);

    return c.json({ profile, progress });
  } catch (error) {
    console.log(`Get profile error: ${error}`);
    return c.json({ error: 'Failed to get profile' }, 500);
  }
});

// Generate lesson endpoint - FINAL WORKING VERSION
app.post("/make-server-91c142be/generate-lesson", async (c) => {
  try {
    console.log('Generate lesson endpoint called');
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!user || error) {
      console.log('Authorization error:', error);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    console.log(`Generating lesson for user: ${user.id}`);
    const profile = await kv.get(`profile:${user.id}`);
    const progress = await kv.get(`progress:${user.id}`);

    if (!profile || !progress) {
      console.log('Profile or progress not found');
      return c.json({ error: 'Profile not found' }, 404);
    }

    // Generate lesson using Google Gemini
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) {
      console.log('GEMINI_API_KEY environment variable is not set!');
      return c.json({ error: 'Gemini API key not configured. Please ensure the GEMINI_API_KEY secret is set.' }, 500);
    }

    const stage = profile.currentStage;
    const wordsLearned = progress.wordsLearned || [];
    const mistakes = progress.mistakes || [];

    let prompt = '';
    switch (stage) {
      case 1:
        prompt = `Generate a Spanish vocabulary lesson for absolute beginners. Include:
- 5 simple, common Spanish words with English translations
- Brief pronunciation guide
- Example sentence for each word
- A 3-question multiple choice quiz to test the words

Words already learned: ${wordsLearned.join(', ') || 'none'}
Recent mistakes: ${mistakes.slice(-5).join(', ') || 'none'}

Format as JSON with this structure:
{
  "title": "Lesson title",
  "stage": 1,
  "content": [
    {"word": "spanish word", "translation": "english", "pronunciation": "guide", "example": "sentence"}
  ],
  "quiz": [
    {"question": "text", "options": ["a", "b", "c", "d"], "correct": 0}
  ]
}`;
        break;
      case 2:
        prompt = `Generate a Spanish phrase lesson for beginners. Include:
- 5 simple, useful phrases with translations
- Context for when to use each phrase
- Brief pronunciation guide
- A 3-question quiz (multiple choice or fill-in-the-blank)

Words already learned: ${wordsLearned.join(', ') || 'none'}
Recent mistakes: ${mistakes.slice(-5).join(', ') || 'none'}

Format as JSON with this structure:
{
  "title": "Lesson title",
  "stage": 2,
  "content": [
    {"phrase": "spanish phrase", "translation": "english", "pronunciation": "guide", "context": "when to use"}
  ],
  "quiz": [
    {"question": "text", "options": ["a", "b", "c", "d"], "correct": 0}
  ]
}`;
        break;
      case 3:
        prompt = `Generate a Spanish sentence construction lesson. Include:
- 5 basic sentence patterns with examples
- Grammar explanation (simple)
- Translation and breakdown
- A 4-question quiz testing sentence construction

Words already learned: ${wordsLearned.join(', ') || 'none'}
Recent mistakes: ${mistakes.slice(-5).join(', ') || 'none'}

Format as JSON with this structure:
{
  "title": "Lesson title",
  "stage": 3,
  "content": [
    {"pattern": "sentence pattern", "example": "spanish example", "translation": "english", "explanation": "simple grammar note"}
  ],
  "quiz": [
    {"question": "text", "options": ["a", "b", "c", "d"], "correct": 0}
  ]
}`;
        break;
      case 4:
        prompt = `Generate a Spanish dialogue lesson. Include:
- A short conversation (4-6 exchanges) between two people
- Translation for each line
- Context (where this conversation happens)
- A 4-question comprehension quiz

Words already learned: ${wordsLearned.join(', ') || 'none'}
Recent mistakes: ${mistakes.slice(-5).join(', ') || 'none'}

Format as JSON with this structure:
{
  "title": "Lesson title",
  "stage": 4,
  "content": {
    "context": "setting description",
    "dialogue": [
      {"speaker": "Person A", "spanish": "text", "english": "translation"}
    ]
  },
  "quiz": [
    {"question": "text", "options": ["a", "b", "c", "d"], "correct": 0}
  ]
}`;
        break;
      case 5:
        prompt = `Generate a topic-based Spanish lesson. Choose one topic: hobbies, school, food, travel, or family. Include:
- 8-10 vocabulary words related to the topic
- 3-4 useful phrases
- A short paragraph using the vocabulary
- A 5-question comprehensive quiz

Words already learned: ${wordsLearned.join(', ') || 'none'}
Recent mistakes: ${mistakes.slice(-5).join(', ') || 'none'}

Format as JSON with this structure:
{
  "title": "Lesson title",
  "stage": 5,
  "topic": "topic name",
  "content": {
    "vocabulary": [{"word": "spanish", "translation": "english"}],
    "phrases": [{"phrase": "spanish", "translation": "english"}],
    "paragraph": {"spanish": "text", "english": "translation"}
  },
  "quiz": [
    {"question": "text", "options": ["a", "b", "c", "d"], "correct": 0}
  ]
}`;
        break;
      default:
        prompt = `Generate a review lesson combining all Spanish learning stages.`;
    }

    console.log(`Generating lesson for stage ${stage}...`);
    
    // Format prompt for Gemini
    const fullPrompt = `You are a Spanish language teacher creating adaptive lessons. ${prompt}\n\nIMPORTANT: Respond with ONLY valid JSON, no other text. Do not use markdown code blocks.`;
    
    // Use the CORRECT model that you have access to
    const model = 'gemini-2.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
    
    console.log(`Using model: ${model}`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: fullPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`Gemini API error (status ${response.status}): ${errorText}`);
      return c.json({ error: `Failed to generate lesson from AI: ${response.status} - ${errorText}` }, 500);
    }

    const data = await response.json();
    console.log('Gemini response received');
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
      console.log('Invalid Gemini response structure:', JSON.stringify(data));
      return c.json({ error: 'Invalid response from AI' }, 500);
    }
    
    let responseText = data.candidates[0].content.parts[0].text;
    
    console.log('Raw AI response:', responseText);
    
    // Remove markdown code blocks if present
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    console.log('Cleaned response:', responseText);
    
    const lessonContent = JSON.parse(responseText);
    console.log('Lesson generated successfully for stage', stage);

    // Save lesson
    const lessonId = `lesson:${user.id}:${Date.now()}`;
    await kv.set(lessonId, {
      userId: user.id,
      stage,
      content: lessonContent,
      createdAt: new Date().toISOString()
    });

    return c.json({ lessonId, lesson: lessonContent });
  } catch (error) {
    console.log(`Generate lesson error: ${error}`);
    console.log(`Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
    return c.json({ error: `Failed to generate lesson: ${error instanceof Error ? error.message : String(error)}` }, 500);
  }
});

// Submit quiz endpoint
app.post("/make-server-91c142be/submit-quiz", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!user || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { lessonId, answers } = await c.req.json();
    
    const lesson = await kv.get(lessonId);
    if (!lesson) {
      return c.json({ error: 'Lesson not found' }, 404);
    }

    // Calculate score
    const quiz = lesson.content.quiz;
    let correct = 0;
    const results = [];

    for (let i = 0; i < quiz.length; i++) {
      const isCorrect = answers[i] === quiz[i].correct;
      if (isCorrect) correct++;
      results.push({
        question: quiz[i].question,
        userAnswer: answers[i],
        correctAnswer: quiz[i].correct,
        isCorrect
      });
    }

    const score = (correct / quiz.length) * 100;

    // Save quiz result
    const resultId = `quiz_result:${user.id}:${Date.now()}`;
    await kv.set(resultId, {
      userId: user.id,
      lessonId,
      score,
      answers,
      results,
      timestamp: new Date().toISOString()
    });

    // Update profile and progress
    const profile = await kv.get(`profile:${user.id}`);
    const progress = await kv.get(`progress:${user.id}`);

    if (profile && progress) {
      profile.lessonsCompleted += 1;
      
      // Calculate new overall accuracy
      const totalAccuracy = profile.overallAccuracy * (profile.lessonsCompleted - 1);
      profile.overallAccuracy = (totalAccuracy + score) / profile.lessonsCompleted;

      // Update stage if score is high enough
      if (score >= 75 && profile.currentStage < 5) {
        profile.currentStage += 1;
      }
      
      await kv.set(`profile:${user.id}`, profile)
    
      // Update progress
      progress.completedLessons.push(lessonId);
      
      // Add words learned (extract from lesson content)
      if (lesson.content.content) {
        if (Array.isArray(lesson.content.content)) {
          for (const item of lesson.content.content) {
            if (item.word && !progress.wordsLearned.includes(item.word)) {
              progress.wordsLearned.push(item.word);
            }
          }
        }
      }

      // Track mistakes
      for (const result of results) {
        if (!result.isCorrect) {
          progress.mistakes.push({
            question: result.question,
            timestamp: new Date().toISOString()
          });
        }
      }

      await kv.set(`progress:${user.id}`, progress);
    }

    return c.json({ 
      score, 
      results,
      passed: score >= 75,
      newStage: profile?.currentStage 
    });
  } catch (error) {
    console.log(`Submit quiz error: ${error}`);
    return c.json({ error: 'Failed to submit quiz' }, 500);
  }
});

// Get progress endpoint
app.get("/make-server-91c142be/progress", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!user || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profile = await kv.get(`profile:${user.id}`);
    const progress = await kv.get(`progress:${user.id}`);

    // Get recent quiz results
    const allKeys = await kv.getByPrefix(`quiz_result:${user.id}:`);
    const quizResults = allKeys.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ).slice(0, 10);

    return c.json({ 
      profile, 
      progress,
      recentQuizzes: quizResults
    });
  } catch (error) {
    console.log(`Get progress error: ${error}`);
    return c.json({ error: 'Failed to get progress' }, 500);
  }
});

Deno.serve(app.fetch);
