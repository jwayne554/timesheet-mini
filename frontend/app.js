document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram?.WebApp;
    const userInfo = document.getElementById('user-info');
    const clockInOutBtn = document.getElementById('clock-in-out');
    const managerView = document.getElementById('manager-view');
    const pendingEntriesList = document.getElementById('pending-entries');
    const API_BASE_URL = 'https://timesheet-mini-19fe8d8112f6.herokuapp.com/api/timesheet';

    let userRole = localStorage.getItem('userRole');
    let isClockedIn = false;

    if (tg) {
        tg.expand();
    }

    async function refreshToken() {
        try {
            const response = await fetch(`${API_BASE_URL}/refresh-token`, {
                method: 'POST',
                credentials: 'include', // This will send the HTTP-only cookie
            });
            if (!response.ok) throw new Error('Token refresh failed');
            const data = await response.json();
            localStorage.setItem('token', data.token);
            return data.token;
        } catch (error) {
            console.error('Error refreshing token:', error);
            showError('Authentication failed. Please try again.');
            // Redirect to login or handle authentication failure
            return null;
        }
    }

    async function fetchWithAuth(url, options = {}) {
        let token = localStorage.getItem('token');
        if (!token) {
            token = await refreshToken();
            if (!token) return null; // Handle authentication failure
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

    async function authenticate() {
        let userData;
        if (tg && tg.initDataUnsafe.user) {
            userData = tg.initDataUnsafe.user;
        } else {
            console.log('Using mock data for testing');
            userData = { id: 12345, first_name: 'Test', last_name: 'User' };
        }

        try {
            const response = await fetch(`${API_BASE_URL}/authenticate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    telegramId: userData.id,
                    firstName: userData.first_name,
                    lastName: userData.last_name,
                }),
            });
            if (!response.ok) {
                throw new Error('Authentication failed');
            }
            const data = await response.json();
            localStorage.setItem('token', data.token);
            localStorage.setItem('userRole', data.role);
            userRole = data.role;
            return data.token;
        } catch (error) {
            console.error('Authentication error:', error);
            showError('Authentication failed. Please try again.');
            return null;
        }
    }

    async function clockIn() {
        let userData;
        if (tg && tg.initDataUnsafe.user) {
            userData = tg.initDataUnsafe.user;
        } else {
            userData = { id: 12345, first_name: 'Test', last_name: 'User' };
        }

        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/clock-in`, {
                method: 'POST',
                body: JSON.stringify({
                    telegramId: userData.id,
                    firstName: userData.first_name,
                    lastName: userData.last_name,
                }),
            });
            if (!response) throw new Error('Network error');
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Clock-in failed');
            
            localStorage.setItem('startTime', data.timeEntry.clockIn);
            showMessage('Clocked in successfully');
            window.location.href = 'timer.html';
        } catch (error) {
            console.error('Clock-in error:', error);
            showError(error.message);
        }
    }

    async function clockOut() {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/clock-out`, {
                method: 'POST',
            });
            if (!response) throw new Error('Network error');
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Clock-out failed');
            
            localStorage.removeItem('startTime');
            showMessage('Clocked out successfully');
            isClockedIn = false;
            updateClockButton();
        } catch (error) {
            console.error('Clock-out error:', error);
            showError(error.message);
        }
    }

    async function reviewEntry(entryId, status) {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/review-entry`, {
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

    function updateUserInfo() {
        let name = 'Test User';
        if (tg && tg.initDataUnsafe.user) {
            const { first_name, last_name } = tg.initDataUnsafe.user;
            name = `${first_name} ${last_name || ''}`;
        }
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
            const response = await fetchWithAuth(`${API_BASE_URL}/process-payment`, {
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
      
    async function fetchPendingEntries() {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/pending-entries`);
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
        updateUserInfo();
        const token = localStorage.getItem('token');
        if (!token) {
            try {
                const newToken = await authenticate();
                if (!newToken) {
                    showError('Authentication failed. Please try again.');
                    return; // Exit early if authentication fails
                }
            } catch (error) {
                console.error('Authentication error:', error);
                showError('Authentication failed. Please try again.');
                return; // Exit early if authentication fails
            }
        }
        isClockedIn = !!localStorage.getItem('startTime');
        updateView();
    }

    clockInOutBtn.addEventListener('click', async () => {
        if (isClockedIn) {
            await clockOut();
        } else {
            await clockIn();
        }
    });

    init();

    // Set up polling for real-time updates of pending entries
    if (userRole === 'manager') {
        setInterval(fetchPendingEntries, 30000); // Fetch every 30 seconds
    }

    // Expose functions globally for onclick handlers
    window.reviewEntry = reviewEntry;
    window.processPayment = processPayment;
});