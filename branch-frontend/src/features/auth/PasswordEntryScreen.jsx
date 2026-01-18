import { useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import useUserStore from '../../store/userStore';

export default function PasswordEntryScreen({ selectedUser, onBack })
{
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useUserStore();

  const handleLogin = async (e) =>
  {
    e.preventDefault();
    setLoading(true);

    try
    {
      const res = await api.post('/auth/login', {
        username: selectedUser.username,
        password: password
      });

      const { user, token, requirePasswordChange } = res.data;

      if (requirePasswordChange)
      {
        toast.error("Password change required (Feature coming soon)");
        // For now, just log them in or show a different screen
        return;
      }

      // Success: Save to store -> App.jsx will auto-redirect to Dashboard
      login(user, token);
      toast.success(`Welcome back, ${user.name}`);

    } catch (err)
    {
      console.error(err);
      toast.error("Incorrect Password");
    } finally
    {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Back Button */}
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            color: '#64748b',
            marginBottom: '1.5rem',
            padding: 0
          }}
        >
          <ArrowLeft size={20} /> <span style={{ marginLeft: '8px' }}>Back to users</span>
        </button>

        <div className="user-card" style={{ cursor: 'default' }}>
          <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem' }}>
            Hello, <span style={{ color: 'var(--primary)' }}>{selectedUser.name}</span>
          </h2>

          <form onSubmit={handleLogin}>
            <input
              type="password"
              autoFocus
              placeholder="Enter Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '1rem',
                fontSize: '1.2rem',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                outline: 'none'
              }}
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '1rem',
                background: 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}