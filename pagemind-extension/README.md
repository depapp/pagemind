# PageMind - AI-Powered Page Summarizer Chrome Extension

A Chrome extension that uses Google's Gemini AI to summarize web pages and leverages Redis for intelligent caching and real-time collaboration through room-based sharing.

## 🏆 Redis "Real-Time AI Innovators" Challenge Submission

This project demonstrates innovative use of Redis as a real-time data layer for AI applications, showcasing:
- **Semantic Caching**: Reduces API calls by caching AI-generated summaries
- **Real-time Collaboration**: Room-based system for sharing summaries instantly
- **Performance Optimization**: Lightning-fast cache retrieval for previously summarized pages

## 🚀 Features

### Core Features
- **AI-Powered Summarization**: Uses Google Gemini to generate intelligent page summaries
- **Smart Redis Caching**: Caches summaries to avoid redundant API calls
- **Room-Based Sharing**: Create/join rooms to share summaries with others in real-time
- **Multiple Summary Lengths**: Choose between brief, medium, or detailed summaries
- **Multi-language Support**: Summarize in 10+ languages
- **Export Options**: Download summaries as Markdown files

### Technical Highlights
- **URL Hashing**: Efficient cache key generation for consistent lookups
- **TTL Management**: 7-day cache expiration for fresh content
- **Chrome Storage Fallback**: Graceful degradation when Redis is unavailable
- **Content Extraction**: Smart algorithm to extract main content from web pages
- **Dark Mode**: Full theme support for better accessibility

## 🛠️ Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **AI**: Google Gemini API
- **Caching**: Redis Cloud
- **Browser**: Chrome Extension Manifest V3
- **Architecture**: Service Worker + Content Scripts

## 📦 Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/pagemind-extension.git
cd pagemind-extension
```

2. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `pagemind-extension` directory

3. The PageMind icon will appear in your Chrome toolbar!

## 🔧 Configuration

The extension requires users to provide their own Google Gemini API key:

1. Get your free API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. The extension will prompt you to enter your API key when you first create or join a room
3. Your API key is stored securely in Chrome's local storage

Note: Redis Cloud credentials are pre-configured for the challenge demo. In production, you would set up your own Redis instance.

## 💡 Usage

### Getting Started
1. Click the PageMind icon in Chrome (opens as a side panel on the right)
2. Choose to either:
   - **Create New Room**: Start your own room for sharing summaries
   - **Join Existing Room**: Enter a 6-character room ID to join

3. Enter your Gemini API key when prompted (first time only)
4. Start summarizing pages!

### Summarizing Pages
1. Navigate to any webpage you want to summarize
2. In the PageMind side panel, click "Summarize Page"
3. Choose summary length (brief/medium/detailed)
4. View your AI-generated summary
5. Copy or export the summary as Markdown

### Room Collaboration
- **Room ID**: Share your 6-character room ID with others
- **Shared Summaries**: All room members see summaries in real-time
- **Click to Open**: Click any summary in the room list to open the original page
- **Leave Room**: Exit a room to create or join a different one

### Settings
- Change summary language (10+ languages supported)
- Enable auto-summarization for new pages
- Toggle dark mode for comfortable viewing

## 🏗️ Architecture

### Data Flow
1. **Content Extraction**: Content script extracts page text
2. **Cache Check**: Background worker checks Redis for existing summary
3. **AI Generation**: If not cached, Gemini API generates summary
4. **Cache Storage**: Summary stored in Redis with URL hash as key
5. **Room Broadcast**: Summary shared with room members
6. **UI Update**: Popup displays summary with cache indicator

### Redis Schema
```javascript
// Summary Cache
"summary:{url_hash}": {
  url, title, summary, timestamp, summarizedBy
}

// Room Management  
"room:{room_id}": {
  created, creator, members[], summaries[]
}
```

## 🎯 Judging Criteria Alignment

### Use of Underlying Technology
- Redis used for caching, room management, and real-time updates
- Demonstrates semantic caching to optimize LLM performance
- Shows Redis as a critical component for AI application scalability

### Usability and User Experience
- Clean, intuitive interface with smooth animations
- One-click summarization with visual feedback
- Room system makes sharing effortless
- Cache indicators show performance benefits

### Accessibility
- Full keyboard navigation support
- Screen reader friendly
- High contrast mode
- Adjustable font sizes
- Multi-language support

### Creativity
- Novel approach to collaborative AI summaries
- Room-based sharing system
- Smart content extraction algorithm
- Elegant fallback mechanisms

## 🚧 Future Enhancements

- WebSocket integration for true real-time updates
- Redis Streams for summary history
- Vector embeddings for semantic search
- Browser sync across devices
- Summary analytics dashboard

## 📄 License

MIT License - feel free to use this project as inspiration for your own Redis-powered applications!

## 🙏 Acknowledgments

- Redis for the amazing challenge and platform
- Google Gemini for powerful AI capabilities
- The Chrome Extensions team for excellent documentation

---

Built with ❤️ for the Redis "Real-Time AI Innovators" Challenge
