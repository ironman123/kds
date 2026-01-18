import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
    baseURL: 'http://localhost:3000/api', // Your Backend URL
    headers: { 'Content-Type': 'application/json' },
});

// Attach Token if it exists
api.interceptors.request.use((config) =>
{
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Handle Errors Globally
api.interceptors.response.use(
    (response) => response,
    (error) =>
    {
        const message = error.response?.data?.error || "Connection Error";
        if (error.response?.status === 401)
        {
            // Auto-logout on 401
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        toast.error(message);
        return Promise.reject(error);
    }
);

export default api;