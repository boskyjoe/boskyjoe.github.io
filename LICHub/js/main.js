const VALID_EMAIL = "jean.l.picard@walmart.com";

const loginView = document.getElementById("loginView");
const landingView = document.getElementById("landingView");
const emailInput = document.getElementById("emailInput");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");

const accordionToggle = document.getElementById("accordionToggle");
const accordionBody = document.getElementById("accordionBody");

loginBtn.addEventListener("click", async () => {
  const email = (emailInput.value || "").trim().toLowerCase();

  if (email !== VALID_EMAIL) {
    loginError.textContent = "Invalid email. Please use your authorized account.";
    return;
  }

  loginError.textContent = "";
  loginView.classList.add("hidden");
  landingView.classList.remove("hidden");

  await initializeGrid();
});

accordionToggle.addEventListener("click", () => {
  const expanded = accordionToggle.getAttribute("aria-expanded") === "true";
  accordionToggle.setAttribute("aria-expanded", String(!expanded));
  accordionBody.classList.toggle("hidden", expanded);
});

async function initializeGrid() {
  const gridDiv = document.getElementById("summaryGrid");

  try {
    const response = await fetch("data/summary.json");
    const summary = await response.json();

    // Build column definitions dynamically from JSON columns
    const columnDefs = (summary.columns || []).map((col) => ({
      field: col,
      headerName: col,
      filter: true,
      sortable: true,
      resizable: true,
      tooltipField: col,
      // Keep multi-line strings readable
      autoHeight: true,
      wrapText: true
    }));

    const gridOptions = {
      columnDefs,
      rowData: summary.data || [],
      defaultColDef: {
        sortable: true,
        filter: true,
        resizable: true,
        wrapText: true,
        autoHeight: true
      },
      rowHeight: 52,
      headerHeight: 54,
      pagination: true,
      paginationPageSize: 10,

      sideBar: {
        toolPanels: [
          {
            id: "columns",
            labelDefault: "Columns",
            labelKey: "columns",
            iconKey: "columns",
            toolPanel: "agColumnsToolPanel",
            toolPanelParams: {
              suppressRowGroups: true,
              suppressValues: true,
              suppressPivots: true,
              suppressPivotMode: true
            }
          }
        ],
        defaultToolPanel: "columns"
      }
    };

    agGrid.createGrid(gridDiv, gridOptions);

    // Optional: set dashboard title/meta from JSON user block
    const dashboardTitle = document.querySelector("#landingView h1");
    if (summary.user?.name && dashboardTitle) {
      dashboardTitle.textContent = `LICHub Dashboard — ${summary.user.name}`;
    }
  } catch (err) {
    console.error("Failed to load summary data:", err);
    loginError.textContent = "Unable to load summary data.";
  }
}
