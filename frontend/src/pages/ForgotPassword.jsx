import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_BASE_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      await axios.post(`${API_URL}/auth/forgot-password`, { email });
      setMessage('Si el correo existe, recibirás un enlace de recuperación.');
    } catch (err) {
      setError('Error al procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="auth-split-screen">
        <div className="auth-banner-side" style={{backgroundImage: "url('https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80')"}}>
            <div className="auth-overlay">
                <h1>Recupera tu Acceso</h1>
                <p>No te preocupes, a todos nos pasa. Te ayudaremos a volver a tu cuenta.</p>
            </div>
        </div>

        <div className="auth-form-side">
            <div className="auth-form-container">
                <h2 className="auth-title">¿Olvidaste tu contraseña? 🔒</h2>
                <p className="auth-subtitle">Ingresa tu correo y te enviaremos instrucciones.</p>

                {message && <div style={{padding:'15px', background:'#d4edda', color:'#155724', borderRadius:'5px', marginBottom:'20px'}}>{message}</div>}
                {error && <div style={{padding:'15px', background:'#f8d7da', color:'#721c24', borderRadius:'5px', marginBottom:'20px'}}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Correo Electrónico</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="ejemplo@correo.com" />
                    </div>

                    <button type="submit" className="btn-auth" disabled={loading}>
                        {loading ? 'Enviando...' : 'Enviar Enlace'}
                    </button>
                </form>

                <div style={{marginTop: '20px', textAlign: 'center', fontSize: '0.9rem'}}>
                    <Link to="/login" style={{color: '#00d4d4', fontWeight: 'bold'}}> Volver al Login</Link>
                </div>
            </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default ForgotPassword;