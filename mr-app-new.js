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

// GPS Helper Function
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

// Calculate distance between two GPS coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
}

// Notification Function
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// ========== PUNCH IN/OUT FUNCTIONALITY ==========

async function punchIn() {
    try {
        showNotification('Getting GPS location...', 'info');
        const location = await getLocation();
        
        const punchData = {
            employeeId: currentUser.employeeId,
            name: currentUser.name,
            action: 'PunchIn',
            date: new Date().toLocaleDateString('hi-IN'),
            time: new Date().toLocaleTimeString('hi-IN'),
            location: location,
            timestamp: new Date().toISOString()
        };
        
        // Save punch in data
        sessionStorage.setItem('todayPunchIn', JSON.stringify(punchData));
        
        // Save to history
        let punchRecords = JSON.parse(localStorage.getItem('punchRecords') || '[]');
        punchRecords.push(punchData);
        localStorage.setItem('punchRecords', JSON.stringify(punchRecords));
        
        // Update UI
        document.getElementById('punchInCard').style.display = 'none';
        document.getElementById('punchOutCard').style.display = 'block';
        document.getElementById('dayStatus').textContent = 'Day Active';
        document.getElementById('dayStatus').className = 'status-badge status-active';
        document.getElementById('todayStatus').textContent = 'Active';
        
        // Display punch in details
        document.getElementById('punchInDetails').innerHTML = `
            <div>⏰ Time: ${punchData.time}</div>
            <div>📅 Date: ${punchData.date}</div>
            <div>📍 Lat: ${location.latitude.toFixed(4)}, Lng: ${location.longitude.toFixed(4)}</div>
        `;
        
        showNotification('✅ Punched In Successfully!');
    } catch (error) {
        showNotification('⚠️ GPS location required for Punch In!', 'error');
    }
}

async function confirmPunchOut() {
    if (!confirm('Are you sure you want to Punch Out? This will end your day.')) return;
    
    await punchOut();
}

async function punchOut() {
    try {
        showNotification('Getting GPS location...', 'info');
        const location = await getLocation();
        
        const punchInData = JSON.parse(sessionStorage.getItem('todayPunchIn') || 'null');
        if (!punchInData) {
            showNotification('No Punch In record found!', 'error');
            return;
        }
        
        // Calculate total KM from all calls
        const reports = JSON.parse(localStorage.getItem('reports') || '[]');
        const todayReports = reports.filter(r => 
            r.employeeId === currentUser.employeeId && 
            r.date === new Date().toISOString().split('T')[0]
        );
        
        let totalKm = 0;
        let lastLocation = punchInData.location;
        
        // Calculate KM from punch in to first call, then call to call, then last call to punch out
        todayReports.forEach(report => {
            if (report.location) {
                const km = calculateDistance(
                    lastLocation.latitude, lastLocation.longitude,
                    report.location.latitude, report.location.longitude
                );
                totalKm += km;
                lastLocation = report.location;
            }
        });
        
        // Add distance from last call to punch out location
        if (todayReports.length > 0 && lastLocation) {
            const finalKm = calculateDistance(
                lastLocation.latitude, lastLocation.longitude,
                location.latitude, location.longitude
            );
            totalKm += finalKm;
        }
        
        const punchOutData = {
            employeeId: currentUser.employeeId,
            name: currentUser.name,
            action: 'PunchOut',
            date: new Date().toLocaleDateString('hi-IN'),
            time: new Date().toLocaleTimeString('hi-IN'),
            location: location,
            totalCalls: todayReports.length,
            totalKm: totalKm.toFixed(2),
            timestamp: new Date().toISOString()
        };
        
        // Save punch out data
        let punchRecords = JSON.parse(localStorage.getItem('punchRecords') || '[]');
        punchRecords.push(punchOutData);
        localStorage.setItem('punchRecords', JSON.stringify(punchRecords));
        
        // Update UI
        document.getElementById('punchOutCard').style.display = 'none';
        document.getElementById('dayCompletedCard').style.display = 'block';
        document.getElementById('dayStatus').textContent = 'Day Completed';
        document.getElementById('dayStatus').className = 'status-badge status-inactive';
        document.getElementById('todayStatus').textContent = 'Completed';
        
        // Show summary
        document.getElementById('dayCompletedSummary').innerHTML = `
            <div class="font-bold mb-2">Day Summary:</div>
            <div>⏰ Punch In: ${punchInData.time}</div>
            <div>⏰ Punch Out: ${punchOutData.time}</div>
            <div>🎯 Total Calls: ${punchOutData.totalCalls}</div>
            <div>🚗 Total Distance: ${punchOutData.totalKm} km</div>
        `;
        
        // Update distance in home tab
        document.getElementById('todayDistance').textContent = punchOutData.totalKm;
        document.getElementById('todayVisits').textContent = punchOutData.totalCalls;
        
        // Clear session
        sessionStorage.removeItem('todayPunchIn');
        
        showNotification('✅ Punched Out Successfully!');
    } catch (error) {
        showNotification('⚠️ GPS location required for Punch Out!', 'error');
    }
}

// Update call count and KM in real-time
function updateDaySummary() {
    const punchInData = JSON.parse(sessionStorage.getItem('todayPunchIn') || 'null');
    if (!punchInData) return;
    
    const reports = JSON.parse(localStorage.getItem('reports') || '[]');
    const todayReports = reports.filter(r => 
        r.employeeId === currentUser.employeeId && 
        r.date === new Date().toISOString().split('T')[0]
    );
    
    let totalKm = 0;
    let lastLocation = punchInData.location;
    
    todayReports.forEach(report => {
        if (report.location) {
            const km = calculateDistance(
                lastLocation.latitude, lastLocation.longitude,
                report.location.latitude, report.location.longitude
            );
            totalKm += km;
            lastLocation = report.location;
        }
    });
    
    document.getElementById('todayCallCount').textContent = todayReports.length;
    document.getElementById('todayKmCount').textContent = totalKm.toFixed(2);
    document.getElementById('todayVisits').textContent = todayReports.length;
    document.getElementById('todayDistance').textContent = totalKm.toFixed(2);
}

// ========== EXPENSE MANAGEMENT ==========

function calculateExpenses() {
    const dayType = document.getElementById('dayType').value;
    const miscAmount = parseFloat(document.getElementById('miscAmount').value) || 0;
    
    if (!dayType) {
        document.getElementById('expenseBreakdown').style.display = 'none';
        document.getElementById('totalExpenseBox').style.display = 'none';
        return;
    }
    
    // Get employee expense settings from admin (stored in employees data)
    const employees = JSON.parse(localStorage.getItem('employees') || '[]');
    const emp = employees.find(e => e.employeeId === currentUser.employeeId);
    
    // Default rates if not set by admin
    const daRates = emp?.daRates || { HQ: 200, 'Ex-HQ': 300, OS: 500 };
    const taPerKm = emp?.taPerKm || 8;
    const mobileAllowance = emp?.mobileAllowance || 500;
    
    // Get today's KM from punch records or reports
    const todayKm = parseFloat(document.getElementById('todayKmCount')?.textContent) || 0;
    const todayCalls = parseInt(document.getElementById('todayCallCount')?.textContent) || 0;
    
    // Calculate DA (Daily Allowance)
    let da = daRates[dayType] || 0;
    
    // If HQ and call-based DA is enabled
    if (dayType === 'HQ' && emp?.daCallBased) {
        if (todayCalls <= 30) {
            da = todayCalls * 6;
        } else {
            da = (30 * 6) + ((todayCalls - 30) * 8);
        }
    }
    
    // Calculate TA (Travel Allowance)
    const ta = todayKm * taPerKm;
    
    // Mobile allowance
    const mobile = mobileAllowance;
    
    // Total calculation
    const total = da + ta + mobile + miscAmount;
    
    // Display breakdown
    document.getElementById('expenseBreakdown').style.display = 'block';
    document.getElementById('expenseCalc').innerHTML = `
        <div>💵 DA (Daily Allowance): ₹${da}</div>
        <div>🚗 TA (${todayKm.toFixed(2)} km × ₹${taPerKm}): ₹${ta.toFixed(2)}</div>
        <div>📱 Mobile Allowance: ₹${mobile}</div>
        ${miscAmount > 0 ? `<div>📝 MISC: ₹${miscAmount}</div>` : ''}
    `;
    
    document.getElementById('totalExpenseBox').style.display = 'block';
    document.getElementById('totalExpenseClaim').textContent = total.toFixed(2);
}

async function submitExpenseClaim() {
    const date = document.getElementById('expenseDate').value;
    const dayType = document.getElementById('dayType').value;
    const miscAmount = parseFloat(document.getElementById('miscAmount').value) || 0;
    const miscRemark = document.getElementById('miscRemark').value;
    const attachment = document.getElementById('expenseAttachment').files[0];
    
    if (!date || !dayType) {
        showNotification('Please select date and day type!', 'error');
        return;
    }
    
    if (miscAmount > 0 && !miscRemark) {
        showNotification('MISC remark is required when amount is entered!', 'error');
        return;
    }
    
    // Get calculated values
    const totalClaim = parseFloat(document.getElementById('totalExpenseClaim').textContent) || 0;
    const expenseCalc = document.getElementById('expenseCalc').innerHTML;
    
    // Handle file attachment (convert to base64 for local storage)
    let attachmentData = null;
    if (attachment) {
        attachmentData = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve({
                name: attachment.name,
                type: attachment.type,
                size: attachment.size,
                data: e.target.result
            });
            reader.readAsDataURL(attachment);
        });
    }
    
    const expenseData = {
        employeeId: currentUser.employeeId,
        name: currentUser.name,
        date: date,
        dayType: dayType,
        breakdown: expenseCalc,
        miscAmount: miscAmount,
        miscRemark: miscRemark,
        totalClaim: totalClaim,
        attachment: attachmentData,
        status: 'Pending',
        submittedOn: new Date().toISOString()
    };
    
    let expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    expenses.push(expenseData);
    localStorage.setItem('expenses', JSON.stringify(expenses));
    
    showNotification('✅ Expense claim submitted successfully!');
    loadExpenses();
    
    // Reset form
    document.getElementById('dayType').value = '';
    document.getElementById('miscAmount').value = '';
    document.getElementById('miscRemark').value = '';
    document.getElementById('expenseAttachment').value = '';
    document.getElementById('expenseBreakdown').style.display = 'none';
    document.getElementById('totalExpenseBox').style.display = 'none';
}

function loadExpenses() {
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    const myExpenses = expenses.filter(e => e.employeeId === currentUser.employeeId);
    
    const currentMonth = new Date().getMonth();
    const monthExpenses = myExpenses.filter(e => new Date(e.date).getMonth() === currentMonth);
    const monthTotal = monthExpenses.reduce((sum, e) => sum + e.totalClaim, 0);
    const pendingTotal = myExpenses.filter(e => e.status === 'Pending').reduce((sum, e) => sum + e.totalClaim, 0);
    
    document.getElementById('monthExpense').textContent = monthTotal.toFixed(2);
    document.getElementById('pendingExpense').textContent = pendingTotal.toFixed(2);
    
    const expenseList = document.getElementById('expenseList');
    if (myExpenses.length === 0) {
        expenseList.innerHTML = '<div class="text-gray-500 text-sm">No expenses submitted</div>';
        return;
    }
    
    expenseList.innerHTML = myExpenses.slice(-10).reverse().map(exp => `
        <div class="list-item">
            <div class="flex justify-between">
                <div>
                    <div class="font-bold">${exp.dayType} - ${exp.date}</div>
                    <div class="text-sm text-gray-600">Total: ₹${exp.totalClaim}</div>
                    ${exp.miscAmount > 0 ? `<div class="text-xs text-gray-500">MISC: ₹${exp.miscAmount} - ${exp.miscRemark}</div>` : ''}
                </div>
                <span class="status-badge status-${exp.status === 'Approved' ? 'active' : exp.status === 'Rejected' ? 'inactive' : 'pending'}">${exp.status}</span>
            </div>
        </div>
    `).join('');
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
    if (tabName === 'expense') { loadExpenses(); updateDaySummary(); }
    if (tabName === 'reports') { loadReports(); populateCustomersDropdown(); }
    if (tabName === 'stockist') loadStockists();
    if (tabName === 'nwday') loadLeaveHistory();
    if (tabName === 'day') checkDayStatus();
}

function quickAction(tab) {
    switchTab(tab);
}

function checkDayStatus() {
    const punchInData = JSON.parse(sessionStorage.getItem('todayPunchIn') || 'null');
    
    if (punchInData) {
        document.getElementById('punchInCard').style.display = 'none';
        document.getElementById('punchOutCard').style.display = 'block';
        document.getElementById('punchInDetails').innerHTML = `
            <div>⏰ Time: ${punchInData.time}</div>
            <div>📅 Date: ${punchInData.date}</div>
            <div>📍 Lat: ${punchInData.location.latitude.toFixed(4)}, Lng: ${punchInData.location.longitude.toFixed(4)}</div>
        `;
        updateDaySummary();
    } else {
        document.getElementById('punchInCard').style.display = 'block';
        document.getElementById('punchOutCard').style.display = 'none';
        document.getElementById('dayCompletedCard').style.display = 'none';
    }
}

// ========== CUSTOMER MANAGEMENT ==========

function openAddCustomerModal() {
    document.getElementById('addCustomerModal').classList.add('active');
}

function closeAddCustomerModal() {
    document.getElementById('addCustomerModal').classList.remove('active');
}

async function saveCustomer() {
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
    
    try {
        const location = await getLocation();
        
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
            location: location,
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
    } catch (error) {
        showNotification('⚠️ GPS location required!', 'error');
    }
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
        (c.name.toLowerCase().includes(searchTerm) || (c.mobile && c.mobile.includes(searchTerm)))
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

// ========== DAILY REPORTS (DCR) ==========

function populateCustomersDropdown() {
    const customers = JSON.parse(localStorage.getItem('customers') || '[]');
    const myCustomers = customers.filter(c => c.employeeId === currentUser.employeeId && c.status === 'Approved');
    const select = document.getElementById('reportCustomer');
    
    select.innerHTML = '<option value="">Select Customer</option>';
    myCustomers.forEach(c => {
        select.innerHTML += `<option value="${c.id}" data-name="${c.name}">${c.name} (${c.type})</option>`;
    });
}

async function saveDailyReport() {
    // Check if day is started
    const punchInData = JSON.parse(sessionStorage.getItem('todayPunchIn') || 'null');
    if (!punchInData) {
        showNotification('Please Punch In first to submit reports!', 'error');
        return;
    }
    
    const date = document.getElementById('reportDate').value;
    const customerId = document.getElementById('reportCustomer').value;
    const customerName = document.getElementById('reportCustomer').selectedOptions[0]?.getAttribute('data-name');
    const type = document.getElementById('reportType').value;
    const time = document.getElementById('reportTime').value;
    const products = document.getElementById('reportProducts').value;
    const samples = document.getElementById('reportSamples').value || 0;
    const feedback = document.getElementById('reportFeedback').value;
    const pob = document.getElementById('reportPOB').value || 0;
    const remarks = document.getElementById('reportRemarks').value;
    
    if (!date || !customerId || !type) {
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
            customerId: customerId,
            customer: customerName,
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
        updateDaySummary();
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

// ========== STOCKIST MANAGEMENT ==========

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
        (s.name.toLowerCase().includes(searchTerm) || (s.mobile && s.mobile.includes(searchTerm)))
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

// ========== TOUR PLAN ==========

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

// ========== LEAVE MANAGEMENT ==========

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

// ========== TARGET VS ACHIEVEMENT ==========

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

// ========== LOGOUT ==========

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        sessionStorage.clear();
        window.location.href = 'index.html';
    }
}

// ========== INITIALIZE ==========

loadCustomers();
loadTours();
loadExpenses();
loadReports();
loadStockists();
loadLeaveHistory();
updateAchievement();
checkDayStatus();
