import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

async function startServer() {
  const app = express();
  const port = process.env.PORT || 3000;

  app.use(express.json());

  // API Route: Game Event Receiver & AI Referee
  app.post('/api/game-event', async (req, res) => {
    try {
      const eventData = req.body;
      const { status, word, guessedLetter, correctLetter, lives, score, level, isBoss } = eventData;

      let winStatusText = 'IN_PROGRESS';
      let message = '';

      if (status === 'WIN') {
        winStatusText = 'JEET GAYA (GAME WON 🎉)';
        message = `Player won level ${level}! Word "${word}" was correctly guessed. +10 Score added.`;
      } else if (status === 'WRONG') {
        winStatusText = 'GALAT GUESS (WRONG GUESS ❌)';
        message = `Player made a wrong guess with "${guessedLetter}". Correct letter was "${correctLetter}" in word "${word}". Lives remaining: ${lives}.`;
      } else if (status === 'GAME_OVER') {
        winStatusText = 'HAAR GAYA (GAME OVER 💔)';
        message = `Game Over on word "${word}"! All 3 lives exhausted. Final Score: ${score}.`;
      } else {
        winStatusText = 'KHEL CHALU HAI (IN PROGRESS 🎮)';
        message = `Current game on level ${level} for word "${word}". Lives: ${lives}.`;
      }

      // If GEMINI_API_KEY is available, get intelligent kid-friendly referee commentary
      let commentary = null;
      if (process.env.GEMINI_API_KEY) {
        try {
          const ai = new GoogleGenAI();
          const prompt = `You are a fun and cheering referee for a kids word puzzle game "Guess The Word".
Status: ${status} (${winStatusText})
Word: ${word}
Guessed Letter: ${guessedLetter || 'N/A'}
Correct Letter: ${correctLetter || 'N/A'}
Lives remaining: ${lives}/3
Score: ${score}
Level: ${level}

Give a super energetic, encouraging 1 or 2 sentence commentary in simple Hinglish/English explaining if the game was won (jeet gaya) or wrong guess (galat hua) and what to do next.`;

          const aiRes = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
          });
          commentary = aiRes.text?.trim() || null;
        } catch (aiErr) {
          console.warn('AI referee commentary skipped:', aiErr);
        }
      }

      if (!commentary) {
        if (status === 'WIN') {
          commentary = `🎉 Zabardast! Aapne word "${word}" sahi guess kiya aur jeet gaye! +10 Points mile!`;
        } else if (status === 'WRONG') {
          commentary = `❌ Galat guess! Letter "${guessedLetter}" sahi nahi tha. Dhyan se hint padho aur dubara koshish karo!`;
        } else if (status === 'GAME_OVER') {
          commentary = `💔 Oops! Sari lives khatam ho gayi. Sahi word "${word}" tha. Try Again karke naya match shuru karo!`;
        } else {
          commentary = `🎮 Match chalu hai! Sahi letter chun kar word pura karo!`;
        }
      }

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        status,
        winStatusText,
        word,
        isWin: status === 'WIN',
        isWrong: status === 'WRONG',
        isGameOver: status === 'GAME_OVER',
        livesLeft: lives,
        currentScore: score,
        level,
        isBossLevel: !!isBoss,
        message,
        commentary,
        echoPayload: eventData
      });
    } catch (err: any) {
      console.error('API Error:', err);
      res.status(500).json({ error: err.message || 'Server error' });
    }
  });

  // Mount Vite middlewares in development
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
