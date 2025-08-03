// Background service worker for PageMind extension
// Now using Redis backend for real-time collaboration

const BACKEND_URL = 'http://localhost:3000';

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle async operations
  (async () => {
    try {
      switch (request.action) {
        case 'summarizePage':
          const summary = await handleSummarizePage(request.data);
          sendResponse({ success: true, data: summary });
          break;
          
        case 'createRoom':
          const newRoom = await handleCreateRoom(request.apiKey);
          sendResponse({ success: true, data: newRoom });
          break;
          
        case 'joinRoom':
          const joinedRoom = await handleJoinRoom(request.roomId);
          sendResponse({ success: true, data: joinedRoom });
          break;
          
        case 'getRoomSummaries':
          const summaries = await handleGetRoomSummaries(request.roomId);
          sendResponse({ success: true, data: summaries });
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Background error:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();
  
  return true;
});

// Handle page summarization - now using Redis backend
async function handleSummarizePage(pageData) {
  const userId = await getUserId();
  const roomId = await getCurrentRoomId();
  const summaryLength = await getSummaryLength();
  const language = await getLanguage();
  
  try {
    // Call backend API which will check Redis cache first
    const response = await fetch(`${BACKEND_URL}/api/summaries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: pageData.url,
        title: pageData.title,
        content: pageData.content || pageData.title + ' ' + pageData.description,
        roomId: roomId,
        userId: userId,
        summaryLength: summaryLength,
        language: language
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate summary');
    }
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Failed to generate summary:', error);
    throw error;
  }
}

// Room management - now using Redis backend
async function handleCreateRoom(apiKey) {
  const roomId = generateSimpleRoomId();
  const userId = await getUserId();
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomId: roomId,
        userId: userId,
        action: 'create',
        apiKey: apiKey
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create room');
    }
    
    const result = await response.json();
    
    // Save current room ID locally for quick access
    await chrome.storage.local.set({ currentRoomId: roomId });
    
    return result;
  } catch (error) {
    console.error('Failed to create room:', error);
    throw error;
  }
}

async function handleJoinRoom(roomId) {
  const userId = await getUserId();
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomId: roomId,
        userId: userId,
        action: 'join'
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to join room');
    }
    
    const result = await response.json();
    
    // Save current room ID locally
    await chrome.storage.local.set({ currentRoomId: roomId });
    
    return result;
  } catch (error) {
    console.error('Failed to join room:', error);
    throw error;
  }
}

async function handleGetRoomSummaries(roomId) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/rooms/${roomId}/summaries`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get summaries');
    }
    
    const result = await response.json();
    return result.summaries;
  } catch (error) {
    console.error('Failed to get room summaries:', error);
    return [];
  }
}

// Utility functions
function generateSimpleRoomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let roomId = '';
  for (let i = 0; i < 6; i++) {
    roomId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return roomId;
}

async function getUserId() {
  const result = await chrome.storage.local.get(['userId']);
  if (result.userId) {
    return result.userId;
  }
  
  const userId = 'user_' + Math.random().toString(36).substr(2, 9);
  await chrome.storage.local.set({ userId: userId });
  return userId;
}

async function getCurrentRoomId() {
  const result = await chrome.storage.local.get(['currentRoomId']);
  return result.currentRoomId || null;
}

async function getSummaryLength() {
  const result = await chrome.storage.local.get(['summaryLength']);
  return result.summaryLength || 'medium';
}

async function getLanguage() {
  const result = await chrome.storage.local.get(['language']);
  return result.language || 'en';
}

// Handle action button click
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('PageMind extension installed - Redis backend enabled');
});

// Periodic sync with backend (optional - for real-time updates)
chrome.alarms.create('syncRoomData', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'syncRoomData') {
    const roomId = await getCurrentRoomId();
    if (roomId) {
      // Could implement real-time sync here if needed
      console.log('Syncing room data for:', roomId);
    }
  }
});
