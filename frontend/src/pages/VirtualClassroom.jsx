import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

function VirtualClassroom() {
  const { id } = useParams(); 
  const { token } = useAuth();
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  // Estados
  const [curso, setCurso] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de UI (Interfaz)
  const [sidebarOpen, setSidebarOpen] = useState(true); // Para colapsar menú
  const [activeTab, setActiveTab] = useState('descripcion'); // Pestañas

  // Cargar datos
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Obtener curso
        const resCurso = await axios.get(`${API_URL}/cursos/${id}/curriculum`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCurso(resCurso.data);

        // 2. Obtener progreso
        const resProgreso = await axios.get(`${API_URL}/cursos/mis-cursos`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const miInscripcion = resProgreso.data.cursos.find(c => c.courseId === parseInt(id));
        if (miInscripcion) {
            setCompletedLessons(miInscripcion.lecciones_completadas || []);
        }

        // Poner la primera lección activa si no hay una seleccionada
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

  // Completar lección
  const handleComplete = async (lessonId) => {
    try {
        const res = await axios.post(
            `${API_URL}/cursos/${id}/lecciones/${lessonId}/completar`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
        );
        setCompletedLessons(res.data.lecciones_completadas);
    } catch (error) {
        console.error(error);
    }
  };

  // Función para cambiar automáticamente al siguiente video (Opcional)
  const handleVideoEnd = () => {
     // Aquí podrías buscar la siguiente lección en el array y setearla
     alert("¡Lección terminada! No olvides marcarla como completada.");
  };

  if (loading) return <div style={{color:'white', background:'#1c1d1f', height:'100vh', display:'flex', alignItems:'center', justifyContent:'center'}}>Cargando aula...</div>;

  return (
    <div className="classroom-container">
      <Navbar /> {/* Navbar arriba, como siempre */}

      <div className="classroom-player-wrapper">
        
        {/* --- SECCIÓN IZQUIERDA (VIDEO + TABS) --- */}
        <div className="video-section">
            {/* Reproductor Estilo Cine */}
            <div className="video-frame-container">
                {activeLesson ? (
                    <iframe 
                        src={activeLesson.url_video?.replace("watch?v=", "embed/")} 
                        title={activeLesson.titulo}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen
                    ></iframe>
                ) : (
                    <h3 style={{color:'white'}}>Selecciona una lección</h3>
                )}
            </div>

            {/* Área de Pestañas debajo del video */}
            <div className="video-info-tabs">
                <div className="tabs-header">
                    <button 
                        className={`tab-btn ${activeTab === 'descripcion' ? 'active' : ''}`}
                        onClick={() => setActiveTab('descripcion')}
                    >
                        Descripción
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'preguntas' ? 'active' : ''}`}
                        onClick={() => setActiveTab('preguntas')}
                    >
                        Preguntas y Respuestas
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'archivos' ? 'active' : ''}`}
                        onClick={() => setActiveTab('archivos')}
                    >
                        Archivos
                    </button>
                </div>

                <div className="tab-body">
                    {activeTab === 'descripcion' && (
                        <div>
                            <h2>{activeLesson?.titulo}</h2>
                            <p style={{lineHeight:'1.6', color:'#333'}}>
                                {activeLesson?.contenido_texto || "En esta lección aprenderemos los fundamentos clave para dominar este tema. Asegúrate de tomar notas y revisar los recursos adjuntos."}
                            </p>
                            
                            <div style={{marginTop: '20px', padding: '20px', background:'#f7f9fa', borderRadius:'8px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                <span>¿Terminaste de ver el video?</span>
                                <button 
                                    onClick={() => handleComplete(activeLesson.id)}
                                    className={`btn-complete-lesson ${completedLessons.includes(activeLesson?.id) ? 'completed' : ''}`}
                                    disabled={completedLessons.includes(activeLesson?.id)}
                                    style={{padding: '10px 20px'}}
                                >
                                    {completedLessons.includes(activeLesson?.id) ? 'Completada ✅' : 'Marcar como Vista'}
                                </button>
                            </div>
                        </div>
                    )}
                    {activeTab === 'preguntas' && (
                        <div>
                            <h3>Foro del Curso</h3>
                            <p>Aquí podrás preguntar tus dudas al instructor (Próximamente).</p>
                            <textarea style={{width:'100%', padding:'10px', marginTop:'10px'}} placeholder="Escribe tu pregunta..."></textarea>
                            <button className="btn-auth" style={{width:'auto', marginTop:'10px'}}>Enviar Pregunta</button>
                        </div>
                    )}
                    {activeTab === 'archivos' && (
                        <div>
                            <h3>Recursos Descargables</h3>
                            <p>No hay archivos adjuntos para esta lección.</p>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Botón flotante para re-abrir sidebar si se cerró */}
            {!sidebarOpen && (
                <button className="toggle-sidebar-btn" onClick={() => setSidebarOpen(true)}>
                    <i className="fas fa-list"></i> Temario
                </button>
            )}
        </div>

        {/* --- SECCIÓN DERECHA (SIDEBAR TEMARIO) --- */}
        <div className={`curriculum-sidebar ${!sidebarOpen ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <span>Contenido del curso</span>
                <button onClick={() => setSidebarOpen(false)} style={{background:'none', border:'none', cursor:'pointer'}}>
                    <i className="fas fa-times"></i>
                </button>
            </div>

            <div className="lesson-list-container">
                {curso?.modulos?.map((modulo, index) => (
                    <div key={modulo.id} className="module-section">
                        <div className="module-title">
                            Sección {index + 1}: {modulo.titulo}
                        </div>
                        <div>
                            {modulo.lecciones?.map((leccion, i) => (
                                <div 
                                    key={leccion.id} 
                                    className={`lesson-row 
                                        ${activeLesson?.id === leccion.id ? 'active' : ''}
                                        ${completedLessons.includes(leccion.id) ? 'completed' : ''}
                                    `}
                                    onClick={() => setActiveLesson(leccion)}
                                >
                                    <div style={{width:'20px'}}>
                                        {completedLessons.includes(leccion.id) ? (
                                            <i className="fas fa-check-square"></i>
                                        ) : (
                                            <i className="far fa-square"></i>
                                        )}
                                    </div>
                                    <div style={{flex:1}}>
                                        {i + 1}. {leccion.titulo}
                                        <div style={{fontSize:'0.8em', color:'#6a6f73', marginTop:'4px'}}>
                                            <i className="fas fa-play-circle"></i> Video
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
}

export default VirtualClassroom;