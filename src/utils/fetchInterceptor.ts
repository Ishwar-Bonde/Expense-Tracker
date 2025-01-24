import { toast } from 'react-toastify';
import { API_BASE_URL } from '../config';

const checkTokenExpiry = () => {
  const expiryTime = localStorage.getItem('tokenExpiry');
  if (!expiryTime) return true;

  const now = new Date();
  const expiry = new Date(expiryTime);
  return now >= expiry;
};

export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  let token = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refreshToken');

  // Check if token has expired
  if (checkTokenExpiry()) {
    // Try to refresh the token
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken })
        });

        if (refreshResponse.ok) {
          const { token: newToken } = await refreshResponse.json();
          localStorage.setItem('token', newToken);
          
          // Set new expiry time (1 hour from now)
          const expiryTime = new Date();
          expiryTime.setHours(expiryTime.getHours() + 1);
          localStorage.setItem('tokenExpiry', expiryTime.toISOString());
          
          token = newToken;
        } else {
          // Refresh failed, clear storage and redirect to login
          localStorage.clear();
          window.location.href = '/login';
          throw new Error('Session expired. Please login again.');
        }
      } catch (error) {
        localStorage.clear();
        window.location.href = '/login';
        throw new Error('Session expired. Please login again.');
      }
    } else {
      localStorage.clear();
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }
  }

  // Determine if the URL is absolute or relative
  const finalUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  const headers = {
    ...options.headers,
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  try {
    const response = await fetch(finalUrl, { ...options, headers });

    if (response.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return response;
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Request failed');
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error');
  }
};