import React from 'react';

function Footer() {
  return (
    <footer className="footer">
      <p>© {new Date().getFullYear()} <span className="logo-tecnia">Tecnia</span> <span className="logo-academy">Academy</span> — Todos los derechos reservados.</p>
    </footer>
  );
}

export default Footer;