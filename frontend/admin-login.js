document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('admin-login-form');
    const errorMessage = document.getElementById('error-message');
  
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
  
      try {
        const response = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
  
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || 'Login failed');
        }
  
        const data = await response.json();
        localStorage.setItem('adminToken', data.token);
        window.location.href = data.redirect;
      } catch (error) {
        console.error('Login error:', error);
        errorMessage.textContent = error.message;
      }
    });
  });