// Google Sheets Configuration
const GOOGLE_SHEET_CONFIG = {
    WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbznmwLMRskh3pzFzFUfrUqPlBvsl0h9h8dLHoj5uT2RrJ4vZO6xPU9Ce82PVgmyQQZTFw/exec',
    SHEET_ID: '1wTed_N96_C-jeDR9Q-fyMt4PZ0dB8q6XEIjHg951s2s'
};

// API Helper Functions
async function sendToGoogleSheet(action, data) {
    try {
        const response = await fetch(GOOGLE_SHEET_CONFIG.WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: action,
                ...data
            })
        });
        
        console.log('Data sent to Google Sheets:', action);
        return { status: 'success' };
    } catch (error) {
        console.error('Error sending to Google Sheets:', error);
        return { status: 'error', message: error.message };
    }
}

async function getFromGoogleSheet(action) {
    try {
        const url = `${GOOGLE_SHEET_CONFIG.WEB_APP_URL}?action=${action}`;
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching from Google Sheets:', error);
        return { status: 'error', data: [] };
    }
}

// Sync Functions
async function syncEmployees() {
    const localEmployees = JSON.parse(localStorage.getItem('employees') || '[]');
    
    // Fetch from Google Sheets
    const sheetData = await getFromGoogleSheet('getEmployees');
    
    if (sheetData.status === 'success' && sheetData.data.length > 0) {
        localStorage.setItem('employees', JSON.stringify(sheetData.data));
        return sheetData.data;
    }
    
    // If no data in sheets, upload local data
    if (localEmployees.length > 0) {
        for (const emp of localEmployees) {
            await sendToGoogleSheet('addEmployee', emp);
        }
    }
    
    return localEmployees;
}

async function syncReports() {
    const localReports = JSON.parse(localStorage.getItem('reports') || '[]');
    
    const sheetData = await getFromGoogleSheet('getReports');
    
    if (sheetData.status === 'success' && sheetData.data.length > 0) {
        localStorage.setItem('reports', JSON.stringify(sheetData.data));
        return sheetData.data;
    }
    
    if (localReports.length > 0) {
        for (const report of localReports) {
            await sendToGoogleSheet('addReport', report);
        }
    }
    
    return localReports;
}

async function syncCustomers() {
    const localCustomers = JSON.parse(localStorage.getItem('customers') || '[]');
    
    const sheetData = await getFromGoogleSheet('getCustomers');
    
    if (sheetData.status === 'success' && sheetData.data.length > 0) {
        localStorage.setItem('customers', JSON.stringify(sheetData.data));
        return sheetData.data;
    }
    
    if (localCustomers.length > 0) {
        for (const customer of localCustomers) {
            await sendToGoogleSheet('addCustomer', customer);
        }
    }
    
    return localCustomers;
}

async function syncExpenses() {
    const localExpenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    
    const sheetData = await getFromGoogleSheet('getExpenses');
    
    if (sheetData.status === 'success' && sheetData.data.length > 0) {
        localStorage.setItem('expenses', JSON.stringify(sheetData.data));
        return sheetData.data;
    }
    
    if (localExpenses.length > 0) {
        for (const expense of localExpenses) {
            await sendToGoogleSheet('addExpense', expense);
        }
    }
    
    return localExpenses;
}

// Auto-sync on load
window.addEventListener('load', async () => {
    console.log('Starting auto-sync with Google Sheets...');
    
    // Sync all data
    await syncEmployees();
    await syncReports();
    await syncCustomers();
    await syncExpenses();
    
    console.log('Auto-sync completed!');
});