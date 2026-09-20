// API Configuration for different environments
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const API_BASE_URL = API_URL;

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
