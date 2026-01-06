import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext'; 
import { formatCurrency } from '../utils/formatCurrency';

function InstructorPanel() {
  const { user, logout, token } = useAuth();
  const API_URL = import.meta.env.VITE_API_BASE_URL;
  
  const [activeTab, setActiveTab] = useState('cursos');
  const [cursos, setCursos] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Estado para datos frescos del usuario
  const [instructorData, setInstructorData] = useState(user);

  // Estado para formulario de datos bancarios
  const [bankData, setBankData] = useState({
    banco_nombre: '',
    numero_cuenta: '',
    titular_cuenta: '',
    cedula_identidad: '',
    alias_bancario: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Cargar Cursos
        const resCursos = await axios.get(`${API_URL}/cursos/instructor`, { headers: { Authorization: `Bearer ${token}` } });
        setCursos(resCursos.data.cursos);

        // 2. Cargar Estadísticas
        const resStats = await axios.get(`${API_URL}/cursos/instructor/stats`, { headers: { Authorization: `Bearer ${token}` } });
        setStats(resStats.data);
        
        // 3. Cargar Perfil Actualizado
        const resPerfil = await axios.get(`${API_URL}/usuario/perfil`, { headers: { Authorization: `Bearer ${token}` } });
        setInstructorData(resPerfil.data);

        // 4. Pre-cargar datos bancarios si ya existen
        setBankData({
            banco_nombre: resPerfil.data.banco_nombre || '',
            numero_cuenta: resPerfil.data.numero_cuenta || '',
            titular_cuenta: resPerfil.data.titular_cuenta || '',
            cedula_identidad: resPerfil.data.cedula_identidad || '',
            alias_bancario: resPerfil.data.alias_bancario || ''
        });

      } catch (error) {
        console.error("Error datos instructor:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (token) fetchData();
  }, [token, API_URL]);

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

  // 🏦 FUNCIÓN PARA GUARDAR DATOS BANCARIOS
  const handleUpdateBankData = async (e) => {
    e.preventDefault();
    try {
        await axios.put(`${API_URL}/usuario/datos-bancarios`, bankData, {
            headers: { Authorization: `Bearer ${token}` }
        });
        alert("¡Datos bancarios actualizados con éxito!");
    } catch (error) {
        console.error(error);
        alert("Error al guardar los datos bancarios.");
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
                <div className="profile-avatar-sidebar">
                    {instructorData?.foto_perfil ? (
                        <img src={instructorData.foto_perfil} alt="Perfil" />
                    ) : (
                        <span style={{fontSize:'2.5em', color:'white', fontWeight:'bold'}}>
                            {instructorData?.nombre_completo?.charAt(0).toUpperCase()}
                        </span>
                    )}
                </div>
                <h4>{instructorData?.nombre_completo}</h4>
                <p>Instructor</p>
            </div>

            <nav className="dashboard-nav">
                <ul>
                    <li><button onClick={() => setActiveTab('cursos')} className={activeTab==='cursos'?'active':''} style={navBtnStyle}><i className="fas fa-chalkboard-teacher"></i> Mis Cursos</button></li>
                    <li><button onClick={() => setActiveTab('analiticas')} className={activeTab==='analiticas'?'active':''} style={navBtnStyle}><i className="fas fa-chart-bar"></i> Analíticas</button></li>
                    {/* 🟢 NUEVO BOTÓN */}
                    <li><button onClick={() => setActiveTab('pagos')} className={activeTab==='pagos'?'active':''} style={navBtnStyle}><i className="fas fa-money-check-alt"></i> Datos Bancarios</button></li>
                    
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
                                        <p className="course-status published">Precio: {formatCurrency(curso.precio)}</p>
                                        <div className="stats"><span>{curso.categoria}</span></div>
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
                                        <td style={{padding:'10px', color:'#27ae60', fontWeight:'bold'}}>{formatCurrency(d.ingresos)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* 🟢 VISTA DE DATOS BANCARIOS */}
            {activeTab === 'pagos' && (
                <div style={{maxWidth:'600px', margin:'0 auto'}}>
                    <header className="content-header"><h2>Configuración de Pagos</h2></header>
                    <div style={{background:'white', padding:'30px', borderRadius:'8px', boxShadow:'0 2px 10px rgba(0,0,0,0.05)'}}>
                        <p style={{marginBottom:'20px', color:'#666'}}>
                            <i className="fas fa-info-circle" style={{color:'#3498db'}}></i> Ingresa aquí los datos de tu cuenta bancaria para recibir tus ganancias mensuales.
                        </p>
                        <form onSubmit={handleUpdateBankData}>
                            <div className="form-group">
                                <label>Nombre del Banco / Financiera</label>
                                <input type="text" value={bankData.banco_nombre} onChange={e => setBankData({...bankData, banco_nombre: e.target.value})} placeholder="Ej: Banco Familiar, Itaú, Visión..." />
                            </div>
                            <div className="form-group">
                                <label>N° de Cuenta</label>
                                <input type="text" value={bankData.numero_cuenta} onChange={e => setBankData({...bankData, numero_cuenta: e.target.value})} placeholder="Ej: 123456789" />
                            </div>
                            <div className="form-group">
                                <label>Titular de la Cuenta</label>
                                <input type="text" value={bankData.titular_cuenta} onChange={e => setBankData({...bankData, titular_cuenta: e.target.value})} placeholder="Nombre completo del titular" />
                            </div>
                            <div className="form-group">
                                <label>Cédula de Identidad (Titular)</label>
                                <input type="text" value={bankData.cedula_identidad} onChange={e => setBankData({...bankData, cedula_identidad: e.target.value})} placeholder="Ej: 4.500.000" />
                            </div>
                            <div className="form-group">
                                <label>Alias Bancario (Opcional)</label>
                                <input type="text" value={bankData.alias_bancario} onChange={e => setBankData({...bankData, alias_bancario: e.target.value})} placeholder="Ej: lucas.ita.u" />
                            </div>
                            <button type="submit" className="btn-submit-course" style={{background:'#27ae60'}}>
                                <i className="fas fa-save"></i> Guardar Datos Bancarios
                            </button>
                        </form>
                    </div>
                </div>
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