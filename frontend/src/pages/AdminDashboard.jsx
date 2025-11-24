import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// Borramos la importación de Navbar porque no la necesitamos aquí

function AdminDashboard() {
  const { user, token } = useAuth();
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  // Estados de Datos
  const [stats, setStats] = useState({ totalUsers: 0, totalCourses: 0, totalRevenue: 0 });
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  
  // Estado de Interfaz y Búsqueda
  const [activeTab, setActiveTab] = useState('stats'); 
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); 

  // --- Cargas de Datos ---
  const loadStats = async () => {
    const res = await axios.get(`${API_URL}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } });
    setStats(res.data);
  };
  const loadUsers = async () => {
    const res = await axios.get(`${API_URL}/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
    setUsers(res.data);
  };
  const loadCourses = async () => {
    const res = await axios.get(`${API_URL}/admin/courses`, { headers: { Authorization: `Bearer ${token}` } });
    setCourses(res.data);
  };
  const loadActivity = async () => {
    const res = await axios.get(`${API_URL}/admin/activity`, { headers: { Authorization: `Bearer ${token}` } });
    setEnrollments(res.data);
  };

  useEffect(() => {
    setLoading(true);
    if (activeTab === 'stats') loadStats();
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'courses') loadCourses();
    if (activeTab === 'activity') loadActivity();
    setLoading(false);
  }, [activeTab]);

  // --- Acciones ---
  const handleDeleteUser = async (id) => {
    if(!confirm("¿Estás SEGURO? Esto borrará al usuario y sus datos.")) return;
    await axios.delete(`${API_URL}/admin/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    loadUsers();
  };

  const handleChangeRole = async (id, newRole) => {
    if(!confirm(`¿Cambiar rol a ${newRole}?`)) return;
    await axios.put(`${API_URL}/admin/users/${id}/role`, { rol: newRole }, { headers: { Authorization: `Bearer ${token}` } });
    loadUsers();
  };

  const handleDeleteCourse = async (id) => {
    if(!confirm("¿Borrar este curso permanentemente?")) return;
    await axios.delete(`${API_URL}/admin/courses/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    loadCourses();
  };

  // --- LÓGICA DE FILTRADO ---
  const filteredUsers = users.filter(u => {
      const term = searchTerm.toLowerCase();
      return (
          u.nombre_completo.toLowerCase().includes(term) || 
          u.email.toLowerCase().includes(term) ||           
          u.id.toString().includes(term) ||                 
          u.rol.toLowerCase().includes(term)                
      );
  });

  return (
    // Eliminamos <Navbar /> para que el diseño flex funcione correctamente
    <div className="instructor-dashboard"> 
        
        {/* SIDEBAR DE ADMIN */}
        <aside className="dashboard-sidebar" style={{backgroundColor: '#2c3e50'}}> 
            <div className="logo" style={{marginBottom: '20px'}}>
                <span style={{color:'white'}}>Tecnia</span><span style={{color:'#e74c3c'}}>Admin</span>
            </div>
            
            <div className="instructor-profile">
                <div style={{width:'60px', height:'60px', background:'#e74c3c', color:'white', borderRadius:'50%', display:'flex', justifyContent:'center', alignItems:'center', margin:'0 auto 10px', fontSize:'1.5em'}}>
                    <i className="fas fa-user-shield"></i>
                </div>
                <h4>{user?.nombre_completo}</h4>
                <p style={{fontSize:'0.8em', color:'#bdc3c7'}}>Super Administrador</p>
            </div>

            <nav className="dashboard-nav">
                <ul>
                    <li><button onClick={() => setActiveTab('stats')} className={activeTab === 'stats' ? 'active' : ''} style={navBtnStyle}><i className="fas fa-tachometer-alt"></i> Dashboard</button></li>
                    <li><button onClick={() => setActiveTab('users')} className={activeTab === 'users' ? 'active' : ''} style={navBtnStyle}><i className="fas fa-users"></i> Usuarios</button></li>
                    <li><button onClick={() => setActiveTab('courses')} className={activeTab === 'courses' ? 'active' : ''} style={navBtnStyle}><i className="fas fa-book"></i> Moderar Cursos</button></li>
                    <li><button onClick={() => setActiveTab('activity')} className={activeTab === 'activity' ? 'active' : ''} style={navBtnStyle}><i className="fas fa-history"></i> Actividad</button></li>
                    
                    <li style={{marginTop:'20px', borderTop:'1px solid #ffffff20', paddingTop:'10px'}}>
                        <Link to="/" style={{...navBtnStyle, justifyContent:'flex-start'}}><i className="fas fa-home"></i> Volver a la Web</Link>
                    </li>
                </ul>
            </nav>
        </aside>

        {/* CONTENIDO PRINCIPAL */}
        <main className="dashboard-content">
            
            {/* VISTA 1: DASHBOARD / ESTADÍSTICAS */}
            {activeTab === 'stats' && (
                <div>
                    <header className="content-header"><h2>Resumen Global</h2></header>
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px'}}>
                        <StatCard title="Usuarios" value={stats.totalUsers} icon="fa-users" color="#3498db" />
                        <StatCard title="Cursos" value={stats.totalCourses} icon="fa-graduation-cap" color="#9b59b6" />
                        <StatCard title="Inscripciones" value={stats.totalEnrollments} icon="fa-clipboard-list" color="#f1c40f" />
                        <StatCard title="Ingresos (Est.)" value={`$${stats.totalRevenue}`} icon="fa-dollar-sign" color="#27ae60" />
                    </div>
                </div>
            )}

            {/* VISTA 2: GESTIÓN DE USUARIOS CON BUSCADOR */}
            {activeTab === 'users' && (
                <div>
                    <header className="content-header" style={{display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:'10px'}}>
                        <h2>Control de Usuarios</h2>
                        <div style={{position: 'relative'}}>
                            <input 
                                type="text" 
                                placeholder="Buscar por nombre, email o rol..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    padding: '10px 15px 10px 35px',
                                    borderRadius: '20px',
                                    border: '1px solid #ccc',
                                    width: '300px',
                                    outline: 'none'
                                }}
                            />
                            <i className="fas fa-search" style={{position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'#999'}}></i>
                        </div>
                    </header>

                    <div style={{background:'white', padding:'20px', borderRadius:'8px', boxShadow:'0 2px 5px rgba(0,0,0,0.05)'}}>
                        <table style={{width:'100%', borderCollapse:'collapse'}}>
                            <thead>
                                <tr style={{textAlign:'left', borderBottom:'2px solid #eee'}}>
                                    <th style={{padding:'10px'}}>ID</th>
                                    <th style={{padding:'10px'}}>Nombre</th>
                                    <th style={{padding:'10px'}}>Email</th>
                                    <th style={{padding:'10px'}}>Rol</th>
                                    <th style={{padding:'10px'}}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.length > 0 ? (
                                    filteredUsers.map(u => (
                                        <tr key={u.id} style={{borderBottom:'1px solid #eee'}}>
                                            <td style={{padding:'10px'}}>{u.id}</td>
                                            <td style={{padding:'10px'}}>{u.nombre_completo}</td>
                                            <td style={{padding:'10px'}}>{u.email}</td>
                                            <td style={{padding:'10px'}}>
                                                <span style={{padding:'3px 8px', borderRadius:'10px', fontSize:'0.8em', background: u.rol==='admin'?'#e74c3c':u.rol==='instructor'?'#f39c12':'#ecf0f1', color: u.rol==='admin'?'white':u.rol==='instructor'?'white':'black'}}>
                                                    {u.rol}
                                                </span>
                                            </td>
                                            <td style={{padding:'10px'}}>
                                                {u.rol !== 'admin' && (
                                                    <>
                                                        {u.rol !== 'instructor' && <button onClick={() => handleChangeRole(u.id, 'instructor')} style={btnActionStyle}>⬆ Instructor</button>}
                                                        {u.rol === 'instructor' && <button onClick={() => handleChangeRole(u.id, 'student')} style={btnActionStyle}>⬇ Estudiante</button>}
                                                        <button onClick={() => handleDeleteUser(u.id)} style={{...btnActionStyle, background:'#e74c3c', color:'white', marginLeft:'5px'}}>Eliminar</button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="5" style={{padding:'20px', textAlign:'center', color:'#999'}}>No se encontraron usuarios.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* VISTA 3: MODERACIÓN DE CURSOS */}
            {activeTab === 'courses' && (
                <div>
                    <header className="content-header"><h2>Todos los Cursos</h2></header>
                    <div className="course-list">
                        {courses.map(c => (
                            <div className="course-item" key={c.id}>
                                <div className="course-info">
                                    <h3>{c.titulo}</h3>
                                    <p style={{fontSize:'0.9em', color:'#666'}}>Instructor: <strong>{c.instructor?.nombre_completo}</strong> | Precio: ${c.precio}</p>
                                </div>
                                <div className="course-actions">
                                    <button onClick={() => handleDeleteCourse(c.id)} className="btn-action delete">Eliminar Curso</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* VISTA 4: ACTIVIDAD RECIENTE */}
            {activeTab === 'activity' && (
                <div>
                    <header className="content-header"><h2>Últimas Inscripciones</h2></header>
                    <div style={{background:'white', padding:'20px', borderRadius:'8px'}}>
                        <ul style={{listStyle:'none', padding:0}}>
                            {enrollments.map(e => (
                                <li key={e.id} style={{padding:'15px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between'}}>
                                    <div>
                                        <strong>{e.User?.nombre_completo}</strong> se inscribió en <span style={{color:'#0b3d91'}}>{e.curso?.titulo}</span>
                                    </div>
                                    <div style={{color:'#999', fontSize:'0.9em'}}>
                                        {new Date(e.createdAt).toLocaleDateString()}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

        </main>
    </div>
  );
}

// --- COMPONENTES AUXILIARES ---
const StatCard = ({ title, value, icon, color }) => (
    <div style={{background:'white', padding:'20px', borderRadius:'8px', boxShadow:'0 2px 5px rgba(0,0,0,0.05)', display:'flex', alignItems:'center', gap:'20px'}}>
        <div style={{fontSize:'2em', color: color, width:'50px', textAlign:'center'}}><i className={`fas ${icon}`}></i></div>
        <div>
            <h4 style={{margin:0, color:'#7f8c8d'}}>{title}</h4>
            <div style={{fontSize:'1.8em', fontWeight:'bold', color:'#2c3e50'}}>{value}</div>
        </div>
    </div>
);

const navBtnStyle = {
    background: 'none', border: 'none', color: 'white', width: '100%', textAlign: 'left', padding: '15px', cursor: 'pointer', display: 'flex', gap: '10px', fontSize: '1em', alignItems: 'center'
};

const btnActionStyle = {
    border: '1px solid #ccc', background: 'white', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8em'
};

export default AdminDashboard;
