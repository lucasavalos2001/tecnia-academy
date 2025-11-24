import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function CreateCourse() {
  const navigate = useNavigate();
  const { token } = useAuth(); // Necesitamos el token para que el backend sepa quién crea el curso
  
  // Estado para guardar los datos del formulario
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion_larga: '',
    categoria: 'diseno', // Valor por defecto
    precio: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // URL del Backend (desde .env)
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Petición POST al backend
      await axios.post(
        `${API_URL}/cursos`, 
        formData,
        { headers: { Authorization: `Bearer ${token}` } } // Importante: Enviar el Token
      );

      alert('¡Curso creado con éxito!');
      navigate('/panel-instructor'); // Redirigir al panel para verlo
    } catch (err) {
      console.error(err);
      setError('Error al crear el curso. Verifica que todos los campos estén llenos.');
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
          <p>Completa la información para publicar tu curso.</p>
          
          {error && <p style={{color: 'red', marginBottom: '15px'}}>{error}</p>}

          <form className="create-course-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Título del Curso</label>
              <input 
                type="text" 
                name="titulo" 
                value={formData.titulo} 
                onChange={handleChange} 
                placeholder="Ej: Introducción a PostgreSQL"
                required 
              />
            </div>
            
            <div className="form-group">
              <label>Descripción Detallada</label>
              <textarea 
                name="descripcion_larga" 
                rows="4" 
                value={formData.descripcion_larga} 
                onChange={handleChange} 
                placeholder="¿Qué aprenderán los estudiantes?"
                required
              ></textarea>
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
              <label>Precio (USD)</label>
              <input 
                type="number" 
                name="precio" 
                step="0.01" 
                value={formData.precio} 
                onChange={handleChange} 
                placeholder="0.00"
                required 
              />
            </div>
            
            <button type="submit" className="btn-submit-course" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Curso'}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default CreateCourse;