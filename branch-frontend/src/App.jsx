import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useUserStore from './store/userStore';

import LoginPage from './pages/LoginPage';
import DashboardLayout from './layouts/DashboardLayout';
import StaffManagement from './features/staff/StaffManagement';
import CategoryManagement from './features/menu/categoryManagement';
import MenuItemManagement from './features/menu/menuItemManagement';

// Placeholder Pages (We will replace 'OrderInterface' next)
const OrderInterface = () => <h2>🍔 Taking Orders (POS)</h2>;
const KitchenDisplay = () => <h2>👨‍🍳 Kitchen View (KDS)</h2>;
const Settings = () => <h2>⚙️ Settings</h2>;

const ProtectedRoute = ({ children }) =>
{
  const { isAuthenticated } = useUserStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

export default function App()
{
  const { isAuthenticated } = useUserStore();

  return (
    <BrowserRouter>
      <Toaster position="top-right" />

      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />

        {/* PROTECTED DASHBOARD ROUTES */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          {/* Default view: Taking Orders */}
          <Route index element={<OrderInterface />} />

          <Route path="kds" element={<KitchenDisplay />} />
          <Route path="category" element={<CategoryManagement />} />
          <Route path="items" element={<MenuItemManagement />} />

          <Route path="staff" element={<StaffManagement />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}