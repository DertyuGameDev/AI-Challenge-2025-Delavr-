/* User Profile Management */

let isProfileOpen = false;
let userStats = {
    solvedTasks: 47,
    streakDays: 12,
    totalXP: 1247,
    accuracy: 89
};

function initializeProfile() {
    const userProfile = document.getElementById('userProfile');
    const profileOverlay = document.getElementById('profileOverlay');
    const closeProfileBtn = document.getElementById('closeProfileBtn');

    if (userProfile) {
        userProfile.addEventListener('click', toggleProfile);
    }

    if (closeProfileBtn) {
        closeProfileBtn.addEventListener('click', closeProfile);
    }

    if (profileOverlay) {
        profileOverlay.addEventListener('click', (e) => {
            if (e.target === profileOverlay) {
                closeProfile();
            }
        });
    }

    updateProfileStats();
}

function toggleProfile() {
    if (isProfileOpen) {
        closeProfile();
    } else {
        openProfile();
    }
}

function openProfile() {
    const profileOverlay = document.getElementById('profileOverlay');
    if (profileOverlay) {
        profileOverlay.style.display = 'flex';
        isProfileOpen = true;
        // Обновляем статистику при открытии профиля
        if (window.userDataManager) {
            window.userDataManager.updateAllStatistics();
        }
        updateProfileStats();
    }
}

function closeProfile() {
    const profileOverlay = document.getElementById('profileOverlay');
    if (profileOverlay) {
        profileOverlay.style.display = 'none';
        isProfileOpen = false;
    }
}

function updateProfileStats() {
    // Получаем реальные данные из userDataManager
    if (window.userDataManager) {
        const stats = window.userDataManager.getGeneralStats();
        const categoryStats = window.userDataManager.getCategoryStats();
        
        // Обновляем решенные задачи и звездочки (основные элементы профиля)
        const solvedTasksEl = document.getElementById('profileSolvedTasks');
        const starsEl = document.getElementById('profileStars');
        
        if (solvedTasksEl) {
            solvedTasksEl.textContent = stats.totalSolved || 0;
            console.log('[Profile] Updated solved tasks:', stats.totalSolved || 0);
        }
        if (starsEl) {
            starsEl.textContent = stats.stars || 0;
            console.log('[Profile] Updated stars:', stats.stars || 0);
        }
        
        // Update stat cards
        const statCards = document.querySelectorAll('.stat-card');
        if (statCards.length >= 4) {
            const statNumbers = statCards[0]?.querySelector('.stat-number');
            if (statNumbers) statNumbers.textContent = stats.totalSolved || 0;
            
            const streakNumbers = statCards[1]?.querySelector('.stat-number');
            if (streakNumbers) streakNumbers.textContent = stats.streakDays || 0;
            
            const xpNumbers = statCards[2]?.querySelector('.stat-number');
            if (xpNumbers) xpNumbers.textContent = (stats.totalXP || 0).toLocaleString();
            
            const accuracyNumbers = statCards[3]?.querySelector('.stat-number');
            if (accuracyNumbers) accuracyNumbers.textContent = (stats.accuracy || 0) + '%';
        }

        // Update progress bars
        const progressBars = document.querySelectorAll('.progress-fill-profile');
        const progressPercents = document.querySelectorAll('.progress-percent');
        const progressDetails = document.querySelectorAll('.progress-details');
        
        const categories = ['algebra', 'geometry', 'calculus', 'probability'];
        const categoryNames = ['Алгебра', 'Геометрия', 'Математический анализ', 'Теория вероятностей'];
        
        categories.forEach((category, index) => {
            const catStats = categoryStats[category];
            if (catStats && progressBars[index] && progressPercents[index] && progressDetails[index]) {
                const percentage = Math.round((catStats.solved / catStats.total) * 100);
                
                progressBars[index].style.width = percentage + '%';
                progressPercents[index].textContent = percentage + '%';
                progressDetails[index].textContent = `${catStats.solved}/${catStats.total} задач`;
            }
        });
    }
}

function updateUserStats(newStats) {
    userStats = { ...userStats, ...newStats };
    updateProfileStats();
}

function addXP(amount) {
    userStats.totalXP += amount;
    updateProfileStats();
    showXPNotification(amount);
}

function showXPNotification(amount) {
    const notification = document.createElement('div');
    notification.className = 'xp-notification';
    notification.innerHTML = `+${amount} XP`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(45deg, #667eea, #764ba2);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 20px;
        font-weight: bold;
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 2000);
}

function incrementSolvedTasks() {
    userStats.solvedTasks++;
    updateProfileStats();
}

function updateAccuracy(newAccuracy) {
    userStats.accuracy = Math.round(newAccuracy);
    updateProfileStats();
}

// Export for use in other modules
window.profileManager = {
    initialize: initializeProfile,
    openProfile,
    closeProfile,
    updateStats: updateUserStats,
    addXP,
    incrementSolvedTasks,
    updateAccuracy,
    getStats: () => ({ ...userStats })
};