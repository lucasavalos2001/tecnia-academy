import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function EditCourse() {
  const { id } = useParams(); // ID del curso a editar
  const navigate = useNavigate();
  const { token } = useAuth();
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  const [formData, setFormData] = useState({
    titulo: '',
    descripcion_larga: '',
    categoria: '',
    precio: ''
  });
  const [loading, setLoading] = useState(true);

  // 1. Cargar los datos actuales del curso
  useEffect(() => {
    const fetchCurso = async () => {
      try {
        // Reusamos el endpoint de detalle público
        const res = await axios.get(`${API_URL}/cursos/${id}/detalle`);
        const c = res.data;
        setFormData({
            titulo: c.titulo,
            descripcion_larga: c.descripcion_larga,
            categoria: c.categoria,
            precio: c.precio
        });
      } catch (error) {
        alert("Error al cargar datos del curso.");
        navigate('/panel-instructor');
      } finally {
        setLoading(false);
      }
    };
    fetchCurso();
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/cursos/${id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('¡Curso actualizado!');
      navigate('/panel-instructor');
    } catch (err) {
      alert('Error al actualizar.');
    }
  };

  if (loading) return <div>Cargando datos...</div>;

  return (
    <>
      <Navbar />
      <main className="create-course-main">
        <div className="create-course-card">
          <h2>Editar Curso</h2>
          <form className="create-course-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Título</label>
              <input type="text" name="titulo" value={formData.titulo} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <textarea name="descripcion_larga" rows="4" value={formData.descripcion_larga} onChange={handleChange} required></textarea>
            </div>
            
            {/* LISTA DE CATEGORÍAS ACTUALIZADA */}
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

            {/* PRECIO EN GUARANÍES */}
            <div className="form-group">
              <label>Precio (Guaraníes)</label>
              <input 
                type="number" 
                name="precio" 
                step="1000" 
                value={formData.precio} 
                onChange={handleChange} 
                placeholder="150000"
                required 
              />
            </div>
            
            <button type="submit" className="btn-submit-course">Guardar Cambios</button>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default EditCourse;