import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import
{
    LayoutDashboard,
    UtensilsCrossed,
    ChefHat,
    Users,
    LogOut,
    Menu,
    List,
    Layers
} from 'lucide-react';
import useUserStore from '../store/userStore';
import clsx from 'clsx';
import '../styles/dashboard.css'; // We will create this next

export default function DashboardLayout()
{
    const { user, logout } = useUserStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setSidebarOpen] = useState(true);

    const handleLogout = () =>
    {
        if (confirm('Log out of this session?'))
        {
            logout();
            navigate('/login');
        }
    };

    // Define navigation items based on role
    const navItems = [
        {
            label: 'New Order',
            icon: <UtensilsCrossed size={20} />,
            path: '/dashboard',
            roles: ['OWNER', 'MANAGER', 'CAPTAIN', 'WAITER']
        },
        {
            label: 'Kitchen (KDS)',
            icon: <ChefHat size={20} />,
            path: '/dashboard/kds',
            roles: ['OWNER', 'MANAGER', 'CHEF']
        },
        {
            label: 'Categories',
            icon: <Layers size={20} />,
            path: '/dashboard/category',
            roles: ['OWNER', 'MANAGER', 'CHEF', 'WAITER', 'CAPTAIN']
        },
        {
            label: 'Menu Items',
            icon: <List size={20} />,
            path: '/dashboard/items',
            roles: ['OWNER', 'MANAGER', 'CHEF', 'WAITER', 'CAPTAIN']
        },
        {
            label: 'Staff',
            icon: <Users size={20} />,
            path: '/dashboard/staff',
            roles: ['OWNER', 'MANAGER']
        },
        {
            label: 'Settings',
            icon: <LayoutDashboard size={20} />,
            path: '/dashboard/settings',
            roles: ['OWNER']
        }
    ];

    return (
        <div className="dashboard-container">
            {/* SIDEBAR */}
            <aside className={clsx("sidebar", { "closed": !isSidebarOpen })}>
                <div className="sidebar-header">
                    <div className="brand-icon">🍔</div>
                    {isSidebarOpen && <h2 className="brand-text">Bistro POS</h2>}
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) =>
                    {
                        // Role Check: Only show if user has permission
                        if (!item.roles.includes(user?.role)) return null;

                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={clsx("nav-item", {
                                    "active": location.pathname === item.path
                                })}
                            >
                                {item.icon}
                                {isSidebarOpen && <span>{item.label}</span>}
                            </button>
                        );
                    })}
                </nav>

                {/* USER PROFILE & LOGOUT */}
                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="avatar">{user?.name?.charAt(0)}</div>
                        {isSidebarOpen && (
                            <div className="user-details">
                                <span className="user-name">{user?.name}</span>
                                <span className="user-role">{user?.role}</span>
                            </div>
                        )}
                    </div>
                    <button onClick={handleLogout} className="logout-btn">
                        <LogOut size={20} />
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="main-content">
                <header className="top-bar">
                    <button
                        className="toggle-btn"
                        onClick={() => setSidebarOpen(!isSidebarOpen)}
                    >
                        <Menu size={24} />
                    </button>
                    <h1 className="page-title">
                        {/* Simple logic to show current page title */}
                        {navItems.find(i => i.path === location.pathname)?.label || 'Dashboard'}
                    </h1>
                    <div className="branch-badge">
                        📍 {user?.branch_id || 'Global'}
                    </div>
                </header>

                <div className="content-scroll">
                    {/* This is where your POS Grid or KDS will appear */}
                    <Outlet />
                </div>
            </main>
        </div>
    );
}