const VALID_EMAIL = "jean.l.picard@walmart.com";

const loginView = document.getElementById("loginView");
const landingView = document.getElementById("landingView");
const emailInput = document.getElementById("emailInput");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");

const accordionToggle = document.getElementById("accordionToggle");
const accordionBody = document.getElementById("accordionBody");

const quickSearchInput = document.getElementById("quickSearchInput");

const openFilterBtn = document.getElementById("openFilterBtn");
const filterModal = document.getElementById("filterModal");
const closeFilterBtn = document.getElementById("closeFilterBtn");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");
const applyFiltersBtn = document.getElementById("applyFiltersBtn");
const filterGroupsEl = document.getElementById("filterGroups");
const collapseAllBtn = document.getElementById("collapseAllBtn");

let gridApi = null;
let gridInitialized = false;

let latestSummary = null;

const FILTER_FIELDS = [
  { field: "License Method", title: "Licensing Method" },
  { field: "Billing Type", title: "Billing Type" },
  // If you have a "Usage" column later, add it here
  { field: "Architecture", title: "Architecture" },
  { field: "Sub-Architecture", title: "Sub-Architecture" }
];

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
    latestSummary = summary;
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
        floatingFilter: false,
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

function openFilterModal() {
  if (!latestSummary) return;
  renderFilterModalFromData(latestSummary.data || []);
  filterModal.classList.remove("hidden");
}

function closeFilterModal() {
  filterModal.classList.add("hidden");
}

openFilterBtn?.addEventListener("click", openFilterModal);
closeFilterBtn?.addEventListener("click", closeFilterModal);

filterModal?.addEventListener("click", (e) => {
  if (e.target === filterModal) closeFilterModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && filterModal && !filterModal.classList.contains("hidden")) {
    closeFilterModal();
  }
});

collapseAllBtn?.addEventListener("click", () => {
  document.querySelectorAll(".filter-group").forEach((g) => g.classList.add("collapsed"));
});

function getUniqueValues(rows, field) {
  const set = new Set();
  for (const r of rows) {
    const v = r?.[field];
    if (v === null || v === undefined || v === "") continue;
    set.add(String(v));
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function renderFilterModalFromData(rows) {
  if (!filterGroupsEl) return;

  // read existing grid filter state (so modal reflects current selection)
  const existingModel = gridApi?.getFilterModel?.() || {};

  filterGroupsEl.innerHTML = "";

  FILTER_FIELDS.forEach(({ field, title }) => {
    const values = getUniqueValues(rows, field);
    if (values.length === 0) return;

    const group = document.createElement("div");
    group.className = "filter-group";

    const header = document.createElement("div");
    header.className = "filter-group-header";
    header.innerHTML = `<span>${title}</span><span class="caret">▼</span>`;

    const body = document.createElement("div");
    body.className = "filter-group-body";

    // If filter already applied, mark corresponding checkboxes checked
    const selected = new Set(
      (existingModel?.[field]?.values || []).map((x) => String(x))
    );

    values.forEach((val) => {
      const id = `flt_${field.replace(/\W+/g, "_")}_${val.replace(/\W+/g, "_")}`.slice(0, 180);

      const item = document.createElement("label");
      item.className = "filter-item";
      item.innerHTML = `
        <input type="checkbox" data-field="${field}" value="${escapeHtml(val)}" id="${id}" ${selected.has(val) ? "checked" : ""}/>
        <span>${escapeHtml(val)}</span>
      `;
      body.appendChild(item);
    });

    header.addEventListener("click", () => group.classList.toggle("collapsed"));

    group.appendChild(header);
    group.appendChild(body);
    filterGroupsEl.appendChild(group);
  });
}

function buildFilterModelFromModal() {
  const model = {};
  const inputs = document.querySelectorAll('#filterGroups input[type="checkbox"]:checked');

  // Collect selections per field
  const map = new Map();
  inputs.forEach((cb) => {
    const field = cb.getAttribute("data-field");
    const value = cb.value;
    if (!map.has(field)) map.set(field, []);
    map.get(field).push(value);
  });

  // AG Grid "set filter" model
  for (const [field, values] of map.entries()) {
    model[field] = {
      filterType: "set",
      values
    };
  }

  return model;
}

clearFiltersBtn?.addEventListener("click", () => {
  if (!gridApi) return;
  gridApi.setFilterModel(null);
  closeFilterModal();
});

applyFiltersBtn?.addEventListener("click", () => {
  if (!gridApi) return;
  const model = buildFilterModelFromModal();
  gridApi.setFilterModel(model);
  gridApi.onFilterChanged();
  closeFilterModal();
});

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
