import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const TermsInstructors = () => {
  const navigate = useNavigate();
  const { user, token, updateSession, isLoggedIn } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  const yaEsInstructor = user?.rol === 'instructor' || user?.rol === 'admin' || user?.rol === 'superadmin';

  const handleAceptar = async () => {
    if (!isLoggedIn) {
        navigate('/login');
        return;
    }
    setLoading(true);
    try {
        const res = await axios.put(`${API_URL}/usuario/convertirse-instructor`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        updateSession(res.data.token, res.data.user);
        toast.success('¡Felicidades! Ya sos instructor de Tecnia Academy.');
        navigate('/panel-instructor');
    } catch (error) {
        toast.error(error.response?.data?.message || 'Error al procesar la solicitud.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>Términos y Condiciones para Instructores</h1>
        <p style={styles.lastUpdate}>Última actualización: Enero 2026</p>

        <section style={styles.section}>
          <h3>1. Naturaleza de la Relación (Independencia Laboral)</h3>
          <p>
            Al registrarse como Instructor en <strong>Tecnia Academy</strong>, usted acepta actuar como un profesional independiente y prestador de servicios autónomo. 
            <strong>No existe relación de dependencia laboral</strong>, subordinación jurídica, ni horario fijo impuesto entre Tecnia Academy y el Instructor.
            El Instructor es el responsable de definir su situación fiscal ante las autoridades de la República del Paraguay.
          </p>
        </section>

        <section style={styles.section}>
          <h3>2. Esquema de Ganancias y Comisiones</h3>
          <p>
            Tecnia Academy establece dos niveles de comisiones basados en la condición fiscal del Instructor:
          </p>

          <div style={{background: '#f8f9fa', padding: '15px', borderLeft: '5px solid #27ae60', marginBottom: '15px'}}>
            <h4 style={{margin: '0 0 10px 0', color: '#27ae60'}}>A. Instructor PRO (Con Factura Legal)</h4>
            <ul style={{marginBottom: 0}}>
              <li><strong>70% para el Instructor</strong> sobre el precio de venta.</li>
              <li><strong>30% para la Plataforma</strong> (Comisión Tecnia).</li>
              <li><strong>Requisito:</strong> Debe presentar Factura Legal válida vigente.</li>
            </ul>
          </div>

          <div style={{background: '#f8f9fa', padding: '15px', borderLeft: '5px solid #f39c12'}}>
            <h4 style={{margin: '0 0 10px 0', color: '#d35400'}}>B. Instructor Básico (Sin Factura)</h4>
            <ul style={{marginBottom: 0}}>
              <li><strong>60% para el Instructor</strong> sobre el precio de venta.</li>
              <li><strong>40% para la Plataforma</strong> (Comisión Tecnia).</li>
              <li><strong>Justificación:</strong> La diferencia del 10% adicional se retiene para cubrir los costos impositivos y administrativos generados por la emisión de Auto-Factura y la pérdida del crédito fiscal (IVA) para la empresa.</li>
            </ul>
          </div>
        </section>

        <section style={styles.section}>
          <h3>3. Pagos y Facturación</h3>
          <p>
            Para garantizar la transparencia y el orden administrativo:
          </p>
          <ul>
            <li><strong>Corte Mensual:</strong> Las ventas se contabilizan desde el primer al último día de cada mes.</li>
            <li><strong>Fecha de Pago:</strong> Los pagos se procesarán entre el día 1 y 10 del mes siguiente al cierre.</li>
            <li>
                El Instructor debe informar su condición (Con o Sin Factura) antes del cierre de mes. 
                Si presenta Factura Legal, recibirá el 70%. Si no la presenta, Tecnia Academy procederá a liquidar el pago bajo el esquema del 60%, 
                emitiendo una Auto-Factura para justificar legalmente el egreso.
            </li>
          </ul>
        </section>

        <section style={styles.section}>
          <h3>4. Propiedad Intelectual</h3>
          <p>
            Usted conserva la propiedad intelectual y los derechos de autor de su contenido. Al subir un curso, otorga a Tecnia Academy una licencia mundial, no exclusiva y libre de regalías para:
            reproducir, distribuir, comercializar y promocionar su contenido dentro de la plataforma. Usted garantiza que es el autor original del material y que no infringe derechos de terceros.
          </p>
        </section>

        <section style={styles.section}>
          <h3>5. Calidad y Reembolsos</h3>
          <p>
            Tecnia Academy se reserva el derecho de rechazar cursos que no cumplan con los estándares de calidad de audio, video o pedagogía. 
            En caso de que un estudiante solicite un reembolso justificado (por fallas técnicas graves o publicidad engañosa del curso), el monto de dicha venta será deducido de la liquidación del Instructor.
          </p>
        </section>

        <section style={styles.section}>
          <h3>6. Modificaciones</h3>
          <p>
            Tecnia Academy se reserva el derecho de modificar estos términos notificando a los instructores con 30 días de antelación. El uso continuado de la plataforma implica la aceptación de los nuevos términos.
          </p>
        </section>

        <div style={styles.acceptBox}>
            {yaEsInstructor ? (
                <>
                    <p style={{margin: '0 0 15px 0', color: '#27ae60', fontWeight: 'bold'}}>
                        <i className="fas fa-check-circle"></i> Ya sos instructor en Tecnia Academy.
                    </p>
                    <button style={styles.acceptButton} onClick={() => navigate('/panel-instructor')}>
                        Ir a mi Panel de Instructor
                    </button>
                </>
            ) : (
                <>
                    <p style={{margin: '0 0 15px 0', color: '#444'}}>
                        Al continuar, confirmás que leíste y aceptás estos términos y condiciones.
                    </p>
                    <button style={styles.acceptButton} onClick={handleAceptar} disabled={loading}>
                        {loading ? 'Procesando...' : (isLoggedIn ? 'Acepto y quiero ser Instructor' : 'Iniciar sesión para continuar')}
                    </button>
                </>
            )}
        </div>

        <div style={{marginTop: '40px', textAlign: 'center', fontSize: '0.9em', color: '#7f8c8d'}}>
          <p>Tecnia Academy Paraguay - Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  acceptBox: {
    marginTop: '30px',
    padding: '25px',
    textAlign: 'center',
    background: '#f0fbfa',
    border: '1px solid #b8ebe8',
    borderRadius: '10px',
  },
  acceptButton: {
    background: '#0b3d91',
    color: 'white',
    border: 'none',
    padding: '14px 30px',
    borderRadius: '30px',
    fontWeight: 'bold',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  container: {
    padding: '40px 20px',
    backgroundColor: '#f4f6f8',
    minHeight: '100vh',
    fontFamily: "'Inter', sans-serif",
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '10px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  title: {
    color: '#2c3e50',
    borderBottom: '2px solid #3498db',
    paddingBottom: '15px',
    marginBottom: '10px',
  },
  lastUpdate: {
    color: '#7f8c8d',
    fontSize: '0.9em',
    marginBottom: '30px',
    fontStyle: 'italic',
  },
  section: {
    marginBottom: '30px',
  },
};

export default TermsInstructors;