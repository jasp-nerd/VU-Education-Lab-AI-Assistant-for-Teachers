// Authentication module for VU Education Lab AI Assistant
// Handles Google OAuth authentication and validates VU email domains

// Allowed email domains for VU users
const ALLOWED_DOMAINS = ['vu.nl', 'student.vu.nl'];

/**
 * Check if an email address is from an allowed VU domain
 * @param {string} email - The email address to validate
 * @returns {boolean} - True if email is from an allowed domain
 */
function isValidVUEmail(email) {
  if (!email) return false;
  
  const emailLower = email.toLowerCase();
  return ALLOWED_DOMAINS.some(domain => emailLower.endsWith('@' + domain));
}

/**
 * Get the current authenticated user
 * @returns {Promise<Object|null>} - User object or null if not authenticated
 */
async function getCurrentUser() {
  try {
    const result = await chrome.storage.local.get(['vuAuthUser']);
    return result.vuAuthUser || null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Save user data to storage
 * @param {Object} user - User data to save
 */
async function saveUser(user) {
  try {
    await chrome.storage.local.set({ vuAuthUser: user });
  } catch (error) {
    console.error('Error saving user:', error);
    throw error;
  }
}

/**
 * Clear user data from storage
 */
async function clearUser() {
  try {
    await chrome.storage.local.remove(['vuAuthUser']);
  } catch (error) {
    console.error('Error clearing user:', error);
    throw error;
  }
}

/**
 * Initiate Google OAuth authentication flow
 * @returns {Promise<Object>} - User object if authentication successful
 */
async function signIn() {
  try {
    // Get OAuth token
    const token = await new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(token);
        }
      });
    });

    if (!token) {
      throw new Error('No token received from Google OAuth');
    }

    // Fetch user info from Google
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info from Google');
    }

    const userInfo = await response.json();

    // Validate email domain
    if (!isValidVUEmail(userInfo.email)) {
      // Revoke the token since user is not authorized
      await revokeToken(token);
      throw new Error(`Access denied. Only VU email addresses (@vu.nl or @student.vu.nl) are allowed. Your email: ${userInfo.email}`);
    }

    // Create user object
    const user = {
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      id: userInfo.id,
      token: token,
      authenticatedAt: new Date().toISOString()
    };

    // Save user to storage
    await saveUser(user);

    return user;
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
}

/**
 * Sign out the current user
 */
async function signOut() {
  try {
    const user = await getCurrentUser();
    
    if (user && user.token) {
      // Revoke the OAuth token
      await revokeToken(user.token);
    }

    // Clear user from storage
    await clearUser();

    return true;
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}

/**
 * Revoke an OAuth token
 * @param {string} token - The token to revoke
 */
async function revokeToken(token) {
  try {
    await new Promise((resolve, reject) => {
      chrome.identity.removeCachedAuthToken({ token }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          // Also revoke on Google's servers
          fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`)
            .then(() => resolve())
            .catch(reject);
        }
      });
    });
  } catch (error) {
    console.error('Error revoking token:', error);
    // Don't throw - continue with sign out even if revocation fails
  }
}

/**
 * Check if user is authenticated with valid VU email
 * @returns {Promise<boolean>} - True if authenticated with valid VU email
 */
async function isAuthenticated() {
  try {
    const user = await getCurrentUser();
    
    if (!user || !user.email) {
      return false;
    }

    // Validate email domain
    if (!isValidVUEmail(user.email)) {
      // Invalid domain - clear user data
      await clearUser();
      return false;
    }

    // Check if token is still valid (optional - you might want to verify with Google)
    if (user.token) {
      // You could add token validation here if needed
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
}

/**
 * Get user profile information
 * @returns {Promise<Object|null>} - User profile or null
 */
async function getUserProfile() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return null;
    }

    return {
      email: user.email,
      name: user.name,
      picture: user.picture,
      authenticatedAt: user.authenticatedAt
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

/**
 * Get the current OAuth token
 * @returns {Promise<string|null>} - OAuth token or null
 */
async function getUserToken() {
  try {
    const user = await getCurrentUser();
    return user?.token || null;
  } catch (error) {
    console.error('Error getting user token:', error);
    return null;
  }
}

// Export authentication API
window.VUAuth = {
  signIn,
  signOut,
  isAuthenticated,
  getCurrentUser,
  getUserProfile,
  isValidVUEmail,
  getUserToken
};

