import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(email, password);
    if (result.success) {
      navigate('/');
    }
  };

  // 🟢 LÓGICA DE WHATSAPP PARA PARAGUAY
  const handleWhatsAppSupport = (e) => {
    e.preventDefault();
    const phoneNumber = "595973833308";
    // Si el usuario ya escribió su correo, lo incluimos en el mensaje automáticamente
    const baseMessage = "Hola Tecnia Academy, olvidé mi contraseña y necesito ayuda para ingresar.";
    const emailInfo = email ? ` Mi correo registrado es: ${email}` : "";
    const finalMessage = encodeURIComponent(`${baseMessage}${emailInfo}`);
    
    window.open(`https://wa.me/${phoneNumber}?text=${finalMessage}`, '_blank');
  };

  return (
    <div className="auth-split-screen">
        {/* LADO IZQUIERDO (Visual) */}
        <div className="auth-banner-side">
            <div className="auth-overlay">
                <h1>
                    <span className="logo-tecnia">Tecnia </span>
                    <span className="logo-academy">Academy</span>
                </h1>
                <p>La plataforma líder para impulsar tu carrera técnica. Aprende de expertos y certifícate hoy mismo.</p>
            </div>
        </div>

        {/* LADO DERECHO (Formulario) */}
        <div className="auth-form-side">
            <Link to="/" className="auth-back-link"><i className="fas fa-arrow-left"></i> Volver al inicio</Link>
            
            <div className="auth-form-container">
                <h2 className="auth-title">¡Hola de nuevo! 👋</h2>
                <p className="auth-subtitle">Ingresa tus credenciales para continuar aprendiendo.</p>

                <form onSubmit={handleSubmit}>
                    {error && (
                        <div className="notification error show" style={{position:'static', transform:'none', marginBottom:'20px'}}>
                            {error}
                        </div>
                    )}
                    
                    <div className="form-group">
                        <label htmlFor="email">Correo Electrónico</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="ejemplo@correo.com"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Contraseña</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    
                    {/* ✅ ENLACE DE WHATSAPP (Sustituye al link de correo) */}
                    <div style={{textAlign:'right', marginBottom:'15px'}}>
                        <a 
                            href="#" 
                            onClick={handleWhatsAppSupport}
                            style={{
                                fontSize:'0.85rem', 
                                color:'#25D366', // Color verde WhatsApp para que resalte
                                textDecoration:'none',
                                fontWeight: '500'
                            }}
                        >
                            <i className="fab fa-whatsapp" style={{marginRight: '5px'}}></i>
                            ¿Olvidaste tu contraseña? Contactar soporte
                        </a>
                    </div>

                    <button 
                        type="submit" 
                        className="btn-auth" 
                        disabled={isLoading}
                        style={{
                            backgroundColor: isLoading ? '#ccc' : '#003366',
                            cursor: isLoading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isLoading ? 'Iniciando...' : 'Iniciar Sesión'}
                    </button>
                </form>

                <div style={{marginTop: '20px', textAlign: 'center', fontSize: '0.9rem'}}>
                    ¿No tienes cuenta? <Link to="/registro" style={{color: '#00d4d4', fontWeight: 'bold'}}>Regístrate gratis</Link>
                </div>
            </div>
        </div>
    </div>
  );
}

export default Login;