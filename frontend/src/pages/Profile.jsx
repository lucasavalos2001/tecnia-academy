import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function Profile() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile-overview');
  
  const [certificados, setCertificados] = useState([]);
  const [formData, setFormData] = useState({ 
    nombre: '', 
    biografia: '', 
    contactEmail: '' 
  });
  
  // Estados para la foto
  const [fotoFile, setFotoFile] = useState(null); 
  const [fotoActual, setFotoActual] = useState(null); 
  const [uploading, setUploading] = useState(false);

  const API_URL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchData = async () => {
        try {
            // Cargar Certificados
            const resCert = await axios.get(`${API_URL}/usuario/certificados`, { headers: { Authorization: `Bearer ${token}` } });
            setCertificados(resCert.data.certificados);

            // Cargar Datos de Perfil
            const resPerfil = await axios.get(`${API_URL}/usuario/perfil`, { headers: { Authorization: `Bearer ${token}` } });
            setFormData({
                nombre: resPerfil.data.nombre_completo,
                biografia: resPerfil.data.biografia || '',
                contactEmail: resPerfil.data.email_contacto || ''
            });
            setFotoActual(resPerfil.data.foto_perfil); 
        } catch (error) { console.error(error); }
    };
    if (token) fetchData();
  }, [token]);

  const handleBecomeInstructor = async () => {
    if (!confirm("¿Estás seguro?")) return;
    try {
        await axios.put(`${API_URL}/usuario/convertirse-instructor`, {}, { headers: { Authorization: `Bearer ${token}` } });
        alert("¡Ahora eres Instructor! Inicia sesión de nuevo.");
        logout(); navigate('/login');
    } catch (error) { alert("Error."); }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
        const data = new FormData();
        data.append('nombre_completo', formData.nombre);
        data.append('biografia', formData.biografia);
        data.append('email_contacto', formData.contactEmail);
        
        if (fotoFile) {
            data.append('foto', fotoFile); 
        }

        await axios.put(`${API_URL}/usuario/actualizar`, data, { 
            headers: { 
                Authorization: `Bearer ${token}`, 
                'Content-Type': 'multipart/form-data' 
            } 
        });
        
        alert("Perfil actualizado. Recarga para ver los cambios.");
        window.location.reload(); 
    } catch (error) { 
        console.error(error);
        alert("Error al actualizar."); 
    } finally {
        setUploading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile-overview':
        return (
          <div className="profile-details">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                <div>
                    <h2 style={{margin:0, color: '#0b3d91'}}>{user?.nombre_completo}</h2>
                    <p style={{color: '#666', margin:'5px 0'}}><i className="fas fa-envelope"></i> {user?.email}</p>
                    {formData.contactEmail && <p style={{color: '#00d4d4', fontWeight: 'bold', margin:'5px 0'}}><i className="fas fa-paper-plane"></i> {formData.contactEmail}</p>}
                    <span style={{background: user?.rol === 'admin' ? '#e74c3c' : '#00d4d4', color: 'white', padding: '4px 10px', borderRadius: '15px', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 'bold'}}>{user?.rol}</span>
                </div>
            </div>
            <div style={{marginTop:'30px', background:'#f9f9f9', padding:'20px', borderRadius:'10px', borderLeft: '5px solid #00d4d4'}}>
                <h3 style={{marginTop:0, fontSize:'1.1rem'}}>Sobre mí</h3>
                <p style={{lineHeight: '1.6', color: '#444'}}>{formData.biografia || "Aún no has escrito tu biografía."}</p>
            </div>
            {user?.rol === 'student' && <div style={{marginTop: '30px', textAlign: 'center'}}><button onClick={handleBecomeInstructor} style={{backgroundColor: '#f39c12', color: 'white', padding: '12px 25px', border: 'none', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold'}}>¡Quiero ser Instructor!</button></div>}
          </div>
        );

      case 'profile-certificates':
        // Filtramos los certificados válidos antes de mostrar
        const certificadosValidos = certificados.filter(cert => cert.curso !== null);

        return (
          <div className="certificates-list">
            {certificadosValidos.length === 0 ? (
                <p>Aún no tienes certificados. ¡Completa un curso al 100% para obtener uno!</p>
            ) : (
                certificadosValidos.map((cert) => (
                    <div className="certificate-card" key={cert.id}>
                        <div className="certificate-thumbnail"><i className="fas fa-trophy"></i></div>
                        <div className="certificate-info">
                            <h4>{cert.curso.titulo}</h4>
                            <p>Completado el: {new Date(cert.updatedAt).toLocaleDateString()}</p>
                        </div>
                        <button className="btn-view-certificate" onClick={() => navigate(`/certificado/${cert.id}`, { state: { certificado: cert, usuario: user.nombre_completo } })}>Ver</button>
                    </div>
                ))
            )}
          </div>
        );

      case 'profile-settings':
        return (
             <form onSubmit={handleUpdateProfile}>
                <div className="settings-section">
                    <h3><i className="fas fa-camera"></i> Foto de Perfil</h3>
                    <div className="form-group">
                        <label className="file-upload-label" style={{display:'block', border:'2px dashed #ccc', padding:'20px', textAlign:'center', cursor:'pointer', background: 'white', borderRadius:'8px'}}>
                            {fotoFile ? (
                                <span style={{fontWeight:'bold', color:'#0b3d91'}}><i className="fas fa-check-circle"></i> Nueva: {fotoFile.name}</span>
                            ) : (
                                <span><i className="fas fa-image" style={{fontSize:'1.5rem', color:'#00d4d4'}}></i> Clic para cambiar foto (JPG/PNG)</span>
                            )}
                            <input type="file" accept="image/*" onChange={e => setFotoFile(e.target.files[0])} style={{display:'none'}} />
                        </label>
                    </div>
                </div>

                <div className="settings-section">
                    <h3><i className="fas fa-globe"></i> Información Pública</h3>
                    <div className="settings-grid">
                        <div className="form-group"><label>Nombre Visible</label><input type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} /></div>
                        <div className="form-group"><label>Email de Contacto</label><input type="email" value={formData.contactEmail} onChange={e => setFormData({...formData, contactEmail: e.target.value})} /></div>
                        <div className="form-group full-width"><label>Biografía</label><textarea rows="4" value={formData.biografia} onChange={e => setFormData({...formData, biografia: e.target.value})}></textarea></div>
                    </div>
                </div>
                
                <button className="btn-save-settings" disabled={uploading} style={{width:'100%'}}>
                    {uploading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </form>
        );
      default: return null;
    }
  };

  return (
    <>
      <Navbar />
      <main className="main-content">
        <div className="profile-page-container">
            <aside className="profile-sidebar">
                <div className="profile-avatar-container" style={{overflow:'hidden', background: fotoActual ? 'transparent' : 'var(--color-secundario)', border: fotoActual ? '2px solid var(--color-primario)' : 'none'}}>
                    {fotoActual ? (
                        <img src={fotoActual} alt="Perfil" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                    ) : (
                        user?.nombre_completo?.charAt(0).toUpperCase()
                    )}
                </div>
                <div className="profile-info"><h3>{user?.nombre_completo}</h3><p>{user?.email}</p></div>
                <nav className="profile-tabs">
                    <button className={`profile-tab-button ${activeTab==='profile-overview'?'active':''}`} onClick={()=>setActiveTab('profile-overview')}><i className="fas fa-user"></i> Mi Perfil</button>
                    <button className={`profile-tab-button ${activeTab==='profile-certificates'?'active':''}`} onClick={()=>setActiveTab('profile-certificates')}><i className="fas fa-certificate"></i> Mis Certificados</button>
                    <button className={`profile-tab-button ${activeTab==='profile-settings'?'active':''}`} onClick={()=>setActiveTab('profile-settings')}><i className="fas fa-cog"></i> Configuración</button>
                </nav>
            </aside>
            <section className="profile-main-content">
                {renderTabContent()}
            </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default Profile;