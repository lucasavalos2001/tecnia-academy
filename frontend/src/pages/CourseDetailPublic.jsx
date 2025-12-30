import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom'; // 👈 Agregamos Link
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatCurrency';

function CourseDetailPublic() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // 🟢 IMPORTANTE: Traemos 'user' y token para lógica de compra y admin
  const { isLoggedIn, token, user } = useAuth();
  
  // Fallback para evitar errores si no está definida la variable de entorno
  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

  const [curso, setCurso] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🟢 ESTADO PARA EL MODAL DE VIDEO (SOLUCIÓN BUNNY CDN)
  const [videoModal, setVideoModal] = useState(null); // Guarda la URL del video a ver

  // Verificamos si es admin
  const isAdmin = user?.rol === 'admin';
  
  // Verificamos si el usuario actual es el dueño del curso
  const isInstructor = user && curso && user.id === curso.instructorId;

  // 🟢 PASE LIBRE: Si es Admin o Instructor, tiene acceso directo
  const hasFreePass = isAdmin || isInstructor;

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await axios.get(`${API_URL}/cursos/${id}/detalle`);
        setCurso(res.data);
      } catch (error) {
        console.error("Error al cargar curso:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id, API_URL]);

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
          navigate('/admin-dashboard'); 
      } catch (error) {
          console.error(error);
          alert("Error al procesar la solicitud de revisión.");
      }
  };

  // 💰 1. FUNCIÓN: COMPRAR CON PAGOPAR
  const handleComprar = async () => {
    // A. Verificar Login
    if (!isLoggedIn) {
        alert("Debes iniciar sesión para comprar este curso.");
        navigate('/login');
        return;
    }
    
    // Evitar que el instructor compre su propio curso (redundante con FreePass pero seguridad extra)
    if (isInstructor) {
        alert("Eres el instructor, ya tienes acceso.");
        return;
    }

    try {
        const botonCompra = document.getElementById('btn-comprar');
        if(botonCompra) botonCompra.innerText = "Procesando...";
        if(botonCompra) botonCompra.disabled = true;

        // C. Llamada al Backend para obtener Link
        const response = await axios.post(`${API_URL}/pagos/iniciar`, 
            { courseId: curso.id }, 
            { headers: { Authorization: `Bearer ${token}` } }
        );

        // D. Redirección Mágica
        if (response.data.success && response.data.redirectUrl) {
            console.log("Redirigiendo a Pagopar...", response.data.redirectUrl);
            window.location.href = response.data.redirectUrl;
        } else {
            alert("Error: El servidor no devolvió el link de pago.");
            if(botonCompra) {
                botonCompra.innerText = `Pagar ${formatCurrency(curso.precio)}`;
                botonCompra.disabled = false;
            }
        }

    } catch (error) {
        console.error("Error en pago:", error);
        alert(error.response?.data?.message || "Hubo un error al conectar con la pasarela de pagos.");
        
        const botonCompra = document.getElementById('btn-comprar');
        if(botonCompra) {
            botonCompra.innerText = `Pagar ${formatCurrency(curso.precio)}`;
            botonCompra.disabled = false;
        }
    }
  };

  if (loading) return <div style={{padding:'50px', textAlign:'center'}}>Cargando información del curso...</div>;
  if (!curso) return <div style={{padding:'50px', textAlign:'center'}}>Curso no encontrado o no disponible.</div>;

  const totalLecciones = curso.modulos?.reduce((acc, m) => acc + m.lecciones.length, 0) || 0;

  return (
    <>
      <Navbar />

      {/* 🟢 MODAL REPRODUCTOR DE VIDEO (MINI PANTALLA) */}
      {videoModal && (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.9)', zIndex: 9999,
            display: 'flex', justifyContent: 'center', alignItems: 'center'
        }} onClick={() => setVideoModal(null)}> {/* Cierra al clickear afuera */}
            
            <div style={{width: '90%', maxWidth: '900px', position: 'relative'}} onClick={e => e.stopPropagation()}>
                {/* Botón cerrar */}
                <button 
                    onClick={() => setVideoModal(null)}
                    style={{
                        position: 'absolute', top: '-40px', right: 0,
                        background: 'transparent', border: 'none', color: 'white',
                        fontSize: '2rem', cursor: 'pointer'
                    }}
                >
                    <i className="fas fa-times"></i>
                </button>

                {/* Reproductor Iframe (16:9) */}
                <div style={{position: 'relative', paddingTop: '56.25%', background: '#000', boxShadow: '0 0 20px rgba(0,0,0,0.5)'}}>
                    <iframe 
                        src={videoModal} 
                        style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', borderRadius: '4px'}}
                        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;" 
                        allowFullScreen={true}
                        title="Auditoría de Video"
                    ></iframe>
                </div>
                <div style={{color:'white', marginTop:'10px', textAlign:'center', fontStyle:'italic'}}>
                    <i className="fas fa-eye"></i> Estás viendo este contenido en <strong>Modo Auditoría</strong>
                </div>
            </div>
        </div>
      )}

      {/* 🟢 PANEL DE AUDITORÍA (SOLO ADMIN) 🟢 */}
      {isAdmin && (
          <div style={{backgroundColor: '#2c3e50', color: 'white', padding: '15px 0', borderBottom: '4px solid #f1c40f'}}>
              <div style={{maxWidth: '1100px', margin: '0 auto', padding: '0 20px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap: 'wrap', gap: '15px'}}>
                  
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
      
      {/* HEADER DEL CURSO */}
      <div style={{backgroundColor: '#1c1d1f', color: 'white', padding: '40px 0'}}>
          <div style={{maxWidth: '1100px', margin: '0 auto', padding: '0 20px', display:'flex', gap:'40px', flexWrap: 'wrap'}}>
              <div style={{flex: 2, paddingRight: window.innerWidth > 960 ? '350px' : '0'}}> 
                  <h1 style={{fontSize: '2.2rem', marginBottom: '15px', lineHeight: '1.2'}}>{curso.titulo}</h1>
                  <p style={{fontSize: '1.1rem', lineHeight: '1.5'}}>{curso.descripcion_larga?.substring(0, 150)}...</p>
                  
                  <div style={{marginTop: '20px', fontSize: '0.9rem', display:'flex', gap:'20px', alignItems:'center', flexWrap: 'wrap'}}>
                      <span style={{background:'#f1c40f', color:'black', padding:'2px 6px', fontWeight:'bold', fontSize:'0.8rem'}}>BESTSELLER</span>
                      <span>Creado por <span style={{color: '#cec0fc', textDecoration:'underline'}}>{curso.instructor?.nombre_completo || 'Instructor Tecnia'}</span></span>
                      <span><i className="fas fa-globe"></i> Español</span>
                      <span><i className="fas fa-calendar-alt"></i> Última act. {new Date(curso.updatedAt).toLocaleDateString()}</span>
                  </div>
              </div>
          </div>
      </div>

      <main className="main-content" style={{maxWidth: '1100px', margin: '0 auto', display:'flex', gap:'40px', position:'relative', padding:'0 20px', flexDirection: window.innerWidth <= 960 ? 'column' : 'row'}}>
          
          {/* COLUMNA IZQUIERDA (CONTENIDO) */}
          <div style={{flex: 2, paddingRight: window.innerWidth > 960 ? '20px' : '0', marginTop: '30px'}}>
              
              <div style={{border: '1px solid #d1d7dc', padding: '20px', marginBottom: '30px'}}>
                  <h3 style={{marginTop:0}}>Descripción del Curso</h3>
                  <p style={{lineHeight:'1.6', color:'#2d2f31', whiteSpace: 'pre-line'}}>{curso.descripcion_larga}</p>
              </div>

              {/* Temario */}
              <div>
                  <h3>Contenido del curso</h3>
                  <p style={{fontSize:'0.9rem', color:'#666'}}>{curso.modulos?.length} secciones • {totalLecciones} clases • {curso.duracion} duración total</p>
                  
                  <div style={{border: '1px solid #d1d7dc', marginTop:'10px'}}>
                      {(!curso.modulos || curso.modulos.length === 0) && <div style={{padding:'15px'}}>El instructor aún no ha subido contenido.</div>}
                      
                      {curso.modulos?.map(mod => (
                          <div key={mod.id} style={{borderBottom:'1px solid #eee'}}>
                              <div style={{padding:'15px', background:'#f7f9fa', fontWeight:'bold', display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
                                  <span>{mod.titulo}</span>
                                  <span style={{fontWeight:'normal', fontSize:'0.9rem'}}>{mod.lecciones?.length || 0} clases</span>
                              </div>
                              
                              {/* LISTA DE LECCIONES */}
                              {mod.lecciones && mod.lecciones.length > 0 && (
                                  <ul style={{padding:'10px 30px', margin:0, listStyle:'none'}}>
                                      {mod.lecciones.map(lec => (
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

                                                  {/* 🟢 EL OJO QUE TODO LO VE (SOLO ADMIN) 🟢 */}
                                                  {isAdmin && lec.url_video && (
                                                      <button 
                                                          onClick={() => setVideoModal(lec.url_video)}
                                                          title="Previsualizar Video (Solo Admin)"
                                                          style={{
                                                              fontSize:'1.2rem', 
                                                              color:'#2c3e50', 
                                                              background:'transparent',
                                                              border:'none',
                                                              cursor: 'pointer',
                                                              transition: 'color 0.2s',
                                                              padding: '0 5px'
                                                          }}
                                                          onMouseOver={e => e.target.style.color = '#3498db'}
                                                          onMouseOut={e => e.target.style.color = '#2c3e50'}
                                                      >
                                                          👁️
                                                      </button>
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
              <div style={{marginTop: '40px', borderTop:'1px solid #eee', paddingTop:'30px', marginBottom: '50px'}}>
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
                              {curso.instructor?.nombre_completo || 'Instructor Confidencial'}
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

          {/* COLUMNA DERECHA: TARJETA FLOTANTE DE PAGO */}
          <div style={{flex: 1, position: 'relative'}}>
              <div style={{
                  position: window.innerWidth > 960 ? 'absolute' : 'static', 
                  top: '-200px', 
                  right: 0,
                  background: 'white', 
                  padding: '4px', 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
                  width: window.innerWidth > 960 ? '340px' : '100%',
                  border: '1px solid #d1d7dc',
                  zIndex: 10,
                  marginTop: window.innerWidth <= 960 ? '20px' : '0'
              }}>
                  <div style={{padding: '2px'}}>
                     <img 
                        src={curso.imagen_url || `https://placehold.co/600x350/00d4d4/ffffff?text=${encodeURIComponent(curso.categoria || 'Curso')}`} 
                        style={{width:'100%', height:'180px', objectFit:'cover', display:'block'}}
                        alt="Portada del curso"
                      />
                  </div>
                  
                  <div style={{padding: '20px'}}>
                      <h2 style={{fontSize:'2rem', margin:'0 0 10px 0', fontWeight:'800'}}>
                          {formatCurrency(curso.precio)}
                      </h2>
                      
                      {/* 🟢 2. BOTÓN "PASE LIBRE" PARA ADMIN E INSTRUCTOR */}
                      {hasFreePass ? (
                          <div style={{marginBottom:'15px'}}>
                               <div style={{padding:'10px', background:'#d4edda', color:'#155724', textAlign:'center', marginBottom:'10px', borderRadius:'4px', border:'1px solid #c3e6cb'}}>
                                   {isInstructor ? "🎓 Eres el Creador" : "🛡️ Eres Super Admin"}
                               </div>
                               <Link to={`/curso/${curso.id}/learn`} style={{textDecoration:'none'}}>
                                   <button style={{
                                       width:'100%', padding:'15px', 
                                       background:'#28a745', color:'white', 
                                       border:'none', fontWeight:'bold', fontSize:'1rem', 
                                       cursor:'pointer', borderRadius:'4px',
                                       boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                   }}>
                                       {isInstructor ? "Gestionar mi Curso" : "Auditar Curso Completo"}
                                   </button>
                               </Link>
                          </div>
                      ) : (
                          /* BOTÓN DE COMPRA NORMAL */
                          <button 
                            id="btn-comprar"
                            onClick={handleComprar}
                            style={{
                                width:'100%', 
                                padding:'15px', 
                                background:'#a435f0', 
                                color:'white', 
                                border:'none', 
                                fontWeight:'bold', 
                                fontSize:'1rem', 
                                cursor:'pointer', 
                                marginBottom:'10px',
                                transition: 'background 0.3s'
                            }}
                            onMouseOver={(e) => e.target.style.background = '#8710d8'}
                            onMouseOut={(e) => e.target.style.background = '#a435f0'}
                          >
                            Pagar {formatCurrency(curso.precio)}
                          </button>
                      )}
                      
                      <p style={{textAlign:'center', fontSize:'0.75rem', color:'#666', marginTop:'15px'}}>Garantía de reembolso de 30 días</p>
                      
                      <div style={{marginTop:'20px'}}>
                          <h4 style={{fontSize:'0.9rem', marginBottom:'5px'}}>Este curso incluye:</h4>
                          <ul style={{listStyle:'none', padding:0, fontSize:'0.9rem', color:'#2d2f31'}}>
                              <li style={{marginBottom:'5px'}}><i className="fas fa-clock" style={{width:'20px', textAlign:'center'}}></i> {curso.duracion || "A tu ritmo"} de contenido</li>
                              <li style={{marginBottom:'5px'}}><i className="fas fa-mobile-alt" style={{width:'20px', textAlign:'center'}}></i> Acceso en dispositivos móviles</li>
                              <li style={{marginBottom:'5px'}}><i className="fas fa-certificate" style={{width:'20px', textAlign:'center'}}></i> Certificado de finalización</li>
                              <li style={{marginBottom:'5px'}}><i className="fas fa-infinity" style={{width:'20px', textAlign:'center'}}></i> Acceso de por vida</li>
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