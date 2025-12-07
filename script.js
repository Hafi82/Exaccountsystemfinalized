// State Management
const state = {
    customers: JSON.parse(localStorage.getItem('eg_customers')) || [],
    invoices: JSON.parse(localStorage.getItem('eg_invoices')) || [],
    settings: {
        currency: 'LKR',
        taxRate: 0
    }
};

// DOM Elements
const navLinks = document.querySelectorAll('.nav-links li');
const sections = document.querySelectorAll('.section');
const pageTitle = document.getElementById('page-title');

// Modals
const customerModal = document.getElementById('customer-modal');
const invoiceModal = document.getElementById('invoice-modal');
const paymentModal = document.getElementById('payment-modal');
const closeBtns = document.querySelectorAll('.close-modal, .close-modal-btn');

// Forms
const customerForm = document.getElementById('customer-form');
const invoiceForm = document.getElementById('invoice-form');
const paymentForm = document.getElementById('payment-form');

// Utility Functions
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);
const formatCurrency = (amount) => `LKR ${parseFloat(amount).toFixed(2)}`;
const formatDate = (dateString) => new Date(dateString).toLocaleDateString();
const saveState = () => {
    localStorage.setItem('eg_customers', JSON.stringify(state.customers));
    localStorage.setItem('eg_invoices', JSON.stringify(state.invoices));
    updateDashboard();
};

// Navigation
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        const sectionId = link.getAttribute('data-section');

        // Update Active State
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        sections.forEach(s => s.classList.remove('active'));
        document.getElementById(sectionId).classList.add('active');

        pageTitle.textContent = link.querySelector('span').textContent;

        // Refresh Data based on section
        if (sectionId === 'customers') renderCustomers();
        if (sectionId === 'invoices') renderInvoices();
        if (sectionId === 'reports') renderReports();
    });
});

// Modal Handling
const openModal = (modal) => modal.classList.add('active');
const closeModal = (modal) => modal.classList.remove('active');

closeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        closeModal(modal);
    });
});

window.onclick = (e) => {
    if (e.target.classList.contains('modal')) {
        closeModal(e.target);
    }
};

// --- CUSTOMERS SECTION ---

const renderCustomers = (filter = '') => {
    const tbody = document.getElementById('customer-list');
    tbody.innerHTML = '';

    const filtered = state.customers.filter(c =>
        c.name.toLowerCase().includes(filter.toLowerCase()) ||
        (c.phone && c.phone.includes(filter))
    );

    filtered.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${c.name}</td>
            <td>${c.phone || '-'} <br> <small>${c.email || ''}</small></td>
            <td>${c.address || '-'}</td>
            <td>
                <button class="btn-secondary small" onclick="editCustomer('${c.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-secondary small" style="color: var(--danger-color); border-color: var(--danger-color);" onclick="deleteCustomer('${c.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

document.getElementById('add-customer-btn').addEventListener('click', () => {
    document.getElementById('customer-id').value = '';
    customerForm.reset();
    document.getElementById('customer-modal-title').textContent = 'Add Customer';
    openModal(customerModal);
});

customerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('customer-id').value;
    const name = document.getElementById('customer-name').value;
    const phone = document.getElementById('customer-phone').value;
    const email = document.getElementById('customer-email').value;
    const address = document.getElementById('customer-address').value;

    if (id) {
        // Edit
        const index = state.customers.findIndex(c => c.id === id);
        state.customers[index] = { id, name, phone, email, address };
    } else {
        // Add
        state.customers.push({ id: generateId(), name, phone, email, address });
    }

    saveState();
    closeModal(customerModal);
    renderCustomers();
});

window.editCustomer = (id) => {
    const c = state.customers.find(c => c.id === id);
    if (c) {
        document.getElementById('customer-id').value = c.id;
        document.getElementById('customer-name').value = c.name;
        document.getElementById('customer-phone').value = c.phone;
        document.getElementById('customer-email').value = c.email;
        document.getElementById('customer-address').value = c.address;
        document.getElementById('customer-modal-title').textContent = 'Edit Customer';
        openModal(customerModal);
    }
};

window.deleteCustomer = (id) => {
    if (confirm('Are you sure? This will not delete their invoices.')) {
        state.customers = state.customers.filter(c => c.id !== id);
        saveState();
        renderCustomers();
    }
};

document.getElementById('customer-search').addEventListener('input', (e) => {
    renderCustomers(e.target.value);
});

// --- INVOICES SECTION ---

const renderInvoices = (statusFilter = 'all', searchFilter = '') => {
    const tbody = document.getElementById('invoice-list');
    tbody.innerHTML = '';

    let filtered = state.invoices;

    // Status Filter
    if (statusFilter !== 'all') {
        if (statusFilter === 'overdue') {
            // Simple overdue logic: unpaid/partial and date < today (not implemented strictly, just showing unpaid for now or we can add due date logic)
            // For now, let's treat overdue as unpaid invoices older than 30 days or just unpaid
            filtered = filtered.filter(inv => inv.status !== 'paid'); // Placeholder
        } else {
            filtered = filtered.filter(inv => inv.status === statusFilter);
        }
    }

    // Search Filter
    if (searchFilter) {
        const term = searchFilter.toLowerCase();
        filtered = filtered.filter(inv =>
            inv.number.toLowerCase().includes(term) ||
            inv.customerName.toLowerCase().includes(term)
        );
    }

    // Sort by date desc
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    filtered.forEach(inv => {
        const tr = document.createElement('tr');
        const statusClass = `status-${inv.status}`;

        tr.innerHTML = `
            <td>${inv.number}</td>
            <td>${formatDate(inv.date)}</td>
            <td>${inv.customerName}</td>
            <td>${formatCurrency(inv.grandTotal)}</td>
            <td>${formatCurrency(inv.paidAmount || 0)}</td>
            <td><span class="status-badge ${statusClass}">${inv.status.toUpperCase()}</span></td>
            <td>
                <button class="btn-secondary small" onclick="viewInvoice('${inv.id}')" title="Download PDF"><i class="fa-solid fa-file-pdf"></i></button>
                <button class="btn-secondary small" onclick="openPaymentModal('${inv.id}')" title="Record Payment"><i class="fa-solid fa-money-bill"></i></button>
                <button class="btn-secondary small" style="color: var(--danger-color);" onclick="deleteInvoice('${inv.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

// Invoice Creation Logic
let currentInvoiceItems = [];

document.getElementById('create-invoice-btn').addEventListener('click', () => {
    // Populate Customer Dropdown
    const select = document.getElementById('invoice-customer');
    select.innerHTML = '<option value="">Select Customer</option>';
    state.customers.forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });

    // Reset Form
    invoiceForm.reset();
    document.getElementById('invoice-date').valueAsDate = new Date();
    currentInvoiceItems = [];
    renderInvoiceItems();
    updateInvoiceTotals();

    openModal(invoiceModal);
});

document.getElementById('add-item-btn').addEventListener('click', () => {
    currentInvoiceItems.push({ desc: '', qty: 1, price: 0 });
    renderInvoiceItems();
});

const renderInvoiceItems = () => {
    const tbody = document.getElementById('invoice-items-list');
    tbody.innerHTML = '';

    currentInvoiceItems.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" value="${item.desc}" onchange="updateItem(${index}, 'desc', this.value)" placeholder="Description"></td>
            <td><input type="number" value="${item.qty}" min="1" onchange="updateItem(${index}, 'qty', this.value)"></td>
            <td><input type="number" value="${item.price}" min="0" step="0.01" onchange="updateItem(${index}, 'price', this.value)"></td>
            <td style="text-align: right; padding-right: 1rem;">${formatCurrency(item.qty * item.price)}</td>
            <td><button type="button" class="btn-secondary small" style="color: var(--danger-color); border:none;" onclick="removeInvoiceItem(${index})"><i class="fa-solid fa-times"></i></button></td>
        `;
        tbody.appendChild(tr);
    });
    updateInvoiceTotals();
};

window.updateItem = (index, field, value) => {
    currentInvoiceItems[index][field] = field === 'desc' ? value : parseFloat(value);
    renderInvoiceItems();
};

window.removeInvoiceItem = (index) => {
    currentInvoiceItems.splice(index, 1);
    renderInvoiceItems();
};

const updateInvoiceTotals = () => {
    const subtotal = currentInvoiceItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
    document.getElementById('invoice-subtotal').textContent = subtotal.toFixed(2);

    const discountVal = parseFloat(document.getElementById('invoice-discount-val').value) || 0;
    const discountType = document.getElementById('invoice-discount-type').value;

    let discountAmount = 0;
    if (discountType === 'percent') {
        discountAmount = subtotal * (discountVal / 100);
    } else {
        discountAmount = discountVal;
    }

    const total = Math.max(0, subtotal - discountAmount);
    document.getElementById('invoice-total').textContent = total.toFixed(2);

    return { subtotal, discountAmount, total };
};

document.getElementById('invoice-discount-val').addEventListener('input', updateInvoiceTotals);
document.getElementById('invoice-discount-type').addEventListener('change', updateInvoiceTotals);

invoiceForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const customerId = document.getElementById('invoice-customer').value;
    const customer = state.customers.find(c => c.id === customerId);
    if (!customer) return alert('Please select a customer');

    if (currentInvoiceItems.length === 0) return alert('Please add at least one item');

    const { subtotal, discountAmount, total } = updateInvoiceTotals();

    const newInvoice = {
        id: generateId(),
        number: 'INV-' + (1000 + state.invoices.length + 1),
        customerId,
        customerName: customer.name,
        date: document.getElementById('invoice-date').value,
        items: [...currentInvoiceItems],
        subtotal,
        discount: discountAmount,
        grandTotal: total,
        paidAmount: 0,
        status: 'unpaid',
        notes: document.getElementById('invoice-notes').value
    };

    state.invoices.push(newInvoice);
    saveState();
    closeModal(invoiceModal);
    renderInvoices();

    // Auto generate PDF?
    if (confirm('Invoice saved! Generate PDF now?')) {
        generatePDF(newInvoice);
    }
});

// PDF Generation
window.generatePDF = (invoice) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Font setup (Typewriter style if available, else Courier)
    doc.setFont("Courier");

    // Header
    doc.setFontSize(22);
    doc.text("INVOICE", 105, 20, null, null, "center");

    doc.setFontSize(12);
    doc.text("Excellence Graphics", 20, 30);
    doc.setFontSize(10);
    doc.text("F9, Hijragama, Hemmathagama", 20, 35);
    doc.text("Phone: +94 123 456 789", 20, 40);

    // Invoice Details
    doc.text(`Invoice #: ${invoice.number}`, 140, 30);
    doc.text(`Date: ${formatDate(invoice.date)}`, 140, 35);

    // Bill To
    doc.text("Bill To:", 20, 55);
    doc.setFontSize(12);
    doc.text(invoice.customerName, 20, 60);
    doc.setFontSize(10);
    // Find customer for address
    const customer = state.customers.find(c => c.id === invoice.customerId);
    if (customer && customer.address) {
        const splitAddress = doc.splitTextToSize(customer.address, 80);
        doc.text(splitAddress, 20, 65);
    }

    // Table
    const tableColumn = ["Description", "Qty", "Price", "Total"];
    const tableRows = [];

    invoice.items.forEach(item => {
        const itemData = [
            item.desc,
            item.qty,
            formatCurrency(item.price),
            formatCurrency(item.qty * item.price)
        ];
        tableRows.push(itemData);
    });

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 80,
        theme: 'plain', // Minimalist/Typewriter style
        styles: { font: 'Courier', fontSize: 10 },
        headStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: 'bold' }
    });

    const finalY = doc.lastAutoTable.finalY + 10;

    // Totals
    doc.text(`Subtotal: ${formatCurrency(invoice.subtotal)}`, 140, finalY);
    doc.text(`Discount: -${formatCurrency(invoice.discount)}`, 140, finalY + 5);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Total: ${formatCurrency(invoice.grandTotal)}`, 140, finalY + 12);

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Paid: ${formatCurrency(invoice.paidAmount)}`, 140, finalY + 18);
    doc.text(`Balance Due: ${formatCurrency(invoice.grandTotal - invoice.paidAmount)}`, 140, finalY + 23);

    // Footer
    doc.text("Thank you for your business!", 105, 280, null, null, "center");

    doc.save(`${invoice.number}.pdf`);
};

window.viewInvoice = (id) => {
    const invoice = state.invoices.find(i => i.id === id);
    if (invoice) generatePDF(invoice);
};

window.deleteInvoice = (id) => {
    if (confirm('Delete this invoice?')) {
        state.invoices = state.invoices.filter(i => i.id !== id);
        saveState();
        renderInvoices();
    }
};

// Payment Handling
window.openPaymentModal = (id) => {
    const invoice = state.invoices.find(i => i.id === id);
    if (!invoice) return;

    document.getElementById('pay-invoice-id').textContent = invoice.number;
    document.getElementById('pay-invoice-idx').value = id;
    document.getElementById('pay-total-amount').textContent = formatCurrency(invoice.grandTotal);

    const balance = invoice.grandTotal - (invoice.paidAmount || 0);
    document.getElementById('pay-balance-due').textContent = formatCurrency(balance);
    document.getElementById('pay-amount').value = balance.toFixed(2); // Default to full balance
    document.getElementById('pay-amount').max = balance.toFixed(2);

    openModal(paymentModal);
};

paymentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('pay-invoice-idx').value;
    const amount = parseFloat(document.getElementById('pay-amount').value);

    const invoice = state.invoices.find(i => i.id === id);
    if (invoice) {
        invoice.paidAmount = (invoice.paidAmount || 0) + amount;

        // Update status
        if (invoice.paidAmount >= invoice.grandTotal - 0.01) { // Tolerance for float
            invoice.status = 'paid';
        } else if (invoice.paidAmount > 0) {
            invoice.status = 'partial';
        } else {
            invoice.status = 'unpaid';
        }

        saveState();
        closeModal(paymentModal);
        renderInvoices();

        // Generate updated PDF
        if (confirm('Payment recorded. Download updated invoice?')) {
            generatePDF(invoice);
        }
    }
});

// Invoice Filters
document.querySelectorAll('.tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderInvoices(btn.dataset.filter, document.getElementById('invoice-search').value);
    });
});

document.getElementById('invoice-search').addEventListener('input', (e) => {
    const activeTab = document.querySelector('.tabs .tab-btn.active').dataset.filter;
    renderInvoices(activeTab, e.target.value);
});


// --- DASHBOARD & REPORTS ---

const updateDashboard = () => {
    // Stats
    const totalIncome = state.invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const totalOutstanding = state.invoices.reduce((sum, inv) => {
        if (inv.status !== 'paid') {
            return sum + (inv.grandTotal - (inv.paidAmount || 0));
        }
        return sum;
    }, 0);

    // New Customers (This month)
    const now = new Date();
    // Assuming we don't track customer creation date strictly in this simple model, 
    // but we can just show total customers for now or add a 'createdAt' to customers.
    // Let's just show total customers for simplicity or assume last 5 are new.
    const newCustomers = state.customers.length;

    document.getElementById('dash-total-income').textContent = formatCurrency(totalIncome);
    document.getElementById('dash-outstanding').textContent = formatCurrency(totalOutstanding);
    document.getElementById('dash-new-customers').textContent = newCustomers;

    // Recent Invoices
    const recentList = document.getElementById('recent-invoices-list');
    recentList.innerHTML = '';
    state.invoices.slice(-5).reverse().forEach(inv => {
        const li = document.createElement('li');
        li.className = 'activity-item';
        li.innerHTML = `
            <div>
                <span style="font-weight: 500; color: var(--text-primary);">${inv.number}</span>
                <br>
                <small style="color: var(--text-secondary);">${inv.customerName}</small>
            </div>
            <div style="text-align: right;">
                <span style="font-weight: 600; color: var(--accent-color);">${formatCurrency(inv.grandTotal)}</span>
                <br>
                <small class="status-badge status-${inv.status}" style="font-size: 0.7rem; padding: 0.1rem 0.4rem;">${inv.status}</small>
            </div>
        `;
        recentList.appendChild(li);
    });

    renderCharts();
};

let incomeChartInstance = null;
let reportChartInstance = null;

const renderCharts = () => {
    // Prepare Data (Monthly Income)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const incomeData = new Array(12).fill(0);

    state.invoices.forEach(inv => {
        const date = new Date(inv.date);
        if (date.getFullYear() === new Date().getFullYear()) {
            incomeData[date.getMonth()] += (inv.paidAmount || 0);
        }
    });

    // Dashboard Chart
    const ctx = document.getElementById('incomeChart').getContext('2d');
    if (incomeChartInstance) incomeChartInstance.destroy();

    incomeChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Income (LKR)',
                data: incomeData,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#334155' } },
                x: { grid: { display: false } }
            }
        }
    });
};

const renderReports = () => {
    // Similar to dashboard but maybe more detailed or different view
    // For now, let's just replicate the income chart but bigger
    const ctx = document.getElementById('salesReportChart').getContext('2d');

    // Calculate totals for report summary
    const totalSales = state.invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
    const netIncome = state.invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);

    document.getElementById('report-total-sales').textContent = formatCurrency(totalSales);
    document.getElementById('report-net-income').textContent = formatCurrency(netIncome);

    if (reportChartInstance) reportChartInstance.destroy();

    // Reuse income data logic
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const incomeData = new Array(12).fill(0);
    state.invoices.forEach(inv => {
        const date = new Date(inv.date);
        if (date.getFullYear() === new Date().getFullYear()) {
            incomeData[date.getMonth()] += (inv.paidAmount || 0);
        }
    });

    reportChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: 'Monthly Income',
                data: incomeData,
                backgroundColor: '#3b82f6',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, grid: { color: '#334155' } },
                x: { grid: { display: false } }
            }
        }
    });
};


// Backup & Restore
document.getElementById('backupBtn').addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "excellence_graphics_backup_" + new Date().toISOString().slice(0, 10) + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
});

document.getElementById('restoreBtn').addEventListener('click', () => {
    document.getElementById('restoreInput').click();
});

document.getElementById('restoreInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const obj = JSON.parse(event.target.result);
            if (obj.customers && obj.invoices) {
                state.customers = obj.customers;
                state.invoices = obj.invoices;
                saveState();
                alert('Data restored successfully!');
                location.reload();
            } else {
                alert('Invalid backup file.');
            }
        } catch (err) {
            alert('Error reading file.');
        }
    };
    reader.readAsText(file);
});

// Initial Render
updateDashboard();
