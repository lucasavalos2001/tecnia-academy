import React, { useState } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function VerifyCertificate() {
  const [certId, setCertId] = useState('');
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_BASE_URL;

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResultado(null);

    try {
      const res = await axios.get(`${API_URL}/usuario/verificar/${certId}`);
      setResultado(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "No se encontró un certificado válido con ese ID.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f4f6f8', padding: '20px' }}>
        
        <div style={{ background: 'white', padding: '40px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', maxWidth: '500px', width: '100%', textAlign: 'center' }}>
          <h2 style={{ color: '#0b3d91', marginBottom: '20px' }}>Verificación de Certificados</h2>
          <p style={{ color: '#666', marginBottom: '30px' }}>Introduce el ID único del certificado para validar su autenticidad.</p>

          <form onSubmit={handleVerify} style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
            <input 
              type="number" 
              placeholder="Ej: 25" 
              value={certId} 
              onChange={(e) => setCertId(e.target.value)}
              required
              style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem' }}
            />
            <button 
              type="submit" 
              disabled={loading}
              style={{ background: '#00d4d4', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {loading ? 'Verificando...' : 'Verificar'}
            </button>
          </form>

          {error && (
            <div style={{ padding: '15px', background: '#fadbd8', color: '#c0392b', borderRadius: '8px', border: '1px solid #e74c3c' }}>
              <i className="fas fa-times-circle"></i> {error}
            </div>
          )}

          {resultado && (
            <div style={{ padding: '20px', background: '#e8f8f5', borderRadius: '8px', border: '1px solid #27ae60', textAlign: 'left' }}>
              <div style={{ textAlign: 'center', color: '#27ae60', fontSize: '3rem', marginBottom: '10px' }}>
                <i className="fas fa-check-circle"></i>
              </div>
              <h3 style={{ textAlign: 'center', color: '#27ae60', margin: '0 0 20px 0' }}>Certificado Válido</h3>
              
              <p><strong>Estudiante:</strong> {resultado.estudiante}</p>
              <p><strong>Curso:</strong> {resultado.curso}</p>
              <p><strong>Completado el:</strong> {new Date(resultado.fecha).toLocaleDateString()}</p>
              <p><strong>Duración:</strong> {resultado.duracion}</p>
              <p><strong>Instructor:</strong> {resultado.instructor}</p>
              
              <div style={{ marginTop: '20px', fontSize: '0.8rem', color: '#666', textAlign: 'center', borderTop: '1px solid #ccc', paddingTop: '10px' }}>
                Verificado oficialmente por Tecnia Academy
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}

export default VerifyCertificate;