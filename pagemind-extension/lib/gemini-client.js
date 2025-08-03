// Gemini API client wrapper
export class GeminiClient {
  constructor() {
    this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
  }

  async getApiKey() {
    const result = await chrome.storage.local.get(['geminiApiKey']);
    if (!result.geminiApiKey) {
      throw new Error('Gemini API key not configured. Please set your API key in the extension settings.');
    }
    return result.geminiApiKey;
  }

  async summarizePage(content, options = {}) {
    const {
      maxLength = 'medium', // 'brief', 'medium', 'detailed'
      language = 'en',
      focusAreas = []
    } = options;

    const lengthInstructions = {
      brief: 'Provide a very concise summary in 2-3 sentences.',
      medium: 'Provide a comprehensive summary in 1-2 paragraphs.',
      detailed: 'Provide a detailed summary with key points and main ideas.'
    };

    const prompt = this.buildPrompt(content, lengthInstructions[maxLength], language, focusAreas);

    try {
      const apiKey = await this.getApiKey();
      const response = await fetch(`${this.apiUrl}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: maxLength === 'brief' ? 150 : maxLength === 'medium' ? 300 : 500,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No summary generated');
      }

      const summary = data.candidates[0].content.parts[0].text;
      
      // Extract key points if detailed summary
      let keyPoints = [];
      if (maxLength === 'detailed') {
        keyPoints = this.extractKeyPoints(summary);
      }

      return {
        summary: summary.trim(),
        keyPoints,
        language,
        summaryLength: maxLength,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`Failed to generate summary: ${error.message}`);
    }
  }

  buildPrompt(content, lengthInstruction, language, focusAreas) {
    let prompt = `Please summarize the following web page content. ${lengthInstruction}\n\n`;
    
    if (language !== 'en') {
      prompt += `Provide the summary in ${this.getLanguageName(language)}.\n\n`;
    }
    
    if (focusAreas.length > 0) {
      prompt += `Focus particularly on: ${focusAreas.join(', ')}.\n\n`;
    }
    
    prompt += `Web page content:\n\n${content}\n\n`;
    prompt += `Summary:`;
    
    return prompt;
  }

  extractKeyPoints(summary) {
    // Simple extraction of key points from summary
    const lines = summary.split('\n').filter(line => line.trim());
    const keyPoints = [];
    
    for (const line of lines) {
      // Look for bullet points, numbered lists, or key phrases
      if (line.match(/^[\-\*•]\s+/) || line.match(/^\d+\.\s+/) || line.includes('key') || line.includes('important')) {
        keyPoints.push(line.replace(/^[\-\*•\d\.]\s+/, '').trim());
      }
    }
    
    // If no explicit points found, extract first few sentences
    if (keyPoints.length === 0) {
      const sentences = summary.match(/[^.!?]+[.!?]+/g) || [];
      keyPoints.push(...sentences.slice(0, 3).map(s => s.trim()));
    }
    
    return keyPoints.slice(0, 5); // Limit to 5 key points
  }

  getLanguageName(code) {
    const languages = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'id': 'Indonesian'
    };
    return languages[code] || 'English';
  }

  // Rate limiting helper
  static rateLimiter = {
    lastCall: 0,
    minInterval: 1000, // 1 second between calls
    
    async throttle() {
      const now = Date.now();
      const timeSinceLastCall = now - this.lastCall;
      
      if (timeSinceLastCall < this.minInterval) {
        await new Promise(resolve => setTimeout(resolve, this.minInterval - timeSinceLastCall));
      }
      
      this.lastCall = Date.now();
    }
  };

  async summarizePageWithRateLimit(content, options) {
    await GeminiClient.rateLimiter.throttle();
    return this.summarizePage(content, options);
  }
}

// Export singleton instance
export const geminiClient = new GeminiClient();
