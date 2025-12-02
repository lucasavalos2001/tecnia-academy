import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types'; 

// 1. Crear el contexto
const AuthContext = createContext();

// URL base desde .env
const API_URL = import.meta.env.VITE_API_BASE_URL; 

// 2. Crear el Proveedor del Contexto
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const storedUser = localStorage.getItem('user');
        return storedUser ? JSON.parse(storedUser) : null;
    });

    const [token, setToken] = useState(() => localStorage.getItem('token') || null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // 3. Configurar Axios
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            localStorage.setItem('token', token);
        } else {
            delete axios.defaults.headers.common['Authorization'];
            localStorage.removeItem('token');
        }
    }, [token]);

    // 4. Función de Login (CORREGIDA)
    const login = async (email, password) => {
        setIsLoading(true);
        setError(null);
        try {
            // CAMBIO: Se envía 'password' en lugar de 'contraseña'
            const res = await axios.post(`${API_URL}/auth/login`, { 
                email, 
                password // Esto equivale a password: password
            });
            
            const { token: newToken, user: userData } = res.data;

            setToken(newToken);
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
            
            setIsLoading(false);
            return { success: true, message: res.data.message };
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Error de red o servidor al iniciar sesión.';
            setError(errorMessage);
            setIsLoading(false);
            return { success: false, message: errorMessage };
        }
    };

    // 5. Función de Registro (CORREGIDA)
    const register = async (name, email, password) => {
        setIsLoading(true);
        setError(null);
        try {
            // CAMBIO: Se envía 'password' en lugar de 'contraseña'
            const res = await axios.post(`${API_URL}/auth/registro`, { 
                nombre_completo: name, 
                email, 
                password // Esto equivale a password: password
            });

            setIsLoading(false);
            return { success: true, message: res.data.message }; 
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Error de red o servidor al registrar.';
            setError(errorMessage);
            setIsLoading(false);
            return { success: false, message: errorMessage };
        }
    };

    // 6. Función de Logout
    const logout = () => {
        setToken(null);
        setUser(null);
    };
    
    // Validar roles
    const userIsAdmin = user?.rol === 'admin' || user?.rol === 'superadmin';
    const userIsInstructor = user?.rol === 'instructor' || userIsAdmin;

    const contextValue = {
        user,
        token,
        isLoading,
        error,
        isLoggedIn: !!token, 
        isAdmin: userIsAdmin,
        isInstructor: userIsInstructor,
        login,
        register,
        logout,
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

AuthProvider.propTypes = {
    children: PropTypes.node.isRequired,
};

// 7. Hook personalizado
export const useAuth = () => {
    return useContext(AuthContext);
};