// Utility functions for PageMind extension

// Get current active tab
export async function getCurrentTab() {
  // First try to get the active tab in the current window
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // If no tab found, try to get the active tab in the last focused window
  if (!tab) {
    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    tab = activeTab;
  }
  
  // If still no tab, get the most recently active tab
  if (!tab) {
    const tabs = await chrome.tabs.query({ active: true });
    tab = tabs[0];
  }
  
  return tab;
}

// Generate a hash for URL to use as cache key
export function hashUrl(url) {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// Generate random room ID
export function generateRoomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let roomId = '';
  for (let i = 0; i < 6; i++) {
    roomId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return roomId;
}

// Generate user ID if not exists
export async function getUserId() {
  const result = await chrome.storage.local.get(['userId']);
  if (result.userId) {
    return result.userId;
  }
  
  const userId = 'user_' + Math.random().toString(36).substr(2, 9);
  await chrome.storage.local.set({ userId });
  return userId;
}

// Get current room ID
export async function getCurrentRoomId() {
  const result = await chrome.storage.local.get(['currentRoomId']);
  return result.currentRoomId || null;
}

// Set current room ID
export async function setCurrentRoomId(roomId) {
  await chrome.storage.local.set({ currentRoomId: roomId });
}

// Format timestamp
export function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString();
}

// Truncate text with ellipsis
export function truncateText(text, maxLength = 100) {
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength - 3) + '...';
}

// Extract domain from URL
export function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

// Clean and extract main content from page
export function cleanPageContent(content) {
  // Remove extra whitespace
  content = content.replace(/\s+/g, ' ').trim();
  
  // Remove common boilerplate patterns
  const boilerplatePatterns = [
    /cookie\s*policy/gi,
    /privacy\s*policy/gi,
    /terms\s*of\s*service/gi,
    /subscribe\s*to\s*newsletter/gi,
    /follow\s*us\s*on/gi,
    /copyright\s*©/gi,
    /all\s*rights\s*reserved/gi
  ];
  
  for (const pattern of boilerplatePatterns) {
    content = content.replace(pattern, '');
  }
  
  // Limit content length for API
  const maxContentLength = 5000;
  if (content.length > maxContentLength) {
    content = content.substring(0, maxContentLength) + '...';
  }
  
  return content;
}

// Validate room ID format
export function isValidRoomId(roomId) {
  return /^[A-Z0-9]{6}$/.test(roomId);
}

// Get summary options from storage
export async function getSummaryOptions() {
  const defaults = {
    summaryLength: 'medium',
    language: 'en',
    autoSummarize: false,
    theme: 'light'
  };
  
  const stored = await chrome.storage.local.get(['summaryOptions']);
  return { ...defaults, ...(stored.summaryOptions || {}) };
}

// Save summary options to storage
export async function saveSummaryOptions(options) {
  await chrome.storage.local.set({ summaryOptions: options });
}

// Export summary as markdown
export function exportAsMarkdown(summaries) {
  let markdown = '# PageMind Summaries\n\n';
  
  for (const summary of summaries) {
    markdown += `## ${summary.title}\n\n`;
    markdown += `**URL:** ${summary.url}\n`;
    markdown += `**Date:** ${formatTimestamp(summary.timestamp)}\n\n`;
    markdown += `### Summary\n\n${summary.summary}\n\n`;
    
    if (summary.keyPoints && summary.keyPoints.length > 0) {
      markdown += `### Key Points\n\n`;
      for (const point of summary.keyPoints) {
        markdown += `- ${point}\n`;
      }
      markdown += '\n';
    }
    
    markdown += '---\n\n';
  }
  
  return markdown;
}

// Download text as file
export function downloadTextFile(content, filename) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: true
  }, () => {
    URL.revokeObjectURL(url);
  });
}

// Debounce function for performance
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Check if URL is summarizable
export function isSummarizableUrl(url) {
  const unsummarizablePatterns = [
    /^chrome:\/\//,
    /^chrome-extension:\/\//,
    /^about:/,
    /^data:/,
    /^file:\/\/.*\.(jpg|jpeg|png|gif|pdf|zip|exe|dmg)$/i
  ];
  
  return !unsummarizablePatterns.some(pattern => pattern.test(url));
}

// Message passing helpers
export async function sendMessageToBackground(action, data = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action, ...data }, response => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

export async function sendMessageToTab(tabId, action, data = {}) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { action, ...data }, response => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}
