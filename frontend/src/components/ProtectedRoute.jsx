import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types'; 
// Requerimos PropTypes, recuerda que lo instalamos con npm install prop-types

// Este componente envuelve las rutas que requieren que el usuario esté logueado
const ProtectedRoute = ({ element: Component, allowedRoles, ...rest }) => {
    const { isLoggedIn, user } = useAuth();
    
    // 1. Si NO está logueado, redirige a /login
    if (!isLoggedIn) {
        // Redirige y reemplaza el historial, para que no pueda volver con el botón "atrás"
        return <Navigate to="/login" replace />; 
    }

    // 2. Si se requieren roles específicos (Ej: 'admin', 'instructor')
    if (allowedRoles && allowedRoles.length > 0) {
        // Obtenemos el rol del usuario
        const userRole = user?.rol; 

        // Verificamos si el rol del usuario NO está en la lista de roles permitidos
        if (!userRole || !allowedRoles.includes(userRole)) {
            // Si el rol no es permitido, redirige a Home y muestra un mensaje
            alert("Acceso denegado. Rol insuficiente.");
            return <Navigate to="/" replace />;
        }
    }

    // Si está logueado y el rol es correcto, renderiza el componente solicitado
    return <Component {...rest} />;
};

// Buena práctica: Definir los tipos de propiedades esperadas
ProtectedRoute.propTypes = {
    element: PropTypes.elementType.isRequired,
    allowedRoles: PropTypes.arrayOf(PropTypes.string),
};

export default ProtectedRoute;