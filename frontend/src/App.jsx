import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import RegisterEmployer from './pages/RegisterEmployer';
import RegisterWorker from './pages/RegisterWorker';
import WorkerOnboarding from './pages/WorkerOnboarding';
import WorkerDashboard from './pages/WorkerDashboard';
import EmployerDashboard from './pages/EmployerDashboard';
import WorkerProfile from './pages/WorkerProfile';
import WorkerSettings from './pages/WorkerSettings';
import WorkerFindJobs from './pages/WorkerFindJobs';
import EmployerProfile from './pages/EmployerProfile';
import EmployerSettings from './pages/EmployerSettings';
import EmployerPostJob from './pages/EmployerPostJob';
import WorkerPublicProfile from './pages/WorkerPublicProfile';
import AdminDashboard from './pages/AdminDashboard';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register-employer" element={<RegisterEmployer />} />
        <Route path="/register-worker" element={<RegisterWorker />} />
        <Route path="/worker-onboarding" element={<WorkerOnboarding />} />
        <Route path="/worker-dashboard" element={<WorkerDashboard />} />
        <Route path="/worker-profile" element={<WorkerProfile />} />
        <Route path="/worker-settings" element={<WorkerSettings />} />
        <Route path="/worker-find-jobs" element={<WorkerFindJobs />} />
        <Route path="/employer-dashboard" element={<EmployerDashboard />} />
        <Route path="/employer-profile" element={<EmployerProfile />} />
        <Route path="/employer-settings" element={<EmployerSettings />} />
        <Route path="/employer-post-job" element={<EmployerPostJob />} />
        <Route path="/worker/:id" element={<WorkerPublicProfile />} />
        
        {/* Password Reset Routes */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Admin Routes */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
