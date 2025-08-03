// Import utilities
import { 
  getCurrentTab, 
  formatTimestamp, 
  getCurrentRoomId,
  setCurrentRoomId,
  generateRoomId
} from '../lib/utils.js';

// State management
let currentView = 'roomSelection';
let currentRoomId = null;
let pendingRoomAction = null; // 'create' or 'join'
let pendingRoomId = null;

// DOM Elements
const elements = {
  // Views
  roomSelectionView: document.getElementById('roomSelectionView'),
  apiKeyView: document.getElementById('apiKeyView'),
  mainView: document.getElementById('mainView'),
  
  // Room Selection
  createRoomBtn: document.getElementById('createRoomBtn'),
  joinRoomBtn: document.getElementById('joinRoomBtn'),
  
  // API Key View
  backToRoomBtn: document.getElementById('backToRoomBtn'),
  apiKeyInput: document.getElementById('apiKeyInput'),
  saveApiKeyBtn: document.getElementById('saveApiKeyBtn'),
  roomIdDisplay: document.getElementById('roomIdDisplay'),
  
  // Main View
  roomId: document.getElementById('roomId'),
  copyRoomBtn: document.getElementById('copyRoomBtn'),
  leaveRoomBtn: document.getElementById('leaveRoomBtn'),
  pageTitle: document.getElementById('pageTitle'),
  pageUrl: document.getElementById('pageUrl'),
  summarizeBtn: document.getElementById('summarizeBtn'),
  summaryLength: document.getElementById('summaryLength'),
  loadingIndicator: document.getElementById('loadingIndicator'),
  summaryResult: document.getElementById('summaryResult'),
  summaryContent: document.getElementById('summaryContent'),
  cacheIndicator: document.getElementById('cacheIndicator'),
  summaryTime: document.getElementById('summaryTime'),
  keyPoints: document.getElementById('keyPoints'),
  keyPointsList: document.getElementById('keyPointsList'),
  copyBtn: document.getElementById('copyBtn'),
  exportBtn: document.getElementById('exportBtn'),
  roomSummariesSection: document.getElementById('roomSummariesSection'),
  summariesList: document.getElementById('summariesList'),
  noSummaries: document.getElementById('noSummaries'),
  refreshSummariesBtn: document.getElementById('refreshSummariesBtn'),
  
  // Modals
  joinRoomModal: document.getElementById('joinRoomModal'),
  roomIdInput: document.getElementById('roomIdInput'),
  confirmJoinBtn: document.getElementById('confirmJoinBtn'),
  cancelJoinBtn: document.getElementById('cancelJoinBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  settingsModal: document.getElementById('settingsModal'),
  languageSelect: document.getElementById('languageSelect'),
  autoSummarize: document.getElementById('autoSummarize'),
  darkMode: document.getElementById('darkMode'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  cancelSettingsBtn: document.getElementById('cancelSettingsBtn')
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await initializeExtension();
  setupEventListeners();
});

// View Management
function showView(viewName) {
  // Hide all views
  document.querySelectorAll('.view').forEach(view => {
    view.classList.remove('active');
    view.style.display = 'none';
  });
  
  // Show requested view
  switch(viewName) {
    case 'roomSelection':
      elements.roomSelectionView.classList.add('active');
      elements.roomSelectionView.style.display = 'block';
      break;
    case 'apiKey':
      elements.apiKeyView.classList.add('active');
      elements.apiKeyView.style.display = 'block';
      if (pendingRoomId) {
        elements.roomIdDisplay.textContent = pendingRoomId;
        elements.roomIdDisplay.parentElement.style.display = 'block';
      }
      break;
    case 'main':
      elements.mainView.classList.add('active');
      elements.mainView.style.display = 'block';
      break;
  }
  
  currentView = viewName;
}

// Initialize extension
async function initializeExtension() {
  // Small delay to ensure Chrome has updated the active tab
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Check if user has a room
  const { currentRoomId: savedRoomId } = await chrome.storage.local.get(['currentRoomId']);
  
  if (savedRoomId) {
    // User has room, go to main view
    currentRoomId = savedRoomId;
    showView('main');
    await loadMainView();
    
    // Check for pending summary display
    await checkForPendingSummaryDisplay();
  } else {
    // New user, show room selection
    showView('roomSelection');
  }
  
  // Load settings
  await loadSettings();
}

// Check if there's a pending summary to display from history click
async function checkForPendingSummaryDisplay() {
  console.log('Checking for pending summary display...');
  const { pendingSummaryDisplay } = await chrome.storage.local.get(['pendingSummaryDisplay']);
  
  if (pendingSummaryDisplay) {
    console.log('Found pending summary:', pendingSummaryDisplay);
    
    // Check if the pending summary is recent (within last 30 seconds)
    const isRecent = Date.now() - pendingSummaryDisplay.timestamp < 30000;
    console.log('Is recent?', isRecent);
    
    // Get current tab
    const currentTab = await getCurrentTab();
    console.log('Current tab URL:', currentTab?.url);
    console.log('Pending summary URL:', pendingSummaryDisplay.url);
    
    // Check if current tab URL matches the pending summary URL
    if (isRecent && currentTab && currentTab.url === pendingSummaryDisplay.url) {
      console.log('URLs match! Displaying summary...');
      
      // Display the cached summary
      const summaryData = pendingSummaryDisplay.summaryData;
      
      // Display the summary
      displaySummary(summaryData);
      
      // Clear the pending summary
      await chrome.storage.local.remove(['pendingSummaryDisplay']);
    } else {
      console.log('URLs do not match or not recent');
    }
  } else {
    console.log('No pending summary found');
  }
}

// Setup event listeners
function setupEventListeners() {
  // Room Selection
  elements.createRoomBtn.addEventListener('click', handleCreateRoom);
  elements.joinRoomBtn.addEventListener('click', handleJoinRoom);
  
  // API Key View
  elements.backToRoomBtn.addEventListener('click', () => showView('roomSelection'));
  elements.saveApiKeyBtn.addEventListener('click', handleSaveApiKey);
  elements.apiKeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSaveApiKey();
  });
  
  // Main View
  elements.copyRoomBtn.addEventListener('click', copyRoomId);
  elements.leaveRoomBtn.addEventListener('click', handleLeaveRoom);
  elements.summarizeBtn.addEventListener('click', handleSummarize);
  elements.copyBtn.addEventListener('click', copySummary);
  elements.exportBtn.addEventListener('click', exportSummary);
  elements.refreshSummariesBtn.addEventListener('click', loadRoomSummaries);
  
  // Join Room Modal
  elements.confirmJoinBtn.addEventListener('click', confirmJoinRoom);
  elements.cancelJoinBtn.addEventListener('click', closeJoinModal);
  elements.roomIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') confirmJoinRoom();
  });
  
  // Settings
  elements.settingsBtn.addEventListener('click', openSettings);
  elements.saveSettingsBtn.addEventListener('click', saveSettings);
  elements.cancelSettingsBtn.addEventListener('click', closeSettings);
  
  // Listen for room updates
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'roomUpdate' && message.data.roomId === currentRoomId) {
      loadRoomSummaries();
    }
  });
}

// Room Management
async function handleCreateRoom() {
  pendingRoomAction = 'create';
  pendingRoomId = generateRoomId();
  // Show API key view for room creator
  showView('apiKey');
}

function handleJoinRoom() {
  elements.joinRoomModal.style.display = 'flex';
  elements.roomIdInput.value = '';
  elements.roomIdInput.focus();
}

async function confirmJoinRoom() {
  const roomId = elements.roomIdInput.value.trim().toUpperCase();
  if (roomId.length !== 6) {
    alert('Please enter a valid 6-character room ID');
    return;
  }
  
  pendingRoomAction = 'join';
  pendingRoomId = roomId;
  closeJoinModal();
  
  // Directly join room without API key check
  await joinExistingRoom(roomId);
}

function closeJoinModal() {
  elements.joinRoomModal.style.display = 'none';
  elements.roomIdInput.value = '';
}

async function handleSaveApiKey() {
  const apiKey = elements.apiKeyInput.value.trim();
  if (!apiKey) {
    alert('Please enter your Gemini API key');
    return;
  }
  
  // Continue with room creation
  if (pendingRoomAction === 'create') {
    await createAndJoinRoom(apiKey);
  }
}

async function createAndJoinRoom(apiKey) {
  try {
    const roomId = pendingRoomId || generateRoomId();
    const response = await chrome.runtime.sendMessage({
      action: 'createRoom',
      apiKey: apiKey
    });
    
    if (response.success) {
      currentRoomId = response.data.roomId;
      await setCurrentRoomId(currentRoomId);
      showView('main');
      await loadMainView();
    } else {
      alert('Failed to create room: ' + response.error);
    }
  } catch (error) {
    console.error('Error creating room:', error);
    alert('Failed to create room');
  }
}

async function joinExistingRoom(roomId) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'joinRoom',
      roomId: roomId
    });
    
    if (response.success) {
      currentRoomId = roomId;
      await setCurrentRoomId(currentRoomId);
      showView('main');
      await loadMainView();
    } else {
      alert('Failed to join room: ' + response.error);
    }
  } catch (error) {
    console.error('Error joining room:', error);
    alert('Failed to join room');
  }
}

async function handleLeaveRoom() {
  if (confirm('Are you sure you want to leave this room?')) {
    await chrome.storage.local.remove(['currentRoomId']);
    currentRoomId = null;
    pendingRoomAction = null;
    pendingRoomId = null;
    showView('roomSelection');
  }
}

// Main View Functions
async function loadMainView() {
  // Display room ID
  elements.roomId.textContent = currentRoomId;
  
  // Small delay to ensure we get the correct active tab
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Load current tab info
  const tab = await getCurrentTab();
  if (tab) {
    elements.pageTitle.textContent = tab.title || 'Untitled';
    elements.pageUrl.textContent = tab.url || '';
  }
  
  // Load room summaries
  await loadRoomSummaries();
}

function copyRoomId() {
  navigator.clipboard.writeText(currentRoomId).then(() => {
    const originalText = elements.copyRoomBtn.innerHTML;
    elements.copyRoomBtn.innerHTML = '✓';
    setTimeout(() => {
      elements.copyRoomBtn.innerHTML = originalText;
    }, 2000);
  });
}

// Summarization
async function handleSummarize() {
  const tab = await getCurrentTab();
  if (!tab || !tab.id) return;
  
  // Show loading state
  elements.loadingIndicator.style.display = 'flex';
  elements.summaryResult.style.display = 'none';
  elements.summarizeBtn.disabled = true;
  
  try {
    // Try to extract page content
    let pageData;
    
    try {
      // First, try to send message to content script
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractContent' });
      
      if (response && response.success) {
        pageData = response.data;
      } else {
        throw new Error('Content script not responding');
      }
    } catch (contentScriptError) {
      console.log('Content script not available, using fallback method');
      
      // Fallback: Use basic tab information
      pageData = {
        title: tab.title || 'Untitled',
        url: tab.url || '',
        content: `Page title: ${tab.title || 'Untitled'}. This is a fallback summary as the content script could not extract the page content. Please ensure you're on a regular webpage (not a Chrome internal page or PDF).`,
        headings: [],
        description: '',
        extractedAt: new Date().toISOString()
      };
    }
    
    // Get summary options
    const summaryLength = elements.summaryLength.value;
    await chrome.storage.local.set({ summaryLength });
    
    // Request summarization
    const response = await chrome.runtime.sendMessage({
      action: 'summarizePage',
      data: pageData
    });
    
    if (response.success) {
      displaySummary(response.data);
      // Reload room summaries to show the new one
      await loadRoomSummaries();
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    console.error('Summarization error:', error);
    alert('Failed to summarize page: ' + error.message);
  } finally {
    elements.loadingIndicator.style.display = 'none';
    elements.summarizeBtn.disabled = false;
  }
}

function displaySummary(summaryData) {
  // Format the summary as markdown
  let markdownContent = summaryData.summary;
  
  // Add key points in markdown format if available
  if (summaryData.keyPoints && summaryData.keyPoints.length > 0) {
    markdownContent += '\n\n**Key points:**\n\n';
    summaryData.keyPoints.forEach(point => {
      markdownContent += `* ${point}\n`;
    });
  }
  
  // Store the markdown content for copying
  elements.summaryContent.dataset.markdown = markdownContent;
  
  // Display the markdown content
  elements.summaryContent.innerHTML = renderMarkdown(markdownContent);
  elements.summaryTime.textContent = formatTimestamp(summaryData.timestamp);
  
  // Show cache indicator if from cache
  if (summaryData.fromCache) {
    elements.cacheIndicator.style.display = 'flex';
  } else {
    elements.cacheIndicator.style.display = 'none';
  }
  
  // Hide the separate key points section since we're including it in markdown
  elements.keyPoints.style.display = 'none';
  
  elements.summaryResult.style.display = 'block';
  elements.summaryResult.classList.add('fade-in');
}

// Simple markdown renderer
function renderMarkdown(markdown) {
  // Convert markdown to HTML
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Line breaks
    .replace(/\n/g, '<br>')
    // Lists
    .replace(/^\* (.+)$/gm, '<li>$1</li>')
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // Inline code
    .replace(/`(.+?)`/g, '<code>$1</code>');
  
  // Wrap consecutive list items in ul tags
  html = html.replace(/(<li>.*<\/li>(\s*<br>)*)+/g, function(match) {
    return '<ul>' + match.replace(/<br>/g, '') + '</ul>';
  });
  
  return html;
}

function copySummary() {
  // Get the original markdown content
  const summaryData = elements.summaryContent.dataset.markdown || elements.summaryContent.textContent;
  navigator.clipboard.writeText(summaryData).then(() => {
    const originalText = elements.copyBtn.textContent;
    elements.copyBtn.textContent = 'Copied!';
    setTimeout(() => {
      elements.copyBtn.textContent = originalText;
    }, 2000);
  });
}

async function exportSummary() {
  const tab = await getCurrentTab();
  const summary = elements.summaryContent.textContent;
  const timestamp = new Date().toISOString().split('T')[0];
  
  const markdown = `# ${tab.title}

**URL:** ${tab.url}  
**Date:** ${timestamp}  
**Summarized by:** PageMind

## Summary

${summary}

${elements.keyPoints.style.display !== 'none' ? `
## Key Points

${Array.from(elements.keyPointsList.children).map(li => `- ${li.textContent}`).join('\n')}
` : ''}

---
*Generated by PageMind Chrome Extension*`;

  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  
  chrome.downloads.download({
    url: url,
    filename: `pagemind-summary-${timestamp}.md`,
    saveAs: true
  });
}

// Room Summaries
async function loadRoomSummaries() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getRoomSummaries',
      roomId: currentRoomId
    });
    
    if (response.success && response.data.length > 0) {
      displayRoomSummaries(response.data);
      elements.noSummaries.style.display = 'none';
    } else {
      elements.summariesList.innerHTML = '';
      elements.noSummaries.style.display = 'block';
    }
  } catch (error) {
    console.error('Error loading room summaries:', error);
  }
}

function displayRoomSummaries(summaries) {
  elements.summariesList.innerHTML = '';
  
  summaries.forEach(summary => {
    const item = document.createElement('div');
    item.className = 'summary-item';
    item.innerHTML = `
      <div class="summary-item-title">${summary.title}</div>
      <div class="summary-item-url">${summary.url}</div>
      <div class="summary-item-preview">${summary.summary.substring(0, 150)}...</div>
      <div class="summary-item-meta">
        <span>${formatTimestamp(summary.timestamp)}</span>
        <span>by ${summary.summarizedBy.substring(0, 8)}</span>
      </div>
    `;
    
    item.addEventListener('click', async () => {
      console.log('History item clicked, storing summary for URL:', summary.url);
      
      // Store the summary data with a longer expiration time
      await chrome.storage.local.set({ 
        pendingSummaryDisplay: {
          url: summary.url,
          summaryData: {
            ...summary,
            fromCache: true  // Mark as from cache
          },
          timestamp: Date.now()
        }
      });
      
      console.log('Summary stored, opening new tab...');
      
      // Create the new tab
      chrome.tabs.create({ url: summary.url });
    });
    
    elements.summariesList.appendChild(item);
  });
}

// Settings
async function loadSettings() {
  const settings = await chrome.storage.local.get([
    'language',
    'summaryLength',
    'autoSummarize',
    'darkMode'
  ]);
  
  // Apply settings
  if (settings.language) {
    elements.languageSelect.value = settings.language;
  }
  
  if (settings.summaryLength) {
    elements.summaryLength.value = settings.summaryLength;
  }
  
  elements.autoSummarize.checked = settings.autoSummarize || false;
  elements.darkMode.checked = settings.darkMode || false;
  
  // Apply dark mode
  if (settings.darkMode) {
    document.body.classList.add('dark-mode');
  }
}

function openSettings() {
  elements.settingsModal.style.display = 'flex';
}

function closeSettings() {
  elements.settingsModal.style.display = 'none';
}

async function saveSettings() {
  const settings = {
    language: elements.languageSelect.value,
    autoSummarize: elements.autoSummarize.checked,
    darkMode: elements.darkMode.checked
  };
  
  await chrome.storage.local.set(settings);
  
  // Apply dark mode immediately
  if (settings.darkMode) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
  
  closeSettings();
}

// Update current page info on tab change
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (currentView === 'main') {
    // Small delay to ensure the tab info is fully loaded
    setTimeout(async () => {
      // Get the full tab details
      const tab = await chrome.tabs.get(activeInfo.tabId);
      if (tab) {
        elements.pageTitle.textContent = tab.title || 'Untitled';
        elements.pageUrl.textContent = tab.url || '';
      }
    }, 100);
    
    // Check if auto-summarize is enabled
    const settings = await chrome.storage.local.get(['autoSummarize']);
    if (settings.autoSummarize) {
      // Auto-summarize is enabled, reload the full view
      await loadMainView();
    }
  }
});

// Also update when URL changes in the same tab
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (currentView === 'main') {
    const activeTab = await getCurrentTab();
    if (activeTab && activeTab.id === tabId) {
      // Update URL immediately when it changes
      if (changeInfo.url) {
        elements.pageUrl.textContent = changeInfo.url || '';
      }
      
      // Update title when the page is complete or when title changes
      if (changeInfo.status === 'complete' || changeInfo.title) {
        // Small delay to ensure title is fully loaded
        setTimeout(async () => {
          const updatedTab = await chrome.tabs.get(tabId);
          elements.pageTitle.textContent = updatedTab.title || 'Untitled';
        }, 100);
      }
      
      // Clear previous summary when navigating to a new page
      if (changeInfo.url) {
        elements.summaryResult.style.display = 'none';
      }
    }
  }
});

// Update when popup is opened/reopened
document.addEventListener('visibilitychange', async () => {
  if (!document.hidden && currentView === 'main') {
    // Small delay to ensure Chrome has updated the active tab
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Popup became visible, update current page info
    const tab = await getCurrentTab();
    if (tab) {
      elements.pageTitle.textContent = tab.title || 'Untitled';
      elements.pageUrl.textContent = tab.url || '';
    }
    
    // Check for pending summary display when popup opens
    await checkForPendingSummaryDisplay();
  }
});
