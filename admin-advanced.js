// Check admin login
const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
if (!currentUser || sessionStorage.getItem('userType') !== 'admin') {
    window.location.href = 'index.html';
}

document.getElementById('adminName').textContent = currentUser.name;

// Initialize Map
let map = null;
let markers = {};

// Tab switching
function switchTab(tabName) {
    const tabs = document.querySelectorAll('.tab-content');
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    sidebarItems.forEach(item => item.classList.remove('active'));
    
    document.getElementById(tabName + '-tab').classList.add('active');
    event.currentTarget.classList.add('active');
    
    // Load data based on tab
    if (tabName === 'dashboard') loadDashboard();
    if (tabName === 'employees') loadEmployees();
    if (tabName === 'hierarchy') loadHierarchy();
    if (tabName === 'customers') loadCustomerApprovals();
    if (tabName === 'tours') loadTourApprovals();
    if (tabName === 'expenses') loadExpenseApprovals();
    if (tabName === 'leaves') loadLeaveApprovals();
    if (tabName === 'attendance') loadMonthlyAttendance();
    if (tabName === 'reports') loadDetailedReports();
    if (tabName === 'gps') initializeGPSTracking();
    if (tabName === 'announcements') loadAnnouncements();
}

// Notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// ============= EMPLOYEE MANAGEMENT =============

function openAddEmployeeModal() {
    document.getElementById('employeeModal').classList.add('active');
    document.getElementById('employeeModalTitle').textContent = 'Add New Employee';
    populateReportingManagers();
    clearEmployeeForm();
}

function closeEmployeeModal() {
    document.getElementById('employeeModal').classList.remove('active');
}

function clearEmployeeForm() {
    document.getElementById('empId').value = '';
    document.getElementById('empName').value = '';
    document.getElementById('empPassword').value = '';
    document.getElementById('empMobile').value = '';
    document.getElementById('empEmail').value = '';
    document.getElementById('empDesignation').value = '';
    document.getElementById('empTerritory').value = '';
    document.getElementById('empReportingTo').value = '';
    document.getElementById('empJoiningDate').value = '';
    document.getElementById('empStatus').value = 'Active';
}

function populateReportingManagers() {
    const employees = JSON.parse(localStorage.getItem('employees') || '[]');
    const select = document.getElementById('empReportingTo');
    
    select.innerHTML = '<option value="">Select Reporting Manager *</option><option value="admin">Admin (Direct)</option>';
    
    employees.forEach(emp => {
        if (emp.status === 'Active') {
            select.innerHTML += `<option value="${emp.employeeId}">${emp.name} (${emp.employeeId})</option>`;
        }
    });
}

function saveEmployee() {
    const empId = document.getElementById('empId').value;
    const name = document.getElementById('empName').value;
    const password = document.getElementById('empPassword').value;
    const mobile = document.getElementById('empMobile').value;
    const email = document.getElementById('empEmail').value;
    const designation = document.getElementById('empDesignation').value;
    const territory = document.getElementById('empTerritory').value;
    const reportingTo = document.getElementById('empReportingTo').value;
    const joiningDate = document.getElementById('empJoiningDate').value;
    const status = document.getElementById('empStatus').value;
    
    if (!empId || !name || !password || !mobile || !designation || !territory || !reportingTo) {
        showNotification('Please fill all required fields!', 'error');
        return;
    }
    
    if (mobile.length !== 10) {
        showNotification('Mobile number must be 10 digits!', 'error');
        return;
    }
    
    let employees = JSON.parse(localStorage.getItem('employees') || '[]');
    
    // Check duplicate ID for new employee
    const existingIndex = employees.findIndex(e => e.employeeId === empId);
    if (existingIndex !== -1 && employees[existingIndex].status !== 'Left') {
        showNotification('Employee ID already exists!', 'error');
        return;
    }
    
    const employeeData = {
        employeeId: empId,
        password: password,
        name: name,
        mobile: mobile,
        email: email,
        designation: designation,
        territory: territory,
        reportingTo: reportingTo,
        joiningDate: joiningDate || new Date().toISOString().split('T')[0],
        status: status,
        createdAt: new Date().toISOString(),
        leftDate: status === 'Left' ? new Date().toISOString().split('T')[0] : null
    };
    
    if (existingIndex !== -1) {
        // Rejoin - restore old data
        employees[existingIndex] = { ...employees[existingIndex], ...employeeData, status: status };
        showNotification('Employee rejoined successfully! ✅');
    } else {
        employees.push(employeeData);
        showNotification('Employee added successfully! ✅');
    }
    
    localStorage.setItem('employees', JSON.stringify(employees));
    closeEmployeeModal();
    loadEmployees();
}

function loadEmployees() {
    const employees = JSON.parse(localStorage.getItem('employees') || '[]');
    const tbody = document.getElementById('employeeTableBody');
    
    if (employees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-gray-500">No employees found</td></tr>';
        return;
    }
    
    tbody.innerHTML = employees.map(emp => `
        <tr>
            <td>${emp.employeeId}</td>
            <td>${emp.name}</td>
            <td>${emp.designation}</td>
            <td>${emp.territory}</td>
            <td>${emp.mobile}</td>
            <td>${emp.joiningDate}</td>
            <td>${emp.reportingTo}</td>
            <td><span class="status-badge status-${emp.status.toLowerCase()}">${emp.status}</span></td>
            <td>
                <button class="btn-warning text-xs mr-1" onclick="editEmployee('${emp.employeeId}')">Edit</button>
                <button class="btn-warning text-xs mr-1" onclick="holdEmployee('${emp.employeeId}')">${emp.status === 'Hold' ? 'Unhold' : 'Hold'}</button>
                <button class="btn-danger text-xs" onclick="leftEmployee('${emp.employeeId}')">Left</button>
            </td>
        </tr>
    `).join('');
}

function editEmployee(empId) {
    const employees = JSON.parse(localStorage.getItem('employees') || '[]');
    const emp = employees.find(e => e.employeeId === empId);
    
    if (!emp) return;
    
    document.getElementById('empId').value = emp.employeeId;
    document.getElementById('empId').disabled = true;
    document.getElementById('empName').value = emp.name;
    document.getElementById('empPassword').value = emp.password;
    document.getElementById('empMobile').value = emp.mobile;
    document.getElementById('empEmail').value = emp.email || '';
    document.getElementById('empDesignation').value = emp.designation;
    document.getElementById('empTerritory').value = emp.territory;
    document.getElementById('empReportingTo').value = emp.reportingTo;
    document.getElementById('empJoiningDate').value = emp.joiningDate;
    document.getElementById('empStatus').value = emp.status;
    
    document.getElementById('employeeModalTitle').textContent = 'Edit Employee';
    openAddEmployeeModal();
}

function holdEmployee(empId) {
    let employees = JSON.parse(localStorage.getItem('employees') || '[]');
    const emp = employees.find(e => e.employeeId === empId);
    
    if (!emp) return;
    
    emp.status = emp.status === 'Hold' ? 'Active' : 'Hold';
    localStorage.setItem('employees', JSON.stringify(employees));
    
    showNotification(`Employee ${emp.status === 'Hold' ? 'put on hold' : 'activated'}!`);
    loadEmployees();
}

function leftEmployee(empId) {
    if (!confirm('Mark this employee as Left? All data will be retained.')) return;
    
    let employees = JSON.parse(localStorage.getItem('employees') || '[]');
    const emp = employees.find(e => e.employeeId === empId);
    
    if (!emp) return;
    
    emp.status = 'Left';
    emp.leftDate = new Date().toISOString().split('T')[0];
    localStorage.setItem('employees', JSON.stringify(employees));
    
    showNotification('Employee marked as Left. Data retained for future rejoin.');
    loadEmployees();
}

function searchEmployees() {
    const searchTerm = document.getElementById('searchEmployee').value.toLowerCase();
    const employees = JSON.parse(localStorage.getItem('employees') || '[]');
    const filtered = employees.filter(emp => 
        emp.employeeId.toLowerCase().includes(searchTerm) ||
        emp.name.toLowerCase().includes(searchTerm) ||
        emp.mobile.includes(searchTerm)
    );
    displayEmployees(filtered);
}

function filterEmployees() {
    const status = document.getElementById('filterStatus').value;
    const designation = document.getElementById('filterDesignation').value;
    let employees = JSON.parse(localStorage.getItem('employees') || '[]');
    
    if (status) {
        employees = employees.filter(e => e.status === status);
    }
    if (designation) {
        employees = employees.filter(e => e.designation === designation);
    }
    
    displayEmployees(employees);
}

function displayEmployees(employees) {
    const tbody = document.getElementById('employeeTableBody');
    
    if (employees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-gray-500">No employees found</td></tr>';
        return;
    }
    
    tbody.innerHTML = employees.map(emp => `
        <tr>
            <td>${emp.employeeId}</td>
            <td>${emp.name}</td>
            <td>${emp.designation}</td>
            <td>${emp.territory}</td>
            <td>${emp.mobile}</td>
            <td>${emp.joiningDate}</td>
            <td>${emp.reportingTo}</td>
            <td><span class="status-badge status-${emp.status.toLowerCase()}">${emp.status}</span></td>
            <td>
                <button class="btn-warning text-xs mr-1" onclick="editEmployee('${emp.employeeId}')">Edit</button>
                <button class="btn-warning text-xs mr-1" onclick="holdEmployee('${emp.employeeId}')">${emp.status === 'Hold' ? 'Unhold' : 'Hold'}</button>
                <button class="btn-danger text-xs" onclick="leftEmployee('${emp.employeeId}')">Left</button>
            </td>
        </tr>
    `).join('');
}

// ============= HIERARCHY =============

function loadHierarchy() {
    const employees = JSON.parse(localStorage.getItem('employees') || '[]');
    const hierarchyView = document.getElementById('hierarchyView');
    
    const hierarchy = {};
    employees.filter(e => e.status !== 'Left').forEach(emp => {
        if (!hierarchy[emp.reportingTo]) {
            hierarchy[emp.reportingTo] = [];
        }
        hierarchy[emp.reportingTo].push(emp);
    });
    
    function buildHierarchy(managerId, level = 0) {
        if (!hierarchy[managerId]) return '';
        
        const colors = ['purple', 'blue', 'green', 'yellow', 'red'];
        const color = colors[level % colors.length];
        
        return hierarchy[managerId].map(emp => `
            <div class="ml-${level * 6} mt-2 border-l-4 border-${color}-500 pl-4">
                <div class="font-semibold">${emp.name} (${emp.employeeId})</div>
                <div class="text-sm text-gray-600">${emp.designation} - ${emp.territory}</div>
                <div class="text-xs text-gray-500">Status: <span class="status-badge status-${emp.status.toLowerCase()}">${emp.status}</span></div>
                ${buildHierarchy(emp.employeeId, level + 1)}
            </div>
        `).join('');
    }
    
    hierarchyView.innerHTML = `
        <div class="border-l-4 border-purple-500 pl-4">
            <div class="font-bold text-lg">👑 Admin (HO)</div>
            ${buildHierarchy('admin', 0)}
        </div>
    `;
}

// ============= CUSTOMER APPROVALS =============

function loadCustomerApprovals() {
    const customers = JSON.parse(localStorage.getItem('customers') || '[]');
    const pending = customers.filter(c => c.status === 'Pending Approval');
    const approved = customers.filter(c => c.status === 'Approved');
    
    // Load approval rights
    const approvalRights = localStorage.getItem('customerApprovalRights') || 'HO';
    document.getElementById('customerApprovalRights').value = approvalRights;
    
    // Pending approvals
    const pendingTable = document.getElementById('customerApprovalTable');
    if (pending.length === 0) {
        pendingTable.innerHTML = '<tr><td colspan="10" class="text-center text-gray-500">No pending approvals</td></tr>';
    } else {
        pendingTable.innerHTML = pending.map(c => `
            <tr>
                <td>${c.id}</td>
                <td>${c.name}</td>
                <td>${c.type}</td>
                <td>${c.specialty || '-'}</td>
                <td>${c.beat || '-'}</td>
                <td>${c.city || '-'}</td>
                <td>${c.mobile || '-'}</td>
                <td>${c.employeeId}</td>
                <td>${new Date(c.createdAt).toLocaleDateString('hi-IN')}</td>
                <td>
                    <button class="btn-success text-xs mr-1" onclick="approveCustomer('${c.id}')">Approve</button>
                    <button class="btn-danger text-xs" onclick="rejectCustomer('${c.id}')">Reject</button>
                </td>
            </tr>
        `).join('');
    }
    
    // Approved customers
    const approvedTable = document.getElementById('approvedCustomerTable');
    if (approved.length === 0) {
        approvedTable.innerHTML = '<tr><td colspan="7" class="text-center text-gray-500">No approved customers</td></tr>';
    } else {
        approvedTable.innerHTML = approved.map(c => `
            <tr>
                <td>${c.id}</td>
                <td>${c.name}</td>
                <td>${c.type}</td>
                <td>${c.beat || '-'}</td>
                <td>${c.city || '-'}</td>
                <td>${c.employeeId}</td>
                <td><span class="status-badge status-approved">Approved</span></td>
            </tr>
        `).join('');
    }
}

function saveApprovalRights() {
    const rights = document.getElementById('customerApprovalRights').value;
    localStorage.setItem('customerApprovalRights', rights);
    showNotification('Approval rights updated!');
}

function approveCustomer(customerId) {
    let customers = JSON.parse(localStorage.getItem('customers') || '[]');
    const customer = customers.find(c => c.id === customerId);
    
    if (!customer) return;
    
    customer.status = 'Approved';
    customer.approvedBy = currentUser.username;
    customer.approvedAt = new Date().toISOString();
    
    localStorage.setItem('customers', JSON.stringify(customers));
    showNotification('Customer approved! ✅');
    loadCustomerApprovals();
}

function rejectCustomer(customerId) {
    if (!confirm('Are you sure you want to reject this customer?')) return;
    
    let customers = JSON.parse(localStorage.getItem('customers') || '[]');
    const customer = customers.find(c => c.id === customerId);
    
    if (!customer) return;
    
    customer.status = 'Rejected';
    customer.rejectedBy = currentUser.username;
    customer.rejectedAt = new Date().toISOString();
    
    localStorage.setItem('customers', JSON.stringify(customers));
    showNotification('Customer rejected!', 'error');
    loadCustomerApprovals();
}

// ============= DASHBOARD =============

function loadDashboard() {
    const employees = JSON.parse(localStorage.getItem('employees') || '[]');
    const reports = JSON.parse(localStorage.getItem('reports') || '[]');
    const dayRecords = JSON.parse(localStorage.getItem('dayRecords') || '[]');
    const customers = JSON.parse(localStorage.getItem('customers') || '[]');
    const tours = JSON.parse(localStorage.getItem('tours') || '[]');
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    const leaves = JSON.parse(localStorage.getItem('leaves') || '[]');
    
    // Total employees
    document.getElementById('totalEmployees').textContent = employees.length;
    document.getElementById('activeEmployees').textContent = employees.filter(e => e.status === 'Active').length;
    document.getElementById('holdEmployees').textContent = employees.filter(e => e.status === 'Hold').length;
    
    // Present today
    const today = new Date().toLocaleDateString('hi-IN');
    const presentToday = dayRecords.filter(d => d.action === 'Start' && d.date === today).length;
    document.getElementById('presentToday').textContent = presentToday;
    
    // Pending approvals
    const pendingCustomers = customers.filter(c => c.status === 'Pending Approval').length;
    const pendingTours = tours.filter(t => t.status === 'Pending').length;
    const pendingExpenses = expenses.filter(e => e.status === 'Pending').length;
    const pendingLeaves = leaves.filter(l => l.status === 'Pending').length;
    const totalPending = pendingCustomers + pendingTours + pendingExpenses + pendingLeaves;
    document.getElementById('pendingApprovals').textContent = totalPending;
    
    // Month reports
    const currentMonth = new Date().getMonth();
    const monthReports = reports.filter(r => new Date(r.date).getMonth() === currentMonth).length;
    document.getElementById('monthReports').textContent = monthReports;
    
    // Pending actions
    const pendingActions = document.getElementById('pendingActions');
    pendingActions.innerHTML = `
        <div class="text-sm">
            <div class="mb-2">📋 Customer Approvals: <strong>${pendingCustomers}</strong></div>
            <div class="mb-2">🗺️ Tour Plan Approvals: <strong>${pendingTours}</strong></div>
            <div class="mb-2">💰 Expense Approvals: <strong>${pendingExpenses}</strong></div>
            <div class="mb-2">🏖️ Leave Requests: <strong>${pendingLeaves}</strong></div>
        </div>
    `;
    
    // Recent activity
    const recentActivity = document.getElementById('recentActivity');
    const recentReports = reports.slice(-5).reverse();
    
    if (recentReports.length === 0) {
        recentActivity.innerHTML = '<p class="text-gray-500 text-sm">No recent activity</p>';
    } else {
        recentActivity.innerHTML = recentReports.map(r => `
            <div class="text-sm border-b pb-2 mb-2">
                <div class="font-bold">${r.employeeId} - ${r.customer}</div>
                <div class="text-gray-600">${r.type} • ${r.date}</div>
            </div>
        `).join('');
    }
}

// ============= GPS TRACKING =============

function initializeGPSTracking() {
    if (!map) {
        map = L.map('map').setView([28.6139, 77.2090], 5); // Default to India
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
    }
    
    refreshGPSTracking();
}

function refreshGPSTracking() {
    const dayRecords = JSON.parse(localStorage.getItem('dayRecords') || '[]');
    const employees = JSON.parse(localStorage.getItem('employees') || '[]');
    const today = new Date().toLocaleDateString('hi-IN');
    
    // Get today's active employees
    const activeToday = dayRecords.filter(d => d.action === 'Start' && d.date === today);
    
    const locationList = document.getElementById('employeeLocationList');
    
    if (activeToday.length === 0) {
        locationList.innerHTML = '<p class="text-gray-500">No active employees today</p>';
        return;
    }
    
    // Clear existing markers
    Object.values(markers).forEach(marker => map.removeLayer(marker));
    markers = {};
    
    locationList.innerHTML = '<h4 class="font-bold mb-2">Active Employees</h4>';
    
    activeToday.forEach(record => {
        const emp = employees.find(e => e.employeeId === record.employeeId);
        if (!emp || !record.location) return;
        
        const lat = record.location.latitude;
        const lng = record.location.longitude;
        
        // Add marker
        const marker = L.marker([lat, lng]).addTo(map);
        marker.bindPopup(`<strong>${emp.name}</strong><br>${emp.employeeId}<br>${new Date(record.timestamp).toLocaleTimeString('hi-IN')}`);
        markers[record.employeeId] = marker;
        
        // Add to list
        locationList.innerHTML += `
            <div class="text-sm border-b pb-2 mb-2 cursor-pointer" onclick="focusEmployee('${record.employeeId}')">
                <div class="font-bold">${emp.name} (${emp.employeeId})</div>
                <div class="text-gray-600">Last seen: ${new Date(record.timestamp).toLocaleTimeString('hi-IN')}</div>
                <div class="text-xs text-gray-500">Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}</div>
            </div>
        `;
    });
    
    showNotification('GPS locations refreshed!', 'info');
}

function focusEmployee(empId) {
    const marker = markers[empId];
    if (marker) {
        map.setView(marker.getLatLng(), 13);
        marker.openPopup();
    }
}

function showAllEmployeesOnMap() {
    const dayRecords = JSON.parse(localStorage.getItem('dayRecords') || '[]');
    const today = new Date().toLocaleDateString('hi-IN');
    const activeToday = dayRecords.filter(d => d.action === 'Start' && d.date === today && d.location);
    
    if (activeToday.length === 0) {
        showNotification('No employees with GPS data!', 'error');
        return;
    }
    
    const bounds = [];
    activeToday.forEach(record => {
        if (record.location) {
            bounds.push([record.location.latitude, record.location.longitude]);
        }
    });
    
    if (bounds.length > 0) {
        map.fitBounds(bounds);
    }
}

// ============= LOGOUT =============

function adminLogout() {
    if (confirm('Are you sure you want to logout?')) {
        sessionStorage.clear();
        window.location.href = 'index.html';
    }
}

// ============= INITIALIZE =============

// Populate month dropdown for attendance
const monthSelect = document.getElementById('attendanceMonth');
const currentMonth = new Date().getMonth();
const currentYear = new Date().getFullYear();
for (let i = 0; i < 12; i++) {
    const date = new Date(currentYear, i, 1);
    const monthName = date.toLocaleDateString('hi-IN', { month: 'long', year: 'numeric' });
    const option = document.createElement('option');
    option.value = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
    option.textContent = monthName;
    if (i === currentMonth) option.selected = true;
    monthSelect.appendChild(option);
}

// Populate employee dropdowns
function populateEmployeeDropdowns() {
    const employees = JSON.parse(localStorage.getItem('employees') || '[]');
    
    const selects = ['attendanceEmployee', 'reportEmployee'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        employees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.employeeId;
            option.textContent = `${emp.name} (${emp.employeeId})`;
            select.appendChild(option);
        });
    });
}

populateEmployeeDropdowns();

// Load dashboard on startup
loadDashboard();

// Stub functions for features to be implemented
function loadTourApprovals() {
    showNotification('Tour approvals loading...', 'info');
}

function loadExpenseApprovals() {
    showNotification('Expense approvals loading...', 'info');
}

function loadLeaveApprovals() {
    showNotification('Leave approvals loading...', 'info');
}

function loadMonthlyAttendance() {
    showNotification('Monthly attendance loading...', 'info');
}

function loadDetailedReports() {
    showNotification('Detailed reports loading...', 'info');
}

function downloadAttendance() {
    showNotification('Downloading attendance...', 'info');
}

function downloadReportsExcel() {
    showNotification('Downloading reports...', 'info');
}

function loadAnnouncements() {
    showNotification('Announcements loading...', 'info');
}

function sendAnnouncement() {
    showNotification('Announcement sent!');
}

function saveSettings() {
    const tourDeadline = document.getElementById('tourPlanDeadline').value;
    const expenseDeadline = document.getElementById('expenseDeadline').value;
    const leaveEligibility = document.getElementById('leaveEligibility').value;
    
    localStorage.setItem('tourPlanDeadline', tourDeadline);
    localStorage.setItem('expenseDeadline', expenseDeadline);
    localStorage.setItem('leaveEligibility', leaveEligibility);
    
    showNotification('Settings saved successfully! ✅');
}

function backupData() {
    const data = {
        employees: localStorage.getItem('employees'),
        customers: localStorage.getItem('customers'),
        reports: localStorage.getItem('reports'),
        expenses: localStorage.getItem('expenses'),
        leaves: localStorage.getItem('leaves'),
        tours: localStorage.getItem('tours'),
        dayRecords: localStorage.getItem('dayRecords')
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mr-app-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    showNotification('Data backup downloaded! ✅');
}

function restoreData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                Object.keys(data).forEach(key => {
                    if (data[key]) {
                        localStorage.setItem(key, data[key]);
                    }
                });
                showNotification('Data restored successfully! ✅');
                loadDashboard();
            } catch (error) {
                showNotification('Invalid backup file!', 'error');
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

function clearOldData() {
    if (!confirm('This will delete data older than 90 days. Continue?')) return;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    
    ['reports', 'expenses', 'dayRecords'].forEach(key => {
        let data = JSON.parse(localStorage.getItem(key) || '[]');
        data = data.filter(item => new Date(item.date || item.timestamp) > cutoffDate);
        localStorage.setItem(key, JSON.stringify(data));
    });
    
    showNotification('Old data cleared! ✅');
}

function closeCustomerDetailsModal() {
    document.getElementById('customerDetailsModal').classList.remove('active');
}
