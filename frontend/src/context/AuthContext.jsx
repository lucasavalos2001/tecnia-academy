import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types'; 

const AuthContext = createContext();
const API_URL = import.meta.env.VITE_API_BASE_URL; 

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const storedUser = localStorage.getItem('user');
            return storedUser ? JSON.parse(storedUser) : null;
        } catch (error) {
            return null;
        }
    });

    const [token, setToken] = useState(() => localStorage.getItem('token') || null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // 🟢 INTERCEPTOR Y CONFIGURACIÓN DE AXIOS
    useEffect(() => {
        const requestInterceptor = axios.interceptors.request.use((config) => {
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });

        const responseInterceptor = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) {
                    logout(); // Auto-logout si el token vence
                }
                return Promise.reject(error);
            }
        );

        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }

        return () => {
            axios.interceptors.request.eject(requestInterceptor);
            axios.interceptors.response.eject(responseInterceptor);
        };
    }, [token]);

    // 🟢 SINCRONIZACIÓN ENTRE PESTAÑAS (Imprescindible para calidad)
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === 'token' && !e.newValue) logout();
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const login = async (email, password) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await axios.post(`${API_URL}/auth/login`, { email, password });
            const { token: newToken, user: userData } = res.data;

            setToken(newToken);
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
            
            return { success: true };
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Error de conexión.';
            setError(errorMessage);
            return { success: false, message: errorMessage };
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (name, email, password) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await axios.post(`${API_URL}/auth/registro`, { 
                nombre_completo: name, 
                email, 
                password 
            });
            return { success: true, message: res.data.message }; 
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Error al registrar.';
            setError(errorMessage);
            return { success: false, message: errorMessage };
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.clear();
        window.location.href = '/login'; // Fuerza limpieza de estado
    };
    
    // Optimizamos el valor del contexto para evitar re-renders innecesarios
    const contextValue = useMemo(() => ({
        user,
        token,
        isLoading,
        error,
        isLoggedIn: !!token, 
        isAdmin: user?.rol === 'admin' || user?.rol === 'superadmin',
        isInstructor: user?.rol === 'instructor' || user?.rol === 'admin' || user?.rol === 'superadmin',
        login,
        register,
        logout,
    }), [user, token, isLoading, error]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

AuthProvider.propTypes = { children: PropTypes.node.isRequired };
export const useAuth = () => useContext(AuthContext);