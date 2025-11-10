// Simple navigation script
document.addEventListener('DOMContentLoaded', function() {
    // Navigation tabs
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabContents = document.querySelectorAll('.tab-content');

    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    const toggleSlider = document.querySelector('.toggle-slider');

    // Initialize navigation
    navTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.dataset.tab;
            switchTab(targetTab);
        });
    });

    // Switch tab function
    function switchTab(tabName) {
        // Remove active class from all tabs
        navTabs.forEach(tab => tab.classList.remove('active'));

        // Hide all tab contents
        tabContents.forEach(content => {
            content.style.display = 'none';
        });

        // Show target tab content
        const targetContent = document.getElementById(tabName + 'Tab');
        if (targetContent) {
            targetContent.style.display = 'block';
        }

        // Add active class to clicked tab
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
    }

    // Start solving button
    const startSolvingBtn = document.getElementById('startSolvingBtn');
    if (startSolvingBtn) {
        startSolvingBtn.addEventListener('click', function() {
            switchTab('solve');
        });
    }

    // Solve daily button
    const solveDailyBtn = document.querySelector('.solve-daily-btn');
    if (solveDailyBtn) {
        solveDailyBtn.addEventListener('click', function() {
            switchTab('solve');
        });
    }

    // Всегда применяем темную тему
    document.body.classList.add('dark-theme');
    document.body.classList.remove('light-theme');

    console.log('Navigation and theme system initialized');
});
// Initialize chatbot if available
if (window.chatbotManager && typeof window.chatbotManager.initialize === 'function') {
    window.chatbotManager.initialize();
}

// Initialize task manager if available  
if (window.taskManager && typeof window.taskManager.initialize === 'function') {
    window.taskManager.initialize();
}

// Initialize user data if available
if (window.userDataManager && typeof window.userDataManager.initialize === 'function') {
    window.userDataManager.initialize();
}

// Initialize profile if available
if (window.profileManager && typeof window.profileManager.initialize === 'function') {
    window.profileManager.initialize();
}