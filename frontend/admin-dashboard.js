document.addEventListener('DOMContentLoaded', () => {
    const timesheetsList = document.getElementById('timesheets-list');

    async function fetchTimesheets() {
        try {
            const response = await fetch('https://timesheet-mini-19fe8d8112f6.herokuapp.com/api/admin/timesheets', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch timesheets');
            }

            const timesheets = await response.json();
            renderTimesheets(timesheets);
        } catch (error) {
            console.error('Error fetching timesheets:', error);
            timesheetsList.innerHTML = '<p>Error loading timesheets. Please try again later.</p>';
        }
    }

    function renderTimesheets(timesheets) {
        timesheetsList.innerHTML = timesheets.map(timesheet => `
            <div class="timesheet-entry">
                <p>User: ${timesheet.user.firstName} ${timesheet.user.lastName}</p>
                <p>Clock In: ${new Date(timesheet.clockIn).toLocaleString()}</p>
                <p>Clock Out: ${timesheet.clockOut ? new Date(timesheet.clockOut).toLocaleString() : 'Not clocked out'}</p>
                <p>Status: ${timesheet.status}</p>
                <button onclick="updateStatus('${timesheet._id}', 'approved')">Approve</button>
                <button onclick="updateStatus('${timesheet._id}', 'rejected')">Reject</button>
            </div>
        `).join('');
    }

    async function updateStatus(timesheetId, status) {
        try {
            const response = await fetch(`https://timesheet-mini-19fe8d8112f6.herokuapp.com/api/admin/timesheet/${timesheetId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                },
                body: JSON.stringify({ status }),
            });

            if (!response.ok) {
                throw new Error('Failed to update timesheet status');
            }

            fetchTimesheets(); // Refresh the list after updating
        } catch (error) {
            console.error('Error updating timesheet status:', error);
            alert('Failed to update timesheet status. Please try again.');
        }
    }

    fetchTimesheets();

    window.updateStatus = updateStatus; // Make the function available globally
});