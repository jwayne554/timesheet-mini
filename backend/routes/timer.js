document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram?.WebApp;
    const userInfo = document.getElementById('user-info');
    const timerDisplay = document.getElementById('timer');
    const clockOutBtn = document.getElementById('clock-out-btn');
    const API_BASE_URL = 'https://timesheet-mini-19fe8d8112f6.herokuapp.com/api/timesheet';

    let startTime = localStorage.getItem('startTime');
    let timerInterval;

    if (tg) {
        tg.expand();
    }

    async function refreshToken() {
        try {
          const response = await fetch(`${API_BASE_URL}/refresh-token`, {
            method: 'POST',
            credentials: 'include',
          });
          if (!response.ok) throw new Error('Token refresh failed');
          return true; // Token refresh successful
        } catch (error) {
          console.error('Error refreshing token:', error);
          showError('Authentication failed. Please try again.');
          return false;
        }
      }

    async function fetchWithAuth(url, options = {}) {
        let token = localStorage.getItem('token');
        if (!token) {
            token = await refreshToken();
            if (!token) {
                // Redirect to login or handle authentication failure
                window.location.href = 'index.html';
                return null;
            }
        }
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
        const response = await fetch(url, options);
        if (response.status === 401) {
            // Token might be expired, try to refresh
            token = await refreshToken();
            if (token) {
                // Retry the original request with the new token
                options.headers['Authorization'] = `Bearer ${token}`;
                return fetch(url, options);
            }
        }
        return response;
    }

    function updateUserInfo() {
        let name = 'Test User';
        if (tg && tg.initDataUnsafe.user) {
            const { first_name, last_name } = tg.initDataUnsafe.user;
            name = `${first_name} ${last_name || ''}`;
        }
        userInfo.textContent = `Welcome, ${name}`;
    }

    function startTimer() {
        if (!startTime) {
            startTime = new Date().getTime();
            localStorage.setItem('startTime', startTime);
        }

        function updateTimer() {
            const now = new Date().getTime();
            const elapsed = now - startTime;
            const hours = Math.floor(elapsed / 3600000);
            const minutes = Math.floor((elapsed % 3600000) / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            timerDisplay.textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
        }

        updateTimer();
        timerInterval = setInterval(updateTimer, 1000);
    }


    function pad(number) {
        return number.toString().padStart(2, '0');
    }

    async function clockOut() {
        try {
            showLoading(true);
            const response = await fetchWithAuth(`${API_BASE_URL}/clock-out`, {
                method: 'POST',
            });

            if (!response) throw new Error('Network error');
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Clock-out failed');

            clearInterval(timerInterval);
            localStorage.removeItem('startTime');
            showMessage(data.message);

            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } catch (error) {
            console.error('Clock-out error:', error);
            showError(error.message || 'An error occurred. Please try again.');
        } finally {
            showLoading(false);
        }
    }

    function showMessage(message) {
        const messageElement = document.getElementById('message');
        messageElement.textContent = message;
        messageElement.style.color = '#28a745';
        messageElement.style.display = 'block';
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, 3000);
    }

    function showError(message) {
        const errorElement = document.getElementById('error-message');
        errorElement.textContent = message;
        errorElement.style.color = '#dc3545';
        errorElement.style.display = 'block';
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 3000);
    }

    function showLoading(isLoading) {
        clockOutBtn.disabled = isLoading;
        clockOutBtn.textContent = isLoading ? 'Processing...' : 'Clock Out';
    }

    function init() {
        updateUserInfo();
        startTimer();
        clockOutBtn.style.display = 'block';
    }

    clockOutBtn.addEventListener('click', clockOut);

    init();
});

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && startTime) {
            // Page is now visible, update the timer immediately
            clearInterval(timerInterval);
            startTimer();
        }
    });