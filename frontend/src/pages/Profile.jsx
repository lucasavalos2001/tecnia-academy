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
  
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const [fotoFile, setFotoFile] = useState(null); 
  const [fotoActual, setFotoActual] = useState(null); 
  const [uploading, setUploading] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const API_URL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchData = async () => {
        try {
            const resCert = await axios.get(`${API_URL}/usuario/certificados`, { headers: { Authorization: `Bearer ${token}` } });
            setCertificados(resCert.data.certificados);

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

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
        alert("La nueva contraseña y su confirmación no coinciden.");
        return;
    }
    
    setChangingPassword(true);
    try {
        await axios.put(`${API_URL}/usuario/update-password`, {
            currentPassword: passwords.current,
            newPassword: passwords.new
        }, { headers: { Authorization: `Bearer ${token}` } });
        
        alert("✅ Contraseña actualizada con éxito.");
        setPasswords({ current: '', new: '', confirm: '' });
    } catch (error) {
        alert(error.response?.data?.message || "Error al cambiar contraseña.");
    } finally {
        setChangingPassword(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
        const data = new FormData();
        data.append('nombre_completo', formData.nombre);
        data.append('biografia', formData.biografia);
        data.append('email_contacto', formData.contactEmail);
        if (fotoFile) data.append('foto', fotoFile);

        await axios.put(`${API_URL}/usuario/actualizar`, data, { 
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } 
        });
        alert("✅ Perfil actualizado correctamente.");
        window.location.reload(); 
    } catch (error) { alert("Error al actualizar."); } finally { setUploading(false); }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile-overview':
        return (
          <div className="profile-details">
            <h2 style={{color: '#0b3d91', marginBottom: '10px'}}>{user?.nombre_completo}</h2>
            <p style={{marginBottom: '10px'}}><i className="fas fa-envelope"></i> {user?.email}</p>
            <span style={{background: '#00d4d4', color: 'white', padding: '5px 15px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold'}}>
                {user?.rol?.toUpperCase()}
            </span>
            <div style={{marginTop:'30px', background:'#f9f9f9', padding:'25px', borderRadius:'15px', borderLeft: '6px solid #00d4d4'}}>
                <h3 style={{marginTop: 0, fontSize: '1.2rem'}}><i className="fas fa-id-card"></i> Sobre mí</h3>
                <p style={{lineHeight: '1.6', color: '#444'}}>{formData.biografia || "Aún no has escrito tu biografía."}</p>
            </div>
          </div>
        );

      case 'profile-certificates':
        return (
          <div className="certificates-list">
            <h2 style={{marginBottom: '20px'}}><i className="fas fa-award"></i> Mis Certificados</h2>
            {certificados.length === 0 ? (
                <p style={{textAlign: 'center', padding: '40px', color: '#777'}}>Aún no tienes certificados. ¡Termina un curso al 100%!</p>
            ) : (
                certificados.filter(c => c.curso).map((cert) => (
                    <div className="certificate-card" key={cert.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '15px', border: '1px solid #eee'}}>
                        <div className="certificate-info">
                            <h4 style={{color: '#0b3d91', margin: '0 0 5px 0'}}>{cert.curso.titulo}</h4>
                            <p style={{fontSize: '0.85rem', color: '#666'}}>Completado: {new Date(cert.updatedAt).toLocaleDateString()}</p>
                        </div>
                        <button className="btn-save-settings" onClick={() => navigate(`/certificado/${cert.id}`)} style={{padding: '8px 20px', fontSize: '0.9rem'}}>Ver</button>
                    </div>
                ))
            )}
          </div>
        );

      case 'profile-settings':
        return (
            <div className="settings-wrapper">
                {/* SECCIÓN 1: DATOS PERSONALES */}
                <div className="settings-section">
                    <h3><i className="fas fa-user-circle"></i> Configuración de Perfil</h3>
                    <form onSubmit={handleUpdateProfile}>
                        <div className="form-group">
                            <label className="custom-file-upload">
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={e => setFotoFile(e.target.files[0])} 
                                    style={{display: 'none'}} 
                                />
                                <i className="fas fa-cloud-upload-alt"></i>
                                <div>
                                    <span style={{display: 'block', fontWeight: 'bold'}}>
                                        {fotoFile ? fotoFile.name : "Subir nueva foto de perfil"}
                                    </span>
                                    <small style={{color: '#64748b'}}>Haz clic para cambiar tu imagen</small>
                                </div>
                            </label>
                        </div>

                        <div className="form-group" style={{marginTop: '20px'}}>
                            <label>Nombre Completo</label>
                            <input type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                        </div>
                        
                        <div className="form-group">
                            <label>Biografía</label>
                            <textarea value={formData.biografia} onChange={e => setFormData({...formData, biografia: e.target.value})} placeholder="Cuéntanos un poco sobre ti..."></textarea>
                        </div>

                        <button className="btn-save-settings" disabled={uploading}>
                            {uploading ? <><i className="fas fa-spinner fa-spin"></i> Guardando...</> : <><i className="fas fa-save"></i> Guardar Cambios</>}
                        </button>
                    </form>
                </div>

                {/* SECCIÓN 2: SEGURIDAD */}
                <div className="settings-section">
                    <h3 style={{color: '#e74c3c', borderColor: '#ffe5e5'}}><i className="fas fa-shield-alt"></i> Seguridad y Contraseña</h3>
                    <form onSubmit={handleUpdatePassword}>
                        <div className="form-group">
                            <label>Contraseña Actual</label>
                            <input 
                                type="password" 
                                required 
                                value={passwords.current} 
                                onChange={e => setPasswords({...passwords, current: e.target.value})}
                                placeholder="Tu clave actual"
                            />
                        </div>
                        <div className="security-grid">
                            <div className="form-group">
                                <label>Nueva Contraseña</label>
                                <input 
                                    type="password" 
                                    required 
                                    value={passwords.new} 
                                    onChange={e => setPasswords({...passwords, new: e.target.value})}
                                    placeholder="Mínimo 6 caracteres"
                                />
                            </div>
                            <div className="form-group">
                                <label>Confirmar Nueva</label>
                                <input 
                                    type="password" 
                                    required 
                                    value={passwords.confirm} 
                                    onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                                />
                            </div>
                        </div>
                        <button 
                            type="submit" 
                            className="btn-save-settings" 
                            disabled={changingPassword} 
                            style={{background: '#2c3e50', width: 'auto'}}
                        >
                            {changingPassword ? <><i className="fas fa-sync fa-spin"></i> Procesando...</> : <><i className="fas fa-lock"></i> Cambiar Contraseña</>}
                        </button>
                    </form>
                </div>
            </div>
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
                <div className="profile-avatar-container" style={{background: '#0b3d91'}}>
                    {fotoActual ? (
                        <img src={fotoActual} alt="Perfil" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                    ) : (
                        <span style={{color: 'white'}}>{user?.nombre_completo?.charAt(0)}</span>
                    )}
                </div>
                <div className="profile-info">
                    <h3>{user?.nombre_completo}</h3>
                    <p style={{fontSize: '0.8rem', opacity: 0.7}}>{user?.email}</p>
                </div>
                <nav className="profile-tabs">
                    <button className={`profile-tab-button ${activeTab==='profile-overview'?'active':''}`} onClick={()=>setActiveTab('profile-overview')}><i className="fas fa-user-shield"></i> Resumen</button>
                    <button className={`profile-tab-button ${activeTab==='profile-certificates'?'active':''}`} onClick={()=>setActiveTab('profile-certificates')}><i className="fas fa-certificate"></i> Logros</button>
                    <button className={`profile-tab-button ${activeTab==='profile-settings'?'active':''}`} onClick={()=>setActiveTab('profile-settings')}><i className="fas fa-user-cog"></i> Ajustes</button>
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