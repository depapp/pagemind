# PageMind Backend - Redis-Powered AI Summary Cache

This is the backend service for PageMind Chrome Extension that uses Redis Cloud for real-time collaborative caching of AI-generated summaries.

## Features

- **Redis Cloud Integration**: Centralized cache for all users
- **Room-based Collaboration**: Share summaries within rooms
- **Cache Optimization**: Reduces Gemini API calls through intelligent caching
- **Real-time Metrics**: Track cache hits, misses, and API usage
- **TTL Management**: Automatic expiration of old summaries

## Redis Data Structures Used

1. **Hashes**: Store summary data
   - `summary:{urlHash}` → Complete summary information

2. **Sets**: Manage room members
   - `room:{roomId}:members` → Set of user IDs in a room
   - `user:{userId}:rooms` → Set of rooms a user belongs to

3. **Sorted Sets**: Order summaries by timestamp
   - `room:{roomId}:summaries` → Summary IDs sorted by creation time

4. **Strings**: Track metrics
   - `metrics:cache_hits`, `metrics:cache_misses`, `metrics:ai_calls`

## Setup Instructions

### 1. Get Redis Cloud Credentials

1. Go to [Redis Cloud](https://app.redislabs.com/)
2. Create a free database
3. From your database dashboard, get:
   - **Endpoint**: (e.g., `redis-12345.c123.us-east-1-2.ec2.cloud.redislabs.com:12345`)
   - **Password**: Your database password

### 2. Configure Environment

Update the `.env` file with your credentials:

```env
# Redis Cloud Configuration
REDIS_HOST=redis-12345.c123.us-east-1-2.ec2.cloud.redislabs.com
REDIS_PORT=12345
REDIS_PASSWORD=your-redis-password

# Server Configuration
PORT=3000

# Gemini API Key
GEMINI_API_KEY=your-gemini-api-key
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Server

```bash
npm start
```

The server will start on `http://localhost:3000`

## API Endpoints

### Health Check
```
GET /health
```

### Create/Join Room
```
POST /api/rooms
Body: {
  "roomId": "ABC123",
  "userId": "user_123",
  "action": "create" | "join"
}
```

### Get Room Summaries
```
GET /api/rooms/:roomId/summaries
```

### Create/Get Summary
```
POST /api/summaries
Body: {
  "url": "https://example.com",
  "title": "Page Title",
  "content": "Page content...",
  "roomId": "ABC123",
  "userId": "user_123",
  "summaryLength": "brief" | "medium" | "detailed"
}
```

### Get Metrics
```
GET /api/metrics
```

## How It Works

1. **First User**: When a user summarizes a page, it:
   - Checks Redis cache first
   - If not found, calls Gemini API
   - Stores result in Redis with 7-day TTL
   - Adds summary to room's sorted set

2. **Second User**: When another user in the same room visits the same page:
   - Redis cache hit - no API call needed!
   - Instant summary retrieval
   - Metrics updated

3. **Room Collaboration**:
   - All room members share the same cache
   - Summaries are ordered by timestamp
   - Real-time synchronization

## Monitoring Redis

You can monitor your Redis usage in the Redis Cloud dashboard:
- View keys and data
- Check memory usage
- Monitor commands/sec
- Track cache hit ratio

## Production Deployment

For production, consider:
- Using environment variables for all configs
- Implementing rate limiting
- Adding authentication
- Setting up proper CORS policies
- Using HTTPS
