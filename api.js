// API integration module for VU Education Lab AI Assistant
// Backend implementation - calls secure backend server instead of direct Gemini API

// Configuration - Backend URL
// For local development: http://localhost:3000
// For production: Replace with your Heroku app URL
const BACKEND_URL = 'https://vu-education-lab-backend-f20c07d5ca03.herokuapp.com'; // Change YOUR_HEROKU_APP_NAME to your actual Heroku app name

/**
 * Generate content using the backend server
 * @param {string} prompt - The user prompt
 * @param {Object} options - Additional options
 * @returns {Promise<string>} - The generated content
 */
async function generateContent(prompt, options = {}) {
  try {
    console.log(`Starting backend request with prompt: ${prompt.substring(0, 100)}...`);

    // Validate input
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Invalid input: prompt is required and must be a string');
    }

    // Get user authentication
    const user = await window.VUAuth.getCurrentUser();
    if (!user || !user.email || !user.token) {
      throw new Error('User not authenticated. Please sign in.');
    }

    // Prepare request body for backend
    const requestBody = {
      prompt: prompt,
      systemPrompt: options.systemPrompt || null,
      feature: options.feature || 'general'
    };

    console.log("Making request to backend:", `${BACKEND_URL}/api/generate`);

    // Make request to backend server WITH AUTHENTICATION
    const response = await fetch(`${BACKEND_URL}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.token}`,
          "X-User-Email": user.email,
          "X-Extension-ID": chrome.runtime.id
        },
        body: JSON.stringify(requestBody)
    });

    // Get the raw response text for better error handling
    const responseText = await response.text();
    console.log("Raw backend response:", responseText.substring(0, 200) + "...");

    // Try to parse the response as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse backend response as JSON:", parseError);
      throw new Error(`Failed to parse backend response: ${responseText.substring(0, 100)}...`);
    }

    // Check if response is successful
    if (!response.ok) {
      const errorMessage = data.error || response.statusText;
      console.error("Backend Error:", {
        status: response.status,
        statusText: response.statusText,
        errorMessage,
        data
      });

      // Provide user-friendly error messages based on status
      let userMessage;
      switch (response.status) {
        case 401:
          userMessage = "Authentication failed. Please sign in again.";
          break;
        case 403:
          userMessage = "Access denied. Only VU emails are allowed.";
          break;
        case 400:
          userMessage = `Invalid request: ${errorMessage}`;
          break;
        case 429:
          userMessage = "Too many requests. Please wait a moment and try again.";
          break;
        case 500:
          userMessage = `Server error: ${errorMessage}`;
          break;
        case 503:
          userMessage = "Backend server is temporarily unavailable. Please try again later.";
          break;
        default:
          userMessage = `Backend error (${response.status}): ${errorMessage}`;
      }

      throw new Error(userMessage);
    }

    // Verify the response structure and extract the content
    if (!data.content) {
      console.error("Unexpected backend response structure:", data);
      throw new Error("Unexpected response structure from backend server");
    }

    console.log("Content generation successful");
    return data.content;

  } catch (error) {
    console.error('Error calling backend API:', error);
    
    // Check if it's a network error
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(`Unable to connect to backend server. Please check if the server is running at ${BACKEND_URL}`);
    }
    
    // Re-throw the error with appropriate message
    throw new Error(error.message || "Unknown error occurred while contacting the backend server");
  }
}

/**
 * Validate the backend connection and API key configuration
 * @returns {Promise<boolean>} - Whether the backend is accessible and properly configured
 */
async function validateConnection() {
  try {
    console.log("Validating backend connection...");

    // Get user info for authentication
    const user = await window.VUAuth.getCurrentUser();
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add auth if user is signed in
    if (user?.token && user?.email) {
      headers['Authorization'] = `Bearer ${user.token}`;
      headers['X-User-Email'] = user.email;
      headers['X-Extension-ID'] = chrome.runtime.id;
    }

    // First check if backend is reachable
    const healthResponse = await fetch(`${BACKEND_URL}/api/health`, {
      method: 'GET',
      headers: headers
    });

    if (!healthResponse.ok) {
      console.error("Backend health check failed:", healthResponse.status);
      return false;
    }

    const healthData = await healthResponse.json();
    console.log("Backend health check passed:", healthData);

    // Then check if API key is configured on backend
    const validateResponse = await fetch(`${BACKEND_URL}/api/validate`, {
        method: 'GET',
        headers: headers
    });

    if (!validateResponse.ok) {
      console.error("Backend validation check failed:", validateResponse.status);
      return false;
    }

    const validateData = await validateResponse.json();
    console.log("Backend validation result:", validateData);

    return validateData.valid === true;

  } catch (error) {
    console.error('Error validating backend connection:', error);
    return false;
  }
}

/**
 * Get backend configuration and status
 * @returns {Promise<Object>} - Backend status information
 */
async function getBackendStatus() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`);
    if (!response.ok) {
      throw new Error(`Backend health check failed: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error getting backend status:', error);
    throw new Error('Backend server is not accessible');
  }
}

// Export functions for use in popup.js
window.GeminiAPI = {
  generateContent,
  validateConnection,
  getBackendStatus,
  // Legacy compatibility - remove API key functions since they're no longer needed
  validateApiKey: async () => {
    console.warn('validateApiKey is deprecated - API keys are now handled by the backend');
    return await validateConnection();
  }
};
