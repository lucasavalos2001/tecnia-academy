import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function CreateCourse() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const toast = useToast();
  
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion_larga: '',
    categoria: 'diseno',
    precio: '',
    duracion: '', // 🟢 NUEVO
    nombre_instructor_certificado: ''
  });
  
  const [imagenFile, setImagenFile] = useState(null); 
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const API_URL = import.meta.env.VITE_API_BASE_URL;
  const abortControllerRef = useRef(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const removeSelectedImage = (e) => {
      e.preventDefault();
      setImagenFile(null);
      const fileInput = document.getElementById('imagenInput');
      if(fileInput) fileInput.value = "";
  };

  const cancelUpload = () => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          setLoading(false);
          setUploadProgress(0);
          toast.info("Subida cancelada.");
      }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setUploadProgress(0);

    abortControllerRef.current = new AbortController();

    try {
      const data = new FormData();
      data.append('titulo', formData.titulo);
      data.append('descripcion_larga', formData.descripcion_larga);
      data.append('categoria', formData.categoria);
      data.append('precio', formData.precio);
      data.append('duracion', formData.duracion); // 🟢 ENVIAR DURACIÓN
      data.append('nombre_instructor_certificado', formData.nombre_instructor_certificado);

      if (imagenFile) {
          data.append('imagen', imagenFile); 
      }

      await axios.post(
        `${API_URL}/cursos`, 
        data,
        { 
            headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
            },
            signal: abortControllerRef.current.signal,
            onUploadProgress: (progressEvent) => {
                const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploadProgress(percent);
            }
        }
      );

      toast.success('¡Curso creado con éxito! Ahora agrega el contenido.');
      navigate('/panel-instructor');
    } catch (err) {
      if (axios.isCancel(err)) {
          console.log('Cancelado por usuario');
      } else {
          console.error(err);
          setError('Error al crear el curso.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="create-course-main">
        <div className="create-course-card">
          <h2>Crear Nuevo Curso</h2>
          <p>Completa la información básica. Luego podrás agregar los videos.</p>
          
          {error && <p style={{color: 'red', marginBottom: '15px'}}>{error}</p>}

          <form className="create-course-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Título del Curso</label>
              <input type="text" name="titulo" value={formData.titulo} onChange={handleChange} required />
            </div>
            
            <div className="form-group">
              <label>Descripción Detallada</label>
              <textarea name="descripcion_larga" rows="4" value={formData.descripcion_larga} onChange={handleChange} required></textarea>
            </div>
            
            {/* 🟢 INPUT DE DURACIÓN */}
            <div className="form-group">
                <label>Duración Estimada (Horas)</label>
                <input 
                    type="number" 
                    name="duracion" 
                    value={formData.duracion} 
                    onChange={handleChange} 
                    placeholder="Ej: 40" 
                    min="0"
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

            {/* 🟢 NOMBRE DEL INSTRUCTOR PARA EL CERTIFICADO */}
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
                    * Si lo dejás vacío, se usará tu nombre de usuario. Podés cambiarlo después desde "Editar curso".
                </small>
            </div>

            <div className="form-group">
                <label>Portada del Curso (Opcional)</label>
                {!imagenFile ? (
                    <label className="file-upload-label" style={{display:'block', border:'2px dashed #ccc', padding:'20px', textAlign:'center', cursor:'pointer', background: 'white', borderRadius:'8px'}}>
                        <i className="fas fa-image" style={{fontSize:'2rem', color:'#00d4d4', marginBottom:'10px'}}></i>
                        <p style={{margin:'0', fontWeight:'bold'}}>Clic para seleccionar imagen (JPG, PNG)</p>
                        <input id="imagenInput" type="file" accept="image/*" onChange={e => setImagenFile(e.target.files[0])} style={{display:'none'}} />
                    </label>
                ) : (
                    <div style={{padding:'15px', background:'#e8f8f5', borderRadius:'5px', display:'flex', justifyContent:'space-between', alignItems:'center', border:'1px solid #00d4d4'}}>
                        <span style={{fontSize:'0.9rem', fontWeight:'bold', color:'#0b3d91'}}><i className="fas fa-check-circle"></i> {imagenFile.name}</span>
                        <button type="button" onClick={removeSelectedImage} style={{background:'none', border:'none', color:'#e74c3c', cursor:'pointer', fontSize:'1.2rem'}} title="Quitar imagen"><i className="fas fa-times-circle"></i></button>
                    </div>
                )}
            </div>
            
            {loading && (
                <div style={{marginBottom:'15px'}}>
                    <div style={{height:'10px', width:'100%', background:'#eee', borderRadius:'5px', overflow:'hidden'}}>
                        <div style={{height:'100%', width:`${uploadProgress}%`, background:'#00d4d4', transition:'width 0.3s'}}></div>
                    </div>
                    <span style={{fontSize:'0.8rem'}}>Subiendo curso... {uploadProgress}%</span>
                </div>
            )}

            <button type="submit" className="btn-submit-course" disabled={loading}>
              {loading ? 'Procesando...' : 'Crear Curso'}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default CreateCourse;