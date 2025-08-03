const express = require('express');
const cors = require('cors');
const redis = require('redis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Redis client
const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  },
  password: process.env.REDIS_PASSWORD
});

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Connect to Redis
redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Connected to Redis Cloud'));

(async () => {
  await redisClient.connect();
})();

// Helper function to generate URL hash
function hashUrl(url) {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', redis: redisClient.isReady });
});

// Create or join room
app.post('/api/rooms', async (req, res) => {
  try {
    const { roomId, userId, action, apiKey } = req.body;
    
    if (action === 'create') {
      // Create new room with API key
      const roomData = {
        created: new Date().toISOString(),
        creator: userId,
        members: [userId]
      };
      
      const roomFields = {
        created: roomData.created,
        creator: roomData.creator
      };
      
      // Store API key if provided
      if (apiKey) {
        roomFields.apiKey = apiKey;
      }
      
      await redisClient.hSet(`room:${roomId}`, roomFields);
      await redisClient.sAdd(`room:${roomId}:members`, userId);
      await redisClient.sAdd(`user:${userId}:rooms`, roomId);
      
      res.json({ success: true, roomId, ...roomData, hasApiKey: !!apiKey });
    } else if (action === 'join') {
      // Check if room exists
      const roomExists = await redisClient.exists(`room:${roomId}`);
      if (!roomExists) {
        return res.status(404).json({ success: false, error: 'Room not found' });
      }
      
      // Add user to room
      await redisClient.sAdd(`room:${roomId}:members`, userId);
      await redisClient.sAdd(`user:${userId}:rooms`, roomId);
      
      // Get room data
      const roomData = await redisClient.hGetAll(`room:${roomId}`);
      const members = await redisClient.sMembers(`room:${roomId}:members`);
      
      // Don't send the actual API key, just indicate if it exists
      const responseData = {
        success: true, 
        roomId,
        created: roomData.created,
        creator: roomData.creator,
        hasApiKey: !!roomData.apiKey,
        members 
      };
      
      res.json(responseData);
    }
  } catch (error) {
    console.error('Room error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get room summaries
app.get('/api/rooms/:roomId/summaries', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // Get all summary IDs for this room (sorted by timestamp)
    const summaryIds = await redisClient.zRange(
      `room:${roomId}:summaries`, 
      0, 
      -1, 
      { REV: true }
    );
    
    // Get all summaries
    const summaries = [];
    for (const summaryId of summaryIds) {
      const summaryData = await redisClient.hGetAll(`summary:${summaryId}`);
      if (summaryData && Object.keys(summaryData).length > 0) {
        // Parse JSON fields
        if (summaryData.keyPoints) {
          summaryData.keyPoints = JSON.parse(summaryData.keyPoints);
        }
        summaries.push(summaryData);
      }
    }
    
    res.json({ success: true, summaries });
  } catch (error) {
    console.error('Get summaries error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create or get summary
app.post('/api/summaries', async (req, res) => {
  try {
    const { url, title, content, roomId, userId, summaryLength = 'medium', language = 'en' } = req.body;
    const urlHash = hashUrl(url);
    const summaryKey = `summary:${urlHash}`;
    
    // Check if summary exists in cache
    const cachedSummary = await redisClient.hGetAll(summaryKey);
    if (cachedSummary && Object.keys(cachedSummary).length > 0) {
      console.log('Cache hit for URL:', url);
      
      // Parse JSON fields
      if (cachedSummary.keyPoints) {
        cachedSummary.keyPoints = JSON.parse(cachedSummary.keyPoints);
      }
      
      // Convert fromCache string back to boolean
      if (cachedSummary.fromCache) {
        cachedSummary.fromCache = cachedSummary.fromCache === 'true';
      }
      
      // Add to room if not already there
      if (roomId) {
        const score = new Date(cachedSummary.timestamp).getTime();
        await redisClient.zAdd(`room:${roomId}:summaries`, {
          score: score,
          value: urlHash
        });
      }
      
      // Track cache hit
      await redisClient.incr('metrics:cache_hits');
      
      res.json({ 
        success: true, 
        data: { ...cachedSummary, fromCache: true }
      });
      return;
    }
    
    // Track cache miss
    await redisClient.incr('metrics:cache_misses');
    
    // Get room's API key if roomId is provided
    let apiKeyToUse = process.env.GEMINI_API_KEY; // Default to backend key
    
    if (roomId) {
      const roomData = await redisClient.hGetAll(`room:${roomId}`);
      if (roomData.apiKey) {
        apiKeyToUse = roomData.apiKey;
        console.log('Using room API key for room:', roomId);
      } else {
        return res.status(400).json({ 
          success: false, 
          error: 'Room does not have an API key configured' 
        });
      }
    }
    
    // Generate new summary using Gemini
    console.log('Generating new summary for:', url);
    
    try {
      // Create a new GenAI instance with the appropriate API key
      const roomGenAI = new GoogleGenerativeAI(apiKeyToUse);
      const model = roomGenAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      let promptInstructions = '';
      switch (summaryLength) {
        case 'brief':
          promptInstructions = 'Provide a very brief summary (2-3 sentences) of the following content:';
          break;
        case 'detailed':
          promptInstructions = 'Provide a detailed summary with comprehensive analysis of the following content:';
          break;
        default:
          promptInstructions = 'Provide a clear and concise summary of the following content:';
      }
      
      // Add language instruction
      let languageInstruction = '';
      switch (language) {
        case 'id':
          languageInstruction = 'Please provide the summary in Indonesian (Bahasa Indonesia).';
          break;
        case 'es':
          languageInstruction = 'Please provide the summary in Spanish.';
          break;
        case 'fr':
          languageInstruction = 'Please provide the summary in French.';
          break;
        case 'de':
          languageInstruction = 'Please provide the summary in German.';
          break;
        case 'ja':
          languageInstruction = 'Please provide the summary in Japanese.';
          break;
        case 'zh':
          languageInstruction = 'Please provide the summary in Chinese.';
          break;
        default:
          languageInstruction = 'Please provide the summary in English.';
      }
      
      const prompt = `${languageInstruction} ${promptInstructions}\n\n${content}\n\nAlso provide 3-5 key points from the content in a bullet list format.`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const generatedText = response.text();
      
      // Parse the response
      const lines = generatedText.split('\n');
      let summary = '';
      let keyPoints = [];
      let isKeyPoints = false;
      
      for (const line of lines) {
        if (line.toLowerCase().includes('key point') || line.includes('•') || line.includes('-') || line.includes('*')) {
          isKeyPoints = true;
        }
        
        if (!isKeyPoints) {
          summary += line + ' ';
        } else if (line.trim() && (line.includes('•') || line.includes('-') || line.includes('*') || /^\d+\./.test(line))) {
          keyPoints.push(line.replace(/^[\•\-\*\d+\.]\s*/, '').trim());
        }
      }
      
      // Track AI calls
      await redisClient.incr('metrics:ai_calls');
      
      // Create summary data
      const summaryData = {
        url,
        urlHash,
        title,
        summary: summary.trim() || generatedText,
        keyPoints: JSON.stringify(keyPoints.length > 0 ? keyPoints : ['Key insights extracted', 'Important information highlighted', 'Main concepts identified']),
        timestamp: new Date().toISOString(),
        summarizedBy: userId,
        summaryLength,
        fromCache: 'false'  // Convert boolean to string for Redis
      };
      
      // Store in Redis with 7-day expiration
      await redisClient.hSet(summaryKey, summaryData);
      await redisClient.expire(summaryKey, 7 * 24 * 60 * 60); // 7 days
      
      // Add to room
      if (roomId) {
        const score = new Date(summaryData.timestamp).getTime();
        await redisClient.zAdd(`room:${roomId}:summaries`, {
          score: score,
          value: urlHash
        });
      }
      
      // Parse keyPoints back to array for response
      const responseData = {
        ...summaryData,
        keyPoints: JSON.parse(summaryData.keyPoints),
        fromCache: false  // Convert back to boolean for response
      };
      
      res.json({ success: true, data: responseData });
    } catch (aiError) {
      console.error('AI generation error:', aiError);
      
      // Track AI errors
      await redisClient.incr('metrics:ai_errors');
      
      res.status(500).json({ 
        success: false, 
        error: 'Failed to generate AI summary: ' + aiError.message 
      });
    }
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get metrics
app.get('/api/metrics', async (req, res) => {
  try {
    const metrics = {
      cache_hits: await redisClient.get('metrics:cache_hits') || '0',
      cache_misses: await redisClient.get('metrics:cache_misses') || '0',
      ai_calls: await redisClient.get('metrics:ai_calls') || '0',
      ai_errors: await redisClient.get('metrics:ai_errors') || '0',
      total_summaries: await redisClient.dbSize()
    };
    
    res.json({ success: true, metrics });
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PageMind backend running on port ${PORT}`);
  console.log(`Redis host: ${process.env.REDIS_HOST}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await redisClient.quit();
  process.exit(0);
});
