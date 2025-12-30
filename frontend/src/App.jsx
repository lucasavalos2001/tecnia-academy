import React from 'react';
import { Routes, Route } from 'react-router-dom';
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

// ✅ NUEVAS IMPORTACIONES: Recuperación de contraseña
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

function App() {
  return (
    <Routes>
      {/* RUTAS PÚBLICAS */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Register />} />
      <Route path="/biblioteca" element={<CourseLibrary />} />
      
      {/* RUTA PÚBLICA DE DETALLE (Landing Page del Curso) */}
      <Route path="/curso/:id" element={<CourseDetailPublic />} />

      {/* ✅ NUEVAS RUTAS DE RECUPERACIÓN */}
      <Route path="/olvide-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      {/* RUTAS PROTEGIDAS (Requieren Token JWT) */}
      
      {/* Rutas de Estudiante/Usuario General */}
      <Route 
        path="/mis-cursos" 
        element={<ProtectedRoute element={MyCourses} />} 
      />
      <Route 
        path="/perfil" 
        element={<ProtectedRoute element={Profile} />} 
      />
      
      {/* Ruta para ver el certificado */}
      <Route 
        path="/certificado/:id" 
        element={<ProtectedRoute element={CertificateView} />} 
      />

      {/* Panel de Administrador General */}
      <Route 
        path="/admin-dashboard" 
        element={
          <ProtectedRoute 
            element={AdminDashboard} 
            allowedRoles={['admin', 'superadmin']} 
          />
        } 
      />

      {/* Rutas de Instructor/Admin */}
      <Route 
        path="/panel-instructor" 
        element={
          <ProtectedRoute 
            element={InstructorPanel} 
            allowedRoles={['instructor', 'admin', 'superadmin']} 
          />
        } 
      />
      
      <Route 
        path="/crear-curso" 
        element={
          <ProtectedRoute 
            element={CreateCourse} 
            allowedRoles={['instructor', 'admin', 'superadmin']} 
          />
        } 
      />

      {/* Ruta: Gestionar Contenido (Módulos y Lecciones) */}
      <Route 
        path="/gestionar-contenido/:id" 
        element={
          <ProtectedRoute 
            element={ManageContent} 
            allowedRoles={['instructor', 'admin', 'superadmin']} 
          />
        } 
      />

      {/* Ruta: Editar Curso */}
      <Route 
        path="/editar-curso/:id" 
        element={
          <ProtectedRoute 
            element={EditCourse} 
            allowedRoles={['instructor', 'admin', 'superadmin']} 
          />
        } 
      />

      {/* 🟢 LA RUTA MÁGICA QUE FALTABA (Conecta con el botón "Acceder") */}
      <Route 
        path="/curso/:id/learn" 
        element={<ProtectedRoute element={VirtualClassroom} />} 
      />

      {/* Ruta: Aula Virtual (Versión alternativa que ya tenías) */}
      <Route 
        path="/aula-virtual/:id" 
        element={<ProtectedRoute element={VirtualClassroom} />} 
      />
      
      {/* Página de Error 404 */}
      <Route path="*" element={<h1>404 | Página No Encontrada</h1>} />
    </Routes>
  );
}

export default App;