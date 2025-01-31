import { API_BASE_URL } from '../config';
import { createTheme, Theme } from '@mui/material/styles';

// Material UI themes
const getMuiTheme = (mode: 'light' | 'dark'): Theme => createTheme({
  palette: {
    mode,
    ...(mode === 'light' 
      ? {
          primary: {
            main: '#6366f1',
            light: '#818cf8',
            dark: '#4f46e5',
          },
          secondary: {
            main: '#14b8a6',
            light: '#2dd4bf',
            dark: '#0d9488',
          },
          background: {
            default: '#f9fafb',
            paper: '#ffffff',
          },
          text: {
            primary: '#111827',
            secondary: '#6b7280',
          },
          divider: 'rgba(0, 0, 0, 0.12)',
        }
      : {
          primary: {
            main: '#818cf8',
            light: '#a5b4fc',
            dark: '#6366f1',
          },
          secondary: {
            main: '#2dd4bf',
            light: '#5eead4',
            dark: '#14b8a6',
          },
          background: {
            default: '#111827',
            paper: '#1f2937',
          },
          text: {
            primary: '#f9fafb',
            secondary: '#9ca3af',
          },
          divider: 'rgba(255, 255, 255, 0.12)',
        }
    ),
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 700,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '8px',
          fontWeight: 600,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

let currentTheme: Theme = getMuiTheme('light');

export const getCurrentTheme = (): Theme => currentTheme;

export const applyTheme = (mode: 'light' | 'dark'): void => {
  // Update root element class
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(mode);

  // Update Material UI theme
  currentTheme = getMuiTheme(mode);

  // Update CSS variables for global styles
  document.documentElement.style.setProperty('--background-default', currentTheme.palette.background.default);
  document.documentElement.style.setProperty('--background-paper', currentTheme.palette.background.paper);
  document.documentElement.style.setProperty('--text-primary', currentTheme.palette.text.primary);
  document.documentElement.style.setProperty('--text-secondary', currentTheme.palette.text.secondary);
  document.documentElement.style.setProperty('--primary-main', currentTheme.palette.primary.main);
  document.documentElement.style.setProperty('--primary-light', currentTheme.palette.primary.light);
  document.documentElement.style.setProperty('--primary-dark', currentTheme.palette.primary.dark);

  // Dispatch theme change event
  window.dispatchEvent(new CustomEvent('themechange', { detail: mode }));
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

export const toggleTheme = (): void => {
  const currentMode = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
  saveTheme(currentMode);
};
