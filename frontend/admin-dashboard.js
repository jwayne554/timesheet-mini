document.addEventListener('DOMContentLoaded', () => {
  const timesheetsList = document.getElementById('timesheets-list');
  const logoutButton = document.getElementById('logout-btn');
  const isSuperAdmin = JSON.parse(localStorage.getItem('isSuperAdmin'));

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
      <div class="timesheet-entry" data-id="${timesheet._id}">
        <p>User: ${timesheet.user.firstName} ${timesheet.user.lastName}</p>
        <p>Clock In: ${new Date(timesheet.clockIn).toLocaleString()}</p>
        <p>Clock Out: ${timesheet.clockOut ? new Date(timesheet.clockOut).toLocaleString() : 'Not clocked out'}</p>
        <p>Status: ${timesheet.status}</p>
        ${isSuperAdmin ? `
          <button onclick="editTimesheet('${timesheet._id}')">Edit</button>
          <button onclick="deleteTimesheet('${timesheet._id}')">Delete</button>
        ` : `
          <button onclick="updateStatus('${timesheet._id}', 'approved')">Approve</button>
          <button onclick="updateStatus('${timesheet._id}', 'rejected')">Reject</button>
        `}
      </div>
    `).join('');
  }

  async function updateStatus(timesheetId, status) {
    try {
      const response = await fetch(`/api/admin/timesheet/${timesheetId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify({ action: status }),
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

  window.editTimesheet = async (id) => {
    // Implement edit functionality here
    console.log('Editing timesheet', id);
  };

  window.deleteTimesheet = async (id) => {
    if (confirm('Are you sure you want to delete this timesheet?')) {
      try {
        const response = await fetch(`/api/admin/timesheet/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to delete timesheet');
        }

        fetchTimesheets(); // Refresh the list after deleting
      } catch (error) {
        console.error('Error deleting timesheet:', error);
        alert('Failed to delete timesheet. Please try again.');
      }
    }
  };

  logoutButton.addEventListener('click', async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });
      localStorage.removeItem('adminToken');
      localStorage.removeItem('isSuperAdmin');
      window.location.href = '/admin-login.html';
    } catch (error) {
      console.error('Logout error:', error);
      alert('Failed to logout. Please try again.');
    }
  });

  fetchTimesheets();
});