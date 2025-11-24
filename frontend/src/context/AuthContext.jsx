import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
// Debes instalar prop-types (npm install prop-types) para usar esto en desarrollo
import PropTypes from 'prop-types'; 

// 1. Crear el contexto
const AuthContext = createContext();

// Obtener la URL base de la API desde el archivo .env
// Verifica que tu archivo frontend/.env tenga VITE_API_BASE_URL=http://localhost:3000/api
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

    // 3. Configurar Axios para enviar el token automáticamente
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            localStorage.setItem('token', token);
        } else {
            delete axios.defaults.headers.common['Authorization'];
            localStorage.removeItem('token');
        }
        // console.log("Estado de Autenticación cambiado. Token:", !!token);
    }, [token]);

    // 4. Función de Login
    const login = async (email, password) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await axios.post(`${API_URL}/auth/login`, { email, contraseña: password });
            
            const { token: newToken, user: userData } = res.data;

            setToken(newToken);
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
            
            setIsLoading(false);
            return { success: true, message: res.data.message };
        } catch (err) {
            // Manejo de errores de la API (ej: Credenciales inválidas, 400/404)
            const errorMessage = err.response?.data?.message || 'Error de red o servidor al iniciar sesión.';
            setError(errorMessage);
            setIsLoading(false);
            return { success: false, message: errorMessage };
        }
    };

    // 5. Función de Registro
    const register = async (name, email, password) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await axios.post(`${API_URL}/auth/registro`, { 
                nombre_completo: name, 
                email, 
                contraseña: password 
            });

            setIsLoading(false);
            // El backend no devuelve un token en el registro, solo el mensaje.
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
        // El useEffect se encarga de limpiar el header de Axios y el localStorage.
    };
    
    // Validar si el usuario tiene los roles de administración/instructor
    const userIsAdmin = user?.rol === 'admin' || user?.rol === 'superadmin';
    const userIsInstructor = user?.rol === 'instructor' || userIsAdmin;


    // El objeto de valor que se pasará a los componentes
    const contextValue = {
        user,
        token,
        isLoading,
        error,
        isLoggedIn: !!token, 
        isAdmin: userIsAdmin,
        isInstructor: userIsInstructor, // Usamos esta bandera para el panel
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

// Validar propiedades (Buena práctica de React)
AuthProvider.propTypes = {
    children: PropTypes.node.isRequired,
};


// 7. Hook personalizado para usar el contexto fácilmente
export const useAuth = () => {
    return useContext(AuthContext);
};