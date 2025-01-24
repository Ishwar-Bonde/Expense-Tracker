import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config';

const checkTokenExpiry = () => {
  const expiryTime = localStorage.getItem('tokenExpiry');
  if (!expiryTime) return false;

  const expiry = new Date(expiryTime);
  const now = new Date();
  return now > expiry;
};

export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    window.location.href = '/login';
    throw new Error('No authentication token found');
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };

  const finalUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  try {
    const response = await fetch(finalUrl, { ...options, headers });

    if (response.status === 401) {
      const data = await response.json();
      localStorage.clear();

      switch (data.error) {
        case 'SESSION_INVALID':
          toast.error('This account is already logged in on another device', {
            duration: 5000,
            position: 'top-center',
          });
          break;
        case 'NO_ACTIVE_SESSION':
          toast.error('Your session has expired. Please login again.', {
            duration: 5000,
            position: 'top-center',
          });
          break;
        case 'TOKEN_EXPIRED':
          toast.error('Your session has expired. Please login again.', {
            duration: 5000,
            position: 'top-center',
          });
          break;
        default:
          toast.error('Authentication failed. Please login again.', {
            duration: 5000,
            position: 'top-center',
          });
      }

      // Add a small delay before redirect to show the toast
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);

      throw new Error(data.message || 'Authentication failed');
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Request failed');
    }

    return response;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};