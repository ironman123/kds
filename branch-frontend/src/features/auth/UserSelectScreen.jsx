import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import api from '../../api/client';
import '../../styles/pos.css';

export default function UserSelectScreen({ onUserSelect })
{
    const [users, setUsers] = useState([]);

    useEffect(() =>
    {
        api.get('/auth/directory')
            .then(res => setUsers(res.data))
            .catch(console.error);
    }, []);

    return (
        <div className="login-container">
            {/* Header Icon */}
            <div style={{
                background: 'var(--primary)',
                padding: '16px',
                borderRadius: '50%',
                marginBottom: '24px'
            }}>
                <Building2 color="white" size={32} />
            </div>

            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Kitchen Display System
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
                Select a user to login
            </p>

            <div className="user-grid">
                {users.map((user) => (
                    <button
                        key={user.id}
                        className="user-card"
                        onClick={() => onUserSelect(user)}
                    >
                        <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{user.name}</div>
                        <div className="role-badge">{user.role}</div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '8px' }}>
                            {user.branch_id}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}