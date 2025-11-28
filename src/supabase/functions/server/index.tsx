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
// Generate lesson endpoint - EXPANDED STAGES WITHIN EACH CATEGORY
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
    
    // EXPANDED: Each stage category now has multiple sub-levels
    switch (stage) {
      // ========== VOCABULARY STAGES (1-10) ==========
      case 1:
        prompt = `Generate a SUPER BASIC Spanish vocabulary lesson for absolute beginners. Include:
- 4-5 extremely simple greeting words (hola, adiós, gracias, por favor, sí, no)
- Brief pronunciation guide
- Simple example sentence for each word
- A 3-question multiple choice quiz in ENGLISH

Format as JSON with this structure:
{
  "title": "Basic Greetings",
  "stage": 1,
  "content": [
    {"word": "spanish word", "translation": "english", "pronunciation": "guide", "example": "simple sentence"}
  ],
  "quiz": [
    {"question": "ENGLISH question", "options": ["English A", "English B", "English C", "English D"], "correct": 0}
  ]
}

IMPORTANT: Quiz in ENGLISH only.`;
        break;

      case 2:
        prompt = `Generate a basic Spanish numbers lesson. Include:
- Numbers 1-10 in Spanish
- Brief pronunciation guide  
- Simple examples with numbers
- A 3-question multiple choice quiz in ENGLISH

Format as JSON with this structure:
{
  "title": "Numbers 1-10",
  "stage": 2,
  "content": [
    {"word": "number", "translation": "english", "pronunciation": "guide", "example": "simple example"}
  ],
  "quiz": [
    {"question": "ENGLISH question", "options": ["English A", "English B", "English C", "English D"], "correct": 0}
  ]
}

IMPORTANT: Quiz in ENGLISH only.`;
        break;

      case 3:
        prompt = `Generate a Spanish colors lesson. Include:
- 6 basic colors (red, blue, green, yellow, black, white)
- Brief pronunciation guide
- Simple examples with colors
- A 3-question multiple choice quiz in ENGLISH

Format as JSON with this structure:
{
  "title": "Basic Colors",
  "stage": 3,
  "content": [
    {"word": "color", "translation": "english", "pronunciation": "guide", "example": "simple example"}
  ],
  "quiz": [
    {"question": "ENGLISH question", "options": ["English A", "English B", "English C", "English D"], "correct": 0}
  ]
}

IMPORTANT: Quiz in ENGLISH only.`;
        break;

      case 4:
        prompt = `Generate a Spanish family members lesson. Include:
- 6 basic family terms (mother, father, brother, sister, family, friend)
- Brief pronunciation guide
- Simple examples
- A 3-question multiple choice quiz in ENGLISH

Format as JSON with this structure:
{
  "title": "Family Members",
  "stage": 4,
  "content": [
    {"word": "family term", "translation": "english", "pronunciation": "guide", "example": "simple example"}
  ],
  "quiz": [
    {"question": "ENGLISH question", "options": ["English A", "English B", "English C", "English D"], "correct": 0}
  ]
}

IMPORTANT: Quiz in ENGLISH only.`;
        break;

      case 5:
        prompt = `Generate a Spanish food and drinks lesson. Include:
- 6 common food/drink items (water, bread, milk, apple, coffee, rice)
- Brief pronunciation guide
- Simple examples
- A 3-question multiple choice quiz in ENGLISH

Format as JSON with this structure:
{
  "title": "Food & Drinks",
  "stage": 5,
  "content": [
    {"word": "food/drink", "translation": "english", "pronunciation": "guide", "example": "simple example"}
  ],
  "quiz": [
    {"question": "ENGLISH question", "options": ["English A", "English B", "English C", "English D"], "correct": 0}
  ]
}

IMPORTANT: Quiz in ENGLISH only.`;
        break;

      case 6:
        prompt = `Generate a Spanish animals lesson. Include:
- 6 common animals (dog, cat, bird, fish, horse, cow)
- Brief pronunciation guide
- Simple examples
- A 3-question multiple choice quiz in ENGLISH

Format as JSON with this structure:
{
  "title": "Animals",
  "stage": 6,
  "content": [
    {"word": "animal", "translation": "english", "pronunciation": "guide", "example": "simple example"}
  ],
  "quiz": [
    {"question": "ENGLISH question", "options": ["English A", "English B", "English C", "English D"], "correct": 0}
  ]
}

IMPORTANT: Quiz in ENGLISH only.`;
        break;

      case 7:
        prompt = `Generate a Spanish household items lesson. Include:
- 6 common household items (house, door, window, table, chair, bed)
- Brief pronunciation guide
- Simple examples
- A 3-question multiple choice quiz in ENGLISH

Format as JSON with this structure:
{
  "title": "Household Items",
  "stage": 7,
  "content": [
    {"word": "item", "translation": "english", "pronunciation": "guide", "example": "simple example"}
  ],
  "quiz": [
    {"question": "ENGLISH question", "options": ["English A", "English B", "English C", "English D"], "correct": 0}
  ]
}

IMPORTANT: Quiz in ENGLISH only.`;
        break;

      case 8:
        prompt = `Generate a Spanish clothing lesson. Include:
- 6 clothing items (shirt, pants, shoes, hat, dress, jacket)
- Brief pronunciation guide
- Simple examples
- A 3-question multiple choice quiz in ENGLISH

Format as JSON with this structure:
{
  "title": "Clothing",
  "stage": 8,
  "content": [
    {"word": "clothing", "translation": "english", "pronunciation": "guide", "example": "simple example"}
  ],
  "quiz": [
    {"question": "ENGLISH question", "options": ["English A", "English B", "English C", "English D"], "correct": 0}
  ]
}

IMPORTANT: Quiz in ENGLISH only.`;
        break;

      case 9:
        prompt = `Generate a Spanish weather and seasons lesson. Include:
- 6 weather/seasons terms (sun, rain, hot, cold, summer, winter)
- Brief pronunciation guide
- Simple examples
- A 3-question multiple choice quiz in ENGLISH

Format as JSON with this structure:
{
  "title": "Weather & Seasons",
  "stage": 9,
  "content": [
    {"word": "weather term", "translation": "english", "pronunciation": "guide", "example": "simple example"}
  ],
  "quiz": [
    {"question": "ENGLISH question", "options": ["English A", "English B", "English C", "English D"], "correct": 0}
  ]
}

IMPORTANT: Quiz in ENGLISH only.`;
        break;

      case 10:
        prompt = `Generate a Spanish time and calendar lesson. Include:
- Days of the week
- Basic time words (today, tomorrow, morning, night)
- Brief pronunciation guide
- Simple examples
- A 3-question multiple choice quiz in ENGLISH

Format as JSON with this structure:
{
  "title": "Time & Calendar",
  "stage": 10,
  "content": [
    {"word": "time/calendar", "translation": "english", "pronunciation": "guide", "example": "simple example"}
  ],
  "quiz": [
    {"question": "ENGLISH question", "options": ["English A", "English B", "English C", "English D"], "correct": 0}
  ]
}

IMPORTANT: Quiz in ENGLISH only.`;
        break;

      // ========== PHRASES STAGES (11-15) ==========
      case 11:
        prompt = `Generate a basic Spanish phrases lesson. Include:
- 4-5 simple greeting phrases (Good morning, How are you?, Thank you, You're welcome, Goodbye)
- Brief pronunciation guide
- Context for when to use each phrase
- A 3-question multiple choice quiz in ENGLISH

Format as JSON with this structure:
{
  "title": "Greeting Phrases",
  "stage": 11,
  "content": [
    {"phrase": "spanish phrase", "translation": "english", "pronunciation": "guide", "context": "when to use"}
  ],
  "quiz": [
    {"question": "ENGLISH question", "options": ["English A", "English B", "English C", "English D"], "correct": 0}
  ]
}

IMPORTANT: Quiz in ENGLISH only.`;
        break;

      case 12:
        prompt = `Generate a Spanish polite expressions lesson. Include:
- 4-5 polite phrases (Please, Thank you, Excuse me, I'm sorry, No problem)
- Brief pronunciation guide
- Context for when to use each phrase
- A 3-question multiple choice quiz in ENGLISH

Format as JSON with this structure:
{
  "title": "Polite Expressions",
  "stage": 12,
  "content": [
    {"phrase": "spanish phrase", "translation": "english", "pronunciation": "guide", "context": "when to use"}
  ],
  "quiz": [
    {"question": "ENGLISH question", "options": ["English A", "English B", "English C", "English D"], "correct": 0}
  ]
}

IMPORTANT: Quiz in ENGLISH only.`;
        break;

      case 13:
        prompt = `Generate a Spanish basic questions lesson. Include:
- 4-5 simple questions (What is your name?, How old are you?, Where are you from?, Do you speak English?)
- Brief pronunciation guide
- Context for when to use each phrase
- A 3-question multiple choice quiz in ENGLISH

Format as JSON with this structure:
{
  "title": "Basic Questions",
  "stage": 13,
  "content": [
    {"phrase": "spanish question", "translation": "english", "pronunciation": "guide", "context": "when to use"}
  ],
  "quiz": [
    {"question": "ENGLISH question", "options": ["English A", "English B", "English C", "English D"], "correct": 0}
  ]
}

IMPORTANT: Quiz in ENGLISH only.`;
        break;

      case 14:
        prompt = `Generate a Spanish common expressions lesson. Include:
- 4-5 common expressions (I don't understand, Can you repeat that?, I don't know, That's good, I like it)
- Brief pronunciation guide
- Context for when to use each phrase
- A 3-question multiple choice quiz in ENGLISH

Format as JSON with this structure:
{
  "title": "Common Expressions",
  "stage": 14,
  "content": [
    {"phrase": "spanish expression", "translation": "english", "pronunciation": "guide", "context": "when to use"}
  ],
  "quiz": [
    {"question": "ENGLISH question", "options": ["English A", "English B", "English C", "English D"], "correct": 0}
  ]
}

IMPORTANT: Quiz in ENGLISH only.`;
        break;

      case 15:
        prompt = `Generate a Spanish travel phrases lesson. Include:
- 4-5 travel-related phrases (Where is...?, How much does it cost?, I need help, The bill please, Goodbye)
- Brief pronunciation guide
- Context for when to use each phrase
- A 3-question multiple choice quiz in ENGLISH

Format as JSON with this structure:
{
  "title": "Travel Phrases",
  "stage": 15,
  "content": [
    {"phrase": "spanish phrase", "translation": "english", "pronunciation": "guide", "context": "when to use"}
  ],
  "quiz": [
    {"question": "ENGLISH question", "options": ["English A", "English B", "English C", "English D"], "correct": 0}
  ]
}

IMPORTANT: Quiz in ENGLISH only.`;
        break;

      // ========== SENTENCES STAGES (16-20) ==========
      case 16:
        prompt = `Generate a Spanish basic sentence patterns lesson. Include:
- 4-5 very simple sentence patterns using "I am..." (I am tired, I am happy, I am here)
- Simple grammar explanation
- Translation and breakdown
- A 3-question multiple choice quiz in ENGLISH

Format as JSON with this structure:
{
  "title": "Basic 'I am' Sentences",
  "stage": 16,
  "content": [
    {"pattern": "sentence pattern", "example": "spanish example", "translation": "english", "explanation": "simple grammar"}
  ],
  "quiz": [
    {"question": "ENGLISH question", "options": ["English A", "English B", "English C", "English D"], "correct": 0}
  ]
}

IMPORTANT: Quiz in ENGLISH only.`;
        break;

      case 17:
        prompt = `Generate a Spanish possession sentences lesson. Include:
- 4-5 simple sentences about possession (I have..., You have..., My name is...)
- Simple grammar explanation
- Translation and breakdown
- A 3-question multiple choice quiz in ENGLISH

Format as JSON with this structure:
{
  "title": "Possession Sentences",
  "stage": 17,
  "content": [
    {"pattern": "sentence pattern", "example": "spanish example", "translation": "english", "explanation": "simple grammar"}
  ],
  "quiz": [
    {"question": "ENGLISH question", "options": ["English A", "English B", "English C", "English D"], "correct": 0}
  ]
}

IMPORTANT: Quiz in ENGLISH only.`;
        break;

      case 18:
        prompt = `Generate a Spanish likes/dislikes sentences lesson. Include:
- 4-5 simple sentences about preferences (I like..., I don't like..., I want...)
- Simple grammar explanation
- Translation and breakdown
- A 3-question multiple choice quiz in ENGLISH

Format as JSON with this structure:
{
  "title": "Likes & Dislikes",
  "stage": 18,
  "content": [
    {"pattern": "sentence pattern", "example": "spanish example", "translation": "english", "explanation": "simple grammar"}
  ],
  "quiz": [
    {"question": "ENGLISH question", "options": ["English A", "English B", "English C", "English D"], "correct": 0}
  ]
}

IMPORTANT: Quiz in ENGLISH only.`;
        break;

      case 19:
        prompt = `Generate a Spanish location sentences lesson. Include:
- 4-5 simple sentences about location (I am in..., You are at..., It is on...)
- Simple grammar explanation
- Translation and breakdown
- A 3-question multiple choice quiz in ENGLISH

Format as JSON with this structure:
{
  "title": "Location Sentences",
  "stage": 19,
  "content": [
    {"pattern": "sentence pattern", "example": "spanish example", "translation": "english", "explanation": "simple grammar"}
  ],
  "quiz": [
    {"question": "ENGLISH question", "options": ["English A", "English B", "English C", "English D"], "correct": 0}
  ]
}

IMPORTANT: Quiz in ENGLISH only.`;
        break;

      case 20:
        prompt = `Generate a Spanish daily routine sentences lesson. Include:
- 4-5 simple sentences about daily activities (I eat..., I work..., I sleep...)
- Simple grammar explanation
- Translation and breakdown
- A 3-question multiple choice quiz in ENGLISH

Format as JSON with this structure:
{
  "title": "Daily Routine Sentences",
  "stage": 20,
  "content": [
    {"pattern": "sentence pattern", "example": "spanish example", "translation": "english", "explanation": "simple grammar"}
  ],
  "quiz": [
    {"question": "ENGLISH question", "options": ["English A", "English B", "English C", "English D"], "correct": 0}
  ]
}

IMPORTANT: Quiz in ENGLISH only.`;
        break;

      // ========== DIALOGUES STAGES (21-25) ==========
      case 21:
        prompt = `Generate a Spanish greeting dialogue lesson. Include:
- A very short conversation (2-3 exchanges) between two people meeting
- Translation for each line
- Context (meeting someone new)
- A 3-question comprehension quiz in ENGLISH

Format as JSON with this structure:
{
  "title": "Greeting Dialogue",
  "stage": 21,
  "content": {
    "context": "Two people meeting for the first time",
    "dialogue": [
      {"speaker": "Person A", "spanish": "text", "english": "translation"}
    ]
  },
  "quiz": [
    {"question": "ENGLISH question", "options": ["English A", "English B", "English C", "English D"], "correct": 0}
  ]
}

IMPORTANT: Quiz in ENGLISH only.`;
        break;

      // Add more dialogue stages...
      
      // ========== TOPICS STAGES (26-30) ==========
      case 26:
        prompt = `Generate a topic-based Spanish lesson about food. Include:
- 8-10 food-related vocabulary words
- 3-4 useful phrases about ordering food
- A short paragraph about food preferences
- A 4-question comprehensive quiz in ENGLISH

Format as JSON with this structure:
{
  "title": "Food Topic",
  "stage": 26,
  "topic": "food",
  "content": {
    "vocabulary": [{"word": "spanish", "translation": "english"}],
    "phrases": [{"phrase": "spanish", "translation": "english"}],
    "paragraph": {"spanish": "text", "english": "translation"}
  },
  "quiz": [
    {"question": "ENGLISH question", "options": ["English A", "English B", "English C", "English D"], "correct": 0}
  ]
}

IMPORTANT: Quiz in ENGLISH only.`;
        break;

      // Add more topic stages...

      default:
        // Review stage for anything beyond 30
        prompt = `Generate a Spanish review lesson combining vocabulary from previous stages. Include:
- Review of 8-10 previously learned words/phrases
- Simple practice exercises
- A 5-question comprehensive quiz in ENGLISH

Format as JSON with this structure:
{
  "title": "Spanish Review",
  "stage": ${stage},
  "content": [
    {"word": "review word", "translation": "english", "pronunciation": "guide", "example": "sentence"}
  ],
  "quiz": [
    {"question": "ENGLISH question", "options": ["English A", "English B", "English C", "English D"], "correct": 0}
  ]
}

IMPORTANT: Quiz in ENGLISH only.`;
    }

    console.log(`Generating lesson for stage ${stage}...`);
    
    // Format prompt for Gemini
    const fullPrompt = `You are a Spanish language teacher creating adaptive lessons for complete beginners. ${prompt}\n\nCRITICAL: All quiz questions and answer options MUST be in ENGLISH only. The student doesn't know Spanish yet.\n\nIMPORTANT: Respond with ONLY valid JSON, no other text. Do not use markdown code blocks.`;
    
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
