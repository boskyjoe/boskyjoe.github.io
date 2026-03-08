const VALID_EMAIL = "jean.l.picard@walmart.com";

const loginView = document.getElementById("loginView");
const landingView = document.getElementById("landingView");
const emailInput = document.getElementById("emailInput");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");

const accordionToggle = document.getElementById("accordionToggle");
const accordionBody = document.getElementById("accordionBody");

const quickSearchInput = document.getElementById("quickSearchInput");

let gridApi = null;
let gridInitialized = false;

// Always show login on page load
document.addEventListener("DOMContentLoaded", () => {
  showLogin();
});

// Login click
loginBtn.addEventListener("click", handleLogin);

// Enter key support
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

// Accordion
accordionToggle.addEventListener("click", () => {
  const expanded = accordionToggle.getAttribute("aria-expanded") === "true";
  accordionToggle.setAttribute("aria-expanded", String(!expanded));
  accordionBody.classList.toggle("hidden", expanded);

  if (!expanded && gridApi) {
    setTimeout(() => gridApi.sizeColumnsToFit(), 0);
  }
});

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
      headerName: col === "rowId" ? "Row ID" : col,
      sortable: true,
      filter: true,
      resizable: true,
      tooltipField: col,
      wrapText: col !== "rowId",
      autoHeight: col !== "rowId",
      pinned: col === "rowId" ? "left" : undefined,
      width: col === "rowId" ? 110 : undefined,
      flex: col === "rowId" ? undefined : 1,
      minWidth: col === "rowId" ? undefined : 170
    }));

    const gridOptions = {
      columnDefs,
      rowData: rows,
      getRowId: (params) => String(params.data.rowId),
      defaultColDef: {
        sortable: true,
        filter: true,
        resizable: true
      },
      animateRows: true,
      pagination: true,
      paginationPageSize: 10,
      paginationPageSizeSelector: [10, 20, 50, 100],
      onGridReady: (params) => {
        gridApi = params.api;
        params.api.sizeColumnsToFit();

        if (quickSearchInput) {
          quickSearchInput.addEventListener("input", (e) => {
            const value = e.target.value || "";
            gridApi.setGridOption("quickFilterText", value);
          });
        }
      }
    };

    agGrid.createGrid(gridDiv, gridOptions);
    gridInitialized = true;

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
