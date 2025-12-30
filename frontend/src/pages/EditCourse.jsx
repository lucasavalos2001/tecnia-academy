import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function EditCourse() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

  const [formData, setFormData] = useState({
    titulo: '', 
    descripcion_larga: '', 
    categoria: '', 
    precio: '', 
    duracion: '',
    // 🟢 NUEVO CAMPO: NOMBRE PARA CERTIFICADO
    nombre_instructor_certificado: '' 
  });
  
  // ESTADO DEL CURSO (Para saber si mostrar botón de revisión)
  const [cursoEstado, setCursoEstado] = useState('borrador');

  const [imagenFile, setImagenFile] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const abortControllerRef = useRef(null);

  // 1. Cargar datos actuales
  useEffect(() => {
    const fetchCurso = async () => {
      try {
        const res = await axios.get(`${API_URL}/cursos/${id}/detalle`);
        const c = res.data;
        setFormData({
            titulo: c.titulo,
            descripcion_larga: c.descripcion_larga,
            categoria: c.categoria,
            precio: c.precio,
            duracion: c.duracion || '',
            // Cargar nombre personalizado si existe, o dejar vacío
            nombre_instructor_certificado: c.nombre_instructor_certificado || '' 
        });
        setCursoEstado(c.estado); 
      } catch (error) {
        alert("Error al cargar datos.");
        navigate('/panel-instructor');
      } finally {
        setLoading(false);
      }
    };
    fetchCurso();
  }, [id, API_URL, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const removeSelectedImage = (e) => {
      e.preventDefault();
      setImagenFile(null);
      const fileInput = document.getElementById('imagenInputEdit');
      if(fileInput) fileInput.value = "";
  };

  const cancelUpload = () => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          setSubmitting(false);
          setUploadProgress(0);
          alert("Cancelado.");
      }
  };

  // FUNCIÓN PARA GUARDAR CAMBIOS (Sin cambiar estado)
  const handleSubmit = async (e) => {
    e.preventDefault();
    await updateCourseData();
  };

  // FUNCIÓN PARA ENVIAR A REVISIÓN
  const handleSendToReview = async () => {
      if(confirm("¿Estás seguro? Al enviar a revisión, el administrador verificará tu curso para publicarlo.")) {
          // Enviamos estado: 'pendiente'
          await updateCourseData('pendiente');
      }
  };

  // Lógica central de actualización
  const updateCourseData = async (nuevoEstado = null) => {
    setSubmitting(true);
    setUploadProgress(0);
    abortControllerRef.current = new AbortController();

    try {
      const data = new FormData();
      data.append('titulo', formData.titulo);
      data.append('descripcion_larga', formData.descripcion_larga);
      data.append('categoria', formData.categoria);
      data.append('precio', formData.precio);
      data.append('duracion', formData.duracion);
      
      // 🟢 Enviar el nombre personalizado del instructor
      data.append('nombre_instructor_certificado', formData.nombre_instructor_certificado);
      
      // Si mandamos un estado nuevo (ej: pendiente), lo agregamos
      if (nuevoEstado) {
          data.append('estado', nuevoEstado);
      }

      if (imagenFile) {
          data.append('imagen', imagenFile);
      }

      await axios.put(`${API_URL}/cursos/${id}`, data, {
        headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
        },
        signal: abortControllerRef.current.signal,
        onUploadProgress: (progressEvent) => {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
        }
      });
      
      if (nuevoEstado === 'pendiente') {
          alert('¡Curso enviado a revisión con éxito!');
      } else {
          alert('¡Cambios guardados!');
      }
      navigate('/panel-instructor');
    } catch (err) {
      if (!axios.isCancel(err)) {
          console.error(err);
          alert('Error al actualizar.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div>Cargando datos...</div>;

  // BADGES DE ESTADO (Visual)
  const getStatusBadge = () => {
      switch(cursoEstado) {
          case 'publicado': return <span style={{background:'#27ae60', color:'white', padding:'5px 10px', borderRadius:'15px', fontSize:'0.8rem'}}>PUBLICADO</span>;
          case 'pendiente': return <span style={{background:'#f39c12', color:'white', padding:'5px 10px', borderRadius:'15px', fontSize:'0.8rem'}}>EN REVISIÓN</span>;
          case 'rechazado': return <span style={{background:'#c0392b', color:'white', padding:'5px 10px', borderRadius:'15px', fontSize:'0.8rem'}}>RECHAZADO</span>;
          default: return <span style={{background:'#95a5a6', color:'white', padding:'5px 10px', borderRadius:'15px', fontSize:'0.8rem'}}>BORRADOR</span>;
      }
  };

  return (
    <>
      <Navbar />
      <main className="create-course-main">
        <div className="create-course-card">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
            <h2>Editar Curso</h2>
            {getStatusBadge()}
          </div>
          
          <form className="create-course-form" onSubmit={handleSubmit}>
            
            <div className="form-group">
              <label>Título</label>
              <input type="text" name="titulo" value={formData.titulo} onChange={handleChange} required />
            </div>
            
            <div className="form-group">
              <label>Descripción</label>
              <textarea name="descripcion_larga" rows="4" value={formData.descripcion_larga} onChange={handleChange} required></textarea>
            </div>

            <div className="form-group">
              <label>Duración (Ej: "10h" o se calculará automáticamente)</label>
              <input 
                type="text" 
                name="duracion" 
                value={formData.duracion} 
                onChange={handleChange} 
                placeholder="Ej: 5h 30m"
                required 
              />
            </div>
            
            <div className="form-group">
              <label>Categoría</label>
              <select name="categoria" value={formData.categoria} onChange={handleChange} style={{padding: '10px', borderRadius: '5px', border: '1px solid #ccc', width: '100%'}}>
                  <option value="diseno">Diseño Gráfico & UX/UI</option>
                  <option value="programacion">Desarrollo Web & Programación</option>
                  <option value="datos">Ciencia de Datos & IA</option>
                  <option value="negocios">Negocios & Emprendimiento</option>
                  <option value="marketing">Marketing Digital</option>
                  <option value="finanzas">Finanzas & Contabilidad</option>
                  <option value="fotografia">Fotografía & Video</option>
                  <option value="musica">Música & Audio</option>
                  <option value="idiomas">Idiomas</option>
                  <option value="salud">Salud & Fitness</option>
                  <option value="desarrollo_personal">Desarrollo Personal</option>
                  <option value="otros">Otros / General</option>
              </select>
            </div>

            <div className="form-group">
              <label>Precio (Guaraníes)</label>
              <input type="number" name="precio" step="1000" value={formData.precio} onChange={handleChange} required />
            </div>

            {/* 🟢 NUEVO CAMPO: NOMBRE INSTRUCTOR PARA CERTIFICADO */}
            <div className="form-group" style={{background: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px dashed #ccc'}}>
                <label style={{color: '#0b3d91', fontWeight: 'bold'}}>
                    <i className="fas fa-certificate"></i> Nombre del Instructor para el Certificado (Opcional)
                </label>
                <input 
                    type="text" 
                    name="nombre_instructor_certificado" 
                    value={formData.nombre_instructor_certificado} 
                    onChange={handleChange} 
                    placeholder="Ej: Ing. Lucas López & Arq. María Pérez"
                    style={{marginTop: '5px'}}
                />
                <small style={{color: '#666', display: 'block', marginTop: '5px'}}>
                    * Si lo dejas vacío, se usará tu nombre de usuario: <strong>{formData.nombre_instructor_certificado ? '' : '(Nombre de tu cuenta)'}</strong>
                </small>
            </div>

            {/* CAMBIAR PORTADA */}
            <div className="form-group">
                <label>Cambiar Portada (Opcional)</label>
                {!imagenFile ? (
                    <label className="file-upload-label" style={{display:'block', border:'2px dashed #ccc', padding:'20px', textAlign:'center', cursor:'pointer', background: 'white', borderRadius:'8px'}}>
                        <i className="fas fa-image" style={{fontSize:'2rem', color:'#00d4d4', marginBottom:'10px'}}></i>
                        <p style={{margin:'0', fontWeight:'bold'}}>Clic para cambiar imagen</p>
                        <input id="imagenInputEdit" type="file" accept="image/*" onChange={e => setImagenFile(e.target.files[0])} style={{display:'none'}} />
                    </label>
                ) : (
                    <div style={{padding:'15px', background:'#e8f8f5', borderRadius:'5px', display:'flex', justifyContent:'space-between', alignItems:'center', border:'1px solid #00d4d4'}}>
                        <span style={{fontSize:'0.9rem', fontWeight:'bold', color:'#0b3d91'}}><i className="fas fa-check-circle"></i> Nueva: {imagenFile.name}</span>
                        <button type="button" onClick={removeSelectedImage} style={{background:'none', border:'none', color:'#e74c3c', cursor:'pointer', fontSize:'1.2rem'}} title="Deshacer"><i className="fas fa-times-circle"></i></button>
                    </div>
                )}
            </div>
            
            {submitting && (
                <div style={{marginBottom:'15px'}}>
                    <div style={{height:'10px', width:'100%', background:'#eee', borderRadius:'5px', overflow:'hidden'}}>
                        <div style={{height:'100%', width:`${uploadProgress}%`, background:'#00d4d4', transition:'width 0.3s'}}></div>
                    </div>
                    <div style={{display:'flex', justifyContent:'space-between', marginTop:'5px'}}>
                        <span style={{fontSize:'0.8rem'}}>Guardando... {uploadProgress}%</span>
                        <button type="button" onClick={cancelUpload} style={{background:'none', border:'none', color:'#e74c3c', fontSize:'0.8rem', cursor:'pointer', textDecoration:'underline'}}>Cancelar</button>
                    </div>
                </div>
            )}
            
            <div style={{display: 'flex', gap: '10px', flexDirection: 'column'}}>
                {/* Botón Guardar Cambios (Siempre visible) */}
                <button type="submit" className="btn-submit-course" disabled={submitting}>
                    {submitting ? 'Guardando...' : 'Guardar Cambios'}
                </button>

                {/* 🟢 BOTÓN ENVIAR A REVISIÓN (Solo si es borrador o rechazado) */}
                {(cursoEstado === 'borrador' || cursoEstado === 'rechazado') && (
                    <button 
                        type="button" 
                        onClick={handleSendToReview} 
                        className="btn-submit-course" 
                        style={{backgroundColor: '#f39c12'}}
                        disabled={submitting}
                    >
                        <i className="fas fa-paper-plane"></i> Enviar a Revisión
                    </button>
                )}
            </div>

          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default EditCourse;