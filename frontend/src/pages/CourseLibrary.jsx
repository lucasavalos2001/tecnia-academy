import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
// Asegúrate de tener este archivo creado en src/utils/formatCurrency.js
import { formatCurrency } from '../utils/formatCurrency';

const CATEGORIAS = [
    { value: 'diseno', label: 'Diseño Gráfico & UX/UI' },
    { value: 'programacion', label: 'Desarrollo Web & Programación' },
    { value: 'datos', label: 'Ciencia de Datos & IA' },
    { value: 'negocios', label: 'Negocios & Emprendimiento' },
    { value: 'marketing', label: 'Marketing Digital' },
    { value: 'finanzas', label: 'Finanzas & Contabilidad' },
    { value: 'fotografia', label: 'Fotografía & Video' },
    { value: 'musica', label: 'Música & Audio' },
    { value: 'idiomas', label: 'Idiomas' },
    { value: 'salud', label: 'Salud & Fitness' },
    { value: 'desarrollo_personal', label: 'Desarrollo Personal' },
    { value: 'otros', label: 'Otros / General' },
];

const NIVELES = [
    { value: 'principiante', label: 'Principiante' },
    { value: 'intermedio', label: 'Intermedio' },
    { value: 'avanzado', label: 'Avanzado' },
];

function CourseLibrary() {
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [nivelFiltro, setNivelFiltro] = useState('');
  const [soloGratis, setSoloGratis] = useState(false);
  const [favoritos, setFavoritos] = useState(new Set());

  const navigate = useNavigate();
  const { isLoggedIn, token } = useAuth();
  const toast = useToast();
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const searchQuery = queryParams.get('q');

  useEffect(() => {
    const fetchCursos = async () => {
      setLoading(true);
      try {
        const params = {};
        if (searchQuery) params.search = searchQuery;
        if (categoriaFiltro) params.categoria = categoriaFiltro;
        if (nivelFiltro) params.nivel = nivelFiltro;
        if (soloGratis) params.gratis = 'true';

        const res = await axios.get(`${API_URL}/cursos`, { params });
        setCursos(res.data.cursos);
      } catch (error) {
        console.error("Error cargando cursos", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCursos();
  }, [searchQuery, categoriaFiltro, nivelFiltro, soloGratis]);

  useEffect(() => {
    const fetchFavoritos = async () => {
      if (!isLoggedIn) return;
      try {
        const res = await axios.get(`${API_URL}/cursos/favoritos`, { headers: { Authorization: `Bearer ${token}` } });
        setFavoritos(new Set(res.data.favoritos.map(f => f.curso?.id).filter(Boolean)));
      } catch (error) {
        console.error("Error cargando favoritos", error);
      }
    };
    fetchFavoritos();
  }, [isLoggedIn, token]);

  const handleToggleFavorito = async (e, courseId) => {
    e.stopPropagation();
    if (!isLoggedIn) {
        toast.info("Iniciá sesión para guardar cursos en favoritos.");
        navigate('/login');
        return;
    }
    try {
        const res = await axios.post(`${API_URL}/cursos/${courseId}/favorito`, {}, { headers: { Authorization: `Bearer ${token}` } });
        setFavoritos(prev => {
            const next = new Set(prev);
            if (res.data.enFavoritos) next.add(courseId); else next.delete(courseId);
            return next;
        });
    } catch (error) {
        toast.error("Error al actualizar favoritos.");
    }
  };

  const limpiarFiltros = () => {
    setCategoriaFiltro('');
    setNivelFiltro('');
    setSoloGratis(false);
  };

  const hayFiltrosActivos = categoriaFiltro || nivelFiltro || soloGratis;
  const selectStyle = { padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.9rem', background: 'white' };

  return (
    <>
      <SEO title="Biblioteca de Cursos" description="Explorá todos los cursos disponibles en Tecnia Academy: programación, diseño, negocios, marketing y más." />
      <Navbar />
      <main className="main-content">
        <section className="explorar">
          <h1>{searchQuery ? `Resultados para: "${searchQuery}"` : 'Explora nuestra biblioteca'}</h1>
          <p>Elige entre una amplia variedad de cursos técnicos y profesionales.</p>

          <div style={{display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', margin: '25px 0', justifyContent: 'center'}}>
              <select value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)} style={selectStyle}>
                  <option value="">Todas las categorías</option>
                  {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>

              <select value={nivelFiltro} onChange={(e) => setNivelFiltro(e.target.value)} style={selectStyle}>
                  <option value="">Todos los niveles</option>
                  {NIVELES.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
              </select>

              <label style={{display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem'}}>
                  <input type="checkbox" checked={soloGratis} onChange={(e) => setSoloGratis(e.target.checked)} />
                  Solo gratuitos
              </label>

              {hayFiltrosActivos && (
                  <button onClick={limpiarFiltros} style={{...selectStyle, cursor: 'pointer', color: '#e74c3c', background: '#fdf0ef'}}>
                      <i className="fas fa-times"></i> Limpiar filtros
                  </button>
              )}
          </div>

          <div className="curso-grid">
            {loading ? (
                <p>Cargando biblioteca...</p>
            ) : cursos.length === 0 ? (
                <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '20px'}}>
                    <p>No se encontraron cursos con estos filtros.</p>
                    {hayFiltrosActivos && (
                        <button onClick={limpiarFiltros} className="btn-inscribirse">Limpiar filtros</button>
                    )}
                </div>
            ) : (
                cursos.map((curso) => (
                    <div className="curso-card" key={curso.id}>
                        {/* Wrapper para imagen con zoom */}
                        <div className="card-image-wrapper">
                             <span className="category-badge">
                                {curso.categoria}
                            </span>
                            <button
                                onClick={(e) => handleToggleFavorito(e, curso.id)}
                                title={favoritos.has(curso.id) ? "Quitar de favoritos" : "Guardar en favoritos"}
                                style={{
                                    position: 'absolute', top: '15px', right: '15px', zIndex: 2,
                                    background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%',
                                    width: '34px', height: '34px', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                }}
                            >
                                <i className={favoritos.has(curso.id) ? 'fas fa-heart' : 'far fa-heart'} style={{color: '#e74c3c'}}></i>
                            </button>
                            <img
                                src={curso.imagen_url || `https://placehold.co/300x180/00d4d4/ffffff?text=${curso.categoria}`}
                                alt={curso.titulo}
                            />
                        </div>

                        <div className="card-content">
                            <h3>{curso.titulo}</h3>
                            <p>{curso.descripcion_larga.substring(0, 100)}...</p>

                            {curso.nivel && (
                                <p style={{fontSize:'0.75em', color:'#888', margin: '0 0 8px 0'}}>
                                    <i className="fas fa-signal"></i> {curso.nivel.charAt(0).toUpperCase() + curso.nivel.slice(1)}
                                </p>
                            )}

                            {/* ✅ CORRECCIÓN DE PRECIO A GUARANÍES */}
                            <p style={{fontWeight: 'bold', color: (!curso.precio || parseFloat(curso.precio) === 0) ? '#27ae60' : '#0b3d91', fontSize: '1.1rem'}}>
                                {(!curso.precio || parseFloat(curso.precio) === 0) ? 'GRATIS' : formatCurrency(curso.precio)}
                            </p>

                            <p style={{fontSize:'0.8em', color:'#666'}}>Por: {curso.instructor?.nombre_completo}</p>

                            <button
                                className="btn-inscribirse"
                                onClick={() => navigate(`/curso/${curso.id}`)}
                            >
                                Ver Detalles
                            </button>
                        </div>
                    </div>
                ))
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

export default CourseLibrary;
