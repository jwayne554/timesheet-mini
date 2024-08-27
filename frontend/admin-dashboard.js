document.addEventListener('DOMContentLoaded', () => {
    const timesheetsList = document.getElementById('timesheets-list');
    const logoutButton = document.getElementById('logout-btn');
  
    async function fetchTimesheets() {
      try {
        const response = await fetch('/api/admin/timesheets', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          },
        });
  
        if (!response.ok) {
          throw new Error('Failed to fetch timesheets');
        }
  
        const timesheets = await response.json();
        renderTimesheets(timesheets);
      } catch (error) {
        console.error('Error fetching timesheets:', error);
        alert('Failed to fetch timesheets. Please try again.');
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
        alert('Failed to update timesheet status. Please try again.');
      }
    }
  
    logoutButton.addEventListener('click', async () => {
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          },
        });
        localStorage.removeItem('adminToken');
        window.location.href = '/admin';
      } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to logout. Please try again.');
      }
    });
  
    fetchTimesheets();
  
    window.updateStatus = updateStatus; // Make the function available globally
  });