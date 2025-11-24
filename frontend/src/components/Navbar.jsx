import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

function Navbar() {
  const { isLoggedIn, user, logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]); // Guardar resultados
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();
  
  const API_URL = import.meta.env.VITE_API_BASE_URL;
  
  // Referencia para detectar clics fuera del buscador
  const searchRef = useRef(null);

  // --- LÓGICA DE BÚSQUEDA EN VIVO (DEBOUNCE) ---
  useEffect(() => {
    // Si el texto está vacío, limpiamos sugerencias
    if (searchTerm.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
    }

    // Creamos un temporizador: Espera 500ms después de que dejes de escribir
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_URL}/cursos?search=${searchTerm}`);
        setSuggestions(res.data.cursos); // Guardamos los cursos encontrados
        setShowSuggestions(true);
      } catch (error) {
        console.error("Error buscando cursos", error);
      }
    }, 500);

    // Limpieza: Si escribes antes de 500ms, cancela la búsqueda anterior
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Manejar Enter (Búsqueda completa)
  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
        navigate(`/biblioteca?q=${encodeURIComponent(searchTerm)}`);
        setShowSuggestions(false); // Ocultar lista al dar enter
    }
  };

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="navbar">
      <Link to="/" className="logo-link">
        <div className="logo">
          <span className="logo-tecnia">Tecnia</span>
          <span className="logo-academy">Academy</span>
        </div>
      </Link>
      
      <nav className="nav-links">
        {/* --- BUSCADOR INTELIGENTE --- */}
        <div className="search-container" ref={searchRef}>
          <input 
            type="text" 
            placeholder="Buscar cursos..." 
            className="search-bar" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchSubmit}
            onFocus={() => searchTerm.length >= 2 && setShowSuggestions(true)}
          />
          
          {/* Lista Flotante de Resultados */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="search-results-dropdown">
                {suggestions.slice(0, 5).map((curso) => ( // Mostramos solo los primeros 5
                    <div 
                        key={curso.id} 
                        className="search-suggestion-item"
                        onClick={() => {
                            // Al hacer clic, vamos al detalle del curso
                            navigate(`/biblioteca?q=${encodeURIComponent(curso.titulo)}`); 
                            // O podrías ir directo al detalle: navigate(`/curso/${curso.id}`);
                            setShowSuggestions(false);
                            setSearchTerm(curso.titulo);
                        }}
                    >
                        <img 
                            src={curso.imagen_url || `https://placehold.co/40x25/00d4d4/ffffff?text=C`} 
                            alt="miniatura" 
                        />
                        <div className="search-suggestion-info">
                            <h4>{curso.titulo}</h4>
                            <span>{curso.instructor?.nombre_completo}</span>
                        </div>
                    </div>
                ))}
                <div 
                    className="search-suggestion-item" 
                    style={{justifyContent:'center', color:'#0b3d91', fontWeight:'bold'}}
                    onClick={() => {
                        navigate(`/biblioteca?q=${encodeURIComponent(searchTerm)}`);
                        setShowSuggestions(false);
                    }}
                >
                    Ver todos los resultados...
                </div>
            </div>
          )}
        </div>
        
        <Link to="/biblioteca">Explorar</Link>
        
        {/* Lógica de menú (Igual que antes) */}
        {isLoggedIn ? (
          <div className="nav-privado" style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
            <Link to="/mis-cursos">Mis Cursos</Link>
            {(user?.rol === 'instructor' || user?.rol === 'admin' || user?.rol === 'superadmin') && (
                <Link to="/panel-instructor">Panel de Instructor</Link>
            )}
            {(user?.rol === 'admin' || user?.rol === 'superadmin') && (
                <Link to="/admin-dashboard" style={{ color: '#e74c3c', fontWeight: 'bold', border: '1px solid #e74c3c', padding: '5px 10px', borderRadius: '5px' }}>
                    ADMIN
                </Link>
            )}
            <Link to="/perfil">Mi Perfil</Link>
            <button onClick={logout} className="btn-registrarse" style={{ border: 'none', cursor: 'pointer' }}>
              Cerrar Sesión
            </button>
          </div>
        ) : (
          <div className="nav-public" style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
            <Link to="/login">Iniciar sesión</Link>
            <Link to="/registro" className="btn-registrarse">Registrarse</Link>
          </div>
        )}
      </nav>
    </header>
  );
}

export default Navbar;