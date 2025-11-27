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

      // ✅ CASO 1: BUNNY.NET (Corregido para React)
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

      // CASO 2: YOUTUBE (Soporte Legacy con ReactPlayer)
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

      // CASO 3: OTROS MP4
      return (
        <video controls width="100%" height="100%" key={url}>
            <source src={url} type="video/mp4" />
            Tu navegador no soporta videos HTML5.
        </video>
      );
  };

  if (loading) return <div style={{color:'white', background:'#1c1d1f', height:'100vh', display:'flex', alignItems:'center', justifyContent:'center'}}>Cargando...</div>;

  return (
    <div className="classroom-container">
      <Navbar /> 
      <div className="classroom-player-wrapper">
        
        <div className="video-section">
            {/* Contenedor del Video con fondo negro */}
            <div className="video-frame-container" style={{background: '#000', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                {renderPlayer()}
            </div>
            
            <div className="video-info-tabs">
                <div className="tabs-header">
                    <button className={`tab-btn ${activeTab==='descripcion'?'active':''}`} onClick={()=>setActiveTab('descripcion')}>Descripción</button>
                    <button className={`tab-btn ${activeTab==='preguntas'?'active':''}`} onClick={()=>setActiveTab('preguntas')}>Preguntas</button>
                    <button className={`tab-btn ${activeTab==='archivos'?'active':''}`} onClick={()=>setActiveTab('archivos')}>Archivos</button>
                </div>
                <div className="tab-body">
                    {activeTab === 'descripcion' && (
                        <div>
                            <h2>{activeLesson?.titulo}</h2>
                            <p>{activeLesson?.contenido_texto || "Detalles de la clase."}</p>
                            <div style={{marginTop: '20px', padding: '20px', background:'#f7f9fa', borderRadius:'8px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                <span>¿Terminaste de ver el video?</span>
                                <button onClick={() => handleComplete(activeLesson.id)} className={`btn-complete-lesson ${completedLessons.includes(activeLesson?.id) ? 'completed' : ''}`} disabled={completedLessons.includes(activeLesson?.id)}>
                                    {completedLessons.includes(activeLesson?.id) ? 'Completada ✅' : 'Marcar como Vista'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {!sidebarOpen && <button className="toggle-sidebar-btn" onClick={() => setSidebarOpen(true)}><i className="fas fa-list"></i></button>}
        </div>

        <div className={`curriculum-sidebar ${!sidebarOpen ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <span>Contenido</span>
                <button onClick={() => setSidebarOpen(false)} style={{background:'none', border:'none', cursor:'pointer'}}><i className="fas fa-times"></i></button>
            </div>
            <div className="lesson-list-container">
                {curso?.modulos?.map((modulo, idx) => (
                    <div key={modulo.id} className="module-section">
                        <div className="module-title">Sección {idx+1}: {modulo.titulo}</div>
                        {modulo.lecciones?.map((leccion, i) => (
                            <div key={leccion.id} className={`lesson-row ${activeLesson?.id === leccion.id ? 'active' : ''}`} onClick={() => setActiveLesson(leccion)}>
                                <div>{i+1}. {leccion.titulo}</div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}

export default VirtualClassroom;