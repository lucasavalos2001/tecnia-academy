import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { formatCurrency } from '../utils/formatCurrency';

function Home() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [cursosDestacados, setCursosDestacados] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_BASE_URL;
  const searchRef = useRef(null);

  // 1. CARGAR CURSOS DESTACADOS
  useEffect(() => {
    const fetchDestacados = async () => {
        try {
            const res = await axios.get(`${API_URL}/cursos`);
            // Tomamos solo los primeros 3
            setCursosDestacados(res.data.cursos.slice(0, 3));
        } catch (error) {
            console.error("Error al cargar destacados");
        } finally {
            setLoading(false);
        }
    };
    fetchDestacados();
  }, []);

  // Lógica de búsqueda en vivo
  useEffect(() => {
    if (searchTerm.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_URL}/cursos?search=${searchTerm}`);
        setSuggestions(res.data.cursos);
        setShowSuggestions(true);
      } catch (error) { console.error(error); }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) { setShowSuggestions(false); }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/biblioteca?q=${encodeURIComponent(searchTerm)}`);
      setShowSuggestions(false);
    }
  };

  // Categorías para la nueva sección
  const categoriasPopulares = [
    { key: 'programacion', label: 'Programación', icon: 'fa-code' },
    { key: 'diseno', label: 'Diseño', icon: 'fa-paint-brush' },
    { key: 'negocios', label: 'Negocios', icon: 'fa-chart-line' },
    { key: 'marketing', label: 'Marketing', icon: 'fa-bullhorn' },
    { key: 'idiomas', label: 'Idiomas', icon: 'fa-language' },
    { key: 'fotografia', label: 'Fotografía', icon: 'fa-camera' },
  ];

  return (
    <>
      <Navbar />
      <main>
        <section className="hero">
          <div className="hero-content">
            <h1>
              Aprende a tu ritmo con <span className="logo-tecnia">Tecnia</span>{' '}
              <span className="logo-academy">Academy</span>
            </h1>
            <p>
              {user ? `Hola, ${user.nombre_completo}. ` : ''}
              Explora cientos de cursos técnicos y profesionales creados por expertos.
            </p>
            
            <div className="search-box">
                <div className="search-container" ref={searchRef} style={{width: '100%'}}>
                    <form onSubmit={handleSearchSubmit} style={{display:'flex', gap:'10px', justifyContent:'center'}}>
                        <input 
                            type="text" 
                            placeholder="¿Qué querés aprender hoy?" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onFocus={() => searchTerm.length >= 2 && setShowSuggestions(true)}
                            style={{width: '400px', padding: '15px 25px', borderRadius: '50px', border:'none', outline:'none'}}
                        />
                        <button type="submit" style={{borderRadius:'50px', padding:'15px 30px', background:'#00d4d4', color:'#0b3d91', fontWeight:'bold', border:'none', cursor:'pointer'}}>
                            Buscar
                        </button>
                    </form>

                    {showSuggestions && suggestions.length > 0 && (
                        <div className="search-results-dropdown" style={{width: '400px', margin:'0 auto', textAlign: 'left', borderRadius:'0 0 15px 15px'}}> 
                            {suggestions.slice(0, 5).map((curso) => (
                                <div 
                                    key={curso.id} 
                                    className="search-suggestion-item"
                                    onClick={() => { navigate(`/curso/${curso.id}`); setShowSuggestions(false); }}
                                >
                                    <img src={curso.imagen_url || `https://placehold.co/40x25/00d4d4/ffffff?text=C`} alt="miniatura" />
                                    <div className="search-suggestion-info">
                                        <h4 style={{color: '#0b3d91'}}>{curso.titulo}</h4>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
          </div>
        </section>

        {/* ✅ NUEVA SECCIÓN: CATEGORÍAS POPULARES (MEJORA VISUAL) */}
        <section style={{maxWidth: '1200px', margin: '40px auto', padding: '0 20px'}}>
            <h3 style={{color: '#333', marginBottom: '20px', fontWeight: '600'}}>Categorías principales</h3>
            <div style={{display: 'flex', gap: '15px', flexWrap: 'wrap'}}>
                {categoriasPopulares.map(cat => (
                    <button 
                        key={cat.key}
                        onClick={() => navigate(`/biblioteca?q=${cat.key}`)}
                        style={{
                            padding: '15px 25px',
                            background: 'white',
                            border: '1px solid #eee',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)'; }}
                    >
                        <i className={`fas ${cat.icon}`} style={{color: '#00d4d4'}}></i>
                        {cat.label}
                    </button>
                ))}
            </div>
        </section>

        {/* SECCIÓN: CURSOS DESTACADOS */}
        <section style={{maxWidth: '1200px', margin: '60px auto', padding: '0 20px'}}>
            <h2 style={{color: '#0b3d91', borderBottom: '2px solid #00d4d4', display: 'inline-block', paddingBottom: '10px', marginBottom: '30px'}}>
                Últimos Cursos Publicados
            </h2>

            <div className="curso-grid">
                {loading ? (
                    <p>Cargando novedades...</p>
                ) : cursosDestacados.length === 0 ? (
                    <p style={{color:'#666'}}>Aún no hay cursos disponibles. ¡Sé el primero en crear uno!</p>
                ) : (
                    cursosDestacados.map((curso) => (
                        <div className="curso-card" key={curso.id} style={{cursor:'pointer'}} onClick={() => navigate(`/curso/${curso.id}`)}>
                            <div className="card-image-wrapper">
                                <span className="category-badge">{curso.categoria}</span>
                                <img 
                                    src={curso.imagen_url || `https://placehold.co/300x180/00d4d4/ffffff?text=${curso.categoria}`} 
                                    alt={curso.titulo} 
                                />
                            </div>
                            <div className="card-content">
                                <h3 style={{fontSize:'1.1rem', marginBottom:'10px'}}>{curso.titulo}</h3>
                                <p style={{fontSize:'0.9rem', color:'#666', marginBottom:'15px'}}>
                                    {curso.descripcion_larga.substring(0, 80)}...
                                </p>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                    <span style={{color:'#666', fontSize:'0.8rem'}}>
                                        <i className="fas fa-user-tie"></i> {curso.instructor?.nombre_completo}
                                    </span>
                                    <span style={{fontWeight:'bold', color:'#0b3d91', fontSize:'1.1rem'}}>
                                        {formatCurrency(curso.precio)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
            
            <div style={{textAlign:'center', marginTop:'40px'}}>
                <button 
                    onClick={() => navigate('/biblioteca')}
                    style={{background:'transparent', border:'2px solid #0b3d91', color:'#0b3d91', padding:'12px 30px', borderRadius:'30px', fontWeight:'bold', cursor:'pointer', fontSize:'1rem'}}
                >
                    Ver todos los cursos
                </button>
            </div>
        </section>

        {/* SECCIÓN DE CARACTERÍSTICAS */}
        <section style={{background:'#f7f9fa', padding:'60px 20px', textAlign:'center'}}>
            <div style={{maxWidth:'1000px', margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'30px'}}>
                <div>
                    <i className="fas fa-laptop-code" style={{fontSize:'3rem', color:'#00d4d4', marginBottom:'20px'}}></i>
                    <h3>Aprende haciendo</h3>
                    <p style={{color:'#666'}}>Proyectos prácticos y ejercicios reales para construir tu portafolio.</p>
                </div>
                <div>
                    <i className="fas fa-certificate" style={{fontSize:'3rem', color:'#00d4d4', marginBottom:'20px'}}></i>
                    <h3>Certifícate</h3>
                    <p style={{color:'#666'}}>Obtén un diploma oficial al completar tus cursos para destacar en LinkedIn.</p>
                </div>
                <div>
                    <i className="fas fa-infinity" style={{fontSize:'3rem', color:'#00d4d4', marginBottom:'20px'}}></i>
                    <h3>Acceso de por vida</h3>
                    <p style={{color:'#666'}}>Estudia a tu propio ritmo, vuelve a ver las clases cuando quieras.</p>
                </div>
            </div>
        </section>

      </main>
      <Footer />
    </>
  );
}

export default Home;