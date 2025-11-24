import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom' // Necesario para que las rutas funcionen
import App from './App.jsx'
import './style.css' // Importar los estilos
import { AuthProvider } from './context/AuthContext.jsx' // Importar el Proveedor de Autenticación

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* Envolvemos toda la App en el AuthProvider para que todos los componentes
          puedan usar el hook useAuth() */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)