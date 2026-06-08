// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';
// For production, change to your deployed backend URL:
// const API_BASE_URL = 'https://your-backend.vercel.app/api';

// Auth token storage
function getToken() {
    return localStorage.getItem('quantum_finance_token');
}

function setToken(token) {
    localStorage.setItem('quantum_finance_token', token);
}

function removeToken() {
    localStorage.removeItem('quantum_finance_token');
}

function isLoggedIn() {
    return !!getToken();
}

// API helper
async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    const token = getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
        ...options,
        headers
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || `API错误: ${response.status}`);
    }
    
    return data;
}

// Auth API
async function register(username, password) {
    const data = await apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password })
    });
    setToken(data.token);
    return data;
}

async function login(username, password) {
    const data = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
    });
    setToken(data.token);
    return data;
}

async function getMe() {
    return await apiCall('/auth/me');
}

// Modeling API
async function createModeling(query) {
    return await apiCall('/modeling', {
        method: 'POST',
        body: JSON.stringify({ query })
    });
}

async function getHistory() {
    return await apiCall('/history');
}

async function getHistoryItem(id) {
    return await apiCall(`/history/${id}`);
}
