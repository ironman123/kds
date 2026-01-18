import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useUserStore from './store/userStore';

// Pages
import LoginPage from './pages/LoginPage';

// Placeholder Dashboard (We will build this next)
const Dashboard = () => (
  <div style={{ padding: '2rem' }}>
    <h1>Dashboard</h1>
    <p>Welcome to the secure area.</p>
    <button onClick={() => window.location.reload()}>Refresh</button>
  </div>
);

// 🔒 Protected Route Component
const ProtectedRoute = ({ children }) =>
{
  const { isAuthenticated } = useUserStore();

  if (!isAuthenticated)
  {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default function App()
{
  const { isAuthenticated } = useUserStore();

  return (
    <BrowserRouter>
      {/* Global Notifications */}
      <Toaster position="top-right" />

      <Routes>
        {/* Public Login Route */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />}
        />

        {/* Protected Dashboard Route */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Protected Default Route */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Navigate to="/dashboard" />
            </ProtectedRoute>
          }
        />

        {/* Catch-all Redirect */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}