/* User Data Management - работа с cookies и статистикой */

// Структура данных пользователя
let userData = {
    solvedTasks: [], // ID решенных задач
    stars: 0, // Количество звездочек
    dailyTasks: [], // ID выполненных daily задач
    statistics: {
        totalSolved: 0,
        byCategory: {
            'algebra': { solved: 0, total: 20 },
            'geometry': { solved: 0, total: 20 },
            'calculus': { solved: 0, total: 20 },
            'probability': { solved: 0, total: 20 }
        },
        streakDays: 0,
        accuracy: 0,
        totalXP: 0
    },
    achievements: [],
    lastActivity: Date.now()
};

// Категории задач
const TASK_CATEGORIES = {
    'equation': 'algebra',
    'integral': 'calculus', 
    'derivative': 'calculus',
    'system': 'algebra',
    'proof': 'algebra',
    'geometry': 'geometry',
    'probability': 'probability',
    'general': 'algebra'
};

async function initializeUserData() {
    console.log('🔧 Initializing user data...');
    await loadUserData();
    updateAllStatistics();
    console.log('✅ User data initialized');
    console.log('📊 Current user data:', userData);
}

// Загрузка данных из JSON файла через API
async function loadUserData() {
    try {
        // Загружаем данные из JSON файла через API
        if (window.getUserData) {
            const data = await window.getUserData();
            if (data) {
                // Обновляем userData из JSON
                userData.solvedTasks = data.solvedTasks || [];
                userData.stars = data.stars || 0;
                userData.dailyTasks = data.dailyTasks || [];
                // Глубокое слияние для statistics
                if (data.statistics) {
                    userData.statistics = {
                        ...userData.statistics,
                        ...data.statistics,
                        byCategory: {
                            ...userData.statistics.byCategory,
                            ...(data.statistics.byCategory || {})
                        }
                    };
                }
                userData.achievements = data.achievements || [];
                userData.lastActivity = data.lastActivity || Date.now();
                
                console.log('📊 Loaded user data from JSON:', userData);
            }
        } else {
            console.warn('getUserData API function not available, using default data');
        }
        
    } catch (error) {
        console.error('❌ Error loading user data:', error);
        // В случае ошибки используем данные по умолчанию
    }
}

// Синхронизация данных в JSON файл через API (вызывается при каждом изменении)
async function syncUserDataToLocalStorage() {
    try {
        console.log('[UserData] syncUserDataToLocalStorage called');
        console.log('[UserData] Current userData:', {
            solvedTasks: userData.solvedTasks.length,
            stars: userData.stars,
            totalSolved: userData.statistics.totalSolved
        });
        
        // Сохраняем данные в JSON файл через API
        if (window.updateUserData) {
            console.log('[UserData] Calling window.updateUserData...');
            const response = await window.updateUserData(userData);
            console.log('💾 Synced to JSON file:', {
                solvedTasks: userData.solvedTasks.length,
                stars: userData.stars,
                totalSolved: userData.statistics.totalSolved,
                response: response
            });
            return true;
        } else {
            console.error('❌ updateUserData API function not available!');
            console.log('Available window functions:', Object.keys(window).filter(k => k.includes('User') || k.includes('update')));
            return false;
        }
    } catch (error) {
        console.error('❌ Error syncing to JSON file:', error);
        console.error('Error details:', error.message, error.stack);
        return false;
    }
}

// Сохранение данных в JSON файл через API
async function saveUserData() {
    try {
        userData.lastActivity = Date.now();
        
        // Сохраняем в JSON файл через API
        const success = await syncUserDataToLocalStorage();
        
        if (success) {
            console.log('💾 User data saved to JSON file successfully');
        } else {
            console.error('❌ Failed to save user data to JSON file');
        }
        
        return success;
    } catch (error) {
        console.error('❌ Error saving user data:', error);
        return false;
    }
}

// Работа с cookies
function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

// Отметить задачу как решенную
async function markTaskSolved(taskId, taskType = 'general', isDaily = false, earnedXP = 20) {
    console.log('[UserData] markTaskSolved called:', { taskId, taskType, isDaily, earnedXP });
    
    // Определяем категорию для использования в логах
    const category = TASK_CATEGORIES[taskType] || 'algebra';
    
    // КРИТИЧЕСКАЯ ПРОВЕРКА: не решена ли задача уже
    // Проверяем как строку и как число (на случай разных типов)
    const taskIdStr = String(taskId);
    const taskIdNum = Number(taskId);
    const isAlreadySolved = userData.solvedTasks.includes(taskId) || 
                            userData.solvedTasks.includes(taskIdStr) || 
                            userData.solvedTasks.includes(taskIdNum) ||
                            (userData.solvedTasks.some(id => String(id) === taskIdStr));
    
    console.log('[UserData] Is task already solved?', {
        isAlreadySolved,
        taskId,
        taskIdStr,
        taskIdNum,
        solvedTasksCount: userData.solvedTasks.length,
        solvedTasks: userData.solvedTasks.slice(0, 5) // Показываем первые 5 для отладки
    });
    
    if (!isAlreadySolved) {
        console.log('[UserData] Marking task as solved for the first time');
        
        // Если это daily задача, НЕ добавляем её в решенные задачи
        if (!isDaily) {
            // Дополнительная проверка перед добавлением (на случай race condition)
            const alreadyInList = userData.solvedTasks.includes(taskId) || 
                                 userData.solvedTasks.includes(String(taskId)) || 
                                 userData.solvedTasks.includes(Number(taskId));
            
            if (!alreadyInList) {
                // Добавляем как строку для единообразия
                userData.solvedTasks.push(String(taskId));
                userData.statistics.totalSolved++;
                userData.statistics.totalXP += earnedXP;
                console.log('[UserData] Task added to solvedTasks:', String(taskId));
            } else {
                console.log('[UserData] Task already in solvedTasks, skipping add');
                return false; // Задача уже была решена
            }
            
            // Обновляем статистику по категориям
            if (userData.statistics.byCategory[category]) {
                userData.statistics.byCategory[category].solved++;
            }
        } else {
            // Для daily задачи только обновляем статистику daily, но не добавляем в решенные
            console.log('[UserData] Daily task solved, not adding to solvedTasks');
        }
        
        // Если это daily задача
        if (isDaily) {
            const today = new Date().toDateString();
            if (!userData.dailyTasks.includes(today)) {
                userData.dailyTasks.push(today);
                // Звёзды начисляются через addStars() в task-manager.js
                updateStreakDays();
            }
        }
        
        // Проверяем достижения
        checkAchievements();
        
        // Обновляем точность
        updateAccuracy();
        
        console.log('[UserData] Calling saveUserData...');
        // Сохраняем в JSON файл
        const saveResult = await saveUserData();
        console.log('[UserData] saveUserData result:', saveResult);
        
        // Обновляем UI
        updateAllStatistics();
        
        console.log(`✅ Task ${taskId} marked as solved. Category: ${category}, XP: +${earnedXP}. Total solved: ${userData.statistics.totalSolved}`);
        
        if (window.showNotification) {
            window.showNotification(`Задача решена! +${earnedXP} XP`, 'success');
        }
        
        return true; // Задача была решена впервые
    } else {
        console.log(`⚠️ Task ${taskId} already solved, no stars awarded`);
        return false; // Задача уже была решена
    }
}

// Добавить звездочки
async function addStars(count) {
    userData.stars = Math.max(0, userData.stars + count); // Не даем уйти в минус
    
    // Сохраняем в JSON файл
    await saveUserData();
    
    // Обновляем UI
    updateAllStatistics();
    
    console.log(`⭐ Added ${count} stars. Total: ${userData.stars}. Saved to JSON file.`);
    
    if (count > 0 && window.showNotification) {
        window.showNotification(`Получено звездочек: +${count} ⭐`, 'success');
    }
}

// Потратить звездочки
async function spendStars(count) {
    if (userData.stars >= count) {
        userData.stars -= count;
        
        // Сохраняем в JSON файл
        await saveUserData();
        
        // Обновляем UI
        updateAllStatistics();
        
        console.log(`⭐ Spent ${count} stars. Remaining: ${userData.stars}. Saved to JSON file.`);
        return true;
    }
    return false;
}

// Обновить серию дней
function updateStreakDays() {
    const today = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    
    // Проверяем есть ли активность вчера
    const hasYesterday = userData.dailyTasks.includes(yesterdayStr);
    const hasToday = userData.dailyTasks.includes(today);
    
    if (hasToday) {
        if (hasYesterday || userData.statistics.streakDays === 0) {
            userData.statistics.streakDays++;
        } else {
            userData.statistics.streakDays = 1;
        }
    }
}

// Обновить точность
function updateAccuracy() {
    // Простая формула точности на основе решенных задач
    const totalAttempts = userData.statistics.totalSolved + Math.floor(userData.statistics.totalSolved * 0.3);
    userData.statistics.accuracy = Math.round((userData.statistics.totalSolved / totalAttempts) * 100);
}

// Проверить достижения
function checkAchievements() {
    const achievements = [
        {
            id: 'first_steps',
            name: 'Первые шаги',
            description: 'Решите первую задачу',
            condition: () => userData.statistics.totalSolved >= 1,
            xp: 50
        },
        {
            id: 'hot_streak',
            name: 'Горячая серия', 
            description: '7 дней подряд',
            condition: () => userData.statistics.streakDays >= 7,
            xp: 100
        },
        {
            id: 'thinker',
            name: 'Мыслитель',
            description: 'Решите 25 задач',
            condition: () => userData.statistics.totalSolved >= 25,
            xp: 200
        },
        {
            id: 'master',
            name: 'Мастер',
            description: 'Решите 100 задач',
            condition: () => userData.statistics.totalSolved >= 100,
            xp: 500
        },
        {
            id: 'perfectionist',
            name: 'Перфекционист',
            description: '95% точность',
            condition: () => userData.statistics.accuracy >= 95,
            xp: 300
        },
        {
            id: 'speedster',
            name: 'Скоростной',
            description: 'Решите 10 задач за день',
            condition: () => {
                const today = new Date().toDateString();
                // Упрощенная проверка - если решено много задач
                return userData.statistics.totalSolved >= 10;
            },
            xp: 150
        }
    ];
    
    achievements.forEach(achievement => {
        if (!userData.achievements.includes(achievement.id) && achievement.condition()) {
            userData.achievements.push(achievement.id);
            userData.statistics.totalXP += achievement.xp;
            
            if (window.showNotification) {
                window.showNotification(`🏆 Достижение разблокировано: ${achievement.name}!`, 'success', 5000);
            }
            
            console.log(`🏆 Achievement unlocked: ${achievement.name}`);
        }
    });
}

// Получить статистику по категориям
function getCategoryStats() {
    return userData.statistics.byCategory;
}

// Получить общую статистику
function getGeneralStats() {
    return {
        totalSolved: userData.statistics.totalSolved,
        stars: userData.stars,
        streakDays: userData.statistics.streakDays,
        accuracy: userData.statistics.accuracy,
        totalXP: userData.statistics.totalXP,
        achievements: userData.achievements.length
    };
}

// Проверить решена ли задача
function isTaskSolved(taskId) {
    return userData.solvedTasks.includes(taskId);
}

// Проверить выполнена ли daily задача сегодня
function isDailyCompletedToday() {
    const today = new Date().toDateString();
    return userData.dailyTasks.includes(today);
}

// Получить список решенных задач
function getSolvedTasks() {
    return [...userData.solvedTasks];
}

// Обновить все статистики в UI
function updateAllStatistics() {
    updateProfileStats();
    // Removed updateDailyTaskStatus();
    // Removed updateCategoryProgress();
    
    // Обновляем звезды в фидбеке модели, если функция доступна
    if (window.updateStarsInFeedback && typeof window.updateStarsInFeedback === 'function') {
        window.updateStarsInFeedback();
    }
}

// Обновить статистику в профиле
function updateProfileStats() {
    // Получаем актуальную статистику
    const stats = getGeneralStats();
    
    // Обновляем только решенные задачи и звездочки
    const solvedTasksEl = document.getElementById('profileSolvedTasks');
    const starsEl = document.getElementById('profileStars');
    
    console.log('Updating profile stats:', stats);
    
    if (solvedTasksEl) {
        solvedTasksEl.textContent = stats.totalSolved || 0;
        console.log('Updated solved tasks:', stats.totalSolved || 0);
    }
    if (starsEl) {
        starsEl.textContent = stats.stars || 0;
        console.log('Updated stars:', stats.stars || 0);
    }
}

// Обновить прогресс по категориям
function updateCategoryProgress() {
    const categoryStats = getCategoryStats();
    const progressBars = document.querySelectorAll('.progress-fill-profile');
    const progressPercents = document.querySelectorAll('.progress-percent');
    const progressDetails = document.querySelectorAll('.progress-details');
    
    const categories = ['algebra', 'geometry', 'calculus', 'probability'];
    
    categories.forEach((category, index) => {
        const stats = categoryStats[category];
        if (stats && progressBars[index] && progressPercents[index] && progressDetails[index]) {
            const percentage = Math.round((stats.solved / stats.total) * 100);
            
            progressBars[index].style.width = percentage + '%';
            progressPercents[index].textContent = percentage + '%';
            progressDetails[index].textContent = `${stats.solved}/${stats.total} задач`;
        }
    });
}

// Обновить статус daily задачи
function updateDailyTaskStatus() {
    const dailyCard = document.querySelector('.daily-task-card');
    const solveDailyBtn = document.querySelector('.solve-daily-btn');
    
    if (isDailyCompletedToday()) {
        if (dailyCard) {
            dailyCard.style.opacity = '0.7';
            dailyCard.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
        }
        if (solveDailyBtn) {
            solveDailyBtn.textContent = '✅ Выполнено';
            solveDailyBtn.disabled = true;
        }
    }
}

// Сбросить данные (для тестирования)
async function resetUserData() {
    userData = {
        solvedTasks: [],
        stars: 0,
        dailyTasks: [],
        statistics: {
            totalSolved: 0,
            byCategory: {
                'algebra': { solved: 0, total: 20 },
                'geometry': { solved: 0, total: 20 },
                'calculus': { solved: 0, total: 20 },
                'probability': { solved: 0, total: 20 }
            },
            streakDays: 0,
            accuracy: 0,
            totalXP: 0
        },
        achievements: [],
        lastActivity: Date.now()
    };
    
    await saveUserData();
    updateAllStatistics();
    
    if (window.showNotification) {
        window.showNotification('Данные сброшены', 'info');
    }
}

// Получить количество звезд
function getStars() {
    return userData.stars || 0;
}

// Export для использования в других модулях
window.userDataManager = {
    initialize: initializeUserData,
    markTaskSolved,
    addStars,
    spendStars,
    getStars,
    isTaskSolved,
    isDailyCompletedToday,
    getSolvedTasks,
    getGeneralStats,
    getCategoryStats,
    updateAllStatistics,
    resetUserData
};