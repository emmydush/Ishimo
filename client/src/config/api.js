// API Configuration for different environments
// Default is empty on purpose: requests go to the same origin (/api/...), which
// works in dev (Vite proxy) and in production (nginx proxies to the API).
// Set VITE_API_URL at build time to point at a separate API host instead.
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export const API_BASE_URL = API_URL;

// Turns a network failure into an actionable message that also shows which API
// origin this build is pointed at. Without this a misconfigured deployment only
// shows a generic "server error".
export const networkErrorMessage = (error) => {
  const origin = API_URL || window.location.origin;
  const detail = (error && error.message) || 'request failed';
  return `Cannot reach the API at ${origin} (${detail}).`;
};

// Helper function to make API calls
export const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const mergedOptions = { ...defaultOptions, ...options };

  // Add token if available
  const token = localStorage.getItem('token');
  if (token) {
    mergedOptions.headers = {
      ...mergedOptions.headers,
      'Authorization': `Bearer ${token}`,
    };
  }

  try {
    const response = await fetch(url, mergedOptions);
    return response;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};
