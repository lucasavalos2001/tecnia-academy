import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';

function MyCourses() {
  const [inscripciones, setInscripciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();
  
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  // Cargar mis inscripciones
  useEffect(() => {
    const fetchMyCourses = async () => {
      try {
        const res = await axios.get(`${API_URL}/cursos/mis-cursos`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setInscripciones(res.data.cursos);
      } catch (error) {
        console.error("Error cargando mis cursos", error);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchMyCourses();
  }, [token]);

  return (
    <>
      <Navbar />
      <main className="main-content">
        <section className="explorar">
          <h1>Mis Cursos</h1>
          <p>Continuá aprendiendo y completá los cursos en los que estás inscripto.</p>
          
          <div className="curso-grid" id="mis-cursos-grid">
            {loading ? (
                <p>Cargando tu progreso...</p>
            ) : inscripciones.length === 0 ? (
                <div style={{gridColumn: '1 / -1', textAlign: 'center', marginTop: '20px'}}>
                    <h3>Aún no te has inscrito en ningún curso.</h3>
                    <Link to="/biblioteca" className="btn-inscribirse">Ir a la Biblioteca</Link>
                </div>
            ) : (
                // ✅ FILTRO DE SEGURIDAD: Solo mostramos si 'inscripcion.curso' existe
                inscripciones
                .filter(inscripcion => inscripcion.curso !== null) 
                .map((inscripcion) => (
                    <div className="curso-card" key={inscripcion.id}>
                        
                        <div className="card-image-wrapper">
                            <span className="category-badge">
                                {inscripcion.curso.categoria || 'General'}
                            </span>
                            <img 
                                src={inscripcion.curso.imagen_url || `https://placehold.co/300x180/9b59b6/ffffff?text=${inscripcion.curso.categoria}`} 
                                alt={inscripcion.curso.titulo} 
                            />
                        </div>

                        <div className="card-content">
                            <h3>{inscripcion.curso.titulo}</h3>
                            
                            <div className="progress-info">
                                <div className="progress-bar-container">
                                    <div 
                                        className="progress-bar" 
                                        style={{width: `${inscripcion.progreso_porcentaje || 0}%`}}
                                    ></div>
                                </div>
                                <span style={{fontWeight:'bold', color: '#0b3d91', fontSize: '0.9rem'}}>
                                    {inscripcion.progreso_porcentaje || 0}% completado
                                </span>
                            </div>

                            <Link 
                                to={`/aula-virtual/${inscripcion.curso.id}`} 
                                className="btn-inscribirse btn-continuar"
                                style={{textAlign:'center', display:'block'}}
                            >
                                {inscripcion.progreso_porcentaje === 100 ? '¡Ver Certificado!' : 'Continuar curso'}
                            </Link>
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

export default MyCourses;