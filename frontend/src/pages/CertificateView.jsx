import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

function CertificateView() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Recibimos los datos del certificado y del usuario
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
    window.print(); 
  };

  // 🟢 LÓGICA DE NOMBRE (Prioridad al personalizado)
  const nombreInstructor = certificado.curso?.nombre_instructor_certificado 
                        || certificado.curso?.instructor?.nombre_completo 
                        || "Firma Autorizada"; // Texto neutro si falla todo

  return (
    <>
      <div className="no-print"><Navbar /></div>
      
      <div className="certificate-viewer-container">
        <div className="certificate-document">
            
            <div className="certificate-header">
                <div className="logo-cert">
                    <span style={{color:'#0b3d91'}}>Tecnia </span>
                    <span style={{color:'#00d4d4'}}>Academy</span>
                </div>
            </div>

            <div className="certificate-body">
                <p className="subtitle">SE OTORGA EL PRESENTE CERTIFICADO A:</p>
                
                <h1 className="student-name">{usuario.nombre_completo || usuario.nombre || usuario}</h1>
                
                <p className="subtitle">POR HABER COMPLETADO SATISFACTORIAMENTE EL CURSO:</p>
                
                <h2 className="course-name">{certificado.curso.titulo}</h2>

                <p className="course-hours">
                  Con una carga horaria de <strong>{certificado.curso.duracion || "Sin duración registrada"}</strong>.
                </p>
                
                <p className="date">
                    Completado el: {new Date(certificado.updatedAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>

            <div className="certificate-footer">
                <div className="verify-id">
                    <strong>ID de Verificación:</strong><br/>
                    {certificado.id}<br/>
                    <small>tecniaacademy.com/verify</small>
                </div>

                <div className="signature-block" style={{ textAlign: 'center' }}>
                    <p className="verified-by">Verificado por:</p>
                    
                    <div className="signature-line" style={{borderTop: '2px solid #333', width: '250px', margin: '0 auto 10px auto'}}></div>
                    
                    {/* Nombre del Instructor */}
                    <div className="signatory-name" style={{fontSize: '1.2rem', fontWeight: 'bold', color: '#000'}}>
                        {nombreInstructor}
                    </div>
                    
                    {/* Cargo (Solo dice Instructor) */}
                    <div className="signatory-title" style={{fontSize: '0.9rem', color: '#666'}}>
                        Instructor
                    </div>
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