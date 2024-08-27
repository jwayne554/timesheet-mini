document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('admin-login-form');
    const errorMessage = document.getElementById('error-message');
  
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
      
        console.log('Attempting login with:', { username, password }); // Add this line
      
        try {
          const response = await fetch('https://timesheet-mini-19fe8d8112f6.herokuapp.com/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
          });
      
          console.log('Response status:', response.status); // Add this line
      
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText); // Add this line
            throw new Error(errorText || 'Login failed');
          }
      
          const data = await response.json();
          localStorage.setItem('adminToken', data.token);
          window.location.href = 'admin-dashboard.html';
        } catch (error) {
          console.error('Login error:', error);
          document.getElementById('error-message').textContent = error.message;
        }
      });
  });