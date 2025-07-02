/* General Body and Container Layout */
body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    margin: 0;
    padding: 0;
    background-color: #f4f7f6;
    color: #333;
    display: flex; /* Make body a flex container */
    min-height: 100vh;
    width: 100%; /* Ensure body takes full width */
}

.container {
    display: flex; /* Makes sidebar and content-area flex items */
    width: 100%;
    max-width: 1200px; /* Max width for the entire app container */
    margin: 20px auto; /* Center the container with some top/bottom margin */
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    overflow: hidden;
    background-color: #ffffff; /* Explicit background for the container */
}

/* Sidebar Styling */
.sidebar {
    width: 250px;
    background-color: #2c3e50; /* Dark blue-grey */
    color: #ecf0f1; /* Light text */
    padding: 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-shadow: 2px 0 5px rgba(0, 0, 0, 0.2);
    flex-shrink: 0; /* Prevent sidebar from shrinking */
}

.logo {
    font-size: 1.8em;
    text-align: center;
    margin-bottom: 30px;
    color: #3498db; /* Bright blue */
}

.main-nav {
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex-grow: 1; /* Allows nav to take available space */
}

.nav-button {
    background-color: #34495e; /* Slightly lighter blue-grey */
    color: #ecf0f1;
    border: none;
    padding: 12px 15px;
    text-align: left;
    font-size: 1.1em;
    cursor: pointer;
    border-radius: 5px;
    transition: background-color 0.3s ease, transform 0.2s ease;
}

.nav-button:hover:not(.active) {
    background-color: #4a627d;
    transform: translateX(3px);
}

.nav-button.active {
    background-color: #3498db; /* Active blue */
    font-weight: bold;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.user-info {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid #4a627d;
    text-align: center;
}

.user-details {
    margin-bottom: 15px;
    font-size: 0.9em;
}

.auth-button {
    background-color: #e74c3c; /* Red for sign out */
    color: white;
    border: none;
    padding: 10px 15px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 1em;
    transition: background-color 0.3s ease;
    width: 100%; /* Make button full width in sidebar */
    box-sizing: border-box; /* Include padding/border in width */
}

.auth-button.sign-in {
    background-color: #27ae60; /* Green for sign in */
}

.auth-button:hover {
    opacity: 0.9;
}

/* Content Area Styling */
.content-area {
    flex-grow: 1; /* Allows content area to take remaining space */
    padding: 20px 30px;
    background-color: #ffffff;
    overflow-y: auto; /* Enable scrolling for content if it overflows */
}

.module {
    display: none; /* Hidden by default */
    /* padding: 20px; Removed as content-area already has padding */
    border-radius: 8px;
    background-color: #fdfdfd;
    /* box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05); Removed to avoid double shadow with container */
}

.module.active {
    display: block; /* Shown when active */
}

h2 {
    color: #2c3e50;
    margin-bottom: 25px;
    border-bottom: 2px solid #eee;
    padding-bottom: 10px;
}

/* Dashboard Specific */
.dashboard-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-top: 20px;
}

.stat-card {
    background-color: #e0f2f7; /* Light blue */
    padding: 20px;
    border-radius: 8px;
    text-align: center;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.stat-card h3 {
    margin-top: 0;
    color: #3498db;
    font-size: 1.2em;
}

.stat-card p {
    font-size: 2.5em;
    font-weight: bold;
    color: #2c3e50;
    margin: 10px 0 0;
}

/* --- Grid.js Specific Styling Adaptations --- */
/* Your existing Tabulator rules are commented out. Replace with these for Grid.js */

/* Main Grid Container (e.g., #customersTable) */
.gridjs-container {
    margin-top: 20px;
    border: 1px solid #e0e0e0; /* Match existing table borders */
    border-radius: 5px;
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.05); /* Match existing table shadows */
    overflow: hidden; /* Ensures rounded corners */
}

/* Table Header (th) */
.gridjs-th {
    background-color: #f2f2f2; /* Match existing table header background */
    font-weight: bold;
    color: #555;
    text-transform: uppercase;
    font-size: 0.9em;
    padding: 12px 15px; /* Match existing padding */
    border-bottom: 1px solid #ddd; /* Add a bottom border to header cells */
}

/* Table Cells (td) */
.gridjs-td {
    padding: 12px 15px; /* Match existing padding */
    border-bottom: 1px solid #eee; /* Light border between rows */
}

/* Striped Rows */
.gridjs-tr:nth-child(even) {
    background-color: #f9f9f9; /* Match existing even row background */
}

/* Row Hover Effect */
.gridjs-tr:hover {
    background-color: #eef; /* Match existing row hover background */
}

/* Grid Search/Filter Input */
.gridjs-search input {
    width: calc(100% - 20px); /* Adjust for padding, if needed */
    padding: 8px 10px;
    border: 1px solid #ccc;
    border-radius: 5px;
    font-size: 0.9em;
    margin-bottom: 10px; /* Space below search input */
}

/* Grid Pagination */
.gridjs-pagination {
    background-color: #f2f2f2; /* Match header background or light grey */
    padding: 10px 15px;
    border-top: 1px solid #e0e0e0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.9em;
}

.gridjs-pages button {
    background-color: #ffffff;
    border: 1px solid #ddd;
    padding: 6px 10px;
    margin: 0 3px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s ease;
}

.gridjs-pages button.gridjs-currentPage {
    background-color: #3498db;
    color: white;
    border-color: #3498db;
    font-weight: bold;
}

.gridjs-pages button:hover:not(.gridjs-currentPage) {
    background-color: #eef;
}

/* Action Icons within Grid.js Cells */
.gridjs-td .action-icons {
    display: flex;
    gap: 10px; /* Space between icons */
    justify-content: center; /* Center icons if column is wide */
    align-items: center;
}

.gridjs-td .action-icons span {
    cursor: pointer;
    font-size: 1.1em; /* Make icons a bit larger */
    transition: color 0.2s ease;
}

.gridjs-td .action-icons .fa-edit {
    color: #27ae60; /* Green for edit */
}

.gridjs-td .action-icons .fa-trash {
    color: #e74c3c; /* Red for delete */
}

.gridjs-td .action-icons span:hover {
    filter: brightness(1.2); /* Slightly brighter on hover */
}

/* --- END Grid.js Specific Styling Adaptations --- */


/* Add Button Styling */
.add-button {
    background-color: #2ecc71; /* Green */
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 1em;
    margin-bottom: 20px;
    transition: background-color 0.3s ease;
}

.add-button:hover {
    background-color: #27ae60;
}

/* Modals */
.modal {
    display: none; /* Hidden by default */
    position: fixed; /* Stay in place */
    z-index: 1000; /* Sit on top */
    left: 0;
    top: 0;
    width: 100%; /* Full width */
    height: 100%; /* Full height */
    overflow: auto; /* Enable scroll if needed */
    background-color: rgba(0,0,0,0.4); /* Black w/ opacity */
    justify-content: center; /* Center horizontally */
    align-items: center; /* Center vertically */
}

.modal-content {
    background-color: #fefefe;
    margin: auto;
    padding: 30px;
    border: 1px solid #888;
    width: 80%; /* Could be responsive */
    max-width: 600px;
    border-radius: 10px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    position: relative;
    animation-name: animatetop;
    animation-duration: 0.4s
}

/* Add Animation */
@keyframes animatetop {
    from {top: -300px; opacity: 0}
    to {top: 0; opacity: 1}
}

.close-button {
    color: #aaa;
    float: right;
    font-size: 28px;
    font-weight: bold;
    position: absolute;
    top: 10px;
    right: 20px;
    cursor: pointer;
}

.close-button:hover,
.close-button:focus {
    color: black;
    text-decoration: none;
    cursor: pointer;
}

/* Forms within Modals and Admin Panel */
form {
    display: flex;
    flex-direction: column;
    gap: 15px;
    margin-top: 20px;
}

form label {
    font-weight: bold;
    color: #555;
    margin-bottom: 5px;
    display: block;
}

form input[type="text"],
form input[type="email"],
form input[type="tel"],
form input[type="number"],
form input[type="date"],
form select,
form textarea {
    width: calc(100% - 20px); /* Adjust for padding */
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 5px;
    font-size: 1em;
    box-sizing: border-box; /* Include padding in width */
}

form button[type="submit"] {
    background-color: #3498db;
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 1.1em;
    transition: background-color 0.3s ease;
    margin-top: 10px;
}

form button[type="submit"]:hover {
    background-color: #2980b9;
}

form button.cancel-edit-btn {
    background-color: #95a5a6; /* Grey */
    color: white;
    border: none;
    padding: 10px 15px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 1em;
    margin-left: 10px;
    transition: background-color 0.3s ease;
}

form button.cancel-edit-btn:hover {
    background-color: #7f8c8d;
}

/* Admin Module Specifics */
.admin-nav { /* Renamed from .admin-sections in your original CSS, matching HTML */
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    flex-wrap: wrap;
}

.admin-section-btn {
    background-color: #556c80; /* A darker shade for admin nav */
    color: #ecf0f1;
    border: none;
    padding: 10px 15px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 1em;
    transition: background-color 0.3s ease;
}

.admin-section-btn.active {
    background-color: #3498db;
}

.admin-section-btn:hover:not(.active) {
    background-color: #6d8498;
}

.admin-subsection {
    display: none;
    margin-top: 25px;
    padding: 20px;
    border: 1px solid #eee;
    border-radius: 8px;
    background-color: #fefefe;
}

.admin-subsection.active {
    display: block;
}

.admin-form {
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 1px dashed #ddd;
}

/* Responsive Adjustments */
@media (max-width: 768px) {
    .container {
        flex-direction: column; /* Stack sidebar and content */
        margin: 0;
        border-radius: 0;
        box-shadow: none;
    }

    .sidebar {
        width: 100%;
        height: auto;
        padding: 15px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        flex-direction: row; /* Layout sidebar items horizontally */
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
    }

    .sidebar .logo {
        margin-bottom: 0;
        width: 100%;
        text-align: center;
        order: -1; /* Place logo at the very top */
        margin-bottom: 15px;
    }

    .sidebar .main-nav {
        flex-direction: row; /* Nav buttons horizontal */
        flex-wrap: wrap;
        justify-content: center;
        gap: 8px;
        flex-grow: 0;
        width: 100%;
    }

    .sidebar .nav-button {
        flex-grow: 1; /* Allow buttons to grow */
        text-align: center;
        padding: 10px;
        font-size: 0.95em;
    }

    .sidebar .user-info {
        margin-top: 15px;
        padding-top: 10px;
        border-top: none; /* No top border if horizontal */
        width: 100%;
        display: flex;
        flex-direction: column; /* Stack user details and auth button */
        align-items: center;
    }

    .sidebar .user-details {
        margin-bottom: 10px;
    }

    .auth-button {
        width: auto; /* Revert width for smaller screen sidebar */
    }

    .content-area {
        padding: 15px;
    }

    .module {
        padding: 10px;
    }

    h2 {
        font-size: 1.8em;
    }

    .dashboard-stats {
        grid-template-columns: 1fr; /* Stack stat cards */
    }

    .modal-content {
        width: 95%;
        padding: 20px;
    }

    form input[type="text"],
    form input[type="email"],
    form input[type="tel"],
    form input[type="number"],
    form input[type="date"],
    form select,
    form textarea {
        width: 100%; /* Full width for inputs on small screens */
    }
}
