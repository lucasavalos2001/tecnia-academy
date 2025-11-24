import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

function CertificateView() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Recibimos los datos del certificado desde la navegación anterior
  const { certificado, usuario } = location.state || {};

  // Si alguien entra directo sin datos, lo mandamos al perfil
  if (!certificado) {
      return (
          <div style={{textAlign: 'center', padding: '50px'}}>
              <h2>Certificado no encontrado.</h2>
              <button onClick={() => navigate('/perfil')}>Volver al Perfil</button>
          </div>
      );
  }

  const handlePrint = () => {
    window.print(); // Esto abre el menú de impresión del navegador (PDF)
  };

  return (
    <>
      {/* Navbar visible solo en pantalla, no en impresión */}
      <div className="no-print"><Navbar /></div>
      
      <div className="certificate-viewer-container">
        <div className="certificate-document">
            
            <div className="certificate-header">
                <div className="logo-cert">
                    <span style={{color:'#0b3d91'}}>Tecnia</span>
                    <span style={{color:'#00d4d4'}}>Academy</span>
                </div>
            </div>

            <div className="certificate-body">
                <p className="subtitle">Se otorga el presente certificado a:</p>
                <h1>{usuario}</h1>
                
                <p className="subtitle">por haber completado satisfactoriamente el curso:</p>
                <h2 className="course-name">{certificado.curso.titulo}</h2>
                
                <p className="date">
                    Completado el: {new Date(certificado.updatedAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>

            <div className="certificate-footer">
                <div className="verify-id">
                    ID: {certificado.id}-{new Date(certificado.updatedAt).getTime()}
                    <br/>tecnia.academy/verify
                </div>
                
                <div className="signature">
                    <div className="signature-font">Juan Pérez</div>
                    <div>Director Académico</div>
                </div>
            </div>

        </div>

        <button className="btn-print" onClick={handlePrint}>
            <i className="fas fa-download"></i> Descargar PDF
        </button>
      </div>
    </>
  );
}

export default CertificateView;