import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const WHATSAPP_NUMERO = '595973833308';

function ForgotPassword() {
  const mensaje = encodeURIComponent('Hola, me olvidé mi contraseña de Tecnia Academy y necesito restablecerla.');
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMERO}?text=${mensaje}`;

  return (
    <>
      <Navbar />
      <div className="auth-split-screen">
        <div className="auth-banner-side" style={{backgroundImage: "url('https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80')"}}>
            <div className="auth-overlay">
                <h1>Recupera tu Acceso</h1>
                <p>No te preocupes, a todos nos pasa. Te ayudamos a volver a tu cuenta.</p>
            </div>
        </div>

        <div className="auth-form-side">
            <div className="auth-form-container">
                <h2 className="auth-title">¿Olvidaste tu contraseña? 🔒</h2>
                <p className="auth-subtitle">
                    Escribinos por WhatsApp y te ayudamos a restablecerla en minutos.
                </p>

                <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-auth"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        textDecoration: 'none',
                        background: '#25D366'
                    }}
                >
                    <i className="fab fa-whatsapp" style={{fontSize: '1.3rem'}}></i>
                    Escribir por WhatsApp
                </a>

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
