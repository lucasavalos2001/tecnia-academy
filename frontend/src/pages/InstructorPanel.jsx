import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext'; 
import { formatCurrency } from '../utils/formatCurrency'; // ✅ Importamos el formateador

function InstructorPanel() {
  const { user, logout, token } = useAuth();
  const API_URL = import.meta.env.VITE_API_BASE_URL;
  
  const [activeTab, setActiveTab] = useState('cursos');
  const [cursos, setCursos] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const resCursos = await axios.get(`${API_URL}/cursos/instructor`, { headers: { Authorization: `Bearer ${token}` } });
        setCursos(resCursos.data.cursos);

        const resStats = await axios.get(`${API_URL}/cursos/instructor/stats`, { headers: { Authorization: `Bearer ${token}` } });
        setStats(resStats.data);
      } catch (error) {
        console.error("Error datos instructor:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (token) fetchData();
  }, [token]);

  const handleDelete = async (cursoId) => {
      if (confirm("¿Estás seguro de que quieres eliminar este curso?")) {
          try {
            await axios.delete(`${API_URL}/cursos/${cursoId}`, { headers: { Authorization: `Bearer ${token}` } });
            setCursos(cursos.filter(c => c.id !== cursoId));
            alert("Curso eliminado.");
          } catch (error) {
            alert("Error al eliminar.");
          }
      }
  };

  return (
    <div className="instructor-dashboard">
        <aside className="dashboard-sidebar">
            <Link to="/" className="dashboard-logo-link">
                <div className="logo">
                    <span className="logo-tecnia">Tecnia</span><span className="logo-academy">Academy</span>
                </div>
            </Link>
            <div className="instructor-profile">
                <div style={{width:'60px', height:'60px', background:'#00d4d4', borderRadius:'50%', margin:'0 auto 10px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5em', color:'white'}}>
                    {user?.nombre_completo.charAt(0).toUpperCase()}
                </div>
                <h4>{user?.nombre_completo}</h4>
                <p style={{fontSize:'0.8rem', color:'rgba(255,255,255,0.7)'}}>Instructor</p>
            </div>
            <nav className="dashboard-nav">
                <ul>
                    <li><button onClick={() => setActiveTab('cursos')} className={activeTab==='cursos'?'active':''} style={navBtnStyle}><i className="fas fa-chalkboard-teacher"></i> Mis Cursos</button></li>
                    <li><button onClick={() => setActiveTab('analiticas')} className={activeTab==='analiticas'?'active':''} style={navBtnStyle}><i className="fas fa-chart-bar"></i> Analíticas</button></li>
                    <li className="logout-link"><button onClick={logout} style={navBtnStyle}><i className="fas fa-sign-out-alt"></i> Cerrar Sesión</button></li>
                </ul>
            </nav>
        </aside>

        <main className="dashboard-content">
            {/* VISTA DE CURSOS */}
            {activeTab === 'cursos' && (
                <>
                    <header className="content-header">
                        <h2>Mis Cursos Creados</h2>
                        <Link to="/crear-curso" className="btn-create-course"><i className="fas fa-plus"></i> Crear Nuevo Curso</Link>
                    </header>
                    
                    <div className="course-list">
                        {loading ? <p>Cargando...</p> : cursos.length === 0 ? <p>No tienes cursos aún.</p> : (
                            cursos.map((curso) => (
                                <div className="course-item" key={curso.id}>
                                    <img src={curso.imagen_url || `https://placehold.co/150x90/9b59b6/ffffff?text=${curso.categoria}`} alt="Miniatura" />
                                    <div className="course-info">
                                        <h3>{curso.titulo}</h3>
                                        
                                        {/* ✅ PRECIO EN GUARANÍES */}
                                        <p className="course-status published">Precio: {formatCurrency(curso.precio)}</p>
                                        
                                        <div className="stats">
                                            <span>{curso.categoria}</span>
                                        </div>
                                    </div>
                                    <div className="course-actions">
                                        <Link to={`/gestionar-contenido/${curso.id}`} className="btn-action manage">Gestionar</Link>
                                        <Link to={`/editar-curso/${curso.id}`} className="btn-action edit">Editar</Link>
                                        <button onClick={() => handleDelete(curso.id)} className="btn-action delete">Eliminar</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            {/* VISTA DE ANALÍTICAS */}
            {activeTab === 'analiticas' && stats && (
                <>
                    <header className="content-header"><h2>Rendimiento</h2></header>
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px'}}>
                        <StatBox title="Total Estudiantes" value={stats.totalEstudiantes} icon="fa-users" color="#3498db" />
                        
                        {/* ✅ INGRESOS EN GUARANÍES */}
                        <StatBox title="Ingresos Totales" value={formatCurrency(stats.totalIngresos)} icon="fa-dollar-sign" color="#27ae60" />
                        
                        <StatBox title="Cursos Activos" value={stats.totalCursos} icon="fa-book" color="#9b59b6" />
                    </div>
                    
                    <div style={{background:'white', padding:'20px', borderRadius:'8px'}}>
                        <h3>Desglose por Curso</h3>
                        <table style={{width:'100%', marginTop:'15px', borderCollapse:'collapse'}}>
                            <thead>
                                <tr style={{textAlign:'left', borderBottom:'2px solid #eee'}}>
                                    <th style={{padding:'10px'}}>Curso</th>
                                    <th style={{padding:'10px'}}>Alumnos</th>
                                    <th style={{padding:'10px'}}>Ingresos</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.desglose.map((d, i) => (
                                    <tr key={i} style={{borderBottom:'1px solid #eee'}}>
                                        <td style={{padding:'10px'}}>{d.titulo}</td>
                                        <td style={{padding:'10px'}}>{d.alumnos}</td>
                                        {/* ✅ DESGLOSE EN GUARANÍES */}
                                        <td style={{padding:'10px', color:'#27ae60', fontWeight:'bold'}}>{formatCurrency(d.ingresos)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </main>
    </div>
  );
}

const navBtnStyle = { background: 'none', border: 'none', color: 'white', width: '100%', textAlign: 'left', padding: '15px', cursor: 'pointer', fontSize: '1em', display:'flex', gap:'10px', alignItems:'center' };
const StatBox = ({ title, value, icon, color }) => (
    <div style={{background:'white', padding:'20px', borderRadius:'8px', boxShadow:'0 2px 5px rgba(0,0,0,0.05)', textAlign:'center'}}>
        <i className={`fas ${icon}`} style={{fontSize:'2em', color: color, marginBottom:'10px'}}></i>
        <h3 style={{margin:0, color:'#7f8c8d'}}>{title}</h3>
        <div style={{fontSize:'1.8em', fontWeight:'bold', color:'#2c3e50'}}>{value}</div>
    </div>
);

export default InstructorPanel;