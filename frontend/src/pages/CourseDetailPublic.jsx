import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';

function CourseDetailPublic() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn, token } = useAuth();
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  const [curso, setCurso] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await axios.get(`${API_URL}/cursos/${id}/detalle`);
        setCurso(res.data);
      } catch (error) {
        console.error("Error", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  const handleEnroll = async () => {
    if (!isLoggedIn) {
        navigate('/login');
        return;
    }
    if (confirm(`¿Quieres inscribirte en "${curso.titulo}" por $${curso.precio}?`)) {
        try {
            await axios.post(`${API_URL}/cursos/${curso.id}/inscribirse`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("¡Inscripción exitosa! Vamos al aula.");
            navigate('/mis-cursos');
        } catch (error) {
            alert(error.response?.data?.message || "Ya estás inscrito o hubo un error.");
        }
    }
  };

  if (loading) return <div style={{padding:'50px', textAlign:'center'}}>Cargando información del curso...</div>;
  if (!curso) return <div style={{padding:'50px', textAlign:'center'}}>Curso no encontrado</div>;

  return (
    <>
      <Navbar />
      
      {/* HEADER OSCURO */}
      <div style={{backgroundColor: '#1c1d1f', color: 'white', padding: '40px 0'}}>
          <div style={{maxWidth: '1100px', margin: '0 auto', padding: '0 20px', display:'flex', gap:'40px'}}>
              <div style={{flex: 2, paddingRight: '350px'}}> 
                  <h1 style={{fontSize: '2.2rem', marginBottom: '15px', lineHeight: '1.2'}}>{curso.titulo}</h1>
                  <p style={{fontSize: '1.1rem', lineHeight: '1.5'}}>{curso.descripcion_larga.substring(0, 150)}...</p>
                  
                  <div style={{marginTop: '20px', fontSize: '0.9rem', display:'flex', gap:'20px', alignItems:'center'}}>
                      <span style={{background:'#f1c40f', color:'black', padding:'2px 6px', fontWeight:'bold', fontSize:'0.8rem'}}>BESTSELLER</span>
                      <span>Creado por <span style={{color: '#cec0fc', textDecoration:'underline'}}>{curso.instructor?.nombre_completo}</span></span>
                      <span><i className="fas fa-globe"></i> Español</span>
                  </div>
              </div>
          </div>
      </div>

      <main className="main-content" style={{maxWidth: '1100px', margin: '0 auto', display:'flex', gap:'40px', position:'relative', padding:'0 20px'}}>
          
          {/* COLUMNA IZQUIERDA */}
          <div style={{flex: 2, paddingRight: '20px', marginTop: '30px'}}>
              
              <div style={{border: '1px solid #d1d7dc', padding: '20px', marginBottom: '30px'}}>
                  <h3 style={{marginTop:0}}>Descripción del Curso</h3>
                  <p style={{lineHeight:'1.6', color:'#2d2f31'}}>{curso.descripcion_larga}</p>
              </div>

              {/* Temario */}
              <div>
                  <h3>Contenido del curso</h3>
                  <p style={{fontSize:'0.9rem', color:'#666'}}>{curso.modulos?.length} secciones • {curso.modulos?.reduce((acc, m) => acc + m.lecciones.length, 0)} clases</p>
                  
                  <div style={{border: '1px solid #d1d7dc', marginTop:'10px'}}>
                      {curso.modulos?.length === 0 && <div style={{padding:'15px'}}>El instructor aún no ha subido contenido.</div>}
                      
                      {curso.modulos?.map(mod => (
                          <div key={mod.id} style={{borderBottom:'1px solid #eee'}}>
                              <div style={{padding:'15px', background:'#f7f9fa', fontWeight:'bold', display:'flex', justifyContent:'space-between'}}>
                                  <span>{mod.titulo}</span>
                                  <span style={{fontWeight:'normal', fontSize:'0.9rem'}}>{mod.lecciones.length} clases</span>
                              </div>
                              {mod.lecciones.length > 0 && (
                                  <ul style={{padding:'10px 30px', margin:0, listStyle:'none'}}>
                                      {mod.lecciones?.map(lec => (
                                          <li key={lec.id} style={{marginBottom:'8px', color:'#666', fontSize:'0.9rem', display:'flex', alignItems:'center', gap:'10px'}}>
                                              <i className="fas fa-play-circle" style={{color:'#666'}}></i> 
                                              {lec.titulo}
                                          </li>
                                      ))}
                                  </ul>
                              )}
                          </div>
                      ))}
                  </div>
              </div>

              {/* ✅ NUEVA SECCIÓN: TU INSTRUCTOR (Biografía Completa) */}
              <div style={{marginTop: '40px', borderTop:'1px solid #eee', paddingTop:'30px'}}>
                  <h3 style={{fontSize: '1.5rem', marginBottom:'20px'}}>Tu Instructor</h3>
                  
                  <div style={{display:'flex', gap:'20px', alignItems:'flex-start'}}>
                      {/* Avatar Grande con Iniciales */}
                      <div style={{
                          width:'100px', height:'100px', 
                          background:'#00d4d4', color:'white', 
                          borderRadius:'50%', display:'flex', 
                          alignItems:'center', justifyContent:'center', 
                          fontSize:'2.5rem', fontWeight:'bold', flexShrink: 0
                      }}>
                          {curso.instructor?.nombre_completo.charAt(0).toUpperCase()}
                      </div>

                      <div>
                          <h4 style={{margin:'0 0 5px 0', color:'#0b3d91', fontSize:'1.3rem', textDecoration:'underline'}}>
                              {curso.instructor?.nombre_completo}
                          </h4>
                          <p style={{margin:0, color:'#666', fontSize:'0.9rem', fontStyle:'italic', marginBottom:'15px'}}>
                              Instructor Experto en Tecnia Academy
                          </p>
                          
                          {/* Biografía Dinámica */}
                          <div style={{lineHeight:'1.6', color:'#333', fontSize:'0.95rem'}}>
                              {curso.instructor?.biografia ? (
                                  curso.instructor.biografia
                              ) : (
                                  "Este instructor es un apasionado de la enseñanza pero aún no ha agregado su biografía personalizada."
                              )}
                          </div>
                      </div>
                  </div>
              </div>

          </div>

          {/* COLUMNA DERECHA: TARJETA FLOTANTE */}
          <div style={{flex: 1, position: 'relative'}}>
              <div style={{
                  position: 'absolute', 
                  top: '-200px', 
                  right: 0,
                  background: 'white', 
                  padding: '4px', 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
                  width: '340px',
                  border: '1px solid #d1d7dc',
                  zIndex: 10
              }}>
                  <div style={{padding: '2px'}}>
                     <img 
                        src={curso.imagen_url || `https://placehold.co/600x350/00d4d4/ffffff?text=${curso.categoria}`} 
                        style={{width:'100%', height:'180px', objectFit:'cover', display:'block'}}
                        alt="Portada"
                      />
                  </div>
                  
                  <div style={{padding: '20px'}}>
                      <h2 style={{fontSize:'2rem', margin:'0 0 10px 0', fontWeight:'800'}}>${curso.precio}</h2>
                      
                      <button 
                        onClick={handleEnroll}
                        style={{width:'100%', padding:'15px', background:'#a435f0', color:'white', border:'none', fontWeight:'bold', fontSize:'1rem', cursor:'pointer', marginBottom:'10px'}}
                      >
                        Inscribirse ahora
                      </button>
                      
                      <p style={{textAlign:'center', fontSize:'0.75rem', color:'#666', marginTop:'15px'}}>Garantía de reembolso de 30 días</p>
                      
                      <div style={{marginTop:'20px'}}>
                          <h4 style={{fontSize:'0.9rem', marginBottom:'5px'}}>Este curso incluye:</h4>
                          <ul style={{listStyle:'none', padding:0, fontSize:'0.9rem', color:'#2d2f31'}}>
                              <li style={{marginBottom:'5px'}}><i className="fas fa-video" style={{width:'20px', textAlign:'center'}}></i> Acceso de por vida</li>
                              <li style={{marginBottom:'5px'}}><i className="fas fa-mobile-alt" style={{width:'20px', textAlign:'center'}}></i> Acceso en dispositivos móviles</li>
                              <li style={{marginBottom:'5px'}}><i className="fas fa-certificate" style={{width:'20px', textAlign:'center'}}></i> Certificado de finalización</li>
                          </ul>
                      </div>
                  </div>
              </div>
          </div>

      </main>
      <Footer />
    </>
  );
}

export default CourseDetailPublic;