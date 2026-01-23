// Enhanced content script for VU Education Lab AI Assistant
// Runs in the context of web pages

// Global variables
let vuHighlightStyle = null;
let vuDraggableWindow = null;
let vuFloatingIcon = null;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "getPageContent":
      sendResponse({ content: extractStructuredContent() });
      return true;
    case "highlightText":
      highlightText(request.text);
      sendResponse({ success: true });
      return true;
    case "clearHighlights":
      clearHighlights();
      sendResponse({ success: true });
      return true;
    default:
      break;
  }
});

// Listen for messages from iframe
window.addEventListener('message', (event) => {
  // Allow messages from extension iframe as well as same origin
  const extensionOrigin = chrome.runtime.getURL('').replace(/\/$/, '');
  if (
    event.origin !== window.location.origin &&
    event.origin !== extensionOrigin
  ) return;

  switch (event.data.action) {
    case 'requestPageContent': {
      // Extract content and send back to iframe
      const content = extractStructuredContent();
      // Send the content back to the iframe
      if (vuDraggableWindow) {
        const iframe = vuDraggableWindow.querySelector('iframe');
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage({
            action: 'receivePageContent',
            content
          }, '*');
        }
      }
      break;
    }
    case 'highlightText':
      highlightText(event.data.text);
      break;
    case 'clearHighlights':
      clearHighlights();
      break;
    default:
      break;
  }
});

// Function to detect if current page is a PDF
function isPDFPage() {
  // Check if URL ends with .pdf
  if (window.location.href.toLowerCase().endsWith('.pdf')) {
    return true;
  }
  
  // Check if Chrome PDF viewer is present
  // Chrome's PDF viewer has specific elements
  const pdfViewer = document.querySelector('embed[type="application/pdf"]') ||
                    document.querySelector('iframe[src*=".pdf"]') ||
                    document.querySelector('.plugin') ||
                    document.querySelector('#plugin');
  
  if (pdfViewer) {
    return true;
  }
  
  // Check for PDF.js viewer elements (Chrome uses PDF.js internally)
  const textLayer = document.querySelector('.textLayer');
  const pdfContainer = document.querySelector('#viewer') || document.querySelector('.pdfViewer');
  
  if (textLayer || pdfContainer) {
    return true;
  }
  
  // Check content type
  const contentType = document.contentType;
  if (contentType && contentType.toLowerCase().includes('application/pdf')) {
    return true;
  }
  
  return false;
}

// Function to extract text from Chrome's PDF viewer
function extractPDFText() {
  const textContent = [];
  
  // Chrome's PDF viewer renders text in .textLayer elements
  // Each page has its own textLayer with text spans
  const textLayers = document.querySelectorAll('.textLayer');
  
  if (textLayers.length > 0) {
    textLayers.forEach(layer => {
      const spans = layer.querySelectorAll('span');
      spans.forEach(span => {
        const text = span.textContent?.trim();
        if (text && text.length > 0) {
          textContent.push(text);
        }
      });
    });
  } else {
    // Fallback: try to find text in common PDF viewer structures
    // Some PDF viewers render text directly in the body
    const allText = document.body.innerText || document.body.textContent;
    if (allText && allText.trim().length > 100) {
      // If we have substantial text, it's likely from a PDF
      textContent.push(allText);
    }
  }
  
  return textContent.join('\n\n');
}

// Function to extract structured content from the page
function extractStructuredContent() {
  // Check if this is a PDF page first
  if (isPDFPage()) {
    console.log('VU AI Assistant: Detected PDF page, extracting PDF content...');
    const pdfText = extractPDFText();
    
    // Count text layers for page count estimation
    const textLayers = document.querySelectorAll('.textLayer');
    
    if (!pdfText || pdfText.trim().length === 0) {
      console.warn('VU AI Assistant: Could not extract text from PDF');
      return {
        title: document.title || 'PDF Document',
        url: window.location.href,
        isPDF: true,
        pdfExtractionFailed: true,
        paragraphs: [],
        headings: { h1: [], h2: [], h3: [] },
        stats: {
          paragraphsCount: 0,
          headingsTotal: 0,
          pdfPageCount: textLayers.length || 0
        }
      };
    }
    
    // Split PDF text into paragraphs (double newlines or long lines)
    const paragraphs = pdfText
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0)
      .slice(0, 500); // Limit paragraphs
    
    // Try to identify headings (lines that are short and might be headings)
    const lines = pdfText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const headings = {
      h1: [],
      h2: [],
      h3: []
    };
    
    // Simple heuristic: lines that are shorter and appear before paragraphs might be headings
    lines.forEach((line, index) => {
      if (line.length < 100 && line.length > 3) {
        // Check if next line is longer (likely a paragraph)
        if (index < lines.length - 1 && lines[index + 1].length > line.length * 2) {
          if (headings.h1.length < 50) {
            headings.h1.push(line);
          } else if (headings.h2.length < 50) {
            headings.h2.push(line);
          } else if (headings.h3.length < 50) {
            headings.h3.push(line);
          }
        }
      }
    });
    
    return {
      title: document.title || 'PDF Document',
      url: window.location.href,
      isPDF: true,
      paragraphs: paragraphs,
      headings: headings,
      pdfText: pdfText.substring(0, 1000000), // Full text, limited to 1MB
      stats: {
        paragraphsCount: paragraphs.length,
        headingsTotal: headings.h1.length + headings.h2.length + headings.h3.length,
        pdfPageCount: textLayers.length || 0
      }
    };
  }
  
  // Constants for content limits
  // AI models (GPT-5) support 256K tokens (~1MB text), so we set generous limits
  const MAX_PARAGRAPHS = 500;
  const MAX_HEADINGS_PER_TYPE = 200;
  const MAX_LISTS = 100;
  const MAX_IMAGES = 100;
  const MAX_TABLES = 50;
  const MAX_LINKS = 200;
  const MAX_CODE_BLOCKS = 50;
  const MAX_TEXT_LENGTH = 1000000; // 1MB max (~250K tokens)

  // Try to find main content area to avoid navigation/UI pollution
  const mainContent = document.querySelector('main, article, [role="main"], .content, #content, #main');
  const contentRoot = mainContent || document.body;

  const pageInfo = {
    title: document.title,
    url: window.location.href,
    // REMOVED: text: document.body.innerText - this was causing massive duplication
  };

  // Extract headings for better structure (limit to avoid huge pages)
  const headings = {
    h1: Array.from(contentRoot.querySelectorAll('h1'))
      .map(el => el.innerText?.trim())
      .filter(text => text && text.length > 0)
      .slice(0, MAX_HEADINGS_PER_TYPE),
    h2: Array.from(contentRoot.querySelectorAll('h2'))
      .map(el => el.innerText?.trim())
      .filter(text => text && text.length > 0)
      .slice(0, MAX_HEADINGS_PER_TYPE),
    h3: Array.from(contentRoot.querySelectorAll('h3'))
      .map(el => el.innerText?.trim())
      .filter(text => text && text.length > 0)
      .slice(0, MAX_HEADINGS_PER_TYPE)
  };

  // Extract paragraphs for better content analysis (with limits)
  const paragraphs = Array.from(contentRoot.querySelectorAll('p'))
    .map(el => el.innerText?.trim())
    .filter(text => text && text.length > 0)
    .slice(0, MAX_PARAGRAPHS);

  // Extract lists - FIXED: Use direct children only to avoid nested list duplication
  const lists = Array.from(contentRoot.querySelectorAll('ul, ol'))
    .map(list => ({
      type: list.tagName.toLowerCase(),
      items: Array.from(list.children)
        .filter(el => el.tagName === 'LI')
        .map(li => li.innerText?.trim())
        .filter(text => text && text.length > 0)
    }))
    .filter(list => list.items.length > 0)
    .slice(0, MAX_LISTS);

  // Extract images - FIXED: Include all images, not just those with alt text
  const images = Array.from(contentRoot.querySelectorAll('img'))
    .map(img => ({
      alt: img.alt?.trim() || '[No alt text]',
      src: img.src,
      hasAlt: !!(img.alt?.trim())
    }))
    .filter(img => img.src && !img.src.startsWith('data:')) // Skip tiny data URLs
    .slice(0, MAX_IMAGES);

  // Extract important links with context
  const links = Array.from(contentRoot.querySelectorAll('a[href]'))
    .filter(link => {
      const href = link.href;
      return href && 
             !href.startsWith('javascript:') && 
             !href.startsWith('#') &&
             link.innerText?.trim();
    })
    .map(link => ({
      text: link.innerText.trim(),
      href: link.href,
      isExternal: !link.href.startsWith(window.location.origin)
    }))
    .slice(0, MAX_LINKS);

  // Extract tables with improved structure
  const tables = Array.from(contentRoot.querySelectorAll('table'))
    .map(table => {
      const headers = Array.from(table.querySelectorAll('th'))
        .map(th => th.innerText?.trim())
        .filter(text => text);
      const rows = Array.from(table.querySelectorAll('tbody tr, tr'))
        .map(tr => {
          const cells = Array.from(tr.querySelectorAll('td'))
            .map(td => td.innerText?.trim())
            .filter(text => text);
          if (cells.length === 0) return null;
          
          // If we have headers and same number of cells, create object
          if (headers.length > 0 && headers.length === cells.length) {
            return Object.fromEntries(headers.map((h, i) => [h, cells[i]]));
          }
          return cells;
        })
        .filter(row => row !== null);
      
      return {
        headers,
        rows,
        hasHeaders: headers.length > 0,
        rowCount: rows.length
      };
    })
    .filter(table => table.rows.length > 0)
    .slice(0, MAX_TABLES);

  // Extract code blocks for technical/educational content
  const codeBlocks = Array.from(contentRoot.querySelectorAll('pre code, pre, code'))
    .map(code => {
      const text = code.innerText?.trim();
      if (!text || text.length < 10) return null; // Skip very short snippets
      
      return {
        text: text.substring(0, 5000), // Limit individual code blocks
        language: code.className.match(/language-(\w+)/)?.[1] || 
                  code.parentElement?.className.match(/language-(\w+)/)?.[1] || 
                  'unknown'
      };
    })
    .filter(block => block !== null)
    .slice(0, MAX_CODE_BLOCKS);

  // Extract meta description if available
  let metaDescription = "";
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDescription = metaDesc.getAttribute("content") || "";

  // Extract additional metadata
  const metaKeywords = document.querySelector('meta[name="keywords"]')?.getAttribute("content") || "";
  const author = document.querySelector('meta[name="author"]')?.getAttribute("content") || "";
  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute("content") || "";
  const ogType = document.querySelector('meta[property="og:type"]')?.getAttribute("content") || "";

  // Assemble final result
  const result = {
    ...pageInfo,
    metaDescription,
    metaKeywords,
    author,
    ogTitle,
    ogType,
    headings,
    paragraphs,
    lists,
    images,
    links,
    tables,
    codeBlocks,
    stats: {
      headingsTotal: headings.h1.length + headings.h2.length + headings.h3.length,
      paragraphsCount: paragraphs.length,
      listsCount: lists.length,
      imagesCount: images.length,
      linksCount: links.length,
      tablesCount: tables.length,
      codeBlocksCount: codeBlocks.length
    }
  };

  // Estimate total size and truncate if needed
  const resultStr = JSON.stringify(result);
  if (resultStr.length > MAX_TEXT_LENGTH) {
    console.warn(`VU AI Assistant: Content too large (${resultStr.length} chars), truncating...`);
    
    // Progressively remove less important content (should rarely happen with 1MB limit)
    if (result.codeBlocks.length > 30) result.codeBlocks = result.codeBlocks.slice(0, 30);
    if (result.links.length > 100) result.links = result.links.slice(0, 100);
    if (result.tables.length > 30) result.tables = result.tables.slice(0, 30);
    if (result.paragraphs.length > 300) result.paragraphs = result.paragraphs.slice(0, 300);
    
    // Update stats
    result.stats.truncated = true;
  }

  return result;
}

// Function to highlight text on the page
function highlightText(text) {
  if (!text) return;
  
  // Clear any existing highlights first
  clearHighlights();
  
  const regex = new RegExp(text, 'gi');
  const walker = document.createTreeWalker(
    document.body, 
    NodeFilter.SHOW_TEXT, 
    null, 
    false
  );
  
  const nodesToHighlight = [];
  let node;
  while (node = walker.nextNode()) {
    if (node.nodeValue.match(regex)) {
      nodesToHighlight.push(node);
    }
  }
  
  nodesToHighlight.forEach(node => {
    const highlightedContent = node.nodeValue.replace(
      regex, 
      match => `<span class="vu-ai-highlight">${match}</span>`
    );
    
    const span = document.createElement('span');
    span.innerHTML = highlightedContent;
    node.parentNode.replaceChild(span, node);
  });
  
  // Add highlight style if not already added
  if (!vuHighlightStyle) {
    vuHighlightStyle = document.createElement('style');
    vuHighlightStyle.textContent = `
      .vu-ai-highlight {
        background-color: #0077B3;
        color: white;
        padding: 2px 4px;
        border-radius: 3px;
        font-weight: bold;
      }
    `;
    document.head.appendChild(vuHighlightStyle);
  }
}

// Function to clear all highlights
function clearHighlights() {
  const highlights = document.querySelectorAll('.vu-ai-highlight');
  highlights.forEach(highlight => {
    const parent = highlight.parentNode;
    const text = document.createTextNode(highlight.textContent);
    parent.replaceChild(text, highlight);
  });
}

// Utility functions for chrome.storage.local
async function saveFloatingIconState(state) {
  return new Promise(resolve => {
    chrome.storage.local.set({ vuFloatingIconState: state }, resolve);
  });
}
async function getFloatingIconState() {
  return new Promise(resolve => {
    chrome.storage.local.get(['vuFloatingIconState'], result => {
      resolve(result.vuFloatingIconState || null);
    });
  });
}

// Constants for floating icon
const FLOATING_ICON_CONFIG = {
  size: { normal: 48, minimized: 20 },
  margin: 20,
  minTop: 10,
  minimizeDelay: 3000,
  animationDuration: 300
};

// Create floating icon with improved structure
async function createFloatingIcon() {
  if (vuFloatingIcon) {
    return vuFloatingIcon;
  }

  const icon = document.createElement('button');
  icon.className = 'vu-ai-floating-icon';
  icon.setAttribute('aria-label', 'Open VU Education Lab Assistant');
  icon.setAttribute('title', 'Open VU Education Lab AI Assistant');
  icon.dataset.edge = 'right'; // Use data attribute for state

  const img = document.createElement('img');
  img.src = chrome.runtime.getURL('images/icon48.png');
  img.alt = 'VU Education Lab AI Assistant';
  img.draggable = false;
  icon.appendChild(img);

  // Click handler - using event delegation pattern
  icon.addEventListener('click', handleIconClick);

  document.body.appendChild(icon);
  vuFloatingIcon = icon;

  // Restore saved state
  const iconState = await getFloatingIconState();
  if (iconState) {
    applyIconState(icon, iconState);
  } else {
    // Default position
    setIconPosition(icon, { edge: 'right', top: window.innerHeight - 68 });
  }

  // Initialize dragging and auto-minimize
  initializeIconDragging(icon);
  initializeAutoMinimize(icon);

  return icon;
}

function handleIconClick() {
  if (!vuFloatingIcon.classList.contains('minimized')) {
    toggleDraggableWindow();
  }
}

// Improved position setter using CSS custom properties
function setIconPosition(icon, { edge, top, skipSave = false }) {
  const clampedTop = clampValue(
    top,
    FLOATING_ICON_CONFIG.minTop,
    window.innerHeight - FLOATING_ICON_CONFIG.size.normal - FLOATING_ICON_CONFIG.minTop
  );

  icon.dataset.edge = edge;
  icon.style.setProperty('--icon-top', `${clampedTop}px`);

  // Apply edge positioning via class
  icon.classList.toggle('edge-left', edge === 'left');
  icon.classList.toggle('edge-right', edge === 'right');

  if (!skipSave) {
    const isMinimized = icon.classList.contains('minimized');
    saveFloatingIconState({ edge, top: clampedTop, minimized: isMinimized });
  }
}

function applyIconState(icon, state) {
  setIconPosition(icon, {
    edge: state.edge || 'right',
    top: state.top || window.innerHeight - 68,
    skipSave: true
  });

  if (state.minimized) {
    icon.classList.add('minimized');
  }
}

// Cleaner drag implementation using closure
function initializeIconDragging(icon) {
  let dragState = null;

  const handleMouseDown = (e) => {
    if (icon.classList.contains('minimized')) return;

    e.preventDefault();
    dragState = {
      startX: e.clientX,
      startY: e.clientY,
      startTop: parseInt(icon.style.getPropertyValue('--icon-top')) || 0,
      startLeft: icon.getBoundingClientRect().left
    };

    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!dragState) return;

    const deltaY = e.clientY - dragState.startY;
    const newTop = clampValue(
      dragState.startTop + deltaY,
      FLOATING_ICON_CONFIG.minTop,
      window.innerHeight - FLOATING_ICON_CONFIG.size.normal - FLOATING_ICON_CONFIG.minTop
    );

    icon.style.setProperty('--icon-top', `${newTop}px`);
  };

  const handleMouseUp = () => {
    if (!dragState) return;

    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);

    // Determine edge based on final position
    const iconRect = icon.getBoundingClientRect();
    const edge = iconRect.left < window.innerWidth / 2 ? 'left' : 'right';
    const top = parseInt(icon.style.getPropertyValue('--icon-top')) || 0;

    setIconPosition(icon, { edge, top });
    dragState = null;
  };

  icon.addEventListener('mousedown', handleMouseDown);
}

// Improved auto-minimize with proper cleanup
function initializeAutoMinimize(icon) {
  let timeoutId = null;

  const scheduleMinimize = () => {
    clearTimeout(timeoutId);
    if (!icon.classList.contains('minimized')) {
      timeoutId = setTimeout(() => {
        minimizeFloatingIcon();
      }, FLOATING_ICON_CONFIG.minimizeDelay);
    }
  };

  const cancelMinimize = () => {
    clearTimeout(timeoutId);
    if (icon.classList.contains('minimized')) {
      restoreFloatingIcon();
    }
  };

  icon.addEventListener('mouseenter', cancelMinimize);
  icon.addEventListener('mouseleave', scheduleMinimize);
  icon.addEventListener('mousedown', scheduleMinimize);
  icon.addEventListener('mouseup', scheduleMinimize);

  // Start initial timer
  scheduleMinimize();
}

function minimizeFloatingIcon() {
  if (!vuFloatingIcon) return;

  vuFloatingIcon.classList.add('minimized');

  // Save minimized state
  const edge = vuFloatingIcon.dataset.edge || 'right';
  const top = parseInt(vuFloatingIcon.style.getPropertyValue('--icon-top')) || 0;
  saveFloatingIconState({ edge, top, minimized: true });
}

function restoreFloatingIcon() {
  if (!vuFloatingIcon) return;

  vuFloatingIcon.classList.remove('minimized');

  // Save restored state
  const edge = vuFloatingIcon.dataset.edge || 'right';
  const top = parseInt(vuFloatingIcon.style.getPropertyValue('--icon-top')) || 0;
  saveFloatingIconState({ edge, top, minimized: false });
}

// Utility function for clamping values
function clampValue(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Constants for draggable window
const WINDOW_CONFIG = {
  defaultWidth: 520,
  defaultHeight: 600,
  minMargin: 10,
  maxWidthPercent: 90,
  maxHeightPercent: 80
};

// Create draggable window with improved structure
function createDraggableWindow() {
  if (vuDraggableWindow) {
    return vuDraggableWindow;
  }

  const windowEl = document.createElement('div');
  windowEl.className = 'vu-ai-draggable-window hidden';

  // Build header with title and controls
  const header = buildWindowHeader();
  const content = buildWindowContent();

  windowEl.appendChild(header);
  windowEl.appendChild(content);
  document.body.appendChild(windowEl);

  vuDraggableWindow = windowEl;

  // Initialize dragging on header
  initializeWindowDragging(windowEl, header);

  return windowEl;
}

function buildWindowHeader() {
  const header = document.createElement('div');
  header.className = 'vu-ai-window-header';

  const title = document.createElement('h1');
  title.className = 'vu-ai-window-title';
  title.textContent = 'VU Education Lab AI Assistant';

  const actions = document.createElement('div');
  actions.className = 'vu-ai-window-actions';

  // Create control buttons
  const minimizeBtn = createWindowButton('&minus;', 'Minimize', hideDraggableWindow);
  const closeBtn = createWindowButton('&times;', 'Close', hideDraggableWindow);

  actions.append(minimizeBtn, closeBtn);
  header.append(title, actions);

  return header;
}

function createWindowButton(innerHTML, label, onClick) {
  const button = document.createElement('button');
  button.className = 'vu-ai-window-button';
  button.innerHTML = innerHTML;
  button.setAttribute('aria-label', label);
  button.setAttribute('title', label);
  button.addEventListener('click', onClick);
  return button;
}

function buildWindowContent() {
  const content = document.createElement('div');
  content.className = 'vu-ai-window-content';

  const iframe = document.createElement('iframe');
  iframe.className = 'vu-ai-window-iframe';
  iframe.src = chrome.runtime.getURL('popup.html');
  iframe.setAttribute('allow', 'clipboard-read; clipboard-write');

  content.appendChild(iframe);
  return content;
}

// Improved draggable implementation with proper constraints
function initializeWindowDragging(windowEl, handle) {
  let dragState = null;

  const handleMouseDown = (e) => {
    e.preventDefault();

    const rect = windowEl.getBoundingClientRect();
    dragState = {
      startX: e.clientX,
      startY: e.clientY,
      startLeft: rect.left,
      startTop: rect.top
    };

    // Add dragging class for potential visual feedback
    windowEl.classList.add('dragging');
    document.body.style.userSelect = 'none';

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!dragState) return;

    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;

    let newLeft = dragState.startLeft + deltaX;
    let newTop = dragState.startTop + deltaY;

    // Constrain to viewport with margins
    const rect = windowEl.getBoundingClientRect();
    const maxLeft = window.innerWidth - rect.width - WINDOW_CONFIG.minMargin;
    const maxTop = window.innerHeight - rect.height - WINDOW_CONFIG.minMargin;

    newLeft = clampValue(newLeft, WINDOW_CONFIG.minMargin, maxLeft);
    newTop = clampValue(newTop, WINDOW_CONFIG.minMargin, maxTop);

    windowEl.style.left = `${newLeft}px`;
    windowEl.style.top = `${newTop}px`;
    windowEl.style.right = 'auto';
    windowEl.style.bottom = 'auto';
    windowEl.style.transform = 'none';
  };

  const handleMouseUp = () => {
    if (!dragState) return;

    windowEl.classList.remove('dragging');
    document.body.style.userSelect = '';

    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);

    dragState = null;
  };

  handle.addEventListener('mousedown', handleMouseDown);
}

// Toggle the draggable window
function toggleDraggableWindow() {
  if (!vuDraggableWindow) {
    createDraggableWindow();
  }
  
  if (vuDraggableWindow.classList.contains('hidden')) {
    showDraggableWindow();
  } else {
    hideDraggableWindow();
  }
}

// Show the draggable window
function showDraggableWindow() {
  // Create if not exists
  if (!vuDraggableWindow) {
    createDraggableWindow();
  }
  
  // Remove hidden class
  vuDraggableWindow.classList.remove('hidden');
  
  // Position window if not already positioned
  if (!vuDraggableWindow.style.top && !vuDraggableWindow.style.left) {
    // Default to centered position
    vuDraggableWindow.style.top = '50%';
    vuDraggableWindow.style.left = '50%';
    vuDraggableWindow.style.transform = 'translate(-50%, -50%)';
  }
}

// Hide the draggable window
function hideDraggableWindow() {
  if (vuDraggableWindow) {
    vuDraggableWindow.classList.add('hidden');
  }
}

// Check if the current page is likely educational or informational
function isEducationalPage() {
  // PDFs are often educational/informational content
  if (isPDFPage()) {
    return true;
  }
  
  // Domains commonly used for educational or informational purposes
  const educationalDomains = [
    '.edu', '.ac.', 'scholar.', 'academic.', 'research.', 'science.',
    'learning.', 'study.', 'course.', 'class.', 'lecture.', 'school.',
    'university.', 'college.', 'academy.', 'institute.', 'faculty.',
    '.org', '.gov', '.info', 'wikipedia.', 'encyclopedia.', 'khanacademy.', 'britannica.'
  ];

  // Keywords that suggest informational or article content
  const infoKeywords = [
    'education', 'learning', 'academic', 'course', 'study', 'research', 'school', 'university', 'college', 'lecture', 'class',
    'article', 'blog', 'news', 'how to', 'guide', 'tutorial', 'encyclopedia', 'reference', 'explanation', 'information', 'faq', 'summary', 'lesson', 'curriculum', 'report', 'analysis', 'review', 'insight', 'explained'
  ];

  const url = window.location.hostname.toLowerCase();
  const pathname = window.location.pathname.toLowerCase();
  const metaTags = document.querySelectorAll('meta[name="keywords"], meta[name="description"], meta[property^="og:"], meta[name^="twitter:"]');
  const metaContent = Array.from(metaTags).map(tag => tag.getAttribute('content') || '').join(' ').toLowerCase();

  // Check domain
  const isEduDomain = educationalDomains.some(domain => url.includes(domain));

  // Check meta content and URL for keywords
  const hasInfoKeywords = infoKeywords.some(keyword => metaContent.includes(keyword) || pathname.includes(keyword));

  // Check for article-like structure
  const hasArticleTag = document.querySelector('article, main, section');
  const hasHeadings = document.querySelector('h1, h2');
  const wordCount = document.body.innerText.split(/\s+/).length;

  // Check for Open Graph type article
  const ogType = document.querySelector('meta[property="og:type"]');
  const isOGArticle = ogType && ogType.getAttribute('content') && ogType.getAttribute('content').toLowerCase().includes('article');

  // Heuristic: If the page has a lot of text and at least one heading, it's likely informational
  const isLongInformational = wordCount > 500 && hasHeadings;

  // Return true if any of the above criteria are met
  return (
    isEduDomain ||
    hasInfoKeywords ||
    hasArticleTag ||
    isOGArticle ||
    isLongInformational
  );
}

// Initialize content script
async function initialize() {
  console.log('VU Education Lab AI Assistant content script loaded');
  if (isEducationalPage()) {
    chrome.storage.local.get(['show_floating_popup'], (result) => {
      const showFloating = result.show_floating_popup !== false; // default true
      if (showFloating) {
        setTimeout(() => {
          createFloatingIcon();
        }, 1500);
      }
    });
  }
}

// Run initialization
initialize();
