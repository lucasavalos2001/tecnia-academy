import React, { useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
        setError("Las contraseñas no coinciden.");
        return;
    }
    if (password.length < 6) {
        setError("La contraseña debe tener al menos 6 caracteres.");
        return;
    }

    setLoading(true);
    setError(null);

    try {
      await axios.post(`${API_URL}/auth/reset-password/${token}`, { password });
      alert("¡Contraseña actualizada! Ahora puedes iniciar sesión.");
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || "El enlace es inválido o ha expirado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="auth-split-screen">
        <div className="auth-banner-side" style={{backgroundImage: "url('https://images.unsplash.com/photo-1555421689-491a97ff2040?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80')"}}>
            <div className="auth-overlay">
                <h1>Nueva Contraseña</h1>
                <p>Crea una contraseña segura que puedas recordar.</p>
            </div>
        </div>

        <div className="auth-form-side">
            <div className="auth-form-container">
                <h2 className="auth-title">Restablecer Contraseña 🔑</h2>
                <p className="auth-subtitle">Ingresa tu nueva clave.</p>

                {error && <div style={{padding:'15px', background:'#f8d7da', color:'#721c24', borderRadius:'5px', marginBottom:'20px'}}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Nueva Contraseña</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="******" />
                    </div>

                    <div className="form-group">
                        <label>Confirmar Contraseña</label>
                        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="******" />
                    </div>

                    <button type="submit" className="btn-auth" disabled={loading}>
                        {loading ? 'Guardando...' : 'Cambiar Contraseña'}
                    </button>
                </form>
            </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default ResetPassword;