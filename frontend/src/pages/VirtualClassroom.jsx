import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import ReactPlayer from 'react-player'; 
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

function VirtualClassroom() {
  const { id } = useParams(); 
  const { token } = useAuth();
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  const [curso, setCurso] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('descripcion');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resCurso = await axios.get(`${API_URL}/cursos/${id}/curriculum`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCurso(resCurso.data);

        const resProgreso = await axios.get(`${API_URL}/cursos/mis-cursos`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const miInscripcion = resProgreso.data.cursos.find(c => c.courseId === parseInt(id));
        if (miInscripcion) {
            setCompletedLessons(miInscripcion.lecciones_completadas || []);
        }

        if (resCurso.data.modulos?.[0]?.lecciones?.[0]) {
            setActiveLesson(resCurso.data.modulos[0].lecciones[0]);
        }
      } catch (error) {
        console.error("Error cargando aula", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, token]);

  const handleComplete = async (lessonId) => {
    if (completedLessons.includes(lessonId)) return; // No hacer nada si ya está completa

    try {
        const res = await axios.post(
            `${API_URL}/cursos/${id}/lecciones/${lessonId}/completar`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
        );
        setCompletedLessons(res.data.lecciones_completadas);
    } catch (error) { console.error(error); }
  };

  // --- RENDERIZADOR DE VIDEO ---
  const renderPlayer = () => {
      if (!activeLesson) return <h3 style={{color:'white'}}>Selecciona una lección</h3>;
      const url = activeLesson.url_video || "";

      // CASO 1: BUNNY.NET (Sintaxis Correcta)
      if (url.includes('bunny') || url.includes('mediadelivery')) {
          return (
            <div style={{position:'relative', paddingTop:'56.25%', width: '100%'}}>
              <iframe 
                  src={url} 
                  loading="lazy" 
                  style={{border:0, position:'absolute', top:0, height:'100%', width:'100%'}} 
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;" 
                  allowFullScreen={true}
              ></iframe>
            </div>
          );
      }

      // CASO 2: YOUTUBE
      if (url.includes('youtu')) {
          return (
            <ReactPlayer
                url={url} 
                width="100%" 
                height="100%" 
                controls={true} 
                config={{ youtube: { playerVars: { showinfo: 0 } } }}
            />
          );
      }

      // CASO 3: OTROS
      return (
        <video controls width="100%" height="100%" key={url}>
            <source src={url} type="video/mp4" />
        </video>
      );
  };

  if (loading) return <div style={{color:'white', background:'#1c1d1f', height:'100vh', display:'flex', alignItems:'center', justifyContent:'center'}}>Cargando...</div>;

  const isCompleted = completedLessons.includes(activeLesson?.id);

  return (
    <div className="classroom-container">
      <Navbar /> 
      <div className="classroom-player-wrapper">
        
        <div className="video-section">
            <div className="video-frame-container" style={{background: '#000', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 8px rgba(0,0,0,0.1)'}}>
                {renderPlayer()}
            </div>
            
            {/* ✅ SECCIÓN DE DETALLES REDISEÑADA ESTÉTICAMENTE */}
            <div className="video-info-tabs" style={{marginTop: '25px', padding: '0 10px'}}>
                {/* Pestañas más modernas */}
                <div className="tabs-header" style={{borderBottom: '2px solid #f0f0f0', marginBottom: '20px'}}>
                    <button style={tabStyle(activeTab==='descripcion')} onClick={()=>setActiveTab('descripcion')}>Descripción</button>
                    <button style={tabStyle(activeTab==='preguntas')} onClick={()=>setActiveTab('preguntas')}>Preguntas</button>
                    <button style={tabStyle(activeTab==='archivos')} onClick={()=>setActiveTab('archivos')}>Archivos</button>
                </div>

                <div className="tab-body" style={{paddingBottom: '40px'}}>
                    {activeTab === 'descripcion' && (
                        <div>
                            {/* Título más grande y con color de marca */}
                            <h1 style={{fontSize:'2rem', color:'var(--color-primario)', marginTop:0, marginBottom:'15px'}}>
                                {activeLesson?.titulo}
                            </h1>
                            
                            {/* Descripción con mejor tipografía */}
                            <p style={{fontSize:'1.05rem', lineHeight:'1.7', color:'#555', marginBottom:'30px'}}>
                                {activeLesson?.contenido_texto || "No hay descripción disponible para esta lección."}
                            </p>
                            
                            {/* ✅ NUEVO BOTÓN DE COMPLETAR MODERNO */}
                            <div style={{display:'flex', alignItems:'center', borderTop:'1px solid #eee', paddingTop:'25px'}}>
                                <button 
                                    onClick={() => handleComplete(activeLesson.id)} 
                                    disabled={isCompleted}
                                    style={{
                                        padding: '14px 28px',
                                        backgroundColor: isCompleted ? '#2ecc71' : 'var(--color-secundario)', // Verde si completo, Turquesa si no
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '50px', // Botón tipo píldora
                                        fontSize: '1.1rem',
                                        fontWeight: 'bold',
                                        cursor: isCompleted ? 'default' : 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        boxShadow: isCompleted ? 'none' : '0 4px 12px rgba(0, 212, 212, 0.4)', // Sombra suave
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    {isCompleted ? (
                                        <><i className="fas fa-check-circle" style={{fontSize:'1.3rem'}}></i> Completada</>
                                    ) : (
                                        <><i className="far fa-circle" style={{fontSize:'1.3rem'}}></i> Marcar como Vista</>
                                    )}
                                </button>
                                {isCompleted && (
                                    <span style={{marginLeft:'20px', color:'#2ecc71', fontWeight:'bold', fontSize:'1.1rem'}}>
                                        ¡Excelente trabajo! 🎉
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                    {activeTab === 'preguntas' && <p>Sección de preguntas próximamente.</p>}
                    {activeTab === 'archivos' && <p>No hay archivos adjuntos para esta clase.</p>}
                </div>
            </div>
            {!sidebarOpen && <button className="toggle-sidebar-btn" onClick={() => setSidebarOpen(true)}><i className="fas fa-list"></i></button>}
        </div>

        <div className={`curriculum-sidebar ${!sidebarOpen ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <span>Contenido del curso</span>
                <button onClick={() => setSidebarOpen(false)} style={{background:'none', border:'none', cursor:'pointer'}}><i className="fas fa-times"></i></button>
            </div>
            <div className="lesson-list-container">
                {curso?.modulos?.map((modulo, idx) => (
                    <div key={modulo.id} className="module-section">
                        <div className="module-title">Sección {idx+1}: {modulo.titulo}</div>
                        {modulo.lecciones?.map((leccion, i) => {
                             const isLessonCompleted = completedLessons.includes(leccion.id);
                             const isActive = activeLesson?.id === leccion.id;
                             return (
                            <div key={leccion.id} className={`lesson-row ${isActive ? 'active' : ''}`} onClick={() => setActiveLesson(leccion)}>
                                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                    <i className={`fas fa-${isLessonCompleted ? 'check-circle' : 'play-circle'}`} 
                                       style={{color: isLessonCompleted ? '#2ecc71' : (isActive ? 'var(--color-primario)' : '#ccc')}}>
                                    </i>
                                    {i+1}. {leccion.titulo}
                                </div>
                            </div>
                        )})}
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}

// Función auxiliar para estilos de pestañas
const tabStyle = (isActive) => ({
    padding: '10px 20px',
    background: 'none',
    border: 'none',
    borderBottom: isActive ? '3px solid var(--color-primario)' : '3px solid transparent',
    color: isActive ? 'var(--color-primario)' : '#666',
    fontWeight: isActive ? 'bold' : 'normal',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'all 0.2s'
});

export default VirtualClassroom;