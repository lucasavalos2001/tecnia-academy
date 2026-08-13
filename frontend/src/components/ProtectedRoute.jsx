import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
// Requerimos PropTypes, recuerda que lo instalamos con npm install prop-types

// Este componente envuelve las rutas que requieren que el usuario esté logueado
const ProtectedRoute = ({ element: Component, allowedRoles, ...rest }) => {
    const { isLoggedIn, user } = useAuth();
    const toast = useToast();

    const userRole = user?.rol;
    const roleAllowed = !allowedRoles || allowedRoles.length === 0 || (userRole && allowedRoles.includes(userRole));

    // Los toasts disparan una actualización de estado, así que deben avisarse
    // como efecto (después del render), nunca directamente durante el render.
    useEffect(() => {
        if (isLoggedIn && !roleAllowed) {
            toast.error("Acceso denegado. Rol insuficiente.");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoggedIn, roleAllowed]);

    // 1. Si NO está logueado, redirige a /login
    if (!isLoggedIn) {
        // Redirige y reemplaza el historial, para que no pueda volver con el botón "atrás"
        return <Navigate to="/login" replace />;
    }

    // 2. Si se requieren roles específicos y el usuario no los tiene, redirige a Home
    if (!roleAllowed) {
        return <Navigate to="/" replace />;
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