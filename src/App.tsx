import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedLayout } from './components/layout/ProtectedLayout';
import { Login } from './pages/Login';
import { DashboardHome } from './pages/Dashboard';
import { Members } from './pages/Members';
import { Schedule } from './pages/Schedule';
import { Payments } from './pages/Payments';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<DashboardHome />} />
            {/* Rutas Admin */}
            <Route path="/members" element={<Members />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/payments" element={<Payments />} />

            {/* Rutas Cliente */}
            <Route path="/my-schedule" element={<Schedule />} />
            <Route path="/profile" element={<div className="p-4">Mi Perfil (Próximamente)</div>} />

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
