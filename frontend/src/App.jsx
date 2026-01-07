import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import axios from 'axios'; 
import ProtectedRoute from './components/ProtectedRoute';
import './style.css'; 

// Importar componentes de página existing
import Home from './pages/Home';
import Login from './pages/login';
import Register from './pages/Register';
import CourseLibrary from './pages/CourseLibrary';
import MyCourses from './pages/MyCourses';
import InstructorPanel from './pages/InstructorPanel'; 
import Profile from './pages/Profile';
import CreateCourse from './pages/CreateCourse'; 
import ManageContent from './pages/ManageContent'; 
import VirtualClassroom from './pages/VirtualClassroom';
import CertificateView from './pages/CertificateView';
import AdminDashboard from './pages/AdminDashboard';
import EditCourse from './pages/EditCourse'; 
import CourseDetailPublic from './pages/CourseDetailPublic';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyCertificate from './pages/VerifyCertificate';
import Maintenance from './pages/Maintenance';

// 🟢 1. IMPORTAR LA NUEVA PÁGINA (Esto faltaba)
import TermsInstructors from './pages/TermsInstructors';

function App() {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 503 && error.response.data.maintenance) {
          setIsMaintenanceMode(true);
        }
        return Promise.reject(error);
      }
    );
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  if (isMaintenanceMode) {
    return <Maintenance />;
  }

  return (
    <Routes>
      {/* RUTAS PÚBLICAS */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Register />} />
      <Route path="/biblioteca" element={<CourseLibrary />} />
      <Route path="/curso/:id" element={<CourseDetailPublic />} />
      <Route path="/olvide-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/verify" element={<VerifyCertificate />} />

      {/* 🟢 2. AGREGAR LA NUEVA RUTA AQUÍ (Esto también faltaba) */}
      <Route path="/terminos-instructores" element={<TermsInstructors />} />

      {/* RUTAS PROTEGIDAS (Requieren Token JWT) */}
      <Route path="/mis-cursos" element={<ProtectedRoute element={MyCourses} />} />
      <Route path="/perfil" element={<ProtectedRoute element={Profile} />} />
      <Route path="/certificado/:id" element={<ProtectedRoute element={CertificateView} />} />

      <Route 
        path="/admin-dashboard" 
        element={<ProtectedRoute element={AdminDashboard} allowedRoles={['admin', 'superadmin']} />} 
      />

      <Route 
        path="/panel-instructor" 
        element={<ProtectedRoute element={InstructorPanel} allowedRoles={['instructor', 'admin', 'superadmin']} />} 
      />
      
      <Route 
        path="/crear-curso" 
        element={<ProtectedRoute element={CreateCourse} allowedRoles={['instructor', 'admin', 'superadmin']} />} 
      />

      <Route 
        path="/gestionar-contenido/:id" 
        element={<ProtectedRoute element={ManageContent} allowedRoles={['instructor', 'admin', 'superadmin']} />} 
      />

      <Route 
        path="/editar-curso/:id" 
        element={<ProtectedRoute element={EditCourse} allowedRoles={['instructor', 'admin', 'superadmin']} />} 
      />

      <Route path="/curso/:id/learn" element={<ProtectedRoute element={VirtualClassroom} />} />
      <Route path="/aula-virtual/:id" element={<ProtectedRoute element={VirtualClassroom} />} />
      
      <Route path="*" element={<h1>404 | Página No Encontrada</h1>} />
    </Routes>
  );
}

export default App;