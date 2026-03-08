const VALID_EMAIL = "jean.l.picard@walmart.com";
const SESSION_KEY = "lichub_logged_in_email";

const loginView = document.getElementById("loginView");
const landingView = document.getElementById("landingView");
const emailInput = document.getElementById("emailInput");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");

const accordionToggle = document.getElementById("accordionToggle");
const accordionBody = document.getElementById("accordionBody");

let gridApi = null;
let gridInitialized = false;

// ---------- Startup ----------
document.addEventListener("DOMContentLoaded", async () => {
  const savedEmail = (localStorage.getItem(SESSION_KEY) || "").toLowerCase();

  if (savedEmail === VALID_EMAIL) {
    showLanding();
    await initializeGrid();
  } else {
    showLogin();
  }
});

// ---------- Login ----------
loginBtn.addEventListener("click", handleLogin);

emailInput.addEventListener("keydown", async (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    await handleLogin();
  }
});

async function handleLogin() {
  const email = (emailInput.value || "").trim().toLowerCase();

  if (email !== VALID_EMAIL) {
    loginError.textContent = "Invalid email. Please use your authorized account.";
    return;
  }

  loginError.textContent = "";
  localStorage.setItem(SESSION_KEY, email);

  showLanding();

  if (!gridInitialized) {
    await initializeGrid();
  }
}

function showLogin() {
  loginView.classList.remove("hidden");
  landingView.classList.add("hidden");
}

function showLanding() {
  loginView.classList.add("hidden");
  landingView.classList.remove("hidden");
}

// ---------- Accordion ----------
accordionToggle.addEventListener("click", () => {
  const isExpanded = accordionToggle.getAttribute("aria-expanded") === "true";
  accordionToggle.setAttribute("aria-expanded", String(!isExpanded));
  accordionBody.classList.toggle("hidden", isExpanded);

  // Let AG Grid recalculate size after expand
  if (!isExpanded && gridApi) {
    setTimeout(() => gridApi.sizeColumnsToFit(), 0);
  }
});

// ---------- Grid ----------
async function initializeGrid() {
  const gridDiv = document.getElementById("summaryGrid");

  try {
    const response = await fetch("data/summary.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} while loading summary.json`);
    }

    const summary = await response.json();

    const columns = Array.isArray(summary.columns) ? summary.columns : [];
    const rows = Array.isArray(summary.data) ? summary.data : [];

    const columnDefs = columns.map((col) => ({
      field: col,
      headerName: col,
      sortable: true,
      filter: true,
      resizable: true,
      tooltipField: col,
      wrapText: true,
      autoHeight: true,
      flex: 1,
      minWidth: 170
    }));

    const gridOptions = {
      columnDefs,
      rowData: rows,
      defaultColDef: {
        sortable: true,
        filter: true,
        resizable: true
      },
      animateRows: true,
      pagination: true,
      paginationPageSize: 10,
      paginationPageSizeSelector: [10, 20, 50, 100],
      suppressDragLeaveHidesColumns: true,
      onGridReady: (params) => {
        gridApi = params.api;
        params.api.sizeColumnsToFit();
      }
    };

    agGrid.createGrid(gridDiv, gridOptions);
    gridInitialized = true;

    // Optional title enrichment from JSON
    const dashboardTitle = document.querySelector("#landingView h1");
    const userName = summary?.user?.name;
    if (dashboardTitle && userName) {
      dashboardTitle.textContent = `LICHub Dashboard — ${userName}`;
    }
  } catch (err) {
    console.error("Failed to initialize grid:", err);
    loginError.textContent = "Unable to load summary data.";
    showLogin();
  }
}
