import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function ManageContent() {
  const { id } = useParams(); 
  const { token } = useAuth();
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  const [curso, setCurso] = useState(null);
  const [modulos, setModulos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Formularios
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  
  // --- ESTADOS PARA LA LECCIÓN (Video + Descripción) ---
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDescription, setLessonDescription] = useState(''); // ✅ NUEVO ESTADO
  const [videoFile, setVideoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Estado para saber si estamos editando
  const [editingLessonId, setEditingLessonId] = useState(null);

  const abortControllerRef = useRef(null);

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

  useEffect(() => {
    fetchCurriculum();
  }, [id]);

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

  // --- FUNCIONES DE ARCHIVO ---
  const removeSelectedFile = () => {
      setVideoFile(null);
      const fileInput = document.getElementById('videoInput');
      if(fileInput) fileInput.value = "";
  };

  const cancelUpload = () => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          setUploading(false);
          setUploadProgress(0);
          alert("Subida cancelada.");
      }
  };

  // --- PREPARAR EDICIÓN ---
  const startEditingLesson = (leccion, moduleId) => {
    setEditingLessonId(leccion.id);
    setLessonTitle(leccion.titulo);
    // Si la lección tiene descripción, la cargamos (asegúrate de que el backend la devuelva)
    setLessonDescription(leccion.contenido_texto || ''); 
    setSelectedModuleId(moduleId);
    setVideoFile(null); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditing = () => {
    setEditingLessonId(null);
    setLessonTitle('');
    setLessonDescription('');
    setVideoFile(null);
    setSelectedModuleId('');
  };

  // --- GESTIÓN DE LECCIONES (CREAR O ACTUALIZAR) ---
  const handleSaveLesson = async (e) => {
    e.preventDefault();
    
    if (!selectedModuleId || !lessonTitle) { 
        alert("Faltan datos obligatorios."); 
        return; 
    }
    if (!editingLessonId && !videoFile) { 
        alert("Selecciona un video."); 
        return; 
    }

    setUploading(true);
    setUploadProgress(0);
    abortControllerRef.current = new AbortController();

    try {
        let finalEmbedUrl = null;

        // SI HAY ARCHIVO NUEVO -> SUBIR A BUNNY
        if (videoFile) {
            const signRes = await axios.post(`${API_URL}/upload/video/presign`, 
                { title: lessonTitle }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const { uploadUrl, authHeader, expiration, embedUrl } = signRes.data;

            await axios.put(uploadUrl, videoFile, {
                headers: {
                    'AuthorizationSignature': authHeader,
                    'AuthorizationExpire': expiration,
                    'Content-Type': 'application/octet-stream',
                    'AccessKey': 'f1d8a002-fe51-475d-9853052bac34-5727-429f' // Tu API Key
                },
                onUploadProgress: (progressEvent) => {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percent);
                },
                signal: abortControllerRef.current.signal
            });
            finalEmbedUrl = embedUrl;
        }

        const leccionData = { 
            titulo: lessonTitle, 
            contenido_texto: lessonDescription // ✅ ENVIAMOS LA DESCRIPCIÓN
        };
        if (finalEmbedUrl) leccionData.url_video = finalEmbedUrl;

        if (editingLessonId) {
            // EDITAR
            await axios.put(`${API_URL}/cursos/lessons/${editingLessonId}`, leccionData, { 
                headers: { Authorization: `Bearer ${token}` } 
            });
            alert("Lección actualizada.");
        } else {
            // CREAR
            await axios.post(`${API_URL}/cursos/modules/${selectedModuleId}/lessons`, 
                leccionData, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert("Lección creada exitosamente.");
        }

        cancelEditing(); // Limpia todo
        fetchCurriculum();

    } catch (error) {
        if (!axios.isCancel(error)) {
            console.error("Error:", error);
            alert("Error al guardar.");
        }
    } finally {
        setUploading(false);
    }
  };

  // --- BORRAR ---
  const handleDeleteLesson = async (lessonId) => {
    if(!confirm("¿Borrar lección?")) return;
    try { await axios.delete(`${API_URL}/cursos/lessons/${lessonId}`, {headers:{Authorization:`Bearer ${token}`}}); fetchCurriculum(); } catch(e){alert("Error");}
  };

  const handleDeleteModule = async (moduleId) => {
    if(!confirm("¿Borrar módulo?")) return;
    try { await axios.delete(`${API_URL}/cursos/modules/${moduleId}`, { headers: { Authorization: `Bearer ${token}` } }); fetchCurriculum(); } catch (e) { alert("Error"); }
  };

  const handleEditModule = async (modulo) => {
    const t = prompt("Nombre:", modulo.titulo); if(t && t!==modulo.titulo) try { await axios.put(`${API_URL}/cursos/modules/${modulo.id}`, {titulo:t}, {headers:{Authorization:`Bearer ${token}`}}); fetchCurriculum(); } catch(e){alert("Error");}
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <>
      <Navbar />
      <main className="dashboard-content">
        <header className="content-header"><h2>Gestionar: {curso?.titulo}</h2></header>
        
        <div className="content-management-layout">
            
            {/* COLUMNA IZQUIERDA */}
            <div className="curriculum-display">
                {modulos.map(mod => (
                    <div key={mod.id} className="module-container">
                        <div className="module-header" style={{display:'flex', justifyContent:'space-between'}}>
                            <strong>{mod.titulo}</strong>
                            <div>
                                <button onClick={() => handleEditModule(mod)} style={iconBtnStyle}><i className="fas fa-edit"></i></button>
                                <button onClick={() => handleDeleteModule(mod.id)} style={{...iconBtnStyle, color:'#e74c3c'}}><i className="fas fa-trash"></i></button>
                            </div>
                        </div>
                        <ul className="lessons-list-in-module">
                            {mod.lecciones?.map(lec => (
                                <li key={lec.id} style={{justifyContent:'space-between'}}>
                                    <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                                        <i className="fas fa-film" style={{color: '#00d4d4'}}></i> {lec.titulo}
                                    </div>
                                    <div>
                                        <button onClick={() => startEditingLesson(lec, mod.id)} style={iconBtnStyle}><i className="fas fa-pencil-alt"></i></button>
                                        <button onClick={() => handleDeleteLesson(lec.id)} style={{...iconBtnStyle, color:'#e74c3c'}}><i className="fas fa-times"></i></button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            {/* COLUMNA DERECHA */}
            <div className="add-lesson-form-container">
                <div style={{marginBottom:'20px'}}>
                    <h3>Nuevo Módulo</h3>
                    <form onSubmit={handleAddModule}>
                        <input type="text" placeholder="Nombre" value={newModuleTitle} onChange={e => setNewModuleTitle(e.target.value)} style={{width:'100%', padding:'10px'}} />
                        <button className="btn-create-course" style={{marginTop:'10px', width:'100%'}}>Agregar</button>
                    </form>
                </div>

                <div>
                    <h3 style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        {editingLessonId ? 'Editar Lección' : 'Subir Video'}
                        {editingLessonId && <button onClick={cancelEditing} style={{fontSize:'0.8rem', color:'red', border:'none', background:'none', cursor:'pointer'}}>Cancelar</button>}
                    </h3>

                    <form onSubmit={handleSaveLesson}>
                        <div className="form-group">
                            <label>Módulo:</label>
                            <select value={selectedModuleId} onChange={e => setSelectedModuleId(e.target.value)} style={{width:'100%', padding:'10px'}} disabled={!!editingLessonId}>
                                <option value="">-- Seleccionar --</option>
                                {modulos.map(m => <option key={m.id} value={m.id}>{m.titulo}</option>)}
                            </select>
                        </div>
                        
                        <div className="form-group">
                            <input type="text" placeholder="Título de la lección" value={lessonTitle} onChange={e => setLessonTitle(e.target.value)} />
                        </div>

                        {/* ✅ NUEVO CAMPO: DESCRIPCIÓN */}
                        <div className="form-group">
                            <textarea 
                                rows="3" 
                                placeholder="Descripción / Notas de la clase..." 
                                value={lessonDescription} 
                                onChange={e => setLessonDescription(e.target.value)}
                                style={{width:'100%', padding:'10px', border:'1px solid #ccc', borderRadius:'5px'}}
                            ></textarea>
                        </div>
                        
                        <div className="form-group">
                            <label className="file-upload-label" style={{display:'block', border:'2px dashed #ccc', padding:'20px', textAlign:'center', cursor:'pointer', background: videoFile ? '#e8f8f5' : 'white'}}>
                                <p style={{margin:'0', fontWeight:'bold'}}>
                                    {videoFile ? videoFile.name : (editingLessonId ? "Cambiar video (opcional)" : "Clic para seleccionar video")}
                                </p>
                                <input 
                                    id="videoInput"
                                    type="file" 
                                    accept="video/*"
                                    onChange={e => setVideoFile(e.target.files[0])}
                                    style={{display:'none'}}
                                />
                            </label>
                            {videoFile && <button type="button" onClick={removeSelectedFile} style={{color:'red', border:'none', background:'none', marginTop:'5px', cursor:'pointer'}}>Quitar video</button>}
                        </div>

                        {uploading && (
                            <div style={{marginBottom:'15px'}}>
                                <div style={{height:'10px', width:'100%', background:'#eee', borderRadius:'5px', overflow:'hidden'}}>
                                    <div style={{height:'100%', width:`${uploadProgress}%`, background:'#00d4d4', transition:'width 0.2s'}}></div>
                                </div>
                                <div style={{display:'flex', justifyContent:'space-between'}}>
                                    <span style={{fontSize:'0.8rem'}}>Subiendo... {uploadProgress}%</span>
                                    <button type="button" onClick={cancelUpload} style={{color:'red', border:'none', background:'none', cursor:'pointer', fontSize:'0.8rem'}}>Cancelar</button>
                                </div>
                            </div>
                        )}

                        <button className="btn-submit-course" disabled={uploading} style={{marginTop:'15px', width:'100%'}}>
                            {uploading ? 'Procesando...' : (editingLessonId ? 'Guardar Cambios' : 'Subir y Guardar')}
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

const iconBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', marginLeft: '8px', fontSize: '1rem', color: '#666' };

export default ManageContent;