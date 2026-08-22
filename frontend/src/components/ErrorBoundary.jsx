import React from 'react';
import PropTypes from 'prop-types';

// Si algo se rompe al renderizar cualquier parte del sitio, esto evita que
// quede una pantalla en blanco sin explicación: muestra un aviso y un botón
// para recargar, en vez de que la app entera deje de responder.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('💥 Error atrapado por ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '40px 20px',
            fontFamily: "'Poppins', sans-serif"
        }}>
          <i className="fas fa-exclamation-triangle" style={{fontSize: '3rem', color: '#e74c3c', marginBottom: '20px'}}></i>
          <h1 style={{color: '#333'}}>Algo salió mal</h1>
          <p style={{color: '#666', maxWidth: '400px', margin: '10px 0 25px'}}>
              Ocurrió un error inesperado. Probá recargar la página; si el problema sigue, contactanos.
          </p>
          <button
              onClick={() => window.location.href = '/'}
              style={{background: '#0b3d91', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer'}}
          >
              Volver al Inicio
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ErrorBoundary.propTypes = { children: PropTypes.node.isRequired };
export default ErrorBoundary;
