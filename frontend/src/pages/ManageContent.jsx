import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import * as tus from 'tus-js-client';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function ManageContent() {
  const { id } = useParams(); 
  const { token } = useAuth();
  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

  const [curso, setCurso] = useState(null);
  const [modulos, setModulos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Formularios Generales
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  
  // --- ESTADOS LECCIÓN (Video + Desc + Recursos) ---
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDescription, setLessonDescription] = useState('');
  const [lessonDuration, setLessonDuration] = useState(''); 
  
  // 🟢 NUEVO ESTADO: RECURSOS
  const [lessonResource, setLessonResource] = useState(''); 
  
  const [videoFile, setVideoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // --- ESTADOS QUIZ (Cuestionario) ---
  const [showQuizBuilder, setShowQuizBuilder] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [tempQuestion, setTempQuestion] = useState({ 
      pregunta: '', opcion1: '', opcion2: '', opcion3: '', correcta: 0 
  });

  // Edición y Control
  const [editingLessonId, setEditingLessonId] = useState(null);
  
  // Referencia TUS
  const uploadRef = useRef(null); 

  // ==========================================
  //  FUNCIONES PARA CALCULAR DURACIÓN AUTO
  // ==========================================
  
  const getVideoDuration = (file) => {
    return new Promise((resolve, reject) => {
      try {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = function() {
          window.URL.revokeObjectURL(video.src);
          resolve(video.duration);
        }
        video.onerror = function() {
          reject("No se pudo cargar el video para leer su duración.");
        }
        video.src = URL.createObjectURL(file);
      } catch (e) {
        reject(e);
      }
    });
  };

  const formatDuration = (seconds) => {
      if (!seconds) return "00:00";
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      
      const mDisplay = m < 10 ? `0${m}` : m;
      const sDisplay = s < 10 ? `0${s}` : s;
      
      if (h > 0) {
          const hDisplay = h < 10 ? `0${h}` : h;
          return `${hDisplay}:${mDisplay}:${sDisplay}`;
      }
      return `${mDisplay}:${sDisplay}`;
  };

  const handleVideoSelect = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      setVideoFile(file); 
      
      try {
          const durationInSeconds = await getVideoDuration(file);
          const formattedDuration = formatDuration(durationInSeconds);
          setLessonDuration(formattedDuration); 
      } catch (error) {
          console.error("Error leyendo duración automática:", error);
      }
  };

  // --- CARGAR DATOS ---
  const fetchCurriculum = async () => {
    try {
      const res = await axios.get(`${API_URL}/cursos/${id}/curriculum`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurso(res.data);
      setModulos(res.data.modulos || []);
    } catch (error) {
      console.error("Error cargando temario", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCurriculum(); }, [id, API_URL, token]);

  // --- MÓDULOS ---
  const handleAddModule = async (e) => {
    e.preventDefault();
    if (!newModuleTitle) return;
    try {
      await axios.post(`${API_URL}/cursos/${id}/modules`, { titulo: newModuleTitle }, { headers: { Authorization: `Bearer ${token}` } });
      setNewModuleTitle('');
      fetchCurriculum();
    } catch (error) { alert("Error al crear módulo"); }
  };

  // --- FUNCIONES QUIZ ---
  const addQuestionToQuiz = () => {
      if(!tempQuestion.pregunta.trim() || !tempQuestion.opcion1.trim() || !tempQuestion.opcion2.trim()) {
          alert("Por favor, completa la pregunta y al menos las opciones A y B.");
          return;
      }
      
      const opcionesLimon = [tempQuestion.opcion1, tempQuestion.opcion2, tempQuestion.opcion3]
          .map(o => o.trim())
          .filter(o => o !== '');

      const nuevaPregunta = {
          pregunta: tempQuestion.pregunta.trim(),
          opciones: opcionesLimon,
          correcta: parseInt(tempQuestion.correcta)
      };

      if(nuevaPregunta.correcta >= nuevaPregunta.opciones.length) {
          alert("La respuesta correcta seleccionada no es válida para las opciones ingresadas.");
          return;
      }

      setQuizQuestions([...quizQuestions, nuevaPregunta]);
      setTempQuestion({ pregunta: '', opcion1: '', opcion2: '', opcion3: '', correcta: 0 });
  };

  const removeQuestion = (index) => {
      const newQuestions = [...quizQuestions];
      newQuestions.splice(index, 1);
      setQuizQuestions(newQuestions);
  };

  // --- FUNCIONES VIDEO ---
  const removeSelectedFile = () => {
      setVideoFile(null);
      const fileInput = document.getElementById('videoInput');
      if(fileInput) fileInput.value = "";
  };

  const cancelUpload = () => {
      if (uploadRef.current) {
          uploadRef.current.abort();
          setUploading(false);
          setUploadProgress(0);
          alert("Subida cancelada.");
      }
  };

  // --- PREPARAR EDICIÓN ---
  const startEditingLesson = (leccion, moduleId) => {
    setEditingLessonId(leccion.id);
    setLessonTitle(leccion.titulo);
    setLessonDescription(leccion.contenido_texto || '');
    setLessonDuration(leccion.duracion || ''); 
    // 🟢 CARGAMOS EL RECURSO SI EXISTE
    setLessonResource(leccion.enlace_recurso || '');
    
    setSelectedModuleId(moduleId);
    
    if (leccion.contenido_quiz && leccion.contenido_quiz.length > 0) {
        setQuizQuestions(leccion.contenido_quiz);
        setShowQuizBuilder(true);
    } else {
        setQuizQuestions([]);
        setShowQuizBuilder(false);
    }
    setTempQuestion({ pregunta: '', opcion1: '', opcion2: '', opcion3: '', correcta: 0 });

    setVideoFile(null); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditing = () => {
    setEditingLessonId(null);
    setLessonTitle('');
    setLessonDescription('');
    setLessonDuration(''); 
    setLessonResource(''); // Limpiamos recurso
    setVideoFile(null);
    setQuizQuestions([]);
    setShowQuizBuilder(false);
    setSelectedModuleId('');
    setTempQuestion({ pregunta: '', opcion1: '', opcion2: '', opcion3: '', correcta: 0 });
  };

  // --- GUARDAR TODO ---
  const handleSaveLesson = async (e) => {
    e.preventDefault();
    
    if (!selectedModuleId || !lessonTitle) { alert("Faltan datos (Módulo o Título)."); return; }
    
    const hasVideo = !!videoFile || (editingLessonId && !videoFile); // Si editamos, asumimos que ya puede haber video
    const hasQuiz = quizQuestions.length > 0;
    // Permitimos guardar si hay solo un recurso, o solo video, o solo quiz
    const hasResource = lessonResource && lessonResource.trim() !== "";

    // Validación flexible: Debe tener ALGO de contenido
    if (!hasVideo && !hasQuiz && !hasResource && !editingLessonId) { 
        alert("Debes agregar al menos un Video, un Cuestionario o un Recurso."); 
        return; 
    }

    setUploading(true);
    setUploadProgress(0);

    try {
        let finalEmbedUrl = null;

        // 1. Subir Video (Si hay uno nuevo seleccionado)
        if (videoFile) {
            const signRes = await axios.post(`${API_URL}/upload/video/presign`, 
                { title: lessonTitle }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            const { authHeader, expiration, videoId, embedUrl } = signRes.data;

            await new Promise((resolve, reject) => {
                const upload = new tus.Upload(videoFile, {
                    endpoint: 'https://video.bunnycdn.com/tusupload',
                    retryDelays: [0, 3000, 5000, 10000, 20000],
                    metadata: {
                        filetype: videoFile.type,
                        title: lessonTitle,
                    },
                    headers: {
                        'AuthorizationSignature': authHeader, 
                        'AuthorizationExpire': expiration,
                        'VideoId': videoId,
                        'LibraryId': '550746', 
                    },
                    onError: (error) => {
                        console.error("Error en TUS:", error);
                        reject(error);
                    },
                    onProgress: (bytesUploaded, bytesTotal) => {
                        const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(0);
                        setUploadProgress(percentage);
                    },
                    onSuccess: () => {
                        resolve();
                    },
                });

                uploadRef.current = upload;
                upload.start();
            });
            
            finalEmbedUrl = embedUrl;
        }

        // 2. Preparar Datos
        const leccionData = { 
            titulo: lessonTitle, 
            contenido_texto: lessonDescription,
            duracion: lessonDuration,
            // 🟢 ENVIAMOS EL RECURSO AL BACKEND
            enlace_recurso: lessonResource, 
            contenido_quiz: quizQuestions.length > 0 ? quizQuestions : null 
        };
        
        if (finalEmbedUrl) {
            leccionData.url_video = finalEmbedUrl;
        }

        // 3. Guardar en BD
        if (editingLessonId) {
            await axios.put(`${API_URL}/cursos/lessons/${editingLessonId}`, leccionData, { headers: { Authorization: `Bearer ${token}` } });
            alert("Lección actualizada correctamente.");
        } else {
            await axios.post(`${API_URL}/cursos/modules/${selectedModuleId}/lessons`, leccionData, { headers: { Authorization: `Bearer ${token}` } });
            alert("Lección creada exitosamente.");
        }

        cancelEditing();
        fetchCurriculum();

    } catch (error) {
        if (!axios.isCancel(error)) {
            console.error("Error:", error);
            alert("Error al guardar la lección: " + (error.message || "Revisa la consola"));
        }
    } finally {
        setUploading(false);
    }
  };

  const handleDeleteModule = async (mid) => { if(!confirm("¿Borrar módulo y sus lecciones?"))return; try{ await axios.delete(`${API_URL}/cursos/modules/${mid}`, {headers:{Authorization:`Bearer ${token}`}}); fetchCurriculum(); }catch(e){alert("Error al borrar módulo");} };
  const handleEditModule = async (mod) => { const t = prompt("Nuevo nombre del módulo:", mod.titulo); if(t && t.trim() !== "") try{ await axios.put(`${API_URL}/cursos/modules/${mod.id}`, {titulo:t}, {headers:{Authorization:`Bearer ${token}`}}); fetchCurriculum(); }catch(e){alert("Error al editar módulo");} };
  const handleDeleteLesson = async (lid) => { if(!confirm("¿Borrar esta lección?"))return; try{ await axios.delete(`${API_URL}/cursos/lessons/${lid}`, {headers:{Authorization:`Bearer ${token}`}}); fetchCurriculum(); }catch(e){alert("Error al borrar lección");} };

  if (loading) return <div style={{padding:'20px', textAlign:'center'}}>Cargando contenido...</div>;

  return (
    <>
      <Navbar />
      <main className="dashboard-content">
        <header className="content-header"><h2>Gestionar: {curso?.titulo}</h2></header>
        
        <div className="content-management-layout">
            
            {/* IZQUIERDA: TEMARIO */}
            <div className="curriculum-display">
                {modulos.map(mod => (
                    <div key={mod.id} className="module-container">
                        <div className="module-header" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <strong>{mod.titulo}</strong>
                            <div>
                                <button onClick={() => handleEditModule(mod)} style={iconBtnStyle} title="Editar Módulo"><i className="fas fa-edit"></i></button>
                                <button onClick={() => handleDeleteModule(mod.id)} style={{...iconBtnStyle, color:'#e74c3c'}} title="Borrar Módulo"><i className="fas fa-trash-alt"></i></button>
                            </div>
                        </div>
                        <ul className="lessons-list-in-module">
                            {mod.lecciones?.map(lec => (
                                <li key={lec.id} style={{justifyContent:'space-between'}}>
                                    <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                                        {/* ÍCONOS SEGÚN TIPO DE CONTENIDO */}
                                        {lec.contenido_quiz && lec.contenido_quiz.length > 0 ? (
                                            <i className="fas fa-tasks" style={{color: '#f39c12'}} title="Cuestionario"></i>
                                        ) : lec.enlace_recurso ? (
                                            <i className="fas fa-link" style={{color: '#3498db'}} title="Recurso/Link"></i>
                                        ) : (
                                            <i className="fas fa-film" style={{color: '#00d4d4'}} title="Video"></i>
                                        )}
                                        
                                        {lec.titulo} 
                                        {lec.duracion && <span style={{fontSize:'0.8rem', color:'#999', marginLeft:'5px'}}>({lec.duracion})</span>}
                                    </div>
                                    <div>
                                        <button onClick={() => startEditingLesson(lec, mod.id)} style={iconBtnStyle} title="Editar Lección"><i className="fas fa-pencil-alt"></i></button>
                                        <button onClick={() => handleDeleteLesson(lec.id)} style={{...iconBtnStyle, color:'#e74c3c'}} title="Borrar Lección"><i className="fas fa-times"></i></button>
                                    </div>
                                </li>
                            ))}
                            {mod.lecciones?.length === 0 && <li style={{color:'#999', fontStyle:'italic'}}>Sin lecciones</li>}
                        </ul>
                    </div>
                ))}
                {modulos.length === 0 && <p style={{textAlign:'center', color:'#777'}}>Comienza creando un módulo.</p>}
            </div>

            {/* DERECHA: FORMULARIOS */}
            <div className="add-lesson-form-container">
                
                {/* FORMULARIO NUEVO MÓDULO */}
                <div style={{marginBottom:'25px', background:'#fff', padding:'20px', borderRadius:'8px', boxShadow:'0 2px 5px rgba(0,0,0,0.05)'}}>
                    <h3 style={{marginTop:0}}>Nuevo Módulo</h3>
                    <form onSubmit={handleAddModule} style={{display:'flex', gap:'10px'}}>
                        <input type="text" placeholder="Ej: Introducción, Módulo 1..." value={newModuleTitle} onChange={e => setNewModuleTitle(e.target.value)} style={{flex:1, padding:'10px', border:'1px solid #ddd', borderRadius:'4px'}} />
                        <button className="btn-create-course" style={{whiteSpace:'nowrap', padding:'10px 20px'}}>
                            <i className="fas fa-plus"></i> Agregar
                        </button>
                    </form>
                </div>

                {/* FORMULARIO LECCIÓN */}
                <div style={{background:'#fff', padding:'25px', borderRadius:'8px', boxShadow:'0 4px 10px rgba(0,0,0,0.08)'}}>
                    <h3 style={{display:'flex', justifyContent:'space-between', marginTop:0, color:'var(--color-primario)'}}>
                        {editingLessonId ? <span><i className="fas fa-edit"></i> Editar Lección</span> : <span><i className="fas fa-plus-circle"></i> Nueva Lección</span>}
                        {editingLessonId && <button onClick={cancelEditing} style={{color:'#e74c3c', border:'none', background:'none', cursor:'pointer', fontSize:'0.9rem'}}><i className="fas fa-times"></i> Cancelar Edición</button>}
                    </h3>

                    <form onSubmit={handleSaveLesson}>
                        <div className="form-group">
                            <label style={labelStyle}>Módulo al que pertenece:</label>
                            <select value={selectedModuleId} onChange={e => setSelectedModuleId(e.target.value)} style={inputStyle} disabled={!!editingLessonId} required>
                                <option value="">-- Seleccionar Módulo --</option>
                                {modulos.map(m => <option key={m.id} value={m.id}>{m.titulo}</option>)}
                            </select>
                        </div>
                        
                        <div className="form-group">
                             <label style={labelStyle}>Título de la Lección:</label>
                            <input type="text" placeholder="Ej: Clase 1: Fundamentos..." value={lessonTitle} onChange={e => setLessonTitle(e.target.value)} style={inputStyle} required />
                        </div>

                        <div className="form-group">
                             <label style={labelStyle}>Duración (Auto-calculada al subir video):</label>
                            <input 
                                type="text" 
                                placeholder="MM:SS (Se llena automático)" 
                                value={lessonDuration} 
                                onChange={e => setLessonDuration(e.target.value)} 
                                style={{...inputStyle, background:'#f9f9f9'}} 
                            />
                        </div>

                        <div className="form-group">
                            <label style={labelStyle}>Descripción / Notas (Opcional):</label>
                            <textarea rows="3" placeholder="Información adicional para el estudiante..." value={lessonDescription} onChange={e => setLessonDescription(e.target.value)} style={{...inputStyle, resize:'vertical'}}></textarea>
                        </div>

                        {/* 🟢 NUEVO CAMPO: ENLACE DE RECURSO */}
                        <div className="form-group">
                            <label style={labelStyle}><i className="fas fa-link"></i> Enlace de Recurso (PDF, Drive, Web):</label>
                            <input 
                                type="url" 
                                placeholder="Ej: https://drive.google.com/..." 
                                value={lessonResource} 
                                onChange={e => setLessonResource(e.target.value)} 
                                style={inputStyle} 
                            />
                            <small style={{color:'#888', display:'block', marginTop:'5px'}}>* Opcional: Agrega un link para que los alumnos descarguen material.</small>
                        </div>
                        
                        {/* SECCIÓN DE VIDEO */}
                        <div className="form-group" style={{marginTop:'20px'}}>
                            <label style={labelStyle}><i className="fas fa-video"></i> Contenido de Video (Opcional si hay Quiz/Recurso):</label>
                            <label className="file-upload-label" style={fileUploadStyle(videoFile)}>
                                <div style={{textAlign:'center'}}>
                                    <i className="fas fa-cloud-upload-alt" style={{fontSize:'2rem', color: videoFile ? '#2ecc71' : '#ccc', marginBottom:'10px'}}></i>
                                    <p style={{margin:'0', fontWeight:'500', color:'#555'}}>{videoFile ? videoFile.name : "Clic para seleccionar archivo de video (MP4, MOV...)"}</p>
                                </div>
                                <input 
                                    id="videoInput" 
                                    type="file" 
                                    accept="video/*" 
                                    onChange={handleVideoSelect} 
                                    style={{display:'none'}} 
                                />
                            </label>
                            {videoFile && (
                                <button type="button" onClick={removeSelectedFile} style={{color:'#e74c3c', border:'none', background:'none', marginTop:'8px', cursor:'pointer', display:'flex', alignItems:'center', gap:'5px'}}>
                                    <i className="fas fa-trash"></i> Quitar video seleccionado
                                </button>
                            )}
                        </div>

                        {/* --- SECCIÓN CREADOR DE CUESTIONARIOS --- */}
                        <div className="form-group" style={{marginTop:'25px', borderTop:'1px solid #eee', paddingTop:'20px'}}>
                            <button type="button" onClick={() => setShowQuizBuilder(!showQuizBuilder)} style={toggleQuizBtnStyle(showQuizBuilder)}>
                                <i className={`fas ${showQuizBuilder ? 'fa-chevron-up' : 'fa-tasks'}`}></i> {showQuizBuilder ? 'Ocultar Creador de Cuestionario' : 'Agregar Cuestionario / Quiz'}
                            </button>
                        </div>

                        {showQuizBuilder && (
                            <div className="quiz-builder-container" style={quizStyles.container}>
                                <h4 style={quizStyles.header}>
                                    <i className="fas fa-list-ol"></i> Preguntas del Cuestionario ({quizQuestions.length})
                                </h4>
                                
                                {quizQuestions.length > 0 ? (
                                    <div style={quizStyles.questionList}>
                                            {quizQuestions.map((q, idx) => (
                                                <div key={idx} style={quizStyles.questionItem}>
                                                    <div style={{flex: 1}}>
                                                        <div style={{fontWeight:'bold', marginBottom:'5px'}}>{idx + 1}. {q.pregunta}</div>
                                                        <div style={quizStyles.optionsPreview}>
                                                            {q.opciones.map((op, i) => (
                                                                <span key={i} style={{...quizStyles.optionBadge, background: i === q.correcta ? '#d4edda' : '#f1f3f5', color: i === q.correcta ? '#155724' : '#495057', border: i === q.correcta ? '1px solid #c3e6cb' : '1px solid #e9ecef'}}>
                                                                    {op} {i === q.correcta && <i className="fas fa-check-circle" style={{marginLeft:'4px'}}></i>}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <button type="button" onClick={() => removeQuestion(idx)} style={quizStyles.deleteBtn} title="Eliminar esta pregunta">
                                                        <i className="fas fa-trash-alt"></i>
                                                    </button>
                                                </div>
                                            ))}
                                    </div>
                                ) : (
                                    <p style={{color:'#777', fontStyle:'italic', marginBottom:'20px'}}>Aún no has agregado preguntas.</p>
                                )}

                                <div style={quizStyles.addFormContainer}>
                                    <h5 style={{margin:'0 0 15px 0', color:'var(--color-primario)', borderBottom:'1px solid #eee', paddingBottom:'10px'}}>Nueva Pregunta</h5>
                                    
                                    <div className="form-group">
                                        <label style={quizStyles.labelSmall}>Texto de la Pregunta:</label>
                                        <input type="text" placeholder="Ej: ¿Cuál es el resultado de 2+2?" value={tempQuestion.pregunta} onChange={e => setTempQuestion({...tempQuestion, pregunta: e.target.value})} style={inputStyle} />
                                    </div>

                                    <div style={quizStyles.optionsGrid}>
                                        <div style={{flex:1}}>
                                            <label style={quizStyles.labelSmall}>Opción A (Obligatoria):</label>
                                            <input type="text" placeholder="Respuesta..." value={tempQuestion.opcion1} onChange={e => setTempQuestion({...tempQuestion, opcion1: e.target.value})} style={inputStyle} />
                                        </div>
                                        <div style={{flex:1}}>
                                            <label style={quizStyles.labelSmall}>Opción B (Obligatoria):</label>
                                            <input type="text" placeholder="Respuesta..." value={tempQuestion.opcion2} onChange={e => setTempQuestion({...tempQuestion, opcion2: e.target.value})} style={inputStyle} />
                                        </div>
                                        <div style={{flex:1}}>
                                            <label style={quizStyles.labelSmall}>Opción C (Opcional):</label>
                                            <input type="text" placeholder="Respuesta..." value={tempQuestion.opcion3} onChange={e => setTempQuestion({...tempQuestion, opcion3: e.target.value})} style={inputStyle} />
                                        </div>
                                    </div>

                                    <div style={quizStyles.footerActions}>
                                        <div style={{display:'flex', alignItems:'center', gap:'10px', background:'#fff', padding:'10px', borderRadius:'5px', border:'1px solid #eee'}}>
                                            <label style={{fontWeight:'bold', color:'#555', margin:0}}>Respuesta Correcta:</label>
                                            <select value={tempQuestion.correcta} onChange={e => setTempQuestion({...tempQuestion, correcta: e.target.value})} style={{...inputStyle, marginBottom:0, width:'auto', padding:'8px'}}>
                                                <option value="0">Opción A</option>
                                                <option value="1">Opción B</option>
                                                {tempQuestion.opcion3 && <option value="2">Opción C</option>}
                                            </select>
                                        </div>
                                        <button type="button" onClick={addQuestionToQuiz} style={quizStyles.addButton}>
                                            <i className="fas fa-plus-circle"></i> Agregar Pregunta al Cuestionario
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {uploading && (
                            <div style={{marginTop:'20px', background:'#eafaf1', padding:'15px', borderRadius:'5px', border:'1px solid #d5f5e3'}}>
                                <p style={{fontWeight:'bold', color:'#27ae60', margin:'0 0 10px 0'}}><i className="fas fa-spinner fa-spin"></i> Subiendo video...</p>
                                <div style={{height:'10px', width:'100%', background:'#ccc', borderRadius:'5px', overflow:'hidden'}}>
                                    <div style={{height:'100%', width:`${uploadProgress}%`, background:'#2ecc71', transition:'width 0.3s'}}></div>
                                </div>
                                <div style={{display:'flex', justifyContent:'space-between', marginTop:'5px', fontSize:'0.9rem'}}>
                                    <span>{uploadProgress}% Completado</span>
                                    <button type="button" onClick={cancelUpload} style={{color:'#e74c3c', border:'none', background:'none', cursor:'pointer', fontWeight:'bold'}}>Cancelar Subida</button>
                                </div>
                            </div>
                        )}

                        <button className="btn-submit-course" disabled={uploading} style={{marginTop:'25px', width:'100%', padding:'15px', fontSize:'1.1rem', display:'flex', justifyContent:'center', alignItems:'center', gap:'10px'}}>
                            {uploading ? <><i className="fas fa-circle-notch fa-spin"></i> Procesando...</> : <><i className="fas fa-save"></i> {editingLessonId ? 'Guardar Cambios' : 'Crear Lección'}</>}
                        </button>
                    </form>
                </div>
            </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

// --- ESTILOS ---
const iconBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', marginLeft: '8px', fontSize: '1.1rem', color: '#666', padding:'5px' };
const inputStyle = { width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '5px', fontSize: '1rem', outline:'none', transition:'border 0.2s' };
const labelStyle = { display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' };

const fileUploadStyle = (file) => ({
    display: 'block',
    border: `2px dashed ${file ? '#2ecc71' : '#ccc'}`,
    padding: '30px 20px',
    cursor: 'pointer',
    background: file ? '#f0fdf4' : '#f9f9f9',
    borderRadius: '8px',
    transition: 'all 0.3s'
});

const toggleQuizBtnStyle = (active) => ({
    background: active ? 'var(--color-primario)' : 'none',
    border: `2px solid var(--color-primario)`,
    color: active ? 'white' : 'var(--color-primario)',
    padding: '10px 20px',
    borderRadius: '30px',
    cursor: 'pointer',
    width: '100%',
    fontWeight: '600',
    fontSize: '1rem',
    display: 'flex', alignItems:'center', justifyContent:'center', gap:'10px',
    transition: 'all 0.2s'
});

const quizStyles = {
    container: {
        background: '#fff', padding: '25px', borderRadius: '10px', marginTop: '20px',
        border: '1px solid #e1e4e8', boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
    },
    header: { marginTop: 0, marginBottom: '20px', color: 'var(--color-primario)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem' },
    questionList: { maxHeight: '350px', overflowY: 'auto', marginBottom: '25px', border: '1px solid #eee', borderRadius: '8px', background:'#fbfbfb' },
    questionItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '15px', borderBottom: '1px solid #eee', background: '#fff' },
    optionsPreview: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' },
    optionBadge: { fontSize: '0.85rem', padding: '4px 10px', borderRadius: '15px' },
    deleteBtn: { background: '#fff5f5', border: '1px solid #ffc9c9', color: '#e74c3c', cursor: 'pointer', padding: '8px 12px', fontSize: '1rem', marginLeft: '15px', borderRadius:'5px', transition:'background 0.2s' },
    addFormContainer: { background: '#f8f9fa', padding: '20px', borderRadius: '10px', border: '1px solid #eee' },
    optionsGrid: { display: 'flex', gap: '15px', marginBottom: '15px', flexWrap: 'wrap' },
    labelSmall: { display: 'block', fontSize: '0.9rem', color: '#666', marginBottom: '6px', fontWeight:'500' },
    footerActions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginTop:'20px' },
    addButton: { background: '#2ecc71', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', fontSize:'1rem', boxShadow:'0 2px 5px rgba(46, 204, 113, 0.3)' }
};

export default ManageContent;