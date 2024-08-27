document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('admin-login-form');
    const errorMessage = document.getElementById('error-message');
  
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
  
      console.log('Attempting login with:', { username, password });
  
      try {
        const response = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
  
        console.log('Response status:', response.status);
  
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(errorText || 'Login failed');
        }
  
        const data = await response.json();
        localStorage.setItem('adminToken', data.token);
        window.location.href = data.redirect || '/admin/dashboard';
      } catch (error) {
        console.error('Login error:', error);
        errorMessage.textContent = error.message;
      }
    });
  });