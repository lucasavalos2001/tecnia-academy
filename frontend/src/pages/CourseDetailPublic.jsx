import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatCurrency';

function CourseDetailPublic() {
  const { id } = useParams();
  const navigate = useNavigate();
  // 🟢 IMPORTANTE: Traemos 'user' para verificar si es admin
  const { isLoggedIn, token, user } = useAuth();
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  const [curso, setCurso] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verificamos si es admin
  const isAdmin = user?.rol === 'admin';

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

  // 🟢 FUNCIÓN DE ADMIN: APROBAR/RECHAZAR
  const handleAdminReview = async (decision) => {
      if(!confirm(`¿Estás seguro de que deseas ${decision.toUpperCase()} este curso?`)) return;
      try {
          await axios.post(
              `${API_URL}/admin/review/${curso.id}`, 
              { decision }, 
              { headers: { Authorization: `Bearer ${token}` } }
          );
          alert(`Curso ${decision === 'aprobar' ? 'PUBLICADO' : 'RECHAZADO'} con éxito.`);
          navigate('/admin-dashboard'); // Volver al panel
      } catch (error) {
          alert("Error al procesar la solicitud.");
      }
  };

  const handleEnroll = async () => {
    if (!isLoggedIn) {
        navigate('/login');
        return;
    }
    
    const precioFormateado = formatCurrency(curso.precio);
    
    if (confirm(`¿Quieres inscribirte en "${curso.titulo}" por ${precioFormateado}?`)) {
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

  // Calculamos total de lecciones para el panel de auditoría
  const totalLecciones = curso.modulos?.reduce((acc, m) => acc + m.lecciones.length, 0) || 0;

  return (
    <>
      <Navbar />

      {/* 🟢 PANEL DE AUDITORÍA (SOLO ADMIN) 🟢 */}
      {isAdmin && (
          <div style={{backgroundColor: '#2c3e50', color: 'white', padding: '15px 0', borderBottom: '4px solid #f1c40f'}}>
              <div style={{maxWidth: '1100px', margin: '0 auto', padding: '0 20px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  
                  <div style={{display:'flex', gap:'30px', alignItems:'center'}}>
                      <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                          <i className="fas fa-user-secret" style={{fontSize:'2rem', color:'#f1c40f'}}></i>
                          <div>
                              <h4 style={{margin:0, textTransform:'uppercase', letterSpacing:'1px', fontSize:'0.9rem', color:'#bdc3c7'}}>Modo Auditoría</h4>
                              <span style={{fontWeight:'bold', fontSize:'1.1rem'}}>Super Administrador</span>
                          </div>
                      </div>

                      <div style={{borderLeft:'1px solid #7f8c8d', paddingLeft:'20px'}}>
                          <p style={{margin:0, fontSize:'0.85rem', color:'#bdc3c7'}}>Estado Actual:</p>
                          <strong style={{
                              color: curso.estado === 'publicado' ? '#2ecc71' : 
                                     curso.estado === 'pendiente' ? '#f1c40f' : '#e74c3c',
                              textTransform: 'uppercase'
                          }}>
                              {curso.estado}
                          </strong>
                      </div>

                      <div style={{borderLeft:'1px solid #7f8c8d', paddingLeft:'20px'}}>
                          <p style={{margin:0, fontSize:'0.85rem', color:'#bdc3c7'}}>Duración Declarada:</p>
                          {/* 🟢 CORREGIDO: Eliminado "Horas" */}
                          <strong>{curso.duracion}</strong>
                      </div>
                  </div>

                  <div style={{display:'flex', gap:'10px'}}>
                      <button 
                          onClick={() => handleAdminReview('rechazado')}
                          style={{padding:'10px 20px', background:'#c0392b', color:'white', border:'none', borderRadius:'4px', cursor:'pointer', fontWeight:'bold'}}
                      >
                          <i className="fas fa-times"></i> Rechazar
                      </button>
                      <button 
                          onClick={() => handleAdminReview('aprobar')}
                          style={{padding:'10px 20px', background:'#27ae60', color:'white', border:'none', borderRadius:'4px', cursor:'pointer', fontWeight:'bold'}}
                      >
                          <i className="fas fa-check"></i> APROBAR CURSO
                      </button>
                  </div>

              </div>
          </div>
      )}
      
      {/* HEADER DEL CURSO (NORMAL) */}
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
                  {/* 🟢 CORREGIDO: Eliminado "h duración total" */}
                  <p style={{fontSize:'0.9rem', color:'#666'}}>{curso.modulos?.length} secciones • {totalLecciones} clases • {curso.duracion} duración total</p>
                  
                  <div style={{border: '1px solid #d1d7dc', marginTop:'10px'}}>
                      {curso.modulos?.length === 0 && <div style={{padding:'15px'}}>El instructor aún no ha subido contenido.</div>}
                      
                      {curso.modulos?.map(mod => (
                          <div key={mod.id} style={{borderBottom:'1px solid #eee'}}>
                              <div style={{padding:'15px', background:'#f7f9fa', fontWeight:'bold', display:'flex', justifyContent:'space-between'}}>
                                  <span>{mod.titulo}</span>
                                  <span style={{fontWeight:'normal', fontSize:'0.9rem'}}>{mod.lecciones.length} clases</span>
                              </div>
                              
                              {/* LISTA DE LECCIONES */}
                              {mod.lecciones.length > 0 && (
                                  <ul style={{padding:'10px 30px', margin:0, listStyle:'none'}}>
                                      {mod.lecciones?.map(lec => (
                                          <li key={lec.id} style={{
                                              marginBottom:'10px', 
                                              color:'#666', 
                                              fontSize:'0.9rem', 
                                              display:'flex', 
                                              alignItems:'center', 
                                              justifyContent:'space-between', 
                                              paddingBottom: '8px',
                                              borderBottom: '1px dashed #eee'
                                          }}>
                                              <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                                  <i className="fas fa-play-circle" style={{color: '#00d4d4'}}></i> 
                                                  <span>{lec.titulo}</span>
                                              </div>

                                              <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                                                  <span style={{fontSize:'0.8rem', color:'#999', background:'#f8f9fa', padding:'2px 8px', borderRadius:'4px'}}>
                                                      {lec.duracion || "00:00"}
                                                  </span>

                                                  {isAdmin && lec.url_video && (
                                                      <a 
                                                          href={lec.url_video} 
                                                          target="_blank" 
                                                          rel="noopener noreferrer"
                                                          style={{
                                                              fontSize:'0.75rem', 
                                                              color:'white', 
                                                              background:'#3498db', 
                                                              padding:'2px 8px', 
                                                              borderRadius:'4px', 
                                                              textDecoration:'none',
                                                              fontWeight:'bold'
                                                          }}
                                                      >
                                                          VER
                                                      </a>
                                                  )}
                                              </div>
                                          </li>
                                      ))}
                                  </ul>
                              )}
                          </div>
                      ))}
                  </div>
              </div>

              {/* SECCIÓN: TU INSTRUCTOR */}
              <div style={{marginTop: '40px', borderTop:'1px solid #eee', paddingTop:'30px'}}>
                  <h3 style={{fontSize: '1.5rem', marginBottom:'20px'}}>Tu Instructor</h3>
                  
                  <div style={{display:'flex', gap:'20px', alignItems:'flex-start'}}>
                      <div style={{
                          width:'100px', height:'100px', 
                          background: curso.instructor?.foto_perfil ? 'transparent' : '#00d4d4', 
                          color:'white', 
                          borderRadius:'50%', overflow:'hidden', 
                          display:'flex', alignItems:'center', justifyContent:'center', 
                          fontSize:'2.5rem', fontWeight:'bold', flexShrink: 0
                      }}>
                          {curso.instructor?.foto_perfil ? (
                              <img src={curso.instructor.foto_perfil} alt="Instructor" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                          ) : (
                              curso.instructor?.nombre_completo.charAt(0).toUpperCase()
                          )}
                      </div>

                      <div>
                          <h4 style={{margin:'0 0 5px 0', color:'#0b3d91', fontSize:'1.3rem', textDecoration:'underline'}}>
                              {curso.instructor?.nombre_completo}
                          </h4>
                          <p style={{margin:0, color:'#666', fontSize:'0.9rem', fontStyle:'italic', marginBottom:'15px'}}>
                              Instructor Experto en Tecnia Academy
                          </p>
                          <div style={{lineHeight:'1.6', color:'#333', fontSize:'0.95rem'}}>
                              {curso.instructor?.biografia || "Este instructor es un apasionado de la enseñanza pero aún no ha agregado su biografía personalizada."}
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
                      <h2 style={{fontSize:'2rem', margin:'0 0 10px 0', fontWeight:'800'}}>
                          {formatCurrency(curso.precio)}
                      </h2>
                      
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
                              {/* 🟢 CORREGIDO: Eliminado "horas de video" */}
                              <li style={{marginBottom:'5px'}}><i className="fas fa-clock" style={{width:'20px', textAlign:'center'}}></i> {curso.duracion} de contenido</li>
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