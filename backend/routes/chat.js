const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const OpenAI = require('openai');

// Konfigurer multer til at gemme filer i hukommelsen
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB max
  },
  fileFilter: (req, file, cb) => {
    // Tillad kun audio filer
    const allowedMimes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 
      'audio/ogg', 'audio/m4a', 'audio/aac', 'audio/flac'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Kun lydfiler er tilladt (mp3, wav, webm, ogg, m4a, aac, flac)'));
    }
  }
});

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.warn('⚠️  OPENAI_API_KEY mangler i environment variabler');
}

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// Chat endpoint med support for både tekst og lydfiler
router.post('/message', upload.single('audio'), async (req, res) => {
  try {
    if (!OPENAI_API_KEY || !openai) {
      return res.status(500).json({ 
        error: 'OpenAI API nøgle er ikke konfigureret',
        message: 'Kontakt administrator'
      });
    }

    const { message = '', history: historyStr = '[]' } = req.body;
    const audioFile = req.file;

    // Parse history fra JSON string (når sendt via FormData)
    let history = [];
    try {
      history = typeof historyStr === 'string' ? JSON.parse(historyStr) : historyStr;
      if (!Array.isArray(history)) {
        history = [];
      }
    } catch (err) {
      console.warn('Fejl ved parsing af historie:', err);
      history = [];
    }

    // Valider at der er enten tekst eller lydfil
    if (!message.trim() && !audioFile) {
      return res.status(400).json({ error: 'Besked eller lydfil er påkrævet' });
    }

    // Konverter historie til OpenAI format
    const messages = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content || (msg.parts && msg.parts[0]?.text) || ''
    }));

    // Tilføj nuværende besked
    if (message.trim()) {
      messages.push({
        role: 'user',
        content: message
      });
    }

    // Hvis der er en lydfil, brug Whisper API til at transkribere først
    if (audioFile) {
      try {
        // Opret en ReadStream fra buffer til OpenAI API
        const audioStream = Readable.from(audioFile.buffer);
        
        // Opret File-like objekt med stream
        const audioFileObj = {
          name: 'audio.mp3',
          type: audioFile.mimetype || 'audio/mpeg',
          stream: () => audioStream
        };
        
        // Transkriber lydfil med Whisper
        const transcription = await openai.audio.transcriptions.create({
          file: audioFileObj,
          model: 'whisper-1',
          language: 'da'
        });

        // Tilføj transkription til messages
        messages.push({
          role: 'user',
          content: transcription.text
        });
      } catch (transcribeError) {
        console.error('Fejl ved transkription:', transcribeError);
        return res.status(500).json({
          error: 'Fejl ved transkription af lydfil',
          message: transcribeError.message || 'Kunne ikke transkribere lydfil'
        });
      }
    }

    // Send besked til OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000
    });

    const responseText = completion.choices[0]?.message?.content || 'Ingen respons modtaget';

    res.json({
      message: responseText,
      success: true
    });

  } catch (error) {
    console.error('OpenAI API fejl:', error);
    console.error('Fejl detaljer:', {
      message: error.message,
      status: error.status,
      statusText: error.statusText
    });
    
    // Bedre fejlhåndtering
    if (error.message && (error.message.includes('API_KEY') || error.message.includes('Invalid API key'))) {
      return res.status(401).json({ 
        error: 'Ugyldig API nøgle',
        message: 'Kontakt administrator'
      });
    }

    // Håndter 429 fejl (quota exceeded)
    if (error.status === 429 || error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('rate limit')) {
      return res.status(429).json({ 
        error: 'API kvote overskredet',
        message: 'Du har nået din API kvote. Vent et øjeblik eller opgrader din plan.',
        retryAfter: 60
      });
    }

    // Håndter 404 fejl (model ikke fundet)
    if (error.status === 404 || error.message?.includes('404') || error.message?.includes('not found')) {
      return res.status(500).json({ 
        error: 'Model ikke fundet',
        message: `Modellen kunne ikke findes. Fejl: ${error.message || '404 Not Found'}`
      });
    }

    res.status(500).json({ 
      error: 'Fejl ved kommunikation med AI',
      message: error.message || error.statusText || 'Ukendt fejl'
    });
  }
});

// Health check for chat service
router.get('/health', (req, res) => {
  res.json({ 
    status: OPENAI_API_KEY ? 'ok' : 'error',
    configured: !!OPENAI_API_KEY,
    message: OPENAI_API_KEY ? 'Chat service er klar' : 'OpenAI API nøgle mangler'
  });
});

module.exports = router;
