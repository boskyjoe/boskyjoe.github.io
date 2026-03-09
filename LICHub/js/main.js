const VALID_EMAIL = "jean.l.picard@walmart.com";

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


const SUBARCH_PARENT_MAP = [
  { name: "Ent. Access Routing", parents: ["Enterprise Routing"] },
  { name: "Ent. Edge Routing", parents: ["Enterprise Routing", "Enterprise Switching"] },
  { name: "Ent. Switching-Access", parents: ["Enterprise Routing", "Enterprise Switching"] },
  { name: "IIoT Routing", parents: ["Enterprise Routing"] },
  { name: "Ent. Switching - Core", parents: ["Enterprise Switching"] },
  { name: "Ent. Switching - Connected Platforms", parents: ["Enterprise Switching"] },
  { name: "Ent. - Other", parents: ["Enterprise Switching"] },
  { name: "Ent. - Wireless", parents: ["Enterprise Switching"] },
  { name: "IIoT Switching", parents: ["Enterprise Switching"] },
  { name: "Aironet", parents: ["Wireless"] },
  { name: "Catalyst Wireless", parents: ["Wireless"] },
  { name: "Nexus Cloud", parents: ["Data Center Networking"] },
  { name: "UCS Server", parents: ["Cisco Compute"] }
];


let gridApi = null;
let gridInitialized = false;

let latestSummary = null;

// Derived from summary.json at runtime:
let archToSubArch = new Map(); // key: Architecture, value: Set(Sub-Architecture)
let allSubArchitectures = [];  // sorted list of all sub-architectures

// modal state
let allExpanded = true;

// Choose which fields appear as groups (must match your JSON keys)
const FILTER_GROUPS = [
  { id: "licenseMethod", field: "License Method", title: "Licensing Method" },
  { id: "billingType", field: "Billing Type", title: "Billing Type" },
  { id: "architecture", field: "Architecture", title: "Architecture" },
  { id: "subArchitecture", field: "Sub-Architecture", title: "Sub-Architecture" }
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

    deriveArchSubArchMap(summary.data || []);

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
      defaultColDef: { sortable: true, filter: true, resizable: true },
      animateRows: true,
      pagination: true,
      paginationPageSize: 10,
      paginationPageSizeSelector: [10, 20, 50, 100],
      onGridReady: (params) => {
        gridApi = params.api;
        params.api.sizeColumnsToFit();

        if (quickSearchInput) {
          quickSearchInput?.addEventListener("input", (e) => {
            gridApi.setGridOption("quickFilterText", e.target.value || "");
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

function openFilters() {
  modalOverlay.classList.add("active");
  modalOverlay.setAttribute("aria-hidden", "false");
}

function closeFilters() {
  modalOverlay.classList.remove("active");
  modalOverlay.setAttribute("aria-hidden", "true");
}

openFilterBtn?.addEventListener("click", openFilters);
cancelFiltersBtn?.addEventListener("click", closeFilters);

// click outside modal closes
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
  const model = buildFilterModelFromTree();
  gridApi.setFilterModel(model);
  gridApi.onFilterChanged();
  closeFilters();
});

clearFiltersBtn?.addEventListener("click", () => {
  if (!gridApi) return;
  gridApi.setFilterModel(null);
  gridApi.onFilterChanged();
  closeFilters();
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


function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openFilters() {
  if (!latestSummary || !gridApi) return;
  renderFilterTree(latestSummary.data || []);
  modalOverlay.classList.add("active");
  modalOverlay.setAttribute("aria-hidden", "false");
}

function closeFilters() {
  modalOverlay.classList.remove("active");
  modalOverlay.setAttribute("aria-hidden", "true");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

function renderFilterTree(rows) {
  const existingModel = gridApi.getFilterModel() || {};
  filterTreeRoot.innerHTML = "";

  FILTER_GROUPS.forEach(({ id, field, title }) => {
    let values = [];

    if (field === "Sub-Architecture") {
      values = allSubArchitectures; // derived list
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

    const selected = new Set((existingModel?.[field]?.values || []).map(String));

    if (field === "Sub-Architecture") {
      list.innerHTML = values
        .map((sub) => {
          // find which architectures contain this sub-architecture
          const parents = [];
          for (const [arch, subSet] of archToSubArch.entries()) {
            if (subSet.has(sub)) parents.push(arch);
          }

          const checked = selected.has(sub) ? "checked" : "";
          return `
            <label class="filter-option" data-parents="${escapeHtml(parents.join(","))}">
              <input type="checkbox" data-field="${escapeHtml(field)}" value="${escapeHtml(sub)}" ${checked}/>
              ${escapeHtml(sub)}
            </label>`;
        })
        .join("");
    } else {
      list.innerHTML = values
        .map((v) => {
          const checked = selected.has(v) ? "checked" : "";
          return `
            <label class="filter-option">
              <input type="checkbox" data-field="${escapeHtml(field)}" value="${escapeHtml(v)}" ${checked}/>
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

  // Hook dependency logic after render
  wireArchitectureDependency();
  filterSubArchitecturesVisibility();

  allExpanded = true;
  if (toggleAllBtn) toggleAllBtn.textContent = "Collapse All";
}

function buildFilterModelFromTree() {
  const model = {};
  const checked = filterTreeRoot.querySelectorAll('input[type="checkbox"]:checked');

  const byField = new Map();
  checked.forEach((cb) => {
    const field = cb.getAttribute("data-field");
    const value = cb.value;
    if (!byField.has(field)) byField.set(field, []);
    byField.get(field).push(value);
  });

  for (const [field, values] of byField.entries()) {
    model[field] = { filterType: "set", values };
  }
  return model;
}

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

    // uncheck hidden selections
    const cb = opt.querySelector('input[type="checkbox"]');
    if (!visible && cb?.checked) cb.checked = false;
  });
}

function deriveArchSubArchMap(rows) {
  const map = new Map();
  const subSet = new Set();

  for (const r of rows) {
    const arch = r?.["Architecture"];
    const sub = r?.["Sub-Architecture"];

    if (!arch || !sub) continue;

    const archKey = String(arch);
    const subVal = String(sub);

    subSet.add(subVal);

    if (!map.has(archKey)) map.set(archKey, new Set());
    map.get(archKey).add(subVal);
  }

  archToSubArch = map;
  allSubArchitectures = Array.from(subSet).sort((a, b) => a.localeCompare(b));
}
