export class AuthManager {
    constructor(app) {
        this.app = app;
        this.token = sessionStorage.getItem('adminToken');
        this.userData = JSON.parse(sessionStorage.getItem('userData') || 'null');
        
        // Bind event listeners
        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('loginBtn')?.addEventListener('click', () => this.showLoginForm());
        document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());
    }

    isAuthenticated() {
        return !!this.token;
    }

    async login(username, password) {
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                throw new Error('Login failed');
            }

            const data = await response.json();
            this.setAuthData(data);
            
            document.body.dataset.auth = 'admin';
            await this.app.admin.init();
            await this.app.vinyl.loadVinyls();
            
            return true;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    logout() {
        sessionStorage.removeItem('adminToken');
        sessionStorage.removeItem('userData');
        this.token = null;
        this.userData = null;
        document.body.dataset.auth = 'guest';
        location.reload();
    }

    setAuthData(data) {
        this.token = data.token;
        this.userData = data.user;
        sessionStorage.setItem('adminToken', data.token);
        sessionStorage.setItem('userData', JSON.stringify(data.user));
    }

    getAuthHeaders() {
        return this.token ? {
            'Authorization': `Bearer ${this.token}`
        } : {};
    }

    showLoginForm() {
        this.app.modal.showAuthModal();
    }

    async register(userData) {
        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Registration failed');
            }

            return true;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }
} 