document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram?.WebApp;
    const userInfo = document.getElementById('user-info');
    const timerDisplay = document.getElementById('timer');
    const clockOutBtn = document.getElementById('clock-out-btn');
    const API_BASE_URL = 'https://timesheet-mini-19fe8d8112f6.herokuapp.com/api/timesheet';

    let token = localStorage.getItem('token');
    let startTime = localStorage.getItem('startTime');
    let timerInterval;

    if (tg) {
        tg.expand();
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

        timerInterval = setInterval(updateTimer, 1000);
    }

    function updateTimer() {
        const currentTime = new Date().getTime();
        const elapsedTime = currentTime - startTime;
        const hours = Math.floor(elapsedTime / 3600000);
        const minutes = Math.floor((elapsedTime % 3600000) / 60000);
        const seconds = Math.floor((elapsedTime % 60000) / 1000);

        timerDisplay.textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }

    function pad(number) {
        return number.toString().padStart(2, '0');
    }

    async function clockOut() {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/clock-out`, {
                method: 'POST',
                body: JSON.stringify({
                    startTime: parseInt(startTime),
                    endTime: new Date().getTime()
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'An error occurred');
            }

            clearInterval(timerInterval);
            localStorage.removeItem('startTime');
            showMessage(data.message);
            
            // Redirect back to the main page
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } catch (error) {
            console.error('Error:', error);
            showError('An error occurred. Please try again.');
        }
    }

    async function fetchWithAuth(url, options = {}) {
        if (!token) {
            // Redirect to login or handle authentication
            window.location.href = 'index.html';
            return;
        }
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
        return fetch(url, options);
    }

    function showMessage(message) {
        const messageElement = document.getElementById('message');
        messageElement.textContent = message;
        messageElement.style.color = '#28a745';
        setTimeout(() => {
            messageElement.textContent = '';
        }, 3000);
    }

    function showError(message) {
        const errorElement = document.getElementById('error-message');
        errorElement.textContent = message;
        errorElement.style.color = '#dc3545';
        setTimeout(() => {
            errorElement.textContent = '';
        }, 3000);
    }

    updateUserInfo();
    startTimer();

    clockOutBtn.addEventListener('click', clockOut);
});