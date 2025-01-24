import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Loading from './Loading';
import { API_BASE_URL } from '../config';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refreshToken');

      if (!token) {
        handleLogout();
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (response.ok && data.isValid) {
          setIsAuthenticated(true);
          localStorage.setItem('user', JSON.stringify(data.user));
        } else if (response.status === 401 && refreshToken) {
          // Token expired, try to refresh
          try {
            const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh-token`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ refreshToken })
            });

            const refreshData = await refreshResponse.json();

            if (refreshResponse.ok) {
              localStorage.setItem('token', refreshData.token);
              localStorage.setItem('refreshToken', refreshData.refreshToken);
              localStorage.setItem('user', JSON.stringify(refreshData.user));
              setIsAuthenticated(true);
            } else {
              handleLogout();
            }
          } catch (refreshError) {
            handleLogout();
          }
        } else {
          handleLogout();
        }
      } catch (error) {
        handleLogout();
      } finally {
        setIsLoading(false);
      }
    };

    const handleLogout = () => {
      setIsAuthenticated(false);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      navigate('/login');
    };

    verifyToken();
  }, [navigate]);

  if (isLoading) {
    return <Loading />;
  }

  return isAuthenticated ? <>{children}</> : null;
};

export default PrivateRoute;
