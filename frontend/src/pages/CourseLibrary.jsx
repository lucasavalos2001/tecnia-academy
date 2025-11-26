import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
// Asegúrate de tener este archivo creado en src/utils/formatCurrency.js
import { formatCurrency } from '../utils/formatCurrency'; 

function CourseLibrary() {
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_BASE_URL;
  
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const searchQuery = queryParams.get('q');

  useEffect(() => {
    const fetchCursos = async () => {
      setLoading(true);
      try {
        const endpoint = searchQuery 
            ? `${API_URL}/cursos?search=${searchQuery}` 
            : `${API_URL}/cursos`;

        const res = await axios.get(endpoint);
        setCursos(res.data.cursos);
      } catch (error) {
        console.error("Error cargando cursos", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCursos();
  }, [searchQuery]);

  return (
    <>
      <Navbar />
      <main className="main-content">
        <section className="explorar">
          <h1>{searchQuery ? `Resultados para: "${searchQuery}"` : 'Explora nuestra biblioteca'}</h1>
          <p>Elige entre una amplia variedad de cursos técnicos y profesionales.</p>
          
          <div className="curso-grid">
            {loading ? (
                <p>Cargando biblioteca...</p>
            ) : cursos.length === 0 ? (
                <p>No se encontraron cursos con ese nombre.</p>
            ) : (
                cursos.map((curso) => (
                    <div className="curso-card" key={curso.id}>
                        {/* Wrapper para imagen con zoom */}
                        <div className="card-image-wrapper">
                             <span className="category-badge">
                                {curso.categoria}
                            </span>
                            <img 
                                src={curso.imagen_url || `https://placehold.co/300x180/00d4d4/ffffff?text=${curso.categoria}`} 
                                alt={curso.titulo} 
                            />
                        </div>

                        <div className="card-content">
                            <h3>{curso.titulo}</h3>
                            <p>{curso.descripcion_larga.substring(0, 100)}...</p>
                            
                            {/* ✅ CORRECCIÓN DE PRECIO A GUARANÍES */}
                            <p style={{fontWeight: 'bold', color: '#0b3d91', fontSize: '1.1rem'}}>
                                {formatCurrency(curso.precio)}
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