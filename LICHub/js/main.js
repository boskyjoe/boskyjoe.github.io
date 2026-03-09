const VALID_EMAIL = "jean.l.picard@walmart.com";

/* ---------- DOM ---------- */
const loginView = document.getElementById("loginView");
const landingView = document.getElementById("landingView");
const emailInput = document.getElementById("emailInput");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");

const accordionToggle = document.getElementById("accordionToggle");
const accordionBody = document.getElementById("accordionBody");

const quickSearchInput = document.getElementById("quickSearchInput");

const modalOverlay = document.getElementById("modalOverlay");
const openFilterBtn = document.getElementById("openFilterBtn");
const cancelFiltersBtn = document.getElementById("cancelFiltersBtn");
const toggleAllBtn = document.getElementById("toggleAllBtn");
const applyFiltersBtn = document.getElementById("applyFiltersBtn");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");
const filterTreeRoot = document.getElementById("filterTreeRoot");

/* ---------- State ---------- */
let gridApi = null;
let gridInitialized = false;

let latestSummary = null;

// Derived from summary.json at runtime:
let archToSubArch = new Map(); // Architecture -> Set(Sub-Architecture)
let allSubArchitectures = [];  // all unique sub-architectures

// External filter state (Community-safe)
let activeExternalFilters = {}; // { "Architecture": ["Meraki"], "Billing Type": ["PREPAID"] }

let allExpanded = true;

const FILTER_GROUPS = [
  { id: "licenseMethod", field: "License Method", title: "Licensing Method" },
  { id: "billingType", field: "Billing Type", title: "Billing Type" },
  { id: "architecture", field: "Architecture", title: "Architecture" },
  { id: "subArchitecture", field: "Sub-Architecture", title: "Sub-Architecture" }
];

/* ---------- Startup ---------- */
document.addEventListener("DOMContentLoaded", () => {
  showLogin();
});

/* ---------- Login ---------- */
loginBtn?.addEventListener("click", handleLogin);

emailInput?.addEventListener("keydown", async (e) => {
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
  loginView?.classList.remove("hidden");
  landingView?.classList.add("hidden");
}

function showLanding() {
  loginView?.classList.add("hidden");
  landingView?.classList.remove("hidden");
}

/* ---------- Accordion ---------- */
accordionToggle?.addEventListener("click", () => {
  const expanded = accordionToggle.getAttribute("aria-expanded") === "true";
  accordionToggle.setAttribute("aria-expanded", String(!expanded));
  accordionBody.classList.toggle("hidden", expanded);

  if (!expanded && gridApi) {
    setTimeout(() => gridApi.sizeColumnsToFit(), 0);
  }
});

/* ---------- Grid ---------- */
async function initializeGrid() {
  const gridDiv = document.getElementById("summaryGrid");

  try {
    const response = await fetch("data/summary.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status} while loading summary.json`);

    const summary = await response.json();
    latestSummary = summary;

    const columns = Array.isArray(summary.columns) ? summary.columns : [];
    const rows = Array.isArray(summary.data) ? summary.data : [];

    deriveArchSubArchMap(rows);

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

      // External filter hooks (Community-safe)
      isExternalFilterPresent: () => {
        return Object.keys(activeExternalFilters).some(
          (k) => Array.isArray(activeExternalFilters[k]) && activeExternalFilters[k].length > 0
        );
      },

      doesExternalFilterPass: (node) => {
        const row = node.data || {};

        // AND across fields, OR within a field
        for (const [field, selectedValues] of Object.entries(activeExternalFilters)) {
          if (!selectedValues || selectedValues.length === 0) continue;

          const cellValue = row[field];
          if (cellValue === null || cellValue === undefined) return false;

          if (!selectedValues.includes(String(cellValue))) return false;
        }
        return true;
      },

      onGridReady: (params) => {
        gridApi = params.api;
        params.api.sizeColumnsToFit();

        quickSearchInput?.addEventListener("input", (e) => {
          gridApi.setGridOption("quickFilterText", e.target.value || "");
        });
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

/* ---------- Filter Modal (Professional UI) ---------- */
openFilterBtn?.addEventListener("click", () => {
  if (!latestSummary || !gridApi) return;
  renderFilterTree(latestSummary.data || []);
  openFilters();
});

cancelFiltersBtn?.addEventListener("click", closeFilters);

// click outside closes
modalOverlay?.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeFilters();
});

// Escape closes
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modalOverlay?.classList.contains("active")) closeFilters();
});

toggleAllBtn?.addEventListener("click", () => {
  const nodes = filterTreeRoot.querySelectorAll(".tree-node");
  allExpanded = !allExpanded;

  nodes.forEach((n) => n.classList.toggle("expanded", allExpanded));
  toggleAllBtn.textContent = allExpanded ? "Collapse All" : "Expand All";
});

applyFiltersBtn?.addEventListener("click", () => {
  if (!gridApi) return;

  activeExternalFilters = buildExternalFilterStateFromTree();
  gridApi.onFilterChanged();

  closeFilters();
});

clearFiltersBtn?.addEventListener("click", () => {
  if (!gridApi) return;

  activeExternalFilters = {};
  filterTreeRoot.querySelectorAll('input[type="checkbox"]').forEach((cb) => (cb.checked = false));
  gridApi.onFilterChanged();

  closeFilters();
});

function openFilters() {
  modalOverlay.classList.add("active");
  modalOverlay.setAttribute("aria-hidden", "false");
}

function closeFilters() {
  modalOverlay.classList.remove("active");
  modalOverlay.setAttribute("aria-hidden", "true");
}

/* ---------- Build filter tree from data ---------- */
function renderFilterTree(rows) {
  filterTreeRoot.innerHTML = "";

  FILTER_GROUPS.forEach(({ id, field, title }) => {
    let values = [];

    if (field === "Sub-Architecture") {
      values = allSubArchitectures;
    } else {
      values = uniqueValues(rows, field);
    }

    if (!values.length) return;

    const node = document.createElement("div");
    node.className = "tree-node expanded";
    node.dataset.groupId = id;

    const header = document.createElement("div");
    header.className = "category-header";
    header.textContent = title;

    const list = document.createElement("div");
    list.className = "options-list";
    list.dataset.field = field;

    if (field === "Sub-Architecture") {
      list.innerHTML = values
        .map((sub) => {
          const parents = [];
          for (const [arch, subSet] of archToSubArch.entries()) {
            if (subSet.has(sub)) parents.push(arch);
          }

          return `
            <label class="filter-option" data-parents="${escapeHtml(parents.join(","))}">
              <input type="checkbox" data-field="${escapeHtml(field)}" value="${escapeHtml(sub)}" />
              ${escapeHtml(sub)}
            </label>`;
        })
        .join("");
    } else {
      list.innerHTML = values
        .map((v) => {
          return `
            <label class="filter-option">
              <input type="checkbox" data-field="${escapeHtml(field)}" value="${escapeHtml(v)}" />
              ${escapeHtml(v)}
            </label>`;
        })
        .join("");
    }

    header.addEventListener("click", () => node.classList.toggle("expanded"));

    node.appendChild(header);
    node.appendChild(list);
    filterTreeRoot.appendChild(node);
  });

  // enable Architecture -> Sub-Architecture dependency
  wireArchitectureDependency();
  filterSubArchitecturesVisibility();

  // reset toggle label
  allExpanded = true;
  if (toggleAllBtn) toggleAllBtn.textContent = "Collapse All";
}

function buildExternalFilterStateFromTree() {
  const state = {};
  const checked = filterTreeRoot.querySelectorAll('input[type="checkbox"]:checked');

  checked.forEach((cb) => {
    const field = cb.getAttribute("data-field");
    const value = String(cb.value);
    if (!state[field]) state[field] = [];
    state[field].push(value);
  });

  return state;
}

/* ---------- Architecture -> Sub-Architecture dependency ---------- */
function wireArchitectureDependency() {
  const archNode = filterTreeRoot.querySelector('[data-group-id="architecture"]');
  if (!archNode) return;

  const archCheckboxes = archNode.querySelectorAll('input[type="checkbox"][data-field="Architecture"]');
  archCheckboxes.forEach((cb) => cb.addEventListener("change", filterSubArchitecturesVisibility));
}

function getSelectedArchitectures() {
  const archNode = filterTreeRoot.querySelector('[data-group-id="architecture"]');
  if (!archNode) return [];

  const checked = archNode.querySelectorAll('input[type="checkbox"][data-field="Architecture"]:checked');
  return Array.from(checked).map((cb) => cb.value);
}

function filterSubArchitecturesVisibility() {
  const selectedArchitectures = getSelectedArchitectures();

  const subNode = filterTreeRoot.querySelector('[data-group-id="subArchitecture"]');
  if (!subNode) return;

  const options = subNode.querySelectorAll(".filter-option");

  options.forEach((opt) => {
    const parentsCsv = opt.getAttribute("data-parents") || "";
    const parents = parentsCsv ? parentsCsv.split(",") : [];

    if (selectedArchitectures.length === 0) {
      opt.classList.remove("hidden");
      return;
    }

    const visible = selectedArchitectures.some((a) => parents.includes(a));
    opt.classList.toggle("hidden", !visible);

    // If it becomes hidden, uncheck it (prevents invisible selections)
    const cb = opt.querySelector('input[type="checkbox"]');
    if (!visible && cb?.checked) cb.checked = false;
  });
}

/* ---------- Data helpers ---------- */
function deriveArchSubArchMap(rows) {
  const map = new Map();
  const subSet = new Set();

  for (const r of rows) {
    const arch = r?.["Architecture"];
    const sub = r?.["Sub-Architecture"];
    if (!arch || !sub) continue;

    const archKey = String(arch);
    const subVal = String(sub);

    if (!map.has(archKey)) map.set(archKey, new Set());
    map.get(archKey).add(subVal);

    subSet.add(subVal);
  }

  archToSubArch = map;
  allSubArchitectures = Array.from(subSet).sort((a, b) => a.localeCompare(b));
}

function uniqueValues(rows, field) {
  const set = new Set();
  for (const r of rows) {
    const v = r?.[field];
    if (v === null || v === undefined || v === "") continue;
    set.add(String(v));
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
