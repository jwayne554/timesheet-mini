document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram?.WebApp;
    const userInfo = document.getElementById('user-info');
    const clockInOutBtn = document.getElementById('clock-in-out');
    const managerView = document.getElementById('manager-view');
    const pendingEntriesList = document.getElementById('pending-entries');
    const messageElement = document.getElementById('message');
    const errorElement = document.getElementById('error-message');
    const timeEntriesList = document.getElementById('time-entries-list');
    const API_BASE_URL = 'https://timesheet-mini-19fe8d8112f6.herokuapp.com/api';
    const timerDisplay = document.getElementById('timer');
   
    let activeSession = null;
    let timerInterval = null;
    let userRole = localStorage.getItem('userRole');
    let isClockedIn = false;

    if (tg) {
        tg.expand();
    }

    async function checkClockInStatus() {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/timesheet/status`);
            if (!response) throw new Error('Network error');
            const data = await response.json();
            if (data.isClockedIn) {
                activeSession = data.activeSession;
                updateUIForActiveSession();
            } else {
                updateUIForClockIn();
            }
        } catch (error) {
            console.error('Error checking clock-in status:', error);
            showError('Error checking clock-in status');
        }
    }

    function updateUIForActiveSession() {
        clockInOutBtn.textContent = 'Clock Out';
        clockInOutBtn.onclick = clockOut;
        clockInOutBtn.disabled = false;
        if (timerDisplay) {
            startTimer(new Date(activeSession.clockIn).getTime());
        }
    }

    function updateUIForClockIn() {
        clockInOutBtn.textContent = 'Clock In';
        clockInOutBtn.onclick = clockIn;
        clockInOutBtn.disabled = false;
        if (timerDisplay) {
            timerDisplay.textContent = '00:00:00';
        }
    }


    async function fetchWithAuth(url, options = {}) {
        let token = localStorage.getItem('token');
        if (!token) {
            token = await authenticate();
            if (!token) return null; // Authentication failed
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
            } else {
                // Refresh failed, redirect to authentication
                await authenticate();
                return null;
            }
        }
        return response;
    }

    async function authenticate() {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/authenticate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ initData: tg.initData }),
            });

            if (!response.ok) throw new Error('Authentication failed');
            
            const data = await response.json();
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('userRole', data.user.role);
            localStorage.setItem('userName', data.user.name); // Store the user's name
            userRole = data.user.role;
            updateUserInfo(data.user.name);
            return data.token;
        } catch (error) {
            console.error('Authentication error:', error);
            showError('Authentication failed. Please try again.');
            return null;
        }
    }

    function updateUserInfo(name) {
        userInfo.textContent = `Welcome, ${name}`;
    }

    async function refreshToken() {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token }),
            });

            if (!response.ok) throw new Error('Token refresh failed');

            const data = await response.json();
            localStorage.setItem('token', data.token);
            return data.token;
        } catch (error) {
            console.error('Token refresh error:', error);
            localStorage.removeItem('token');
            return null;
        }
    }

    async function clockIn() {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/timesheet/clock-in`, {
                method: 'POST',
            });
            if (!response) throw new Error('Network error');
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Clock-in failed');

            activeSession = data.timeEntry;
            showMessage('Clocked in successfully');
            updateUIForActiveSession();
        } catch (error) {
            console.error('Clock-in error:', error);
            showError(error.message);
        }
    }

    async function clockOut() {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/timesheet/clock-out`, {
                method: 'POST',
            });
            if (!response) throw new Error('Network error');
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Clock-out failed');

            showMessage('Clocked out successfully');
            stopTimer(); // Stop the timer immediately
            updateUIForClockIn();
            fetchTimeEntries();
        } catch (error) {
            console.error('Clock-out error:', error);
            showError(error.message);
        }
    }

    function startTimer(startTime) {
        stopTimer(); // Clear any existing timer
        timerInterval = setInterval(() => {
            const now = new Date().getTime();
            const elapsed = now - startTime;
            const hours = Math.floor(elapsed / 3600000);
            const minutes = Math.floor((elapsed % 3600000) / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            timerDisplay.textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
        }, 1000);
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    function pad(number) {
        return number.toString().padStart(2, '0');
    }

    async function fetchTimeEntries() {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/timesheet/my-entries`);
            if (!response) throw new Error('Network error');
            if (!response.ok) throw new Error('Failed to fetch time entries');
            const entries = await response.json();
            renderTimeEntries(entries);
        } catch (error) {
            console.error('Error fetching time entries:', error);
            showError('Error fetching time entries');
        }
    }

    function renderTimeEntries(entries) {
        timeEntriesList.innerHTML = entries.map(entry => `
            <li>
                Clock In: ${new Date(entry.clockIn).toLocaleString()}
                Clock Out: ${entry.clockOut ? new Date(entry.clockOut).toLocaleString() : 'Not clocked out'}
                Duration: ${entry.duration ? (entry.duration / 3600).toFixed(2) + ' hours' : 'N/A'}
            </li>
        `).join('');
    }


    async function reviewEntry(entryId, status) {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/timesheet/review-entry`, {
                method: 'POST',
                body: JSON.stringify({ entryId, status }),
            });
            if (!response) throw new Error('Network error');
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Review failed');

            showMessage(data.message);
            fetchPendingEntries();
        } catch (error) {
            console.error('Error reviewing entry:', error);
            showError(error.message);
        }
    }

    function updateView() {
        if (userRole === 'manager') {
            managerView.style.display = 'block';
            clockInOutBtn.style.display = 'none';
            fetchPendingEntries();
        } else {
            managerView.style.display = 'none';
            clockInOutBtn.style.display = 'block';
        }
        updateClockButton();
    }

    function updateUserInfo(name) {
        userInfo.textContent = `Welcome, ${name}`;
    }

    function updateClockButton() {
        clockInOutBtn.textContent = isClockedIn ? 'Clock Out' : 'Clock In';
    }

    async function processPayment(entryId) {
        const amountInput = document.getElementById(`payment-amount-${entryId}`);
        const amount = parseFloat(amountInput.value);
        if (isNaN(amount) || amount <= 0) {
            showError('Invalid payment amount');
            return;
        }
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/timesheet/process-payment`, {
                method: 'POST',
                body: JSON.stringify({ entryId, amount }),
            });
            if (!response) throw new Error('Network error');
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Payment processing failed');

            showMessage(data.message);
            fetchPendingEntries();
        } catch (error) {
            console.error('Error processing payment:', error);
            showError(error.message);
        }
    }

    function showMessage(message) {
        messageElement.textContent = message;
        messageElement.style.color = '#28a745';
        messageElement.style.display = 'block';
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, 3000);
    }

    function showError(message) {
        errorElement.textContent = message;
        errorElement.style.color = '#dc3545';
        errorElement.style.display = 'block';
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 3000);
    }

    async function fetchPendingEntries() {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/timesheet/pending-entries`);
            if (!response) throw new Error('Network error');
            if (!response.ok) throw new Error('Failed to fetch pending entries');
            const entries = await response.json();
            renderPendingEntries(entries);
        } catch (error) {
            console.error('Error fetching pending entries:', error);
            showError('Error fetching pending entries');
        }
    }

    function renderPendingEntries(entries) {
        pendingEntriesList.innerHTML = entries.map(entry => `
            <li>
                ${entry.user.firstName} ${entry.user.lastName} - 
                ${new Date(entry.clockIn).toLocaleString()} to 
                ${entry.clockOut ? new Date(entry.clockOut).toLocaleString() : 'Not clocked out'}
                <div class="entry-actions">
                    <button class="approve-btn" onclick="reviewEntry('${entry._id}', 'approved')">Approve</button>
                    <button class="reject-btn" onclick="reviewEntry('${entry._id}', 'rejected')">Reject</button>
                </div>
                <div class="payment-input">
                    <input type="number" id="payment-amount-${entry._id}" placeholder="Payment amount">
                    <button onclick="processPayment('${entry._id}')">Process Payment</button>
                </div>
            </li>
        `).join('');
    }

    async function init() {
        const token = localStorage.getItem('token');
        if (!token) {
            const newToken = await authenticate();
            if (!newToken) {
                showError('Authentication failed. Please try again.');
                return;
            }
        } else {
            // If token exists, try to get the user name from localStorage
            const userName = localStorage.getItem('userName');
            if (userName) {
                updateUserInfo(userName);
            } else {
                // If userName is not in localStorage, you might want to fetch it from the server
                // or re-authenticate the user
                await authenticate();
            }
        }
        
        await checkClockInStatus();
        fetchTimeEntries();
    }

    init();
});