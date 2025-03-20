// Function to determine the current page and set active states
function createHeader() {
    const currentPath = window.location.pathname;
    const isHomePage = currentPath.endsWith('index.html') || currentPath.endsWith('/');
    
    // Create the header HTML
    const headerHTML = `
    <a href="${isHomePage ? '#' : 'index.html'}" class="logo">
        <img src="assets/images/favicon.ico" alt="favicon" class="nav-favicon">
        <span class="artistic-text">
            <span class="letter">E</span>
            <span class="letter">d</span>
            <span class="letter">d</span>
            <span class="letter">i</span>
            <span class="letter">e</span>
        </span>
    </a>
    <div class="dropdown center-menu">
        <button class="dropbtn">Menu</button>
        <div class="dropdown-content">
            <a href="research.html" ${currentPath.includes('research') ? 'class="active"' : ''}>My Research</a>
            <a href="project.html" ${currentPath.includes('project') ? 'class="active"' : ''}>My Project</a>
            <a href="life.html" ${currentPath.includes('life') ? 'class="active"' : ''}>My Life</a>
        </div>
    </div>
    <nav class="navbar">
        <a href="${isHomePage ? '#Past' : 'index.html#Past'}">Past</a>
        <a href="${isHomePage ? '#Present' : 'index.html#Present'}">Present</a>
        <a href="${isHomePage ? '#Future' : 'index.html#Future'}">Future</a>
    </nav>
    `;
    
    // Insert the header HTML into the header element
    document.querySelector('header').innerHTML = headerHTML;
}

// Run the function when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', createHeader); 