import React, { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { QRCodeCanvas } from 'qrcode.react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

function CertificateView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const toast = useToast();
  const certRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const [certificado, setCertificado] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_BASE_URL;

  // Pedimos el certificado directo al servidor usando el ID de la URL,
  // en vez de depender de datos de navegación que se pierden al refrescar o entrar directo.
  useEffect(() => {
    const fetchCertificado = async () => {
      try {
        const res = await axios.get(`${API_URL}/usuario/certificados`, { headers: { Authorization: `Bearer ${token}` } });
        const encontrado = res.data.certificados.find((c) => String(c.id) === String(id));
        setCertificado(encontrado || null);
      } catch (error) {
        console.error('Error cargando certificado:', error);
        setCertificado(null);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchCertificado();
  }, [id, token, API_URL]);

  if (loading) {
    return (
        <div style={{textAlign: 'center', padding: '80px 20px'}}>
            <i className="fas fa-spinner fa-spin" style={{fontSize: '2rem', color: '#0b3d91'}}></i>
            <p>Cargando certificado...</p>
        </div>
    );
  }

  if (!certificado) {
      return (
          <div style={{textAlign: 'center', padding: '50px'}}>
              <h2>Certificado no encontrado.</h2>
              <button onClick={() => navigate('/perfil')}>Volver al Perfil</button>
          </div>
      );
  }

  // 🟢 DESCARGA REAL DE PDF (captura el documento y lo convierte en un archivo)
  const handleDownloadPdf = async () => {
    if (!certRef.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(certRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);

      const nombreArchivo = `Certificado-${certificado.curso.titulo}`.replace(/[^a-zA-Z0-9-_]+/g, '-');
      pdf.save(`${nombreArchivo}.pdf`);
      toast.success('¡Certificado descargado con éxito!');
    } catch (error) {
      console.error('Error generando PDF:', error);
      toast.error('No se pudo generar el PDF. Probá con la opción de imprimir.');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // 🟢 LÓGICA DE NOMBRE (Prioridad al personalizado)
  const nombreInstructor = certificado.curso?.nombre_instructor_certificado
                        || certificado.curso?.instructor?.nombre_completo
                        || "Firma Autorizada"; // Texto neutro si falla todo

  const verifyUrl = `https://tecniaacademy.com/verify?id=${certificado.id}`;

  return (
    <>
      <div className="no-print"><Navbar /></div>

      <div className="certificate-viewer-container">
        <div className="certificate-document" ref={certRef}>

            <div className="certificate-header">
                <div className="logo-cert">
                    <span style={{color:'#0b3d91'}}>Tecnia </span>
                    <span style={{color:'#00d4d4'}}>Academy</span>
                </div>
            </div>

            <div className="certificate-body">
                <p className="subtitle">SE OTORGA EL PRESENTE CERTIFICADO A:</p>

                <h1 className="student-name">{user?.nombre_completo}</h1>

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
                    <QRCodeCanvas value={verifyUrl} size={72} level="M" bgColor="#ffffff" fgColor="#0b3d91" />
                    <div className="verify-id-text">
                        <strong>ID de Verificación: {certificado.id}</strong><br/>
                        <small>Escaneá el código o visitá<br/>tecniaacademy.com/verify</small>
                    </div>
                </div>

                <div className="certificate-seal">
                    <i className="fas fa-award"></i>
                    <span>Tecnia Academy · Certificado Verificado</span>
                </div>

                <div className="signature-block">
                    <p className="verified-by">Verificado por:</p>
                    <div className="signature-line"></div>
                    <div className="signatory-name">{nombreInstructor}</div>
                    <div className="signatory-title">Instructor</div>
                </div>
            </div>

        </div>

        <div className="certificate-actions no-print">
            <button className="btn-print" onClick={handleDownloadPdf} disabled={generating}>
                <i className="fas fa-file-pdf"></i> {generating ? 'Generando PDF...' : 'Descargar PDF'}
            </button>
            <button className="btn-print btn-print-secondary" onClick={handlePrint}>
                <i className="fas fa-print"></i> Imprimir
            </button>
        </div>
      </div>
    </>
  );
}

export default CertificateView;
