/* Base styles from previous version, adjusted for better integration */
body {
    font-family: 'Inter', sans-serif;
    background-color: #f8faff; /* Light blue-gray background */
    color: #333;
}
.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
}
.header {
    background-color: #ffffff;
    border-bottom: 1px solid #e0e7ff; /* Lighter blue border */
    box-shadow: 0 4px 12px rgba(0,0,0,0.08); /* More pronounced shadow for depth */
    z-index: 1000; /* Ensure header is on top */
    position: sticky;
    top: 0;
    width: 100%;
}
.nav-link {
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    transition: all 0.2s ease-in-out;
    font-weight: 500;
    color: #4a5568; /* Gray-800 */
    text-decoration: none; /* Ensure no underline */
    display: block; /* For better click area in mobile, and block-level within dropdowns */
}
.nav-link:hover {
    background-color: #edf2f7; /* Gray-100 */
    color: #2d3748; /* Gray-900 */
}
.nav-link.active {
    background-color: #4c51bf; /* Indigo-700 */
    color: #ffffff;
}
.btn-primary {
    background-color: #4c51bf; /* Indigo-700 */
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 600;
    transition: background-color 0.2s ease-in-out, transform 0.1s ease-out; /* Add transform for subtle click effect */
    cursor: pointer;
    border: none; /* Remove default button border */
}
.btn-primary:hover {
    background-color: #5a62d9; /* Slightly lighter indigo */
    transform: translateY(-1px); /* Slight lift on hover */
}
.btn-primary:active {
    transform: translateY(0); /* Return on click */
}
.btn-secondary {
    background-color: #e2e8f0; /* Gray-200 */
    color: #2d3748; /* Gray-900 */
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 600;
    transition: background-color 0.2s ease-in-out, transform 0.1s ease-out;
    cursor: pointer;
    border: none;
}
.btn-secondary:hover {
    background-color: #cbd5e0; /* Gray-300 */
    transform: translateY(-1px);
}
.btn-secondary:active {
    transform: translateY(0);
}
.form-input, .form-select, .form-textarea {
    width: 100%;
    padding: 0.65rem 1rem;
    border: 1px solid #cbd5e0; /* Gray-300 */
    border-radius: 0.375rem; /* rounded-md */
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}
.form-input:focus, .form-select:focus, .form-textarea:focus {
    border-color: #a7b3ff; /* Indigo-200 */
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2); /* Indigo-500 with opacity */
    outline: none;
}
.card {
    background-color: #ffffff;
    border-radius: 0.75rem; /* rounded-lg */
    box-shadow: 0 4px 10px rgba(0,0,0,0.08); /* Slightly stronger shadow for cards */
    padding: 1.5rem;
}
.section-title {
    font-size: 1.875rem; /* text-3xl */
    font-weight: 700; /* font-bold */
    color: #2d3748; /* Gray-900 */
    margin-bottom: 1.5rem;
}

/* Modal Styles */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}
.modal-content {
    background-color: white;
    padding: 2rem;
    border-radius: 0.75rem;
    box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
    max-width: 450px;
    text-align: center;
}
.modal-content h3 {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
    color: #2d3748;
}
.modal-content p {
    margin-bottom: 1.5rem;
    color: #4a5568;
}
.modal-actions {
    display: flex;
    justify-content: center;
    gap: 1rem;
}
.modal-actions button {
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s ease-in-out;
}
.modal-actions button.primary {
    background-color: #4c51bf;
    color: white;
}
.modal-actions button.primary:hover {
    background-color: #5a62d9;
}
.modal-actions button.secondary {
    background-color: #e2e8f0;
    color: #2d3748;
}
.modal-actions button.secondary:hover {
    background-color: #cbd5e0;
}
.message.error {
    background-color: #fee2e2; /* Red-100 */
    color: #b91c1c; /* Red-700 */
    padding: 0.75rem 1rem;
    border-radius: 0.375rem;
    margin-bottom: 1rem;
    border: 1px solid #ef4444; /* Red-500 */
}
.message.success {
    background-color: #dcfce7; /* Green-100 */
    color: #166534; /* Green-700 */
    padding: 0.75rem 1rem;
    border-radius: 0.375rem;
    margin-bottom: 1rem;
    border: 1px solid #22c55e; /* Green-500 */
}

/* Mobile Menu specific styles */
#mobileMenu {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease-out; /* Smooth slide-down/up */
}
#mobileMenu.open {
    max-height: 500px; /* Adjust based on content height, needs to be large enough */
    transition: max-height 0.5s ease-in;
}
#mobileMenu .nav-link {
    width: 100%; /* Full width for mobile links */
}
#mobileMenu .mobile-submenu {
    padding-left: 1.5rem; /* Indent sub-items */
}

/* Tooltip styles */
.group.relative .tooltip-text {
    visibility: hidden;
    width: 250px; /* Adjust width as needed */
    background-color: #333;
    color: #fff;
    text-align: center;
    border-radius: 6px;
    padding: 8px 10px;
    position: absolute;
    z-index: 1;
    bottom: 125%; /* Position above the icon */
    left: 50%;
    margin-left: -125px; /* Half the width to center it */
    opacity: 0;
    transition: opacity 0.3s;
    font-size: 0.8rem; /* Smaller text for tooltip */
    line-height: 1.3;
    pointer-events: none; /* Allow clicks on elements below */
}

.group.relative .tooltip-text::after {
    content: " ";
    position: absolute;
    top: 100%; /* At the bottom of the tooltip */
    left: 50%;
    margin-left: -5px;
    border-width: 5px;
    border-style: solid;
    border-color: #333 transparent transparent transparent;
}

.group.relative:hover .tooltip-text {
    visibility: visible;
    opacity: 1;
}
