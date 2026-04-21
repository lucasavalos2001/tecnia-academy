import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AdminDashboard() {
  const { user, token } = useAuth();
  const API_URL = import.meta.env.VITE_API_BASE_URL;

  // --- ESTADOS DE DATOS ---
  const [stats, setStats] = useState({ totalUsers: 0, totalCourses: 0, totalRevenue: 0 });
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [pendingCourses, setPendingCourses] = useState([]); 
  const [payouts, setPayouts] = useState([]); 
  
  // Mantenimiento
  const [maintenanceMode, setMaintenanceMode] = useState(false);
   
  // Interfaz y Búsqueda
  const [activeTab, setActiveTab] = useState('stats'); 
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); 

  // Filtro de Pagos
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); 
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // --- FUNCIONES DE CARGA (FETCHING) ---
  const loadStats = async () => {
    try {
        const res = await axios.get(`${API_URL}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } });
        setStats(res.data);
    } catch (error) { console.error("Error stats", error); }
  };

  const loadUsers = async () => {
    try {
        const res = await axios.get(`${API_URL}/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
        setUsers(res.data);
    } catch (error) { console.error("Error users", error); }
  };

  const loadCourses = async () => {
    try {
        const res = await axios.get(`${API_URL}/admin/courses`, { headers: { Authorization: `Bearer ${token}` } });
        setCourses(res.data);
    } catch (error) { console.error("Error courses", error); }
  };

  const loadActivity = async () => {
    try {
        const res = await axios.get(`${API_URL}/admin/activity`, { headers: { Authorization: `Bearer ${token}` } });
        setEnrollments(res.data);
    } catch (error) { console.error("Error activity", error); }
  };
  
  const loadPendingCourses = async () => {
    try {
        const res = await axios.get(`${API_URL}/admin/pending`, { headers: { Authorization: `Bearer ${token}` } });
        setPendingCourses(res.data);
    } catch (error) { console.error("Error pendientes", error); }
  };

  const loadPayouts = async () => {
    try {
        const res = await axios.get(`${API_URL}/admin/payouts`, { 
            headers: { Authorization: `Bearer ${token}` },
            params: { month: selectedMonth, year: selectedYear } 
        });
        setPayouts(res.data);
    } catch (error) { console.error("Error payouts", error); }
  };

  const loadMaintenanceStatus = async () => {
      try {
          const res = await axios.get(`${API_URL}/admin/maintenance/status`, { headers: { Authorization: `Bearer ${token}` } });
          setMaintenanceMode(res.data.enabled);
      } catch (error) { console.error("Error maintenance status", error); }
  };

  // Orquestador de carga basado en el Tab activo
  useEffect(() => {
    loadMaintenanceStatus();
    if (activeTab === 'stats') loadStats();
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'courses') loadCourses();
    if (activeTab === 'activity') loadActivity();
    if (activeTab === 'requests') loadPendingCourses(); 
    if (activeTab === 'payouts') loadPayouts(); 
  }, [activeTab, selectedMonth, selectedYear]); 

  // --- ACCIONES ADMINISTRATIVAS ---
  
  const handleResetPassword = async (userId, userName) => {
    const provisoria = `Tecnia.${Math.floor(1000 + Math.random() * 9000)}`;
    if(!confirm(`¿Resetear clave de ${userName} a: ${provisoria}?`)) return;
    try {
        await axios.post(`${API_URL}/admin/users/${userId}/reset-password`, { newPassword: provisoria }, { headers: { Authorization: `Bearer ${token}` } });
        navigator.clipboard.writeText(provisoria);
        alert(`✅ Éxito. Clave copiada: ${provisoria}`);
    } catch (error) { alert("Error al resetear."); }
  };

  const handleDeleteUser = async (id) => {
    if(!confirm("¿Borrar usuario permanentemente?")) return;
    await axios.delete(`${API_URL}/admin/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    loadUsers();
  };

  const handleChangeRole = async (id, newRole) => {
    if(!confirm(`¿Cambiar rol a ${newRole}?`)) return;
    await axios.put(`${API_URL}/admin/users/${id}/role`, { rol: newRole }, { headers: { Authorization: `Bearer ${token}` } });
    loadUsers();
  };

  const handleDeleteCourse = async (id) => {
    if(!confirm("¿Borrar este curso?")) return;
    await axios.delete(`${API_URL}/admin/courses/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    loadCourses();
  };

  const handleReviewCourse = async (courseId, decision) => {
      const actionText = decision === 'aprobar' ? 'PUBLICAR' : 'RECHAZAR';
      if(!confirm(`¿Deseas ${actionText} este curso?`)) return;
      try {
          await axios.post(`${API_URL}/admin/review/${courseId}`, { decision }, { headers: { Authorization: `Bearer ${token}` } });
          loadPendingCourses(); 
          loadStats(); 
      } catch (error) { alert("Error en revisión."); }
  };

  const toggleMaintenance = async () => {
      const nuevoEstado = !maintenanceMode;
      if (!confirm(nuevoEstado ? "🔒 ¿Activar mantenimiento?" : "✅ ¿Abrir sitio?")) return;
      try {
          await axios.post(`${API_URL}/admin/maintenance/toggle`, { enabled: nuevoEstado }, { headers: { Authorization: `Bearer ${token}` } });
          setMaintenanceMode(nuevoEstado);
      } catch (error) { alert("Error en mantenimiento."); }
  };

  // --- UTILIDADES ---
  const filteredUsers = users.filter(u => {
      const term = searchTerm.toLowerCase();
      return u.nombre_completo.toLowerCase().includes(term) || u.email.toLowerCase().includes(term) || u.rol.toLowerCase().includes(term);
  });

  const formatMoney = (amount) => {
      return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(amount);
  };

  return (
    <div className="instructor-dashboard"> 
        {/* SIDEBAR */}
        <aside className="dashboard-sidebar" style={{backgroundColor: '#2c3e50'}}> 
            <div className="logo" style={{padding: '20px', textAlign: 'center'}}>
                <span style={{color:'white', fontWeight:'bold', fontSize:'1.2em'}}>Tecnia</span><span style={{color:'#e74c3c', fontWeight:'bold', fontSize:'1.2em'}}>Admin</span>
            </div>
            
            <div className="instructor-profile" style={{textAlign:'center', padding:'10px'}}>
                <div style={{width:'50px', height:'50px', background:'#e74c3c', color:'white', borderRadius:'50%', display:'flex', justifyContent:'center', alignItems:'center', margin:'0 auto 10px'}}><i className="fas fa-user-shield"></i></div>
                <h4 style={{color:'white', margin:0}}>{user?.nombre_completo}</h4>
                <p style={{fontSize:'0.7em', color:'#bdc3c7'}}>SUPER ADMIN</p>
            </div>

            <div style={{padding:'10px'}}>
                <button onClick={toggleMaintenance} style={{width:'100%', padding:'8px', borderRadius:'20px', border:'none', cursor:'pointer', background: maintenanceMode ? '#e74c3c' : '#27ae60', color:'white', fontWeight:'bold'}}>
                    {maintenanceMode ? '🔒 MANTENIMIENTO' : '✅ ONLINE'}
                </button>
            </div>

            <nav className="dashboard-nav" style={{marginTop:'20px'}}>
                <ul style={{listStyle:'none', padding:0}}>
                    <li><button onClick={() => setActiveTab('stats')} className={activeTab === 'stats' ? 'active' : ''} style={navBtnStyle}><i className="fas fa-tachometer-alt"></i> Resumen Global</button></li>
                    <li>
                        <button onClick={() => setActiveTab('requests')} className={activeTab === 'requests' ? 'active' : ''} style={navBtnStyle}>
                            <i className="fas fa-bell"></i> Solicitudes {pendingCourses.length > 0 && <span style={badgeStyle}>{pendingCourses.length}</span>}
                        </button>
                    </li>
                    <li><button onClick={() => setActiveTab('users')} className={activeTab === 'users' ? 'active' : ''} style={navBtnStyle}><i className="fas fa-users"></i> Usuarios</button></li>
                    <li><button onClick={() => setActiveTab('courses')} className={activeTab === 'courses' ? 'active' : ''} style={navBtnStyle}><i className="fas fa-book"></i> Moderar Cursos</button></li>
                    <li><button onClick={() => setActiveTab('activity')} className={activeTab === 'activity' ? 'active' : ''} style={navBtnStyle}><i className="fas fa-history"></i> Actividad Reciente</button></li>
                    <li><button onClick={() => setActiveTab('payouts')} className={activeTab === 'payouts' ? 'active' : ''} style={navBtnStyle}><i className="fas fa-money-bill-wave"></i> Liquidación Pagos</button></li>
                </ul>
            </nav>
        </aside>

        {/* CONTENIDO */}
        <main className="dashboard-content" style={{padding:'20px', flex:1, backgroundColor:'#f4f7f6', minHeight:'100vh'}}>
            {maintenanceMode && <div style={alertStyle}><i className="fas fa-exclamation-triangle"></i> MODO MANTENIMIENTO ACTIVO</div>}

            {/* TAB: ESTADÍSTICAS */}
            {activeTab === 'stats' && (
                <section>
                    <h2 style={{marginBottom:'20px'}}>Dashboard de Control</h2>
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px'}}>
                        <StatCard title="Usuarios Totales" value={stats.totalUsers} icon="fa-users" color="#3498db" />
                        <StatCard title="Cursos Creados" value={stats.totalCourses} icon="fa-graduation-cap" color="#9b59b6" />
                        <StatCard title="Inscripciones" value={stats.totalEnrollments} icon="fa-clipboard-list" color="#f1c40f" />
                        <StatCard title="Ingresos Totales" value={formatMoney(stats.totalRevenue)} icon="fa-coins" color="#27ae60" />
                    </div>
                </section>
            )}

            {/* TAB: SOLICITUDES */}
            {activeTab === 'requests' && (
                <section>
                    <h2 style={{marginBottom:'20px'}}>Cursos Pendientes de Revisión</h2>
                    {pendingCourses.length === 0 ? <p>No hay solicitudes.</p> : 
                        pendingCourses.map(curso => (
                            <div key={curso.id} style={itemBoxStyle}>
                                <div>
                                    <h4 style={{margin:0}}>{curso.titulo}</h4>
                                    <small>Instructor: {curso.instructor?.nombre_completo} | Precio: {formatMoney(curso.precio)}</small>
                                </div>
                                <div style={{display:'flex', gap:'10px'}}>
                                    <button onClick={() => handleReviewCourse(curso.id, 'aprobar')} style={{...btnSmall, background:'#27ae60', color:'white'}}>Aprobar</button>
                                    <button onClick={() => handleReviewCourse(curso.id, 'rechazado')} style={{...btnSmall, background:'#e74c3c', color:'white'}}>Rechazar</button>
                                </div>
                            </div>
                        ))
                    }
                </section>
            )}

            {/* TAB: USUARIOS (INCLUYE RESET PASSWORD) */}
            {activeTab === 'users' && (
                <section>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                        <h2>Gestión de Usuarios</h2>
                        <input type="text" placeholder="Buscar usuario..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={searchStyle} />
                    </div>
                    <div style={tableWrapper}>
                        <table style={{width:'100%', borderCollapse:'collapse'}}>
                            <thead style={{background:'#eee'}}>
                                <tr>
                                    <th style={thStyle}>ID</th>
                                    <th style={thStyle}>Nombre / Email</th>
                                    <th style={thStyle}>Rol</th>
                                    <th style={thStyle}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(u => (
                                    <tr key={u.id} style={{borderBottom:'1px solid #eee'}}>
                                        <td style={tdStyle}>{u.id}</td>
                                        <td style={tdStyle}><strong>{u.nombre_completo}</strong><br/><small>{u.email}</small></td>
                                        <td style={tdStyle}><span style={{...roleBadge, background: u.rol==='admin'?'#e74c3c':u.rol==='instructor'?'#f39c12':'#bdc3c7'}}>{u.rol}</span></td>
                                        <td style={tdStyle}>
                                            <div style={{display:'flex', gap:'5px'}}>
                                                <button onClick={() => handleResetPassword(u.id, u.nombre_completo)} style={{...btnSmall, background:'#3498db', color:'white'}} title="Resetear Clave"><i className="fas fa-key"></i></button>
                                                {u.rol !== 'admin' && (
                                                    <>
                                                        <button onClick={() => handleChangeRole(u.id, u.rol==='instructor'?'student':'instructor')} style={btnSmall} title="Cambiar Rol"><i className="fas fa-user-edit"></i></button>
                                                        <button onClick={() => handleDeleteUser(u.id)} style={{...btnSmall, color:'#e74c3c'}} title="Eliminar"><i className="fas fa-trash-alt"></i></button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* TAB: LIQUIDACIÓN (COMPLETA) */}
            {activeTab === 'payouts' && (
                <section>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                        <h2>Liquidación a Instructores</h2>
                        <div style={{display:'flex', gap:'10px'}}>
                            <select value={selectedMonth} onChange={(e)=>setSelectedMonth(e.target.value)} style={selectStyle}>
                                {[...Array(12).keys()].map(m => <option key={m+1} value={m+1}>{new Date(0, m).toLocaleString('es', {month:'long'})}</option>)}
                            </select>
                            <select value={selectedYear} onChange={(e)=>setSelectedYear(e.target.value)} style={selectStyle}>
                                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>
                    <div style={tableWrapper}>
                        <table style={{width:'100%', borderCollapse:'collapse'}}>
                            <thead style={{background:'#2c3e50', color:'white'}}>
                                <tr>
                                    <th style={thStyle}>Instructor / Datos Banco (PY)</th>
                                    <th style={thStyle}>Ventas</th>
                                    <th style={thStyle}>Total Bruto</th>
                                    <th style={thStyle}>Neto (70%)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payouts.length === 0 ? <tr><td colSpan="4" style={{padding:'20px', textAlign:'center'}}>No hay pagos este mes.</td></tr> : 
                                    payouts.map((p, idx) => (
                                        <tr key={idx} style={{borderBottom:'1px solid #eee'}}>
                                            <td style={tdStyle}>
                                                <strong>{p.instructor.nombre}</strong><br/>
                                                <small>{p.instructor.banco} - {p.instructor.cuenta} (CI: {p.instructor.ci})</small>
                                            </td>
                                            <td style={tdStyle}>
                                                <ul style={{margin:0, paddingLeft:'15px', fontSize:'0.8em'}}>
                                                    {p.detalle.map((d, i) => <li key={i}>{d.titulo}: {d.cantidad}</li>)}
                                                </ul>
                                            </td>
                                            <td style={tdStyle}>{formatMoney(p.estadisticas.total_bruto)}</td>
                                            <td style={{...tdStyle, fontWeight:'bold', color:'#27ae60'}}>{formatMoney(p.estadisticas.total_a_pagar)}</td>
                                        </tr>
                                    ))
                                }
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* TAB: ACTIVIDAD RECIENTE */}
            {activeTab === 'activity' && (
                <section>
                    <h2 style={{marginBottom:'20px'}}>Historial de Inscripciones</h2>
                    <div style={tableWrapper}>
                        {enrollments.map(e => (
                            <div key={e.id} style={{padding:'12px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between'}}>
                                <span><strong>{e.User?.nombre_completo}</strong> compró <strong>{e.curso?.titulo}</strong></span>
                                <span style={{color:'#999'}}>{new Date(e.createdAt).toLocaleDateString()}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* TAB: MODERACIÓN DE CURSOS */}
            {activeTab === 'courses' && (
                <section>
                    <h2 style={{marginBottom:'20px'}}>Catálogo Maestro</h2>
                    <div style={{display:'grid', gap:'15px'}}>
                        {courses.map(c => (
                            <div key={c.id} style={itemBoxStyle}>
                                <div>
                                    <h4 style={{margin:0}}>{c.titulo}</h4>
                                    <p style={{margin:0, fontSize:'0.8em', color:'#666'}}>
                                        Instructor: {c.instructor?.nombre_completo} | Estado: <span style={{color: c.estado==='publicado'?'#27ae60':'#f39c12'}}>{c.estado.toUpperCase()}</span>
                                    </p>
                                </div>
                                <button onClick={() => handleDeleteCourse(c.id)} style={{...btnSmall, color:'#e74c3c', border:'1px solid #e74c3c'}}>Eliminar</button>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </main>
    </div>
  );
}

// --- ESTILOS (SISTEMA DE DISEÑO) ---
const navBtnStyle = { background: 'none', border: 'none', color: 'white', width: '100%', textAlign: 'left', padding: '12px 20px', cursor: 'pointer', display: 'flex', gap: '10px', fontSize: '0.9em', alignItems: 'center', transition: '0.3s' };
const badgeStyle = { background: '#e74c3c', color: 'white', borderRadius: '50%', padding: '2px 7px', fontSize: '0.7em', marginLeft: 'auto' };
const alertStyle = { background: '#e74c3c', color: 'white', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontWeight: 'bold', textAlign: 'center' };
const itemBoxStyle = { background: 'white', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' };
const tableWrapper = { background: 'white', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden' };
const thStyle = { padding: '12px', textAlign: 'left', fontSize: '0.9em' };
const tdStyle = { padding: '12px', fontSize: '0.9em' };
const btnSmall = { padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', border: '1px solid #ddd', background: 'white', fontSize: '0.8em' };
const roleBadge = { color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7em', fontWeight: 'bold' };
const searchStyle = { padding: '8px 15px', borderRadius: '20px', border: '1px solid #ddd', width: '250px', outline: 'none' };
const selectStyle = { padding: '8px', borderRadius: '5px', border: '1px solid #ddd' };

const StatCard = ({ title, value, icon, color }) => (
    <div style={{background:'white', padding:'20px', borderRadius:'8px', boxShadow:'0 2px 5px rgba(0,0,0,0.05)', display:'flex', alignItems:'center', gap:'15px'}}>
        <i className={`fas ${icon}`} style={{fontSize:'2em', color: color}}></i>
        <div><h4 style={{margin:0, color:'#7f8c8d', fontSize:'0.8em'}}>{title}</h4><div style={{fontSize:'1.4em', fontWeight:'bold'}}>{value}</div></div>
    </div>
);

export default AdminDashboard;