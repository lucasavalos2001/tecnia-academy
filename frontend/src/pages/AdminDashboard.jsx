import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AdminDashboard() {
  const { user, token } = useAuth();
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  // Estados de Datos
  const [stats, setStats] = useState({ totalUsers: 0, totalCourses: 0, totalRevenue: 0 });
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [pendingCourses, setPendingCourses] = useState([]); 
  const [payouts, setPayouts] = useState([]); // 🟢 Estado para pagos
   
  // Estado de Interfaz y Búsqueda
  const [activeTab, setActiveTab] = useState('stats'); 
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); 

  // --- Cargas de Datos ---
  const loadStats = async () => {
    try {
        const res = await axios.get(`${API_URL}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } });
        setStats(res.data);
    } catch (error) { console.error("Error stats", error); }
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
  
  const loadPendingCourses = async () => {
    try {
        const res = await axios.get(`${API_URL}/admin/pending`, { headers: { Authorization: `Bearer ${token}` } });
        setPendingCourses(res.data);
    } catch (error) { console.error("Error pendientes", error); }
  };

  // 🟢 Cargar reporte de pagos
  const loadPayouts = async () => {
    try {
        const res = await axios.get(`${API_URL}/admin/payouts`, { headers: { Authorization: `Bearer ${token}` } });
        setPayouts(res.data);
    } catch (error) { console.error("Error payouts", error); }
  };

  useEffect(() => {
    setLoading(true);
    if (activeTab === 'stats') loadStats();
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'courses') loadCourses();
    if (activeTab === 'activity') loadActivity();
    if (activeTab === 'requests') loadPendingCourses(); 
    if (activeTab === 'payouts') loadPayouts(); // 🟢 Cargar al entrar a la tab
    setLoading(false);
  }, [activeTab]);

  // --- Acciones Existentes ---
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

  const handleReviewCourse = async (courseId, decision) => {
      const actionText = decision === 'aprobar' ? 'PUBLICAR' : 'RECHAZAR';
      if(!confirm(`¿Estás seguro de que quieres ${actionText} este curso?`)) return;

      try {
          await axios.post(
              `${API_URL}/admin/review/${courseId}`, 
              { decision }, 
              { headers: { Authorization: `Bearer ${token}` } }
          );
          alert(`Curso ${decision === 'aprobar' ? 'publicado' : 'rechazado'} con éxito.`);
          loadPendingCourses(); 
          loadStats(); 
      } catch (error) {
          alert("Error al procesar la solicitud.");
          console.error(error);
      }
  };

  // --- LÓGICA DE FILTRADO USUARIOS ---
  const filteredUsers = users.filter(u => {
      const term = searchTerm.toLowerCase();
      return (
          u.nombre_completo.toLowerCase().includes(term) || 
          u.email.toLowerCase().includes(term) ||            
          u.id.toString().includes(term) ||                  
          u.rol.toLowerCase().includes(term)                 
      );
  });

  const formatMoney = (amount) => {
      return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(amount);
  };

  return (
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
                    
                    <li>
                        <button onClick={() => setActiveTab('requests')} className={activeTab === 'requests' ? 'active' : ''} style={navBtnStyle}>
                            <i className="fas fa-bell"></i> Solicitudes 
                            {pendingCourses.length > 0 && (
                                <span style={{background:'#e74c3c', color:'white', borderRadius:'50%', padding:'2px 6px', fontSize:'0.7em', marginLeft:'auto'}}>
                                    {pendingCourses.length}
                                </span>
                            )}
                        </button>
                    </li>

                    <li><button onClick={() => setActiveTab('users')} className={activeTab === 'users' ? 'active' : ''} style={navBtnStyle}><i className="fas fa-users"></i> Usuarios</button></li>
                    <li><button onClick={() => setActiveTab('courses')} className={activeTab === 'courses' ? 'active' : ''} style={navBtnStyle}><i className="fas fa-book"></i> Moderar Cursos</button></li>
                    <li><button onClick={() => setActiveTab('activity')} className={activeTab === 'activity' ? 'active' : ''} style={navBtnStyle}><i className="fas fa-history"></i> Actividad</button></li>
                    
                    {/* 🟢 NUEVO BOTÓN: PAGOS */}
                    <li><button onClick={() => setActiveTab('payouts')} className={activeTab === 'payouts' ? 'active' : ''} style={navBtnStyle}><i className="fas fa-money-bill-wave"></i> Liquidación Pagos</button></li>

                    <li style={{marginTop:'20px', borderTop:'1px solid #ffffff20', paddingTop:'10px'}}>
                        <Link to="/" style={{...navBtnStyle, justifyContent:'flex-start'}}><i className="fas fa-home"></i> Volver a la Web</Link>
                    </li>
                </ul>
            </nav>
        </aside>

        {/* CONTENIDO PRINCIPAL */}
        <main className="dashboard-content">
            
            {/* VISTA 1: DASHBOARD */}
            {activeTab === 'stats' && (
                <div>
                    <header className="content-header"><h2>Resumen Global</h2></header>
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px'}}>
                        <StatCard title="Usuarios" value={stats.totalUsers} icon="fa-users" color="#3498db" />
                        <StatCard title="Cursos Totales" value={stats.totalCourses} icon="fa-graduation-cap" color="#9b59b6" />
                        <StatCard title="Inscripciones" value={stats.totalEnrollments} icon="fa-clipboard-list" color="#f1c40f" />
                        <StatCard title="Ingresos (Est.)" value={`$${stats.totalRevenue}`} icon="fa-dollar-sign" color="#27ae60" />
                    </div>
                </div>
            )}

            {/* VISTA: SOLICITUDES PENDIENTES */}
            {activeTab === 'requests' && (
                <div>
                    <header className="content-header"><h2>Solicitudes de Publicación</h2></header>
                    {pendingCourses.length === 0 ? (
                        <div style={{textAlign:'center', padding:'40px', color:'#7f8c8d'}}>
                            <i className="fas fa-check-circle" style={{fontSize:'3em', color:'#2ecc71', marginBottom:'10px'}}></i>
                            <p>¡Todo al día! No hay cursos pendientes de revisión.</p>
                        </div>
                    ) : (
                        <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                            {pendingCourses.map(curso => (
                                <div key={curso.id} style={{background:'white', padding:'20px', borderRadius:'8px', boxShadow:'0 2px 5px rgba(0,0,0,0.05)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'15px', borderLeft:'5px solid #f39c12'}}>
                                    <div style={{flex:'1'}}>
                                        <h3 style={{margin:'0 0 5px 0', color:'#2c3e50'}}>{curso.titulo}</h3>
                                        <p style={{margin:0, color:'#7f8c8d', fontSize:'0.9em'}}>
                                            Instructor: <strong>{curso.instructor?.nombre_completo}</strong> | 
                                            Duración: <strong>{curso.duracion}</strong> | 
                                            Precio: {formatMoney(curso.precio)}
                                        </p>
                                        <p style={{margin:'5px 0 0 0', fontSize:'0.85em', color:'#95a5a6'}}>
                                            Enviado el: {new Date(curso.updatedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div style={{display:'flex', gap:'10px'}}>
                                        <Link to={`/curso/${curso.id}`} target="_blank" style={{textDecoration:'none', padding:'8px 15px', border:'1px solid #3498db', borderRadius:'4px', color:'#3498db', fontSize:'0.9em'}}>
                                            <i className="fas fa-eye"></i> Ver Contenido
                                        </Link>
                                        <button onClick={() => handleReviewCourse(curso.id, 'rechazado')} style={{padding:'8px 15px', background:'#e74c3c', color:'white', border:'none', borderRadius:'4px', cursor:'pointer', fontWeight:'bold'}}>
                                            <i className="fas fa-times"></i> Rechazar
                                        </button>
                                        <button onClick={() => handleReviewCourse(curso.id, 'aprobar')} style={{padding:'8px 15px', background:'#27ae60', color:'white', border:'none', borderRadius:'4px', cursor:'pointer', fontWeight:'bold'}}>
                                            <i className="fas fa-check"></i> Aprobar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* 🟢 VISTA NUEVA: LIQUIDACIÓN DE PAGOS */}
            {activeTab === 'payouts' && (
                <div>
                    <header className="content-header" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <h2>Liquidación Mensual de Instructores</h2>
                        <button onClick={() => window.print()} style={{padding:'10px 20px', background:'#2c3e50', color:'white', border:'none', borderRadius:'5px', cursor:'pointer'}}>
                            <i className="fas fa-print"></i> Imprimir Reporte
                        </button>
                    </header>

                    <div style={{overflowX: 'auto', background:'white', borderRadius:'8px', boxShadow:'0 2px 10px rgba(0,0,0,0.05)'}}>
                        <table style={{width:'100%', borderCollapse:'collapse', minWidth:'800px'}}>
                            <thead style={{background:'#f8f9fa', color:'#2c3e50'}}>
                                <tr>
                                    <th style={{padding:'15px', textAlign:'left'}}>Instructor</th>
                                    <th style={{padding:'15px', textAlign:'left'}}>Datos Bancarios</th>
                                    <th style={{padding:'15px', textAlign:'center'}}>Ventas Mes</th>
                                    <th style={{padding:'15px', textAlign:'right'}}>Total Bruto</th>
                                    <th style={{padding:'15px', textAlign:'right', color:'#e74c3c'}}>Comisión (30%)</th>
                                    <th style={{padding:'15px', textAlign:'right', background:'#27ae60', color:'white'}}>A PAGAR</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payouts.length === 0 ? (
                                    <tr><td colSpan="6" style={{padding:'30px', textAlign:'center', color:'#999'}}>No hay ventas registradas este mes.</td></tr>
                                ) : (
                                    payouts.map((p, idx) => (
                                        <tr key={idx} style={{borderBottom:'1px solid #eee'}}>
                                            <td style={{padding:'15px'}}>
                                                <strong>{p.instructor.nombre}</strong><br/>
                                                <small style={{color:'#999'}}>ID: {p.instructor.id}</small>
                                            </td>
                                            <td style={{padding:'15px', fontSize:'0.9em'}}>
                                                {p.instructor.banco ? (
                                                    <>
                                                        <div><strong>Banco:</strong> {p.instructor.banco}</div>
                                                        <div><strong>Cta:</strong> {p.instructor.cuenta}</div>
                                                        <div><strong>Titular:</strong> {p.instructor.titular}</div>
                                                        <div><strong>CI:</strong> {p.instructor.ci}</div>
                                                        {p.instructor.alias && <div><strong>Alias:</strong> {p.instructor.alias}</div>}
                                                    </>
                                                ) : (
                                                    <span style={{color:'#e74c3c', fontWeight:'bold'}}>Sin datos bancarios</span>
                                                )}
                                            </td>
                                            <td style={{padding:'15px', textAlign:'center'}}>
                                                {p.estadisticas.alumnos_mes} alumnos<br/>
                                                <small>en {p.estadisticas.cursos_activos} cursos</small>
                                            </td>
                                            <td style={{padding:'15px', textAlign:'right'}}>
                                                {formatMoney(p.estadisticas.total_bruto)}
                                            </td>
                                            <td style={{padding:'15px', textAlign:'right', color:'#e74c3c'}}>
                                                - {formatMoney(p.estadisticas.comision_retenida)}
                                            </td>
                                            <td style={{padding:'15px', textAlign:'right', fontWeight:'bold', color:'#27ae60', fontSize:'1.1em'}}>
                                                {formatMoney(p.estadisticas.total_a_pagar)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <p style={{marginTop:'20px', fontSize:'0.9em', color:'#666', textAlign:'center'}}>
                        * Cálculos basados en inscripciones del mes en curso. La comisión de plataforma es del 30%.
                    </p>
                </div>
            )}

            {/* VISTA: USUARIOS */}
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
                                {filteredUsers.map(u => (
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
                                                    {u.rol !== 'instructor' && <button onClick={() => handleChangeRole(u.id, 'instructor')} style={btnActionStyle}>⬇ Instructor</button>}
                                                    {u.rol === 'instructor' && <button onClick={() => handleChangeRole(u.id, 'student')} style={btnActionStyle}>⬇ Estudiante</button>}
                                                    <button onClick={() => handleDeleteUser(u.id)} style={{...btnActionStyle, background:'#e74c3c', color:'white', marginLeft:'5px'}}>Eliminar</button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* VISTA: CURSOS */}
            {activeTab === 'courses' && (
                <div>
                    <header className="content-header"><h2>Todos los Cursos (Catálogo)</h2></header>
                    <div className="course-list">
                        {courses.map(c => (
                            <div className="course-item" key={c.id}>
                                <div className="course-info">
                                    <h3>{c.titulo}</h3>
                                    <p style={{fontSize:'0.9em', color:'#666'}}>
                                        Instructor: <strong>{c.instructor?.nombre_completo}</strong> | 
                                        Duración: <strong>{c.duracion}</strong> |
                                        Estado: 
                                        <strong style={{color: c.estado === 'publicado' ? '#27ae60' : '#f39c12', marginLeft: '5px'}}>
                                            {c.estado.toUpperCase()}
                                        </strong>
                                    </p>
                                </div>
                                <div className="course-actions">
                                    <button onClick={() => handleDeleteCourse(c.id)} className="btn-action delete">Eliminar Curso</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* VISTA: ACTIVIDAD */}
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