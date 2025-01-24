import { API_BASE_URL } from '../config';

export const applyTheme = (theme: 'light' | 'dark') => {
  // Remove both themes first
  document.documentElement.classList.remove('light', 'dark');
  // Add the new theme
  document.documentElement.classList.add(theme);
};

export const saveTheme = async (theme: 'light' | 'dark'): Promise<boolean> => {
  const token = localStorage.getItem('token');
  if (!token) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/api/theme`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ theme })
    });

    if (response.ok) {
      applyTheme(theme);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error saving theme:', error);
    return false;
  }
};

export const toggleTheme = async () => {
  const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  // Save theme to MongoDB
  await saveTheme(newTheme);
  
  return newTheme;
};
