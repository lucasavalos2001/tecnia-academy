import React, { useState, useEffect } from 'react';
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
  
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [newLesson, setNewLesson] = useState({ titulo: '', url_video: '' });

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

  // --- CREACIÓN ---
  const handleAddModule = async (e) => {
    e.preventDefault();
    if (!newModuleTitle) return;
    try {
      await axios.post(`${API_URL}/cursos/${id}/modules`, { titulo: newModuleTitle }, { headers: { Authorization: `Bearer ${token}` } });
      setNewModuleTitle('');
      fetchCurriculum();
    } catch (error) { alert("Error al crear módulo"); }
  };

  const handleAddLesson = async (e) => {
    e.preventDefault();
    if (!selectedModuleId || !newLesson.titulo) { alert("Selecciona módulo y escribe título"); return; }
    try {
      await axios.post(`${API_URL}/cursos/modules/${selectedModuleId}/lessons`, newLesson, { headers: { Authorization: `Bearer ${token}` } });
      setNewLesson({ titulo: '', url_video: '' });
      fetchCurriculum();
    } catch (error) { alert("Error al crear lección"); }
  };

  // --- EDICIÓN Y BORRADO ---
  const handleDeleteModule = async (moduleId) => {
    if(!confirm("¿Borrar este módulo y todas sus lecciones?")) return;
    try {
        await axios.delete(`${API_URL}/cursos/modules/${moduleId}`, { headers: { Authorization: `Bearer ${token}` } });
        fetchCurriculum();
    } catch (error) { alert("Error al borrar módulo"); }
  };

  const handleEditModule = async (modulo) => {
    const newTitle = prompt("Nuevo nombre del módulo:", modulo.titulo);
    if (newTitle && newTitle !== modulo.titulo) {
        try {
            await axios.put(`${API_URL}/cursos/modules/${modulo.id}`, { titulo: newTitle }, { headers: { Authorization: `Bearer ${token}` } });
            fetchCurriculum();
        } catch (error) { alert("Error al editar módulo"); }
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    if(!confirm("¿Borrar esta lección?")) return;
    try {
        await axios.delete(`${API_URL}/cursos/lessons/${lessonId}`, { headers: { Authorization: `Bearer ${token}` } });
        fetchCurriculum();
    } catch (error) { alert("Error al borrar lección"); }
  };

  const handleEditLesson = async (leccion) => {
    const newTitle = prompt("Nuevo título:", leccion.titulo);
    const newUrl = prompt("Nueva URL de video:", leccion.url_video);
    
    if ((newTitle && newTitle !== leccion.titulo) || (newUrl && newUrl !== leccion.url_video)) {
        try {
            await axios.put(`${API_URL}/cursos/lessons/${leccion.id}`, 
                { titulo: newTitle || leccion.titulo, url_video: newUrl || leccion.url_video }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchCurriculum();
        } catch (error) { alert("Error al editar lección"); }
    }
  };

  if (loading) return <div>Cargando gestor...</div>;

  return (
    <>
      <Navbar />
      <main className="dashboard-content">
        <header className="content-header">
          <h2>Gestionar Contenido: {curso?.titulo}</h2>
        </header>

        <div className="content-management-layout">
            
            {/* COLUMNA IZQUIERDA */}
            <div className="curriculum-display">
                <h3>Temario Actual</h3>
                {modulos.length === 0 ? <p>No hay módulos todavía.</p> : null}
                
                {modulos.map((mod) => (
                    <div key={mod.id} className="module-container">
                        <div className="module-header" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <strong>{mod.titulo}</strong>
                            <div>
                                <button onClick={() => handleEditModule(mod)} style={iconBtnStyle} title="Editar nombre"><i className="fas fa-edit"></i></button>
                                <button onClick={() => handleDeleteModule(mod.id)} style={{...iconBtnStyle, color:'#e74c3c'}} title="Borrar módulo"><i className="fas fa-trash"></i></button>
                            </div>
                        </div>
                        <ul className="lessons-list-in-module">
                            {mod.lecciones && mod.lecciones.map((lec) => (
                                <li key={lec.id} style={{justifyContent:'space-between'}}>
                                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                        <i className="fas fa-play-circle" style={{color:'#00d4d4'}}></i> 
                                        {lec.titulo}
                                    </div>
                                    <div>
                                        <button onClick={() => handleEditLesson(lec)} style={iconBtnStyle} title="Editar lección"><i className="fas fa-pencil-alt"></i></button>
                                        <button onClick={() => handleDeleteLesson(lec.id)} style={{...iconBtnStyle, color:'#e74c3c'}} title="Borrar lección"><i className="fas fa-times"></i></button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            {/* COLUMNA DERECHA */}
            <div className="add-lesson-form-container">
                <div style={{marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '20px'}}>
                    <h3>1. Crear Nuevo Módulo</h3>
                    <form onSubmit={handleAddModule}>
                        <div className="form-group">
                            <input type="text" placeholder="Ej: Introducción" value={newModuleTitle} onChange={e => setNewModuleTitle(e.target.value)} />
                        </div>
                        <button className="btn-create-course" style={{width: '100%', justifyContent:'center'}}>Agregar Módulo</button>
                    </form>
                </div>

                <div>
                    <h3>2. Agregar Lección a Módulo</h3>
                    <form onSubmit={handleAddLesson}>
                        <div className="form-group">
                            <label>Selecciona el Módulo:</label>
                            <select value={selectedModuleId} onChange={e => setSelectedModuleId(e.target.value)} style={{width: '100%', padding: '10px'}}>
                                <option value="">-- Seleccionar --</option>
                                {modulos.map(m => <option key={m.id} value={m.id}>{m.titulo}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Título de la Lección:</label>
                            <input type="text" value={newLesson.titulo} onChange={e => setNewLesson({...newLesson, titulo: e.target.value})} />
                        </div>
                        {/* ✅ INPUT DE VIDEO MEJORADO */}
                        <div className="form-group">
                            <label>Video de la clase:</label>
                            <input 
                                type="text" 
                                placeholder="Pega aquí el enlace (YouTube, Vimeo, Drive)" 
                                value={newLesson.url_video} 
                                onChange={e => setNewLesson({...newLesson, url_video: e.target.value})} 
                            />
                            <small style={{display:'block', marginTop:'5px', color:'#666', fontSize:'0.8rem'}}>
                                <i className="fas fa-info-circle"></i> Recomendamos subir tu video a <strong>YouTube (No listado)</strong> o <strong>Vimeo</strong> y pegar el link aquí para mejor velocidad.
                            </small>
                        </div>
                        <button className="btn-submit-course">Guardar Lección</button>
                    </form>
                </div>
            </div>

        </div>
      </main>
      <Footer />
    </>
  );
}

const iconBtnStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    marginLeft: '8px',
    fontSize: '1rem',
    color: '#666'
};

export default ManageContent;