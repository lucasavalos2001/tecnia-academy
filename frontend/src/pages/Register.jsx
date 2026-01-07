import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // 🟢 Nuevo estado para el Checkbox
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const { register, isLoading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Doble validación de seguridad
    if (!acceptedTerms) {
      alert("Debes aceptar los términos y condiciones para continuar.");
      return;
    }

    const result = await register(name, email, password);
    if (result.success) {
      alert('¡Cuenta creada con éxito! Ahora puedes iniciar sesión.');
      navigate('/login');
    }
  };

  return (
    <div className="auth-split-screen">
        {/* LADO IZQUIERDO (Visual) */}
        <div className="auth-banner-side" style={{backgroundImage: "url('https://images.unsplash.com/photo-1531482615713-2afd69097998?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80')"}}>
            <div className="auth-overlay">
                <h1>
                    <span className="logo-tecnia">Tecnia</span>
                    <span className="logo-academy">Academy</span>
                </h1>
                <h2 style={{color:'white', fontSize:'1.5rem', marginTop:'10px'}}>Únete a la Comunidad</h2>
                <p>Descubre cientos de cursos, conecta con instructores y lleva tus habilidades al siguiente nivel.</p>
            </div>
        </div>

        {/* LADO DERECHO (Formulario) */}
        <div className="auth-form-side">
            <Link to="/" className="auth-back-link"><i className="fas fa-arrow-left"></i> Volver al inicio</Link>
            
            <div className="auth-form-container">
                <h2 className="auth-title">Crear Cuenta 🚀</h2>
                <p className="auth-subtitle">Completa el formulario para empezar.</p>

                <form onSubmit={handleSubmit}>
                    {error && <div className="notification error show" style={{position:'static', transform:'none', marginBottom:'20px'}}>{error}</div>}

                    <div className="form-group">
                        <label htmlFor="name">Nombre Completo</label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Tu nombre real"
                            required
                        />
                    </div>

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
                            placeholder="Mínimo 6 caracteres"
                            required
                        />
                    </div>

                    {/* 🟢 CHECKBOX DE TÉRMINOS LEGALES */}
                    <div className="form-group" style={{flexDirection: 'row', alignItems: 'flex-start', gap: '10px', marginTop: '10px'}}>
                        <input 
                            type="checkbox" 
                            id="terms" 
                            checked={acceptedTerms}
                            onChange={(e) => setAcceptedTerms(e.target.checked)}
                            required
                            style={{width: '20px', height: '20px', marginTop: '2px', cursor: 'pointer'}}
                        />
                        <label htmlFor="terms" style={{fontSize: '0.9rem', color: '#555', cursor: 'pointer', lineHeight: '1.4'}}>
                            He leído y acepto los <Link to="/terminos-instructores" target="_blank" style={{color: '#00d4d4', fontWeight: 'bold'}}>Términos y Condiciones</Link> y la Política de Privacidad de la plataforma.
                        </label>
                    </div>

                    {/* El botón se deshabilita visualmente si no aceptan */}
                    <button 
                        type="submit" 
                        className="btn-auth" 
                        disabled={isLoading || !acceptedTerms}
                        style={{opacity: acceptedTerms ? 1 : 0.6, cursor: acceptedTerms ? 'pointer' : 'not-allowed'}}
                    >
                        {isLoading ? 'Creando cuenta...' : 'Registrarse'}
                    </button>
                </form>

                <div style={{marginTop: '20px', textAlign: 'center', fontSize: '0.9rem'}}>
                    ¿Ya tienes cuenta? <Link to="/login" style={{color: '#00d4d4', fontWeight: 'bold'}}>Inicia Sesión</Link>
                </div>
            </div>
        </div>
    </div>
  );
}

export default Register;