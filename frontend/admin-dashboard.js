document.addEventListener('DOMContentLoaded', () => {
    const timesheetsList = document.getElementById('timesheets-list');

    async function fetchTimesheets() {
        try {
            const response = await fetch('/api/admin/timesheets', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch timesheets');
            }

            const timesheets = await response.json();
            renderTimesheets(timesheets);
        } catch (error) {
            console.error('Error fetching timesheets:', error);
        }
    }

    function renderTimesheets(timesheets) {
        timesheetsList.innerHTML = timesheets.map(timesheet => `
            <div class="timesheet-entry">
                <p>User: ${timesheet.user.firstName} ${timesheet.user.lastName}</p>
                <p>Clock In: ${new Date(timesheet.clockIn).toLocaleString()}</p>
                <p>Clock Out: ${timesheet.clockOut ? new Date(timesheet.clockOut).toLocaleString() : 'Not clocked out'}</p>
                <p>Duration: ${formatDuration(timesheet.duration)}</p>
                <p>Status: ${timesheet.status}</p>
                <button onclick="updateStatus('${timesheet._id}', 'approved')">Approve</button>
                <button onclick="updateStatus('${timesheet._id}', 'declined')">Decline</button>
            </div>
        `).join('');
    }

    function formatDuration(duration) {
        const hours = Math.floor(duration / 3600);
        const minutes = Math.floor((duration % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }

    async function updateStatus(timesheetId, status) {
        try {
            const response = await fetch(`/api/admin/timesheet/${timesheetId}`, {
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
        }
    }

    fetchTimesheets();

    window.updateStatus = updateStatus; // Make the function available globally
});