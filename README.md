# 🧠 PageMind - Real-Time Collaborative Web Summarization

[![Redis](https://img.shields.io/badge/Redis-8-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white)](https://chrome.google.com)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

> Transform how teams consume web content with AI-powered summarization and Redis-powered real-time collaboration.

## 🚀 Features

- **⚡ Lightning-Fast Summaries**: Redis caching reduces response time from 3-5 seconds to <50ms
- **👥 Team Collaboration**: Create rooms and share summaries in real-time
- **🌍 Multi-Language Support**: Generate summaries in 7 different languages
- **💰 Cost-Effective**: 90% reduction in AI API calls through intelligent caching
- **📊 Smart History**: One-click access to previously summarized pages
- **🎨 Beautiful UI**: Clean, modern interface with markdown rendering

## 🏗️ Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│ Chrome Extension│  HTTP   │  Node.js Backend │  Redis  │   Redis Cloud   │
│                 ├────────▶│                  ├────────▶│                 │
│  PageMind UI    │         │  Express + AI    │         │  Cache Layer    │
└─────────────────┘         └──────────────────┘         └─────────────────┘
```

## 📦 Project Structure

```
pagemind/
├── pagemind-extension/     # Chrome extension
│   ├── manifest.json       # Extension configuration
│   ├── popup/             # Extension UI
│   ├── background/        # Service worker
│   └── content/           # Content scripts
├── pagemind-backend/      # Node.js backend
│   ├── server.js          # Express server with Redis
│   ├── package.json       # Dependencies
│   └── .env.example       # Environment variables template
└── railway.json           # Railway deployment config
```

## 🛠️ Installation

### Prerequisites

- Node.js 18+
- Redis Cloud account (free tier works)
- Google Gemini API key
- Chrome browser

### Backend Setup

1. Clone the repository:
```bash
git clone https://github.com/depapp/pagemind.git
cd pagemind
```

2. Install backend dependencies:
```bash
cd pagemind-backend
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your Redis and Gemini credentials
```

4. Start the backend:
```bash
npm start
```

### Extension Setup

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `pagemind-extension` folder
5. The PageMind icon should appear in your toolbar

## 🚀 Deployment

### Deploy Backend to Railway

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login and initialize:
```bash
railway login
railway init
```

3. Set environment variables:
```bash
railway variables set REDIS_HOST=your-redis-host
railway variables set REDIS_PORT=your-redis-port
railway variables set REDIS_PASSWORD=your-redis-password
railway variables set GEMINI_API_KEY=your-gemini-key
```

4. Deploy:
```bash
railway up
```

### Publish Extension

1. Update `manifest.json` with your backend URL
2. Create a zip of the `pagemind-extension` folder
3. Upload to Chrome Web Store Developer Dashboard

## 🔧 Configuration

### Redis Setup

PageMind uses Redis for:
- **Hashes**: Store structured summary data
- **Sets**: Manage room memberships
- **Sorted Sets**: Maintain chronological history
- **Strings**: Performance metrics counters

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `REDIS_HOST` | Redis Cloud host | Yes |
| `REDIS_PORT` | Redis port (usually 16379) | Yes |
| `REDIS_PASSWORD` | Redis password | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `PORT` | Server port (default: 3000) | No |

## 📊 Performance

With Redis caching, PageMind achieves:
- **98% faster** response times for cached content
- **90% reduction** in AI API costs
- **85-95%** cache hit rate in production
- Support for **1000+ concurrent users**

---

<p align="center">Made with ❤️ and Redis</p>
