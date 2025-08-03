// Content script for extracting page content

// Extract main content from the page
function extractPageContent() {
  // Remove script and style elements
  const scripts = document.querySelectorAll('script, style, noscript');
  scripts.forEach(el => el.remove());
  
  // Try to find main content areas
  const contentSelectors = [
    'main',
    'article',
    '[role="main"]',
    '#content',
    '.content',
    '#main',
    '.main',
    '.post',
    '.article-content',
    '.entry-content',
    '.post-content'
  ];
  
  let mainContent = null;
  
  // Try to find main content area
  for (const selector of contentSelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim().length > 100) {
      mainContent = element;
      break;
    }
  }
  
  // If no main content found, use body
  if (!mainContent) {
    mainContent = document.body;
  }
  
  // Clone the content to avoid modifying the actual page
  const contentClone = mainContent.cloneNode(true);
  
  // Remove unwanted elements
  const unwantedSelectors = [
    'nav',
    'header',
    'footer',
    'aside',
    '.sidebar',
    '.navigation',
    '.menu',
    '.advertisement',
    '.ads',
    '.social-share',
    '.comments',
    '#comments',
    '.related-posts',
    '.cookie-notice',
    '.popup',
    '.modal',
    '[class*="share"]',
    '[class*="social"]',
    '[class*="newsletter"]',
    '[class*="subscribe"]'
  ];
  
  unwantedSelectors.forEach(selector => {
    const elements = contentClone.querySelectorAll(selector);
    elements.forEach(el => el.remove());
  });
  
  // Extract text content
  let textContent = contentClone.textContent || '';
  
  // Clean up the text
  textContent = textContent
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  // Get page metadata
  const title = document.title || '';
  const description = document.querySelector('meta[name="description"]')?.content || 
                     document.querySelector('meta[property="og:description"]')?.content || '';
  
  // Get headings for structure
  const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
    .slice(0, 10)
    .map(h => h.textContent.trim())
    .filter(text => text.length > 0);
  
  return {
    title,
    description,
    content: textContent,
    headings,
    url: window.location.href,
    extractedAt: new Date().toISOString()
  };
}

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractContent') {
    try {
      const pageData = extractPageContent();
      sendResponse({ success: true, data: pageData });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
  
  // Return true to indicate async response
  return true;
});

// Highlight summarized content (optional feature)
function highlightSummarizedContent(ranges) {
  ranges.forEach(range => {
    const elements = document.querySelectorAll(range.selector);
    elements.forEach(el => {
      el.style.backgroundColor = 'rgba(255, 235, 59, 0.3)';
      el.style.transition = 'background-color 0.3s ease';
    });
  });
}

// Clear highlights
function clearHighlights() {
  const highlighted = document.querySelectorAll('[style*="background-color"]');
  highlighted.forEach(el => {
    el.style.backgroundColor = '';
  });
}

// Auto-extract content if enabled
async function checkAutoExtract() {
  const response = await chrome.runtime.sendMessage({ action: 'getSummaryOptions' });
  if (response && response.autoSummarize) {
    // Wait for page to fully load
    if (document.readyState === 'complete') {
      const pageData = extractPageContent();
      chrome.runtime.sendMessage({ 
        action: 'autoSummarize', 
        data: pageData 
      });
    }
  }
}

// Check for auto-extract when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkAutoExtract);
} else {
  checkAutoExtract();
}
