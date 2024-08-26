document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram?.WebApp;
    const userInfo = document.getElementById('user-info');
    const clockInOutBtn = document.getElementById('clock-in-out');
    const managerView = document.getElementById('manager-view');
    const pendingEntriesList = document.getElementById('pending-entries');
    const API_BASE_URL = 'https://timesheet-mini-19fe8d8112f6.herokuapp.com/';

    let token = localStorage.getItem('token');
    let userRole = localStorage.getItem('userRole');
    let isClockedIn = false;

    if (tg) {
        tg.expand();
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
            token = data.token;
            userRole = data.role;
            localStorage.setItem('token', token);
            localStorage.setItem('userRole', userRole);
        } catch (error) {
            console.error('Authentication error:', error);
            showError('Authentication failed. Please try again.');
        }
    }

    async function fetchWithAuth(url, options = {}) {
        options.headers = {
            ...options.headers,
            'Authorization': token,
            'Content-Type': 'application/json',
        };
        return fetch(url, options);
    }

    async function clockInOut() {
        console.log('clockInOut function called');
        
        let userData;
        if (tg && tg.initDataUnsafe.user) {
            userData = tg.initDataUnsafe.user;
        } else {
            userData = { id: 12345, first_name: 'Test', last_name: 'User' };
        }
    
        try {
            console.log('Sending request to:', `${API_BASE_URL}/clock-in`);
            const response = await fetchWithAuth(`${API_BASE_URL}/clock-in`, {
                method: 'POST',
                body: JSON.stringify({
                    telegramId: userData.id,
                    firstName: userData.first_name,
                    lastName: userData.last_name,
                }),
            });
    
            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Response data:', data);
    
            if (!response.ok) {
                throw new Error(data.message || 'An error occurred');
            }
    
            console.log(data.message);
            showMessage(data.message);
            
            // Redirect to the timer page
            window.location.href = 'timer.html';
        } catch (error) {
            console.error('Error:', error);
            showError('An error occurred. Please try again.');
        }
    }
    

    async function reviewEntry(entryId, status) {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/review-entry`, {
                method: 'POST',
                body: JSON.stringify({ entryId, status }),
            });
            const data = await response.json();
            console.log(data.message);
            fetchPendingEntries();
            showMessage(data.message);
        } catch (error) {
            console.error('Error reviewing entry:', error);
            showError('Error reviewing entry');
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
    }

    function updateUserInfo() {
        let name = 'Test User';
        if (tg && tg.initDataUnsafe.user) {
            const { first_name, last_name } = tg.initDataUnsafe.user;
            name = `${first_name} ${last_name || ''}`;
        }
        userInfo.textContent = `Welcome, ${name}`;
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
            const data = await response.json();
            if (response.ok) {
                showMessage(data.message);
                fetchPendingEntries();
            } else {
                showError(data.message || 'Error processing payment');
            }
        } catch (error) {
            console.error('Error processing payment:', error);
            showError('An error occurred while processing the payment');
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
            const entries = await response.json();
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
        } catch (error) {
            console.error('Error fetching pending entries:', error);
            showError('Error fetching pending entries');
        }
    }

    async function init() {
        updateUserInfo();
        if (!token) {
            await authenticate();
        }
        updateView();
        console.log('Token:', token);
    }

    clockInOutBtn.addEventListener('click', () => {
        console.log('Button clicked!');
        clockInOut();
    });

    init();

    // Expose functions globally for onclick handlers
    window.reviewEntry = reviewEntry;
    window.processPayment = processPayment;
});