import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function VerifyCertificate() {
  const [searchParams] = useSearchParams();
  const [certId, setCertId] = useState(searchParams.get('id') || '');
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_BASE_URL;

  const verify = async (id) => {
    setLoading(true);
    setError('');
    setResultado(null);
    try {
      const res = await axios.get(`${API_URL}/usuario/verificar/${id}`);
      setResultado(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "No se encontró un certificado válido con ese ID.");
    } finally {
      setLoading(false);
    }
  };

  // Si llega un ?id= en la URL (ej. al escanear el QR del certificado), verificamos automáticamente
  useEffect(() => {
    const idFromUrl = searchParams.get('id');
    if (idFromUrl) verify(idFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVerify = async (e) => {
    e.preventDefault();
    verify(certId);
  };

  return (
    <>
      <Navbar />
      <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f4f6f8', padding: '20px' }}>

        <div style={{ background: 'white', padding: '40px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', maxWidth: '520px', width: '100%', textAlign: 'center' }}>
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
            <div className="verify-result-card">
              <div className="verify-result-header">
                <i className="fas fa-check-circle"></i>
                <div>
                  <strong>Certificado Válido</strong>
                  <span>Emitido y verificado por Tecnia Academy</span>
                </div>
              </div>

              <div className="verify-result-course">{resultado.curso}</div>

              <div className="verify-result-grid">
                <div><span>Estudiante</span><strong>{resultado.estudiante}</strong></div>
                <div><span>Instructor</span><strong>{resultado.instructor}</strong></div>
                <div><span>Duración</span><strong>{resultado.duracion}</strong></div>
                <div><span>Completado el</span><strong>{new Date(resultado.fecha).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></div>
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
