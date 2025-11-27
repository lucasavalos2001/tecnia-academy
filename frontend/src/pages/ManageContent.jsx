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
  
  // --- ESTADOS PARA LA SUBIDA DE VIDEO ---
  const [lessonTitle, setLessonTitle] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Referencia para cancelar la subida
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

  // --- ✅ FUNCIONES NUEVAS: CONTROL DE ARCHIVO ---
  
  // Quitar archivo seleccionado (Botón X)
  const removeSelectedFile = () => {
      setVideoFile(null);
      // Limpiar el input file invisible
      const fileInput = document.getElementById('videoInput');
      if(fileInput) fileInput.value = "";
  };

  // Cancelar subida en progreso
  const cancelUpload = () => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          setUploading(false);
          setUploadProgress(0);
          alert("Subida cancelada por el usuario.");
      }
  };

  // --- SUBIDA DE VIDEO A BUNNY.NET ---
  const handleAddLesson = async (e) => {
    e.preventDefault();
    
    if (!selectedModuleId || !lessonTitle) { 
        alert("Por favor selecciona un módulo y escribe un título."); 
        return; 
    }
    if (!videoFile) { 
        alert("Por favor selecciona un archivo de video."); 
        return; 
    }

    setUploading(true);
    setUploadProgress(0);

    // Crear controlador de cancelación
    abortControllerRef.current = new AbortController();

    try {
        // 1. Pedir permiso al Backend
        const signRes = await axios.post(`${API_URL}/upload/video/presign`, 
            { title: lessonTitle }, 
            { headers: { Authorization: `Bearer ${token}` } }
        );

        const { uploadUrl, embedUrl } = signRes.data;

        // 2. Subir a Bunny con la API Key directa (Solución al error 401)
        await axios.put(uploadUrl, videoFile, {
            headers: {
                'AccessKey': 'f1d8a002-fe51-475d-9853052bac34-5727-429f', // Tu clave real
                'Content-Type': 'application/octet-stream'
            },
            onUploadProgress: (progressEvent) => {
                const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploadProgress(percent);
            },
            signal: abortControllerRef.current.signal // Conectar señal de cancelación
        });

        // 3. Guardar la lección en base de datos
        await axios.post(`${API_URL}/cursos/modules/${selectedModuleId}/lessons`, 
            { titulo: lessonTitle, url_video: embedUrl }, 
            { headers: { Authorization: `Bearer ${token}` } }
        );

        setLessonTitle('');
        removeSelectedFile();
        setUploadProgress(0);
        alert("¡Video subido exitosamente!");
        fetchCurriculum();

    } catch (error) {
        if (axios.isCancel(error)) {
            console.log('Subida cancelada');
        } else {
            console.error("Error subida:", error);
            alert("Error al subir el video.");
        }
    } finally {
        setUploading(false);
    }
  };

  // ... (Funciones de edición y borrado se mantienen igual) ...
  const handleDeleteModule = async (moduleId) => { if(!confirm("¿Borrar este módulo?")) return; try { await axios.delete(`${API_URL}/cursos/modules/${moduleId}`, { headers: { Authorization: `Bearer ${token}` } }); fetchCurriculum(); } catch (e) { alert("Error"); } };
  const handleEditModule = async (mod) => { const t = prompt("Nombre:", mod.titulo); if(t && t!==mod.titulo) try { await axios.put(`${API_URL}/cursos/modules/${mod.id}`, {titulo:t}, {headers:{Authorization:`Bearer ${token}`}}); fetchCurriculum(); } catch(e){alert("Error");} };
  const handleDeleteLesson = async (id) => { if(!confirm("¿Borrar lección?")) return; try { await axios.delete(`${API_URL}/cursos/lessons/${id}`, {headers:{Authorization:`Bearer ${token}`}}); fetchCurriculum(); } catch(e){alert("Error");} };
  const handleEditLesson = async (lec) => { const t = prompt("Título:", lec.titulo); if(t && t!==lec.titulo) try { await axios.put(`${API_URL}/cursos/lessons/${lec.id}`, {titulo:t, url_video:lec.url_video}, {headers:{Authorization:`Bearer ${token}`}}); fetchCurriculum(); } catch(e){alert("Error");} };

  if (loading) return <div>Cargando gestor...</div>;

  return (
    <>
      <Navbar />
      <main className="dashboard-content">
        <header className="content-header"><h2>Gestionar: {curso?.titulo}</h2></header>
        
        <div className="content-management-layout">
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
                                        <button onClick={() => handleEditLesson(lec)} style={iconBtnStyle}><i className="fas fa-pencil-alt"></i></button>
                                        <button onClick={() => handleDeleteLesson(lec.id)} style={{...iconBtnStyle, color:'#e74c3c'}}><i className="fas fa-times"></i></button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <div className="add-lesson-form-container">
                <div style={{marginBottom:'20px'}}>
                    <h3>Nuevo Módulo</h3>
                    <form onSubmit={handleAddModule}>
                        <input type="text" placeholder="Nombre" value={newModuleTitle} onChange={e => setNewModuleTitle(e.target.value)} style={{width:'100%', padding:'10px'}} />
                        <button className="btn-create-course" style={{marginTop:'10px', width:'100%'}}>Agregar</button>
                    </form>
                </div>

                <div>
                    <h3>Subir Video</h3>
                    <form onSubmit={handleAddLesson}>
                        <select value={selectedModuleId} onChange={e => setSelectedModuleId(e.target.value)} style={{width:'100%', padding:'10px', marginBottom:'10px'}}>
                            <option value="">-- Seleccionar Módulo --</option>
                            {modulos.map(m => <option key={m.id} value={m.id}>{m.titulo}</option>)}
                        </select>
                        <input type="text" placeholder="Título del Video" value={lessonTitle} onChange={e => setLessonTitle(e.target.value)} style={{width:'100%', padding:'10px', marginBottom:'10px'}} />
                        
                        {/* INPUT DE ARCHIVO MEJORADO CON "X" */}
                        {!videoFile ? (
                            <label className="file-upload-label" style={{display:'block', border:'2px dashed #ccc', padding:'20px', textAlign:'center', cursor:'pointer', background: 'white'}}>
                                <i className="fas fa-cloud-upload-alt" style={{fontSize:'2rem', color:'#00d4d4'}}></i>
                                <p style={{margin:'10px 0'}}>Clic para seleccionar video (MP4)</p>
                                <input 
                                    id="videoInput"
                                    type="file" 
                                    accept="video/*"
                                    onChange={e => setVideoFile(e.target.files[0])}
                                    style={{display:'none'}}
                                />
                            </label>
                        ) : (
                            <div style={{padding:'15px', background:'#e8f8f5', borderRadius:'5px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                <span style={{fontSize:'0.9rem', fontWeight:'bold', color:'#0b3d91'}}>
                                    <i className="fas fa-file-video"></i> {videoFile.name}
                                </span>
                                {/* ✅ BOTÓN X PARA QUITAR ARCHIVO */}
                                <button type="button" onClick={removeSelectedFile} style={{background:'none', border:'none', color:'#e74c3c', cursor:'pointer', fontSize:'1.2rem'}} title="Quitar archivo">
                                    <i className="fas fa-times-circle"></i>
                                </button>
                            </div>
                        )}

                        {/* BARRA DE PROGRESO CON BOTÓN CANCELAR */}
                        {uploading && (
                            <div style={{marginTop:'15px'}}>
                                <div style={{height:'10px', width:'100%', background:'#eee', borderRadius:'5px', overflow:'hidden'}}>
                                    <div style={{height:'100%', width:`${uploadProgress}%`, background:'#00d4d4', transition:'width 0.2s'}}></div>
                                </div>
                                <div style={{display:'flex', justifyContent:'space-between', marginTop:'5px'}}>
                                    <span style={{fontSize:'0.8rem'}}>Subiendo... {uploadProgress}%</span>
                                    {/* ✅ BOTÓN CANCELAR SUBIDA */}
                                    <button type="button" onClick={cancelUpload} style={{background:'none', border:'none', color:'#e74c3c', fontSize:'0.8rem', cursor:'pointer', textDecoration:'underline'}}>
                                        Cancelar Subida
                                    </button>
                                </div>
                            </div>
                        )}

                        {!uploading && (
                            <button className="btn-submit-course" style={{marginTop:'15px', width:'100%'}} disabled={!videoFile}>
                                Subir y Guardar
                            </button>
                        )}
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