import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function NotFound() {
  return (
    <>
      <Navbar />
      <div style={{
          minHeight: '65vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '60px 20px'
      }}>
        <div style={{fontSize: '5rem', fontWeight: 800, color: '#0b3d91', lineHeight: 1}}>404</div>
        <h1 style={{color: '#333', marginTop: '10px'}}>Esta página no existe</h1>
        <p style={{color: '#666', maxWidth: '420px', margin: '10px 0 30px'}}>
            Puede que el enlace esté roto, o que la página se haya movido. Volvamos a un lugar conocido.
        </p>
        <Link to="/" className="btn-inscribirse">
            <i className="fas fa-home"></i> Volver al Inicio
        </Link>
      </div>
      <Footer />
    </>
  );
}

export default NotFound;
