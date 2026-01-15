import './index.css';

/**
 * ============================================
 * SUPER BROWSER - Renderer Process
 * ============================================
 * Premium always-on-top mini browser with
 * robust error handling and state management
 */

// ===== DOM ELEMENT REFERENCES =====
const elements = {
  // Navigation controls
  backButton: document.getElementById('back-button'),
  forwardButton: document.getElementById('forward-button'),
  reloadButton: document.getElementById('reload-button'),
  searchButton: document.getElementById('search-button'),
  goButton: document.getElementById('go-button'),
  hubButton: document.getElementById('hub-button'),
  
  // URL input
  urlForm: document.getElementById('url-form'),
  urlInput: document.getElementById('url-input'),
  
  // Webview and overlays
  webview: document.getElementById('webview'),
  loadingBar: document.getElementById('loading-bar'),
  errorOverlay: document.getElementById('error-overlay'),
  errorTitle: document.getElementById('error-title'),
  errorMessage: document.getElementById('error-message'),
  retryButton: document.getElementById('retry-button'),
  
  // Streaming hub
  hubModal: document.getElementById('hub-modal'),
  hubClose: document.getElementById('hub-close'),
  hubBackdrop: document.querySelector('.hub-backdrop'),
  platformButtons: document.querySelectorAll('.platform-btn')
};

// ===== APPLICATION STATE =====
const state = {
  isLoading: false,
  currentUrl: '',
  canGoBack: false,
  canGoForward: false,
  lastError: null
};

// ===== CONSTANTS =====
const CONFIG = {
  DEFAULT_URL: 'https://www.google.com',
  SEARCH_ENGINE: 'https://www.google.com/search?q=',
  URL_PATTERN: /^(https?:\/\/)?([\w-]+(\.[\w-]+)+\.?(:\d+)?(\/.*)?)/i,
  DEBOUNCE_DELAY: 300
};

// ===== UTILITY FUNCTIONS =====

/**
 * Debounce function to limit function calls
 */
function debounce(func, wait) {
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

/**
 * Validate and normalize URL input
 */
function normalizeUrl(input) {
  const trimmed = input.trim();
  
  if (!trimmed) {
    return { valid: false, url: null };
  }
  
  // Already has protocol
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return { valid: true, url: trimmed };
  }
  
  // Looks like a domain (has dots, no spaces)
  if (CONFIG.URL_PATTERN.test(trimmed)) {
    return { valid: true, url: `https://${trimmed}` };
  }
  
  // Treat as search query
  return { valid: true, url: null, isSearch: true, query: trimmed };
}

/**
 * Update navigation button states
 */
function updateNavigationState() {
  state.canGoBack = elements.webview.canGoBack();
  state.canGoForward = elements.webview.canGoForward();
  
  elements.backButton.disabled = !state.canGoBack;
  elements.forwardButton.disabled = !state.canGoForward;
  
  // Update aria attributes
  elements.backButton.setAttribute('aria-disabled', !state.canGoBack);
  elements.forwardButton.setAttribute('aria-disabled', !state.canGoForward);
}

/**
 * Update loading state
 */
function setLoadingState(isLoading) {
  state.isLoading = isLoading;
  
  if (isLoading) {
    elements.loadingBar.classList.add('active');
    elements.reloadButton.classList.add('loading');
    elements.reloadButton.setAttribute('title', 'Stop loading (Esc)');
  } else {
    elements.loadingBar.classList.remove('active');
    elements.reloadButton.classList.remove('loading');
    elements.reloadButton.setAttribute('title', 'Reload (Ctrl+R)');
  }
}

/**
 * Show error overlay
 */
function showError(title, message) {
  state.lastError = { title, message };
  elements.errorTitle.textContent = title;
  elements.errorMessage.textContent = message;
  elements.errorOverlay.classList.remove('hidden');
}

/**
 * Hide error overlay
 */
function hideError() {
  state.lastError = null;
  elements.errorOverlay.classList.add('hidden');
}

/**
 * Show streaming hub modal
 */
function showHub() {
  elements.hubModal.classList.remove('hidden');
  // Focus first platform button for keyboard navigation
  const firstButton = elements.hubModal.querySelector('.platform-btn');
  if (firstButton) {
    setTimeout(() => firstButton.focus(), 100);
  }
}

/**
 * Hide streaming hub modal
 */
function hideHub() {
  elements.hubModal.classList.add('hidden');
  elements.hubButton.focus();
}

/**
 * Navigate to streaming platform
 */
function navigateToPlatform(url) {
  hideHub();
  hideError();
  elements.webview.src = url;
  state.currentUrl = url;
  elements.urlInput.value = url;
}

// ===== NAVIGATION FUNCTIONS =====

/**
 * Navigate to URL or perform search
 */
function navigate(input) {
  const { valid, url, isSearch, query } = normalizeUrl(input);
  
  if (!valid) {
    showError('Invalid Input', 'Please enter a valid URL or search query');
    return;
  }
  
  hideError();
  
  try {
    if (isSearch) {
      elements.webview.src = `${CONFIG.SEARCH_ENGINE}${encodeURIComponent(query)}`;
    } else {
      elements.webview.src = url;
    }
    state.currentUrl = elements.webview.src;
  } catch (error) {
    console.error('Navigation error:', error);
    showError('Navigation Failed', 'Unable to navigate to the requested page');
  }
}

/**
 * Handle URL form submission
 */
function handleFormSubmit(event) {
  event.preventDefault();
  const input = elements.urlInput.value;
  navigate(input);
}

/**
 * Handle search button click
 */
function handleSearch() {
  const query = elements.urlInput.value.trim();
  
  if (!query) {
    elements.webview.src = CONFIG.DEFAULT_URL;
    return;
  }
  
  navigate(query);
}

/**
 * Go back in history
 */
function goBack() {
  if (elements.webview.canGoBack()) {
    elements.webview.goBack();
  }
}

/**
 * Go forward in history
 */
function goForward() {
  if (elements.webview.canGoForward()) {
    elements.webview.goForward();
  }
}

/**
 * Reload or stop loading
 */
function reloadOrStop() {
  if (state.isLoading) {
    elements.webview.stop();
    setLoadingState(false);
  } else {
    hideError();
    elements.webview.reload();
  }
}

/**
 * Retry last navigation
 */
function retryNavigation() {
  hideError();
  if (state.currentUrl) {
    elements.webview.src = state.currentUrl;
  } else {
    elements.webview.src = CONFIG.DEFAULT_URL;
  }
}

// ===== WEBVIEW EVENT HANDLERS =====

/**
 * Handle successful navigation
 */
function handleDidNavigate(event) {
  const url = event.url;
  state.currentUrl = url;
  elements.urlInput.value = url;
  updateNavigationState();
  hideError();
}

/**
 * Handle navigation in page (anchor links, etc.)
 */
function handleDidNavigateInPage(event) {
  if (event.isMainFrame) {
    state.currentUrl = event.url;
    elements.urlInput.value = event.url;
    updateNavigationState();
  }
}

/**
 * Handle page load start
 */
function handleDidStartLoading() {
  setLoadingState(true);
}

/**
 * Handle page load complete
 */
function handleDidStopLoading() {
  setLoadingState(false);
  updateNavigationState();
}

/**
 * Handle load failures
 */
function handleDidFailLoad(event) {
  // Ignore aborted loads (-3) and cache misses
  if (event.errorCode === -3 || event.errorCode === 0) {
    return;
  }
  
  setLoadingState(false);
  
  const errorMessages = {
    '-105': { title: 'No Internet Connection', message: 'Check your network connection and try again' },
    '-106': { title: 'Internet Disconnected', message: 'Please check your network settings' },
    '-107': { title: 'SSL Certificate Error', message: 'This site\'s security certificate is not trusted' },
    '-200': { title: 'Certificate Error', message: 'The security certificate of this site is invalid' },
    '-300': { title: 'Server Not Found', message: 'The server could not be reached' },
  };
  
  const error = errorMessages[event.errorCode.toString()] || {
    title: 'Failed to Load',
    message: `Error: ${event.errorDescription || 'Unknown error occurred'}`
  };
  
  showError(error.title, error.message);
}

/**
 * Handle page title updates
 */
function handlePageTitleUpdated(event) {
  // Update window title if needed
  document.title = `${event.title} - Super Browser`;
}

// ===== KEYBOARD SHORTCUTS =====

/**
 * Handle keyboard shortcuts
 */
function handleKeyboardShortcuts(event) {
  // Ctrl/Cmd + R: Reload
  if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
    event.preventDefault();
    reloadOrStop();
  }
  
  // Alt + Left: Back
  if (event.altKey && event.key === 'ArrowLeft') {
    event.preventDefault();
    goBack();
  }
  
  // Alt + Right: Forward
  if (event.altKey && event.key === 'ArrowRight') {
    event.preventDefault();
    goForward();
  }
  
  // Esc: Stop loading
  if (event.key === 'Escape' && state.isLoading) {
    event.preventDefault();
    elements.webview.stop();
    setLoadingState(false);
  }
  
  // Ctrl/Cmd + L: Focus URL bar
  if ((event.ctrlKey || event.metaKey) && event.key === 'l') {
    event.preventDefault();
    elements.urlInput.select();
  }
  
  // Ctrl/Cmd + H: Toggle hub
  if ((event.ctrlKey || event.metaKey) && event.key === 'h') {
    event.preventDefault();
    if (elements.hubModal.classList.contains('hidden')) {
      showHub();
    } else {
      hideHub();
    }
  }
  
  // Escape: Close hub if open
  if (event.key === 'Escape' && !elements.hubModal.classList.contains('hidden')) {
    event.preventDefault();
    hideHub();
  }
}

// ===== EVENT LISTENER SETUP =====

function initializeEventListeners() {
  // Form submission
  elements.urlForm.addEventListener('submit', handleFormSubmit);
  
  // Navigation buttons
  elements.backButton.addEventListener('click', goBack);
  elements.forwardButton.addEventListener('click', goForward);
  elements.reloadButton.addEventListener('click', reloadOrStop);
  elements.searchButton.addEventListener('click', handleSearch);
  elements.goButton.addEventListener('click', handleFormSubmit);
  elements.hubButton.addEventListener('click', showHub);
  
  // Error retry
  elements.retryButton.addEventListener('click', retryNavigation);
  
  // Hub modal controls
  elements.hubClose.addEventListener('click', hideHub);
  elements.hubBackdrop.addEventListener('click', hideHub);
  
  // Platform buttons
  elements.platformButtons.forEach(button => {
    button.addEventListener('click', () => {
      const url = button.getAttribute('data-url');
      if (url) {
        navigateToPlatform(url);
      }
    });
  });
  
  // Webview events
  elements.webview.addEventListener('did-navigate', handleDidNavigate);
  elements.webview.addEventListener('did-navigate-in-page', handleDidNavigateInPage);
  elements.webview.addEventListener('did-start-loading', handleDidStartLoading);
  elements.webview.addEventListener('did-stop-loading', handleDidStopLoading);
  elements.webview.addEventListener('did-fail-load', handleDidFailLoad);
  elements.webview.addEventListener('page-title-updated', handlePageTitleUpdated);
  
  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);
  
  // URL input focus
  elements.urlInput.addEventListener('focus', () => {
    elements.urlInput.select();
  });
}

// ===== INITIALIZATION =====

function initialize() {
  console.log('🚀 Super Browser initialized');
  
  // Set initial URL
  elements.webview.src = CONFIG.DEFAULT_URL;
  
  // Setup event listeners
  initializeEventListeners();
  
  // Initial state
  updateNavigationState();
}

// ===== DOM READY =====

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}