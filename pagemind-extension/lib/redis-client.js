// Redis client wrapper for Chrome extension
export class RedisClient {
  constructor() {
    this.config = {
      username: 'default',
      password: 'tsfnZJyk1yuhHmSbZiqk7233xCNbnNUY',
      host: 'redis-14495.c8.us-east-1-2.ec2.redns.redis-cloud.com',
      port: 14495
    };
    this.baseUrl = `https://${this.config.host}:${this.config.port}`;
  }

  // Since we can't use native Redis client in browser, we'll use Redis REST API
  async executeCommand(command, args = []) {
    try {
      // For Redis Cloud, we'll need to use their REST API or implement a proxy server
      // For now, we'll implement a simple key-value store using Chrome storage as fallback
      // In production, you'd want to set up a backend proxy for Redis operations
      
      // Simulating Redis operations with Chrome storage for MVP
      return await this.simulateRedisWithStorage(command, args);
    } catch (error) {
      console.error('Redis operation failed:', error);
      throw error;
    }
  }

  // Simulate Redis operations using Chrome storage
  async simulateRedisWithStorage(command, args) {
    const storage = chrome.storage.local;
    
    switch (command.toUpperCase()) {
      case 'GET':
        const getResult = await storage.get(args[0]);
        return getResult[args[0]] || null;
        
      case 'SET':
        const setData = {};
        setData[args[0]] = args[1];
        await storage.set(setData);
        return 'OK';
        
      case 'HGET':
        const hgetResult = await storage.get(args[0]);
        const hgetData = hgetResult[args[0]];
        return hgetData ? hgetData[args[1]] : null;
        
      case 'HSET':
        const hsetResult = await storage.get(args[0]);
        const hsetData = hsetResult[args[0]] || {};
        hsetData[args[1]] = args[2];
        const hsetUpdate = {};
        hsetUpdate[args[0]] = hsetData;
        await storage.set(hsetUpdate);
        return 1;
        
      case 'SADD':
        const saddResult = await storage.get(args[0]);
        const set = new Set(saddResult[args[0]] || []);
        set.add(args[1]);
        const saddUpdate = {};
        saddUpdate[args[0]] = Array.from(set);
        await storage.set(saddUpdate);
        return 1;
        
      case 'SMEMBERS':
        const smembersResult = await storage.get(args[0]);
        return smembersResult[args[0]] || [];
        
      default:
        throw new Error(`Unsupported Redis command: ${command}`);
    }
  }

  // Cache operations
  async getCachedSummary(urlHash) {
    const key = `summary:${urlHash}`;
    const cached = await this.executeCommand('GET', [key]);
    return cached ? JSON.parse(cached) : null;
  }

  async setCachedSummary(urlHash, summaryData) {
    const key = `summary:${urlHash}`;
    const value = JSON.stringify(summaryData);
    // Set with 7 days TTL (simulated)
    await this.executeCommand('SET', [key, value]);
    
    // Store expiration separately
    const expiryKey = `${key}:expiry`;
    const expiryTime = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
    await this.executeCommand('SET', [expiryKey, expiryTime.toString()]);
  }

  // Room operations
  async createRoom(roomId, userId) {
    const roomKey = `room:${roomId}`;
    const roomData = {
      created: new Date().toISOString(),
      creator: userId,
      members: [userId],
      summaries: []
    };
    await this.executeCommand('SET', [roomKey, JSON.stringify(roomData)]);
    return roomData;
  }

  async joinRoom(roomId, userId) {
    const roomKey = `room:${roomId}`;
    const roomData = await this.executeCommand('GET', [roomKey]);
    
    if (!roomData) {
      throw new Error('Room not found');
    }
    
    const room = JSON.parse(roomData);
    if (!room.members.includes(userId)) {
      room.members.push(userId);
      await this.executeCommand('SET', [roomKey, JSON.stringify(room)]);
    }
    
    return room;
  }

  async addSummaryToRoom(roomId, urlHash) {
    const roomKey = `room:${roomId}`;
    const roomData = await this.executeCommand('GET', [roomKey]);
    
    if (!roomData) {
      throw new Error('Room not found');
    }
    
    const room = JSON.parse(roomData);
    if (!room.summaries.includes(urlHash)) {
      room.summaries.push(urlHash);
      await this.executeCommand('SET', [roomKey, JSON.stringify(room)]);
    }
    
    return room;
  }

  async getRoomSummaries(roomId) {
    const roomKey = `room:${roomId}`;
    const roomData = await this.executeCommand('GET', [roomKey]);
    
    if (!roomData) {
      throw new Error('Room not found');
    }
    
    const room = JSON.parse(roomData);
    const summaries = [];
    
    for (const urlHash of room.summaries) {
      const summary = await this.getCachedSummary(urlHash);
      if (summary) {
        summaries.push(summary);
      }
    }
    
    return summaries;
  }

  // Utility function to check and clean expired entries
  async cleanExpiredEntries() {
    const allKeys = await chrome.storage.local.get(null);
    const now = Date.now();
    
    for (const key in allKeys) {
      if (key.endsWith(':expiry')) {
        const expiryTime = parseInt(allKeys[key]);
        if (expiryTime < now) {
          const dataKey = key.replace(':expiry', '');
          await chrome.storage.local.remove([dataKey, key]);
        }
      }
    }
  }
}

// Export singleton instance
export const redisClient = new RedisClient();
