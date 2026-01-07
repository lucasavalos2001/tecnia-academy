import React from 'react';

const Maintenance = () => {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>🛠️</div>
        <h1 style={styles.title}>Sitio en Mantenimiento</h1>
        <p style={styles.text}>
          Estamos realizando mejoras en nuestra plataforma para brindarte una mejor experiencia.
          <br />
          Volveremos a estar en línea muy pronto.
        </p>
        <div style={styles.loader}></div>
        <p style={styles.subtext}>Tecnia Academy Team</p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    height: '100vh',
    width: '100vw',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f6f8',
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 9999, // Encima de todo
  },
  card: {
    textAlign: 'center',
    background: 'white',
    padding: '40px',
    borderRadius: '15px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    maxWidth: '500px',
    margin: '20px',
  },
  icon: {
    fontSize: '4em',
    marginBottom: '20px',
  },
  title: {
    color: '#2c3e50',
    margin: '0 0 10px 0',
    fontSize: '2em',
  },
  text: {
    color: '#7f8c8d',
    fontSize: '1.1em',
    lineHeight: '1.6',
    marginBottom: '30px',
  },
  subtext: {
    color: '#bdc3c7',
    fontSize: '0.9em',
    marginTop: '20px',
  },
  loader: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #3498db',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto',
  }
};

// Agregamos la animación de rotación al estilo global (truco rápido para JSX)
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;
document.head.appendChild(styleSheet);

export default Maintenance;