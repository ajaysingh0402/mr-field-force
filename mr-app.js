// Check authentication
const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
if (!currentUser || sessionStorage.getItem('userType') !== 'mr') {
    window.location.href = 'index.html';
}

// Display user info
document.getElementById('userName').textContent = 'Welcome, ' + currentUser.name;
document.getElementById('employeeId').textContent = currentUser.employeeId + ' | ' + currentUser.territory;

// Update date and time
function updateDateTime() {
    const now = new Date();
    document.getElementById('currentDate').textContent = now.toLocaleDateString('hi-IN');
    document.getElementById('currentTime').textContent = now.toLocaleTimeString('hi-IN');
}
updateDateTime();
setInterval(updateDateTime, 1000);

// Set default dates
const today = new Date().toISOString().split('T')[0];
document.getElementById('tourDate').value = today;
document.getElementById('expenseDate').value = today;
document.getElementById('reportDate').value = today;
document.getElementById('leaveStartDate').value = today;
document.getElementById('leaveEndDate').value = today;

// GPS Helper
function getLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject('Geolocation not supported');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: new Date().toISOString()
            }),
            (error) => reject(error),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    });
}

// Notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Tab switching
function switchTab(tabName) {
    const tabs = document.querySelectorAll('.tab-content');
    const navItems = document.querySelectorAll('.nav-item');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    navItems.forEach(item => item.classList.remove('active'));
    
    document.getElementById(tabName + '-tab').classList.add('active');
    event.currentTarget.classList.add('active');
    
    if (tabName === 'customers') loadCustomers();
    if (tabName === 'tour') loadTours();
    if (tabName === 'expense') loadExpenses();
    if (tabName === 'reports') { loadReports(); populateCustomersDropdown(); }
    if (tabName === 'stockist') loadStockists();
    if (tabName === 'nwday') loadLeaveHistory();
}

function quickAction(tab) {
    switchTab(tab);
}

// Start Day with GPS
async function startDay() {
    const odometer = document.getElementById('startOdometer').value;
    const remarks = document.getElementById('startRemarks').value;
    
    if (!odometer) {
        showNotification('Please enter odometer reading!', 'error');
        return;
    }
    
    try {
        showNotification('Getting GPS location...', 'info');
        const location = await getLocation();
        
        const dayData = {
            employeeId: currentUser.employeeId,
            name: currentUser.name,
            date: new Date().toLocaleDateString('hi-IN'),
            action: 'Start',
            location: location,
            odometer: odometer,
            remarks: remarks,
            timestamp: new Date().toISOString()
        };
        
        let dayRecords = JSON.parse(localStorage.getItem('dayRecords') || '[]');
        dayRecords.push(dayData);
        localStorage.setItem('dayRecords', JSON.stringify(dayRecords));
        
        localStorage.setItem('dayStarted', 'true');
        localStorage.setItem('startTime', new Date().toISOString());
        localStorage.setItem('startOdometer', odometer);
        
        document.getElementById('dayStatus').textContent = 'Day Started';
        document.getElementById('dayStatus').className = 'status-badge status-active';
        document.getElementById('todayStatus').textContent = 'Active';
        
        showNotification('✅ Day started successfully!');
        document.getElementById('startOdometer').value = '';
        document.getElementById('startRemarks').value = '';
    } catch (error) {
        showNotification('⚠️ GPS location required!', 'error');
    }
}

// End Day with GPS
async function endDay() {
    if (localStorage.getItem('dayStarted') !== 'true') {
        showNotification('Please start your day first!', 'error');
        return;
    }
    
    const endOdometer = document.getElementById('endOdometer').value;
    const visits = document.getElementById('totalVisits').value;
    const remarks = document.getElementById('endRemarks').value;
    
    if (!endOdometer || !visits) {
        showNotification('Please fill all fields!', 'error');
        return;
    }
    
    try {
        showNotification('Getting GPS location...', 'info');
        const location = await getLocation();
        
        const startOdo = parseFloat(localStorage.getItem('startOdometer') || 0);
        const distance = parseFloat(endOdometer) - startOdo;
        
        const dayData = {
            employeeId: currentUser.employeeId,
            name: currentUser.name,
            date: new Date().toLocaleDateString('hi-IN'),
            action: 'End',
            location: location,
            odometer: endOdometer,
            visits: visits,
            distance: distance,
            remarks: remarks,
            timestamp: new Date().toISOString()
        };
        
        let dayRecords = JSON.parse(localStorage.getItem('dayRecords') || '[]');
        dayRecords.push(dayData);
        localStorage.setItem('dayRecords', JSON.stringify(dayRecords));
        
        document.getElementById('todayDistance').textContent = distance;
        document.getElementById('todayVisits').textContent = visits;
        document.getElementById('dayStatus').textContent = 'Day Ended';
        document.getElementById('dayStatus').className = 'status-badge status-inactive';
        document.getElementById('todayStatus').textContent = 'Completed';
        
        localStorage.setItem('dayStarted', 'false');
        
        showNotification('✅ Day ended successfully!');
        document.getElementById('endOdometer').value = '';
        document.getElementById('totalVisits').value = '';
        document.getElementById('endRemarks').value = '';
    } catch (error) {
        showNotification('⚠️ GPS location required!', 'error');
    }
}

// Customer Management
function openAddCustomerModal() {
    document.getElementById('addCustomerModal').classList.add('active');
}

function closeAddCustomerModal() {
    document.getElementById('addCustomerModal').classList.remove('active');
}

function saveCustomer() {
    const type = document.getElementById('customerType').value;
    const name = document.getElementById('customerName').value;
    const specialty = document.getElementById('customerSpecialty').value;
    const mobile = document.getElementById('customerMobile').value;
    const email = document.getElementById('customerEmail').value;
    const address = document.getElementById('customerAddress').value;
    const city = document.getElementById('customerCity').value;
    
    if (!type || !name) {
        showNotification('Please fill required fields!', 'error');
        return;
    }
    
    const customerData = {
        id: 'CUST' + Date.now(),
        employeeId: currentUser.employeeId,
        type: type,
        name: name,
        specialty: specialty,
        mobile: mobile,
        email: email,
        address: address,
        city: city,
        status: 'Pending Approval',
        createdAt: new Date().toISOString()
    };
    
    let customers = JSON.parse(localStorage.getItem('customers') || '[]');
    customers.push(customerData);
    localStorage.setItem('customers', JSON.stringify(customers));
    
    showNotification('✅ Customer added! Pending HO approval');
    closeAddCustomerModal();
    loadCustomers();
    
    // Clear form
    document.getElementById('customerType').value = '';
    document.getElementById('customerName').value = '';
    document.getElementById('customerSpecialty').value = '';
    document.getElementById('customerMobile').value = '';
    document.getElementById('customerEmail').value = '';
    document.getElementById('customerAddress').value = '';
    document.getElementById('customerCity').value = '';
}

function loadCustomers() {
    const customers = JSON.parse(localStorage.getItem('customers') || '[]');
    const myCustomers = customers.filter(c => c.employeeId === currentUser.employeeId);
    const list = document.getElementById('customersList');
    
    if (myCustomers.length === 0) {
        list.innerHTML = '<div class="card text-gray-500 text-center">No customers found</div>';
        return;
    }
    
    list.innerHTML = myCustomers.map(c => `
        <div class="list-item">
            <div class="flex justify-between items-start">
                <div>
                    <div class="font-bold">${c.name}</div>
                    <div class="text-sm text-gray-600">${c.type} • ${c.specialty || 'N/A'}</div>
                    <div class="text-xs text-gray-500">📞 ${c.mobile || 'N/A'} • 📍 ${c.city || 'N/A'}</div>
                </div>
                <span class="status-badge status-${c.status === 'Approved' ? 'active' : 'pending'}">${c.status}</span>
            </div>
        </div>
    `).join('');
}

function searchCustomers() {
    const searchTerm = document.getElementById('searchCustomer').value.toLowerCase();
    const customers = JSON.parse(localStorage.getItem('customers') || '[]');
    const filtered = customers.filter(c => 
        c.employeeId === currentUser.employeeId &&
        (c.name.toLowerCase().includes(searchTerm) || c.mobile.includes(searchTerm))
    );
    
    const list = document.getElementById('customersList');
    list.innerHTML = filtered.map(c => `
        <div class="list-item">
            <div class="flex justify-between items-start">
                <div>
                    <div class="font-bold">${c.name}</div>
                    <div class="text-sm text-gray-600">${c.type} • ${c.specialty || 'N/A'}</div>
                    <div class="text-xs text-gray-500">📞 ${c.mobile || 'N/A'} • 📍 ${c.city || 'N/A'}</div>
                </div>
                <span class="status-badge status-${c.status === 'Approved' ? 'active' : 'pending'}">${c.status}</span>
            </div>
        </div>
    `).join('');
}

function filterCustomers() {
    const type = document.getElementById('filterCustomerType').value;
    const customers = JSON.parse(localStorage.getItem('customers') || '[]');
    let filtered = customers.filter(c => c.employeeId === currentUser.employeeId);
    
    if (type) {
        filtered = filtered.filter(c => c.type === type);
    }
    
    const list = document.getElementById('customersList');
    list.innerHTML = filtered.map(c => `
        <div class="list-item">
            <div class="flex justify-between items-start">
                <div>
                    <div class="font-bold">${c.name}</div>
                    <div class="text-sm text-gray-600">${c.type} • ${c.specialty || 'N/A'}</div>
                    <div class="text-xs text-gray-500">📞 ${c.mobile || 'N/A'} • 📍 ${c.city || 'N/A'}</div>
                </div>
                <span class="status-badge status-${c.status === 'Approved' ? 'active' : 'pending'}">${c.status}</span>
            </div>
        </div>
    `).join('');
}

// Stockist Management
function openAddStockistModal() {
    document.getElementById('addStockistModal').classList.add('active');
}

function closeAddStockistModal() {
    document.getElementById('addStockistModal').classList.remove('active');
}

function saveStockist() {
    const name = document.getElementById('stockistName').value;
    const firm = document.getElementById('stockistFirm').value;
    const mobile = document.getElementById('stockistMobile').value;
    const email = document.getElementById('stockistEmail').value;
    const address = document.getElementById('stockistAddress').value;
    const city = document.getElementById('stockistCity').value;
    const gstin = document.getElementById('stockistGSTIN').value;
    
    if (!name) {
        showNotification('Please enter stockist name!', 'error');
        return;
    }
    
    const stockistData = {
        id: 'STK' + Date.now(),
        employeeId: currentUser.employeeId,
        name: name,
        firm: firm,
        mobile: mobile,
        email: email,
        address: address,
        city: city,
        gstin: gstin,
        status: 'Active',
        createdAt: new Date().toISOString()
    };
    
    let stockists = JSON.parse(localStorage.getItem('stockists') || '[]');
    stockists.push(stockistData);
    localStorage.setItem('stockists', JSON.stringify(stockists));
    
    showNotification('✅ Stockist added successfully!');
    closeAddStockistModal();
    loadStockists();
    
    // Clear form
    document.getElementById('stockistName').value = '';
    document.getElementById('stockistFirm').value = '';
    document.getElementById('stockistMobile').value = '';
    document.getElementById('stockistEmail').value = '';
    document.getElementById('stockistAddress').value = '';
    document.getElementById('stockistCity').value = '';
    document.getElementById('stockistGSTIN').value = '';
}

function loadStockists() {
    const stockists = JSON.parse(localStorage.getItem('stockists') || '[]');
    const myStockists = stockists.filter(s => s.employeeId === currentUser.employeeId);
    const list = document.getElementById('stockistList');
    
    if (myStockists.length === 0) {
        list.innerHTML = '<div class="card text-gray-500 text-center">No stockists found</div>';
        return;
    }
    
    list.innerHTML = myStockists.map(s => `
        <div class="list-item">
            <div class="font-bold">${s.name}</div>
            <div class="text-sm text-gray-600">${s.firm || 'N/A'}</div>
            <div class="text-xs text-gray-500">📞 ${s.mobile || 'N/A'} • 📍 ${s.city || 'N/A'}</div>
            <div class="text-xs text-gray-500 mt-1">GSTIN: ${s.gstin || 'N/A'}</div>
        </div>
    `).join('');
}

function searchStockists() {
    const searchTerm = document.getElementById('searchStockist').value.toLowerCase();
    const stockists = JSON.parse(localStorage.getItem('stockists') || '[]');
    const filtered = stockists.filter(s => 
        s.employeeId === currentUser.employeeId &&
        (s.name.toLowerCase().includes(searchTerm) || s.mobile.includes(searchTerm))
    );
    
    const list = document.getElementById('stockistList');
    list.innerHTML = filtered.map(s => `
        <div class="list-item">
            <div class="font-bold">${s.name}</div>
            <div class="text-sm text-gray-600">${s.firm || 'N/A'}</div>
            <div class="text-xs text-gray-500">📞 ${s.mobile || 'N/A'} • 📍 ${s.city || 'N/A'}</div>
            <div class="text-xs text-gray-500 mt-1">GSTIN: ${s.gstin || 'N/A'}</div>
        </div>
    `).join('');
}

// Tour Plan
function saveTourPlan() {
    const date = document.getElementById('tourDate').value;
    const area = document.getElementById('tourArea').value;
    const customers = document.getElementById('tourCustomers').value;
    const startTime = document.getElementById('tourStartTime').value;
    const type = document.getElementById('tourType').value;
    const objective = document.getElementById('tourObjective').value;
    
    if (!date || !area || !type) {
        showNotification('Please fill required fields!', 'error');
        return;
    }
    
    const tourData = {
        employeeId: currentUser.employeeId,
        name: currentUser.name,
        date: date,
        area: area,
        customers: customers,
        startTime: startTime,
        type: type,
        objective: objective,
        status: 'Planned',
        timestamp: new Date().toISOString()
    };
    
    let tours = JSON.parse(localStorage.getItem('tours') || '[]');
    tours.push(tourData);
    localStorage.setItem('tours', JSON.stringify(tours));
    
    showNotification('✅ Tour plan saved!');
    loadTours();
    
    document.getElementById('tourArea').value = '';
    document.getElementById('tourCustomers').value = '';
    document.getElementById('tourStartTime').value = '';
    document.getElementById('tourType').value = '';
    document.getElementById('tourObjective').value = '';
}

function loadTours() {
    const tours = JSON.parse(localStorage.getItem('tours') || '[]');
    const myTours = tours.filter(t => t.employeeId === currentUser.employeeId);
    const tourList = document.getElementById('tourList');
    
    if (myTours.length === 0) {
        tourList.innerHTML = '<div class="text-gray-500 text-sm">No tours planned</div>';
        return;
    }
    
    tourList.innerHTML = myTours.slice(-5).reverse().map(tour => `
        <div class="list-item">
            <div class="flex justify-between items-start">
                <div>
                    <div class="font-bold">${tour.area}</div>
                    <div class="text-sm text-gray-600">${tour.type}</div>
                    <div class="text-xs text-gray-500">${tour.date} • ${tour.startTime || 'No time'}</div>
                </div>
                <span class="status-badge status-pending">${tour.status}</span>
            </div>
        </div>
    `).join('');
}

// Expense Management
function saveExpense() {
    const date = document.getElementById('expenseDate').value;
    const category = document.getElementById('expenseCategory').value;
    const amount = document.getElementById('expenseAmount').value;
    const location = document.getElementById('expenseLocation').value;
    const description = document.getElementById('expenseDescription').value;
    
    if (!date || !category || !amount) {
        showNotification('Please fill required fields!', 'error');
        return;
    }
    
    const expenseData = {
        employeeId: currentUser.employeeId,
        name: currentUser.name,
        date: date,
        category: category,
        amount: parseFloat(amount),
        location: location,
        description: description,
        status: 'Pending',
        timestamp: new Date().toISOString()
    };
    
    let expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    expenses.push(expenseData);
    localStorage.setItem('expenses', JSON.stringify(expenses));
    
    showNotification('✅ Expense added!');
    loadExpenses();
    
    document.getElementById('expenseCategory').value = '';
    document.getElementById('expenseAmount').value = '';
    document.getElementById('expenseLocation').value = '';
    document.getElementById('expenseDescription').value = '';
}

function loadExpenses() {
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    const myExpenses = expenses.filter(e => e.employeeId === currentUser.employeeId);
    
    const today = new Date().toISOString().split('T')[0];
    const todayExpenses = myExpenses.filter(e => e.date === today);
    const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
    
    const currentMonth = new Date().getMonth();
    const monthExpenses = myExpenses.filter(e => new Date(e.date).getMonth() === currentMonth);
    const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    
    document.getElementById('dayExpense').textContent = todayTotal;
    document.getElementById('monthExpense').textContent = monthTotal;
    
    const expenseList = document.getElementById('expenseList');
    if (myExpenses.length === 0) {
        expenseList.innerHTML = '<div class="text-gray-500 text-sm">No expenses recorded</div>';
        return;
    }
    
    expenseList.innerHTML = myExpenses.slice(-5).reverse().map(exp => `
        <div class="list-item">
            <div class="flex justify-between">
                <div>
                    <div class="font-bold">${exp.category}</div>
                    <div class="text-sm text-gray-600">${exp.description}</div>
                    <div class="text-xs text-gray-500">${exp.date}</div>
                </div>
                <div>
                    <div class="font-bold text-lg">₹${exp.amount}</div>
                    <span class="status-badge status-${exp.status === 'Approved' ? 'active' : 'pending'} text-xs">${exp.status}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Daily Reports (DCR)
function populateCustomersDropdown() {
    const customers = JSON.parse(localStorage.getItem('customers') || '[]');
    const myCustomers = customers.filter(c => c.employeeId === currentUser.employeeId && c.status === 'Approved');
    const select = document.getElementById('reportCustomer');
    
    select.innerHTML = '<option value="">Select Customer</option>';
    myCustomers.forEach(c => {
        select.innerHTML += `<option value="${c.name}">${c.name} (${c.type})</option>`;
    });
}

async function saveDailyReport() {
    const date = document.getElementById('reportDate').value;
    const customer = document.getElementById('reportCustomer').value;
    const type = document.getElementById('reportType').value;
    const time = document.getElementById('reportTime').value;
    const products = document.getElementById('reportProducts').value;
    const samples = document.getElementById('reportSamples').value || 0;
    const feedback = document.getElementById('reportFeedback').value;
    const pob = document.getElementById('reportPOB').value || 0;
    const remarks = document.getElementById('reportRemarks').value;
    
    if (!date || !customer || !type) {
        showNotification('Please fill required fields!', 'error');
        return;
    }
    
    try {
        showNotification('Getting GPS location...', 'info');
        const location = await getLocation();
        
        const reportData = {
            employeeId: currentUser.employeeId,
            name: currentUser.name,
            date: date,
            customer: customer,
            type: type,
            time: time,
            products: products,
            samples: parseInt(samples),
            feedback: feedback,
            pob: parseFloat(pob),
            remarks: remarks,
            location: location,
            timestamp: new Date().toISOString()
        };
        
        let reports = JSON.parse(localStorage.getItem('reports') || '[]');
        reports.push(reportData);
        localStorage.setItem('reports', JSON.stringify(reports));
        
        showNotification('✅ Report submitted with GPS!');
        loadReports();
        
        // Update achievement
        updateAchievement();
        
        // Clear form
        document.getElementById('reportCustomer').value = '';
        document.getElementById('reportType').value = '';
        document.getElementById('reportTime').value = '';
        document.getElementById('reportProducts').value = '';
        document.getElementById('reportSamples').value = '';
        document.getElementById('reportFeedback').value = '';
        document.getElementById('reportPOB').value = '';
        document.getElementById('reportRemarks').value = '';
    } catch (error) {
        showNotification('⚠️ GPS location required!', 'error');
    }
}

function loadReports() {
    const reports = JSON.parse(localStorage.getItem('reports') || '[]');
    const myReports = reports.filter(r => r.employeeId === currentUser.employeeId);
    
    const today = new Date().toISOString().split('T')[0];
    const todayReports = myReports.filter(r => r.date === today);
    
    const totalCalls = todayReports.length;
    const totalPOB = todayReports.reduce((sum, r) => sum + r.pob, 0);
    
    document.getElementById('totalCalls').textContent = totalCalls;
    document.getElementById('totalPOB').textContent = totalPOB;
}

// Leave Management
function applyLeave() {
    const startDate = document.getElementById('leaveStartDate').value;
    const endDate = document.getElementById('leaveEndDate').value;
    const type = document.getElementById('leaveType').value;
    const reason = document.getElementById('leaveReason').value;
    
    if (!startDate || !endDate || !type || !reason) {
        showNotification('Please fill all fields!', 'error');
        return;
    }
    
    const leaveData = {
        employeeId: currentUser.employeeId,
        name: currentUser.name,
        startDate: startDate,
        endDate: endDate,
        type: type,
        reason: reason,
        status: 'Pending',
        appliedOn: new Date().toISOString()
    };
    
    let leaves = JSON.parse(localStorage.getItem('leaves') || '[]');
    leaves.push(leaveData);
    localStorage.setItem('leaves', JSON.stringify(leaves));
    
    showNotification('✅ Leave request submitted!');
    loadLeaveHistory();
    
    document.getElementById('leaveStartDate').value = today;
    document.getElementById('leaveEndDate').value = today;
    document.getElementById('leaveType').value = '';
    document.getElementById('leaveReason').value = '';
}

function loadLeaveHistory() {
    const leaves = JSON.parse(localStorage.getItem('leaves') || '[]');
    const myLeaves = leaves.filter(l => l.employeeId === currentUser.employeeId);
    const list = document.getElementById('leaveHistory');
    
    const approvedLeaves = myLeaves.filter(l => l.status === 'Approved').length;
    document.getElementById('takenLeaves').textContent = approvedLeaves;
    document.getElementById('availableLeaves').textContent = 12 - approvedLeaves;
    
    if (myLeaves.length === 0) {
        list.innerHTML = '<div class="text-gray-500 text-sm">No leave history</div>';
        return;
    }
    
    list.innerHTML = myLeaves.slice(-5).reverse().map(leave => `
        <div class="list-item">
            <div class="flex justify-between items-start">
                <div>
                    <div class="font-bold">${leave.type}</div>
                    <div class="text-sm text-gray-600">${leave.startDate} to ${leave.endDate}</div>
                    <div class="text-xs text-gray-500">${leave.reason}</div>
                </div>
                <span class="status-badge status-${leave.status === 'Approved' ? 'active' : leave.status === 'Rejected' ? 'inactive' : 'pending'}">${leave.status}</span>
            </div>
        </div>
    `).join('');
}

// Target vs Achievement
function updateAchievement() {
    const reports = JSON.parse(localStorage.getItem('reports') || '[]');
    const myReports = reports.filter(r => r.employeeId === currentUser.employeeId);
    
    const currentMonth = new Date().getMonth();
    const monthReports = myReports.filter(r => new Date(r.date).getMonth() === currentMonth);
    
    const achievement = monthReports.reduce((sum, r) => sum + r.pob, 0);
    const target = 50000; // Default target
    const progress = Math.min((achievement / target) * 100, 100);
    
    document.getElementById('achievement').textContent = achievement;
    document.getElementById('monthlyTarget').textContent = target;
    document.getElementById('progressBar').style.width = progress + '%';
    document.getElementById('progressPercent').textContent = Math.round(progress);
}

// Logout
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        sessionStorage.clear();
        window.location.href = 'index.html';
    }
}

// Initialize
loadCustomers();
loadTours();
loadExpenses();
loadReports();
loadStockists();
loadLeaveHistory();
updateAchievement();

// Check day status
if (localStorage.getItem('dayStarted') === 'true') {
    document.getElementById('dayStatus').textContent = 'Day Started';
    document.getElementById('dayStatus').className = 'status-badge status-active';
    document.getElementById('todayStatus').textContent = 'Active';
}
