import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import ReactPlayer from 'react-player'; 
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

// --- COMPONENTE DE QUIZ (ESTUDIANTE) ---
const QuizRenderer = ({ questions, onComplete }) => {
    const [currentQ, setCurrentQ] = useState(0);
    const [score, setScore] = useState(0);
    const [finished, setFinished] = useState(false);
    const [feedback, setFeedback] = useState(null); 

    const handleAnswer = (index) => {
        if (index === questions[currentQ].correcta) {
            setScore(score + 1);
            setFeedback('correct');
        } else {
            setFeedback('incorrect');
        }
        setTimeout(() => {
            if (currentQ + 1 < questions.length) {
                setCurrentQ(currentQ + 1);
                setFeedback(null);
            } else {
                setFinished(true);
                if ((score + (index === questions[currentQ].correcta ? 1 : 0)) >= questions.length / 2) onComplete();
            }
        }, 1000);
    };

    if (finished) {
        return (
            <div style={{color:'white', textAlign:'center', padding:'40px'}}>
                <h2>¡Quiz Finalizado!</h2>
                <p style={{fontSize:'1.5rem'}}>Tu nota: {score} / {questions.length}</p>
                <button onClick={() => {setFinished(false); setCurrentQ(0); setScore(0); setFeedback(null);}} style={{padding:'10px 20px', marginTop:'20px', cursor:'pointer'}}>Reintentar</button>
            </div>
        );
    }

    return (
        <div style={{color:'white', padding:'40px', width:'100%', maxWidth:'600px'}}>
            <div style={{marginBottom:'10px', color:'#aaa'}}>Pregunta {currentQ + 1} de {questions.length}</div>
            <h2 style={{marginBottom:'20px'}}>{questions[currentQ].pregunta}</h2>
            <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                {questions[currentQ].opciones.map((op, idx) => (
                    <button key={idx} onClick={() => !feedback && handleAnswer(idx)} 
                        style={{padding:'15px', textAlign:'left', background: feedback && idx===questions[currentQ].correcta ? '#2ecc71' : '#333', color:'white', border:'1px solid #555', borderRadius:'5px', cursor:'pointer'}}>
                        {op}
                    </button>
                ))}
            </div>
        </div>
    );
};

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
        const resCurso = await axios.get(`${API_URL}/cursos/${id}/curriculum`, { headers: { Authorization: `Bearer ${token}` } });
        setCurso(resCurso.data);
        const resProgreso = await axios.get(`${API_URL}/cursos/mis-cursos`, { headers: { Authorization: `Bearer ${token}` } });
        const miInscripcion = resProgreso.data.cursos.find(c => c.courseId === parseInt(id));
        if (miInscripcion) setCompletedLessons(miInscripcion.lecciones_completadas || []);
        if (resCurso.data.modulos?.[0]?.lecciones?.[0]) setActiveLesson(resCurso.data.modulos[0].lecciones[0]);
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchData();
  }, [id, token]);

  const handleComplete = async (lessonId) => {
    if (completedLessons.includes(lessonId)) return;
    try {
        const res = await axios.post(`${API_URL}/cursos/${id}/lecciones/${lessonId}/completar`, {}, { headers: { Authorization: `Bearer ${token}` } });
        setCompletedLessons(res.data.lecciones_completadas);
    } catch (e) { console.error(e); }
  };

  // --- RENDERIZADOR ---
  const renderContent = () => {
      if (!activeLesson) return <h3 style={{color:'white'}}>Selecciona lección</h3>;

      // 1. QUIZ
      if (activeLesson.contenido_quiz && activeLesson.contenido_quiz.length > 0) {
          return <QuizRenderer questions={activeLesson.contenido_quiz} onComplete={() => handleComplete(activeLesson.id)} />;
      }

      // 2. VIDEO (Bunny / YouTube / MP4)
      const url = activeLesson.url_video || "";
      
      // Fondo negro SÓLIDO para que no se vea nada detrás
      const containerStyle = {position:'relative', paddingTop:'56.25%', width: '100%', background:'black'};

      if (url.includes('bunny') || url.includes('mediadelivery')) {
          return (
            <div style={containerStyle}>
              <iframe src={url} loading="lazy" style={{border:0, position:'absolute', top:0, left:0, height:'100%', width:'100%'}} allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;" allowFullScreen={true}></iframe>
            </div>
          );
      }
      if (url.includes('youtu')) {
          return <ReactPlayer url={url} width="100%" height="100%" controls={true} config={{ youtube: { playerVars: { showinfo: 0 } } }} />;
      }
      return <video controls width="100%" height="100%" key={url} style={{background:'black'}}><source src={url} type="video/mp4" /></video>;
  };

  if (loading) return <div style={{color:'white', background:'#1c1d1f', height:'100vh', display:'flex', alignItems:'center', justifyContent:'center'}}>Cargando...</div>;
  
  const isCompleted = completedLessons.includes(activeLesson?.id);
  const isQuiz = activeLesson?.contenido_quiz && activeLesson.contenido_quiz.length > 0;

  return (
    <div className="classroom-container">
      <Navbar /> 
      <div className="classroom-player-wrapper">
        
        <div className="video-section">
            {/* REPRODUCTOR CON FONDO NEGRO SÓLIDO */}
            <div className="video-frame-container" style={{background: '#000', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight:'450px', position:'relative', zIndex: 2}}>
                {renderContent()}
            </div>
            
            {/* DETALLES DEBAJO */}
            <div className="video-info-tabs" style={{marginTop: '0', padding: '20px', background: 'white', position: 'relative', zIndex: 1}}>
                <div className="tabs-header" style={{borderBottom: '2px solid #f0f0f0', marginBottom: '20px'}}>
                    <button className={`tab-btn ${activeTab==='descripcion'?'active':''}`} onClick={()=>setActiveTab('descripcion')}>Descripción</button>
                    <button className={`tab-btn ${activeTab==='preguntas'?'active':''}`} onClick={()=>setActiveTab('preguntas')}>Preguntas</button>
                    <button className={`tab-btn ${activeTab==='archivos'?'active':''}`} onClick={()=>setActiveTab('archivos')}>Archivos</button>
                </div>

                <div className="tab-body">
                    {activeTab === 'descripcion' && (
                        <div>
                            <h1 style={{fontSize:'1.8rem', color:'var(--color-primario)', marginTop:0, marginBottom:'15px'}}>
                                {activeLesson?.titulo}
                            </h1>
                            <p style={{fontSize:'1rem', lineHeight:'1.6', color:'#555', marginBottom:'30px'}}>
                                {activeLesson?.contenido_texto || (isQuiz ? "Completa el cuestionario para aprobar." : "No hay descripción.")}
                            </p>

                            {!isQuiz && (
                                <div style={{display:'flex', alignItems:'center', borderTop:'1px solid #eee', paddingTop:'20px'}}>
                                    <button 
                                        onClick={() => handleComplete(activeLesson.id)} 
                                        disabled={isCompleted}
                                        style={{
                                            padding: '12px 25px', borderRadius: '30px', border: 'none',
                                            background: isCompleted ? '#2ecc71' : 'var(--color-secundario)',
                                            color: 'white', fontWeight: 'bold', fontSize: '1rem', cursor: isCompleted ? 'default' : 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '10px'
                                        }}
                                    >
                                        {isCompleted ? <><i className="fas fa-check-circle"></i> Completada</> : <><i className="far fa-circle"></i> Marcar como Vista</>}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === 'preguntas' && <p>Foro próximamente.</p>}
                    {activeTab === 'archivos' && <p>No hay archivos.</p>}
                </div>
            </div>
            {!sidebarOpen && <button className="toggle-sidebar-btn" onClick={() => setSidebarOpen(true)}><i className="fas fa-list"></i></button>}
        </div>

        {/* SIDEBAR */}
        <div className={`curriculum-sidebar ${!sidebarOpen ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <span>Contenido</span>
                <button onClick={() => setSidebarOpen(false)} style={{background:'none', border:'none', cursor:'pointer'}}><i className="fas fa-times"></i></button>
            </div>
            <div className="lesson-list-container">
                {curso?.modulos?.map((modulo, idx) => (
                    <div key={modulo.id} className="module-section">
                        <div className="module-title">Sección {idx+1}: {modulo.titulo}</div>
                        {modulo.lecciones?.map((leccion, i) => {
                             const isComp = completedLessons.includes(leccion.id);
                             const isQ = leccion.contenido_quiz && leccion.contenido_quiz.length > 0;
                             const isActive = activeLesson?.id === leccion.id;
                             return (
                                <div key={leccion.id} className={`lesson-row ${isActive ? 'active' : ''}`} onClick={() => setActiveLesson(leccion)}>
                                    <div style={{width:'20px'}}><i className={`fas fa-${isComp ? 'check-circle' : 'circle'}`} style={{color: isComp ? '#2ecc71' : '#ccc'}}></i></div>
                                    <div style={{flex:1}}>
                                        {i+1}. {leccion.titulo}
                                        <div style={{fontSize:'0.8em', color:'#6a6f73'}}>
                                            {isQ ? <><i className="fas fa-tasks" style={{color:'#f39c12'}}></i> Cuestionario</> : <><i className="fas fa-film"></i> Video</>}
                                        </div>
                                    </div>
                                </div>
                             );
                        })}
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}

export default VirtualClassroom;