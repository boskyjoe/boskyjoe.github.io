const ALLOWED_EMAIL = 'jean.l.picard@walmart.com';
const JSON_URL = 'data/summary.json';

document.addEventListener('DOMContentLoaded', () => {
  const emailEl = document.getElementById('user-email');
  const nameEl = document.getElementById('user-name');
  const companyEl = document.getElementById('company-name');

  const loginView = document.getElementById('login-view');
  const dashboardView = document.getElementById('dashboard-view');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const logoutBtn = document.getElementById('logout-btn');
  const loadingEl = document.getElementById('loading');

  const summaryCards = document.getElementById('summary-cards');
  const tableBody = document.querySelector('#usage-table tbody');
  const lastUpdatedEl = document.getElementById('last-updated');
  const filterInput = document.getElementById('table-filter');

  function show(view) {
    const isDashboard = view === 'dashboard';
    loginView.hidden = isDashboard;
    dashboardView.hidden = !isDashboard;
    logoutBtn.hidden = !isDashboard;
  }
  function setLoading(on) { loadingEl.hidden = !on; }
  function authenticate(email) { return (email || '').trim().toLowerCase() === ALLOWED_EMAIL; }
  function fmt(n) { return new Intl.NumberFormat().format(n); }
  function perc(used, total){ return total ? Math.round((used/total)*100) : 0; }
  function formatDate(s){
    if(!s) return '';
    const d = new Date(s); return isNaN(d) ? '' : d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
  }

  function renderSummary(licenses) {
    const totals = licenses.reduce((a, it) => {
      a.total += Number(it.seatsTotal || 0);
      a.used += Number(it.seatsUsed || 0);
      return a;
    }, { total: 0, used: 0 });
    const available = totals.total - totals.used;
    const utilization = perc(totals.used, totals.total);
    const cards = [
      { label: 'Total Seats', value: fmt(totals.total) },
      { label: 'Used Seats', value: fmt(totals.used) },
      { label: 'Available', value: fmt(available) },
      { label: 'Utilization', value: utilization + '%' },
    ];
    summaryCards.innerHTML = cards.map(c => (
      `<div class="card stat">
        <div class="stat-value">${c.value}</div>
        <div class="stat-label">${c.label}</div>
      </div>`
    )).join('');
  }

  function renderTable(licenses) {
    const rows = licenses.map(it => {
      const total = Number(it.seatsTotal || 0);
      const used = Number(it.seatsUsed || 0);
      const available = total - used;
      const statusClass = available < 0 ? 'danger' : available === 0 ? 'warn' : 'ok';
      return `<tr>
        <td>${it.license}</td>
        <td class="muted">${it.sku}</td>
        <td class="num">${fmt(total)}</td>
        <td class="num">${fmt(used)}</td>
        <td class="num"><span class="pill ${statusClass}">${fmt(available)}</span></td>
        <td>${formatDate(it.renewalDate)}</td>
      </tr>`;
    }).join('');
    tableBody.innerHTML = rows || `<tr><td colspan="6" class="muted">No license data</td></tr>`;
  }

  function attachFilter(){
    filterInput.addEventListener('input', () => {
      const q = filterInput.value.trim().toLowerCase();
      for (const tr of tableBody.querySelectorAll('tr')) {
        tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
      }
    });
  }

  async function loadData(){
    setLoading(true);
    try{
      const res = await fetch(`${JSON_URL}?v=${Date.now()}`);
      if(!res.ok) throw new Error(`Failed to fetch ${JSON_URL}`);
      const data = await res.json();

      // Header info
      if (data?.user?.name) nameEl.textContent = data.user.name;
      if (data?.user?.company) companyEl.textContent = data.user.company;

      // Cards & table
      const licenses = Array.isArray(data.licenses) ? data.licenses : [];
      renderSummary(licenses);
      renderTable(licenses);

      const updated = data?.user?.lastUpdated ? new Date(data.user.lastUpdated) : new Date();
      lastUpdatedEl.textContent = `Last updated: ${updated.toLocaleString()}`;
    } catch(err){
      console.error(err);
      lastUpdatedEl.textContent = 'Failed to load data.';
      summaryCards.innerHTML = '';
      tableBody.innerHTML = `<tr><td colspan="6" class="muted">Unable to load data from ${JSON_URL}</td></tr>`;
    } finally{
      setLoading(false);
    }
  }

  // Attempt session restore
  const storedEmail = (localStorage.getItem('loggedInEmail') || '').toLowerCase();
  if (authenticate(storedEmail)) {
    emailEl.textContent = storedEmail;
    show('dashboard');
    loadData();
  } else {
    show('login');
  }

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    loginError.textContent = '';
    const input = document.getElementById('email');
    const email = input.value;
    if (authenticate(email)) {
      localStorage.setItem('loggedInEmail', ALLOWED_EMAIL);
      emailEl.textContent = ALLOWED_EMAIL;
      show('dashboard');
      loadData();
    } else {
      loginError.textContent = 'Access denied. Use jean.l.picard@walmart.com';
    }
  });

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('loggedInEmail');
    emailEl.textContent = '';
    filterInput.value = '';
    show('login');
  });

  attachFilter();
});
