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
        const esCorrecta = index === questions[currentQ].correcta;
        if (esCorrecta) {
            setScore(prev => prev + 1);
            setFeedback('correct');
        } else {
            setFeedback('incorrect');
        }
        setTimeout(() => {
            if (currentQ + 1 < questions.length) {
                setCurrentQ(prev => prev + 1);
                setFeedback(null);
            } else {
                setFinished(true);
                const finalScore = score + (esCorrecta ? 1 : 0);
                if (finalScore >= questions.length / 2) {
                    onComplete();
                }
            }
        }, 1000);
    };

    if (finished) {
        return (
            <div style={{color:'white', textAlign:'center', padding:'40px'}}>
                <h2>¡Quiz Finalizado!</h2>
                <p style={{fontSize:'1.5rem', margin:'20px 0'}}>Tu nota: {score} / {questions.length}</p>
                <div style={{display:'flex', gap:'10px', justifyContent:'center'}}>
                    <button 
                        onClick={() => {setFinished(false); setCurrentQ(0); setScore(0); setFeedback(null);}} 
                        style={{padding:'10px 20px', cursor:'pointer', background:'#3498db', color:'white', border:'none', borderRadius:'4px'}}
                    >
                        Reintentar
                    </button>
                    {score >= questions.length / 2 && (
                         <div style={{padding:'10px 20px', background:'#2ecc71', color:'white', borderRadius:'4px'}}>
                             ¡Aprobado! ✅
                         </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div style={{color:'white', padding:'40px', width:'100%', maxWidth:'800px'}}>
            <div style={{marginBottom:'10px', color:'#aaa', textTransform:'uppercase', fontSize:'0.8rem', letterSpacing:'1px'}}>
                Pregunta {currentQ + 1} de {questions.length}
            </div>
            <h2 style={{marginBottom:'30px', fontSize:'1.5rem', lineHeight:'1.4'}}>{questions[currentQ].pregunta}</h2>
            <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                {questions[currentQ].opciones.map((op, idx) => (
                    <button key={idx} onClick={() => !feedback && handleAnswer(idx)} 
                        style={{
                            padding:'20px', 
                            textAlign:'left', 
                            background: feedback && idx === questions[currentQ].correcta ? '#2ecc71' : 
                                        feedback && idx !== questions[currentQ].correcta && feedback === 'incorrect' ? '#e74c3c' : '#2d2f31', 
                            color:'white', 
                            border: feedback && idx === questions[currentQ].correcta ? '1px solid #2ecc71' : '1px solid #555', 
                            borderRadius:'8px', 
                            cursor: feedback ? 'default' : 'pointer',
                            fontSize: '1rem',
                            transition: 'all 0.2s'
                        }}>
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
  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

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
        
        if (resCurso.data.modulos?.[0]?.lecciones?.[0]) {
            setActiveLesson(resCurso.data.modulos[0].lecciones[0]);
        }
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    if(token) fetchData();
  }, [id, token, API_URL]);

  const handleComplete = async (lessonId) => {
    if (completedLessons.includes(lessonId)) return;
    try {
        const res = await axios.post(`${API_URL}/cursos/${id}/lecciones/${lessonId}/completar`, {}, { headers: { Authorization: `Bearer ${token}` } });
        if(res.data && res.data.lecciones_completadas) {
            setCompletedLessons(res.data.lecciones_completadas);
        }
    } catch (e) { console.error(e); }
  };

  const renderContent = () => {
      if (!activeLesson) return <h3 style={{color:'white'}}>Selecciona una lección para comenzar</h3>;

      if (activeLesson.contenido_quiz && activeLesson.contenido_quiz.length > 0) {
          return <QuizRenderer questions={activeLesson.contenido_quiz} onComplete={() => handleComplete(activeLesson.id)} />;
      }

      const url = activeLesson.url_video || "";
      const containerStyle = {position:'relative', paddingTop:'56.25%', width: '100%', background:'black'};
      const iframeStyle = { position:'absolute', top:0, left:0, width:'100%', height:'100%', border:0 };

      if (url.includes('bunny') || url.includes('mediadelivery')) {
          return (
            <div style={containerStyle}>
              <iframe src={url} loading="lazy" style={iframeStyle} allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;" allowFullScreen={true} title="Reproductor Bunny"></iframe>
            </div>
          );
      }
      
      if (url.includes('youtu')) {
          return (
            <div style={{...containerStyle, paddingTop: 0, height: '100%'}}> 
                <ReactPlayer url={url} width="100%" height="100%" controls={true} config={{ youtube: { playerVars: { showinfo: 0 } } }} />
            </div>
          );
      }
      
      // Si no hay video pero hay recurso, mostramos un mensaje bonito
      if (!url && activeLesson.enlace_recurso) {
          return (
              <div style={{color:'white', textAlign:'center', padding:'40px'}}>
                  <i className="fas fa-file-download" style={{fontSize:'4rem', marginBottom:'20px', color:'#3498db'}}></i>
                  <h3>Material de Lectura / Descarga</h3>
                  <p>Esta lección contiene recursos descargables. Revisa la pestaña "Recursos" abajo.</p>
              </div>
          );
      }

      return (
        <video controls width="100%" height="100%" key={url} style={{background:'black', maxHeight: '100%'}}>
            <source src={url} type="video/mp4" />
        </video>
      );
  };

  if (loading) return <div style={{color:'white', background:'#1c1d1f', height:'100vh', display:'flex', alignItems:'center', justifyContent:'center'}}>Cargando aula virtual...</div>;
  
  const isCompleted = completedLessons.includes(activeLesson?.id);
  const isQuiz = activeLesson?.contenido_quiz && activeLesson.contenido_quiz.length > 0;

  return (
    <div className="classroom-container">
      <Navbar /> 
      
      <div className="classroom-player-wrapper">
        
        <div className="video-section">
            <div className="video-frame-container" style={{background: '#000', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight:'500px', position:'relative'}}>
                {renderContent()}
            </div>
            
            <div className="video-info-tabs">
                <div className="tabs-header">
                    <button className={`tab-btn ${activeTab==='descripcion'?'active':''}`} onClick={()=>setActiveTab('descripcion')}>Descripción</button>
                    <button className={`tab-btn ${activeTab==='recursos'?'active':''}`} onClick={()=>setActiveTab('recursos')}>Recursos</button>
                </div>

                <div className="tab-body">
                    {activeTab === 'descripcion' && (
                        <div>
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'20px'}}>
                                <div>
                                    <h1 style={{fontSize:'1.5rem', color:'#333', marginTop:0, marginBottom:'10px'}}>
                                        {activeLesson?.titulo}
                                    </h1>
                                    {!isQuiz && (
                                        <div style={{fontSize:'0.9rem', color:'#666', marginBottom:'20px'}}>
                                            Lección {activeLesson?.orden || '-'} • {activeLesson?.duracion || 'Duración variable'}
                                        </div>
                                    )}
                                </div>
                                
                                {/* 🟢 BOTÓN DE COMPLETAR MEJORADO */}
                                {!isQuiz && (
                                    <button 
                                        onClick={() => handleComplete(activeLesson.id)} 
                                        disabled={isCompleted}
                                        style={{
                                            padding: '12px 25px', 
                                            borderRadius: '30px', 
                                            border: 'none',
                                            background: isCompleted ? '#2ecc71' : '#00d4d4', // Verde si listo, Turquesa si no
                                            color: 'white', 
                                            fontWeight: 'bold', 
                                            fontSize: '1rem', 
                                            cursor: isCompleted ? 'default' : 'pointer',
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '10px',
                                            boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                                            transition: 'transform 0.2s, background 0.3s'
                                        }}
                                        onMouseOver={(e) => !isCompleted && (e.currentTarget.style.transform = 'translateY(-2px)')}
                                        onMouseOut={(e) => !isCompleted && (e.currentTarget.style.transform = 'translateY(0)')}
                                    >
                                        {isCompleted ? <><i className="fas fa-check-circle"></i> Completada</> : <><i className="far fa-circle"></i> Marcar como vista</>}
                                    </button>
                                )}
                            </div>
                            
                            <hr style={{border:'0', borderTop:'1px solid #eee', margin:'20px 0'}} />
                            
                            <p style={{fontSize:'1rem', lineHeight:'1.6', color:'#444'}}>
                                {activeLesson?.contenido_texto || (isQuiz ? "Completa el cuestionario de arriba para aprobar este módulo." : "No hay descripción adicional para esta lección.")}
                            </p>
                        </div>
                    )}
                    
                    {/* 🟢 PESTAÑA DE RECURSOS (LINKS) */}
                    {activeTab === 'recursos' && (
                        <div style={{padding:'10px'}}>
                            {activeLesson?.enlace_recurso ? (
                                <a 
                                    href={activeLesson.enlace_recurso} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '15px',
                                        background: '#f8f9fa', padding: '20px', borderRadius: '8px',
                                        textDecoration: 'none', color: '#333', border: '1px solid #e9ecef',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseOver={(e) => { e.currentTarget.style.background = '#e9ecef'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.background = '#f8f9fa'; }}
                                >
                                    <div style={{fontSize:'2rem', color:'#e74c3c'}}>
                                        <i className="fas fa-file-pdf"></i>
                                    </div>
                                    <div>
                                        <h4 style={{margin:'0 0 5px 0', color:'#0b3d91'}}>Recurso Descargable</h4>
                                        <p style={{margin:0, fontSize:'0.9rem', color:'#666'}}>{activeLesson.enlace_recurso}</p>
                                    </div>
                                    <div style={{marginLeft:'auto', color:'#2ecc71'}}>
                                        <i className="fas fa-download"></i> Abrir
                                    </div>
                                </a>
                            ) : (
                                <p style={{color:'#666', fontStyle:'italic'}}>No hay recursos adicionales para esta lección.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {!sidebarOpen && (
                <button 
                    className="toggle-sidebar-btn open" 
                    onClick={() => setSidebarOpen(true)}
                    title="Mostrar contenido del curso"
                >
                    <i className="fas fa-list"></i> Contenido del curso
                </button>
            )}
        </div>

        <div className={`curriculum-sidebar ${!sidebarOpen ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <span style={{fontWeight:'bold'}}>Contenido del curso</span>
                <button onClick={() => setSidebarOpen(false)} className="close-sidebar-btn" style={{background:'none', border:'none', cursor:'pointer'}}>
                    <i className="fas fa-times"></i>
                </button>
            </div>
            
            <div className="lesson-list-container">
                {curso?.modulos?.map((modulo, idx) => (
                    <div key={modulo.id} className="module-section">
                        <div className="module-title">
                            <strong>Sección {idx+1}:</strong> {modulo.titulo}
                        </div>
                        {modulo.lecciones?.map((leccion, i) => {
                             const isComp = completedLessons.includes(leccion.id);
                             const isQ = leccion.contenido_quiz && leccion.contenido_quiz.length > 0;
                             const isActive = activeLesson?.id === leccion.id;
                             
                             return (
                                <div 
                                    key={leccion.id} 
                                    className={`lesson-row ${isActive ? 'active' : ''}`} 
                                    onClick={() => setActiveLesson(leccion)}
                                >
                                    <div className="lesson-status-icon">
                                        {isComp ? (
                                            <i className="fas fa-check-square" style={{color: '#2ecc71'}}></i>
                                        ) : (
                                            <i className="far fa-square" style={{color: '#ccc'}}></i>
                                        )}
                                    </div>
                                    <div className="lesson-info">
                                        <div className="lesson-title">{i+1}. {leccion.titulo}</div>
                                        <div className="lesson-meta">
                                            {isQ ? (
                                                <span style={{color:'#e67e22'}}><i className="fas fa-tasks"></i> Cuestionario</span>
                                            ) : leccion.enlace_recurso && !leccion.url_video ? (
                                                <span style={{color:'#3498db'}}><i className="fas fa-file-alt"></i> Lectura</span>
                                            ) : (
                                                <span><i className="fas fa-play-circle"></i> {leccion.duracion || "Video"}</span>
                                            )}
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