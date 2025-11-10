// Основные элементы DOM
const navTabs = document.querySelectorAll('.nav-tab');
const tabContents = document.querySelectorAll('.tab-content');
const startSolvingBtn = document.getElementById('startSolvingBtn');
const quickUpload = document.getElementById('quickUpload');
const quickResult = document.getElementById('quickResult');

// Элементы вкладки "Решить"
const toggleHistoryBtn = document.getElementById('toggleHistory');
const historyContent = document.getElementById('historyContent');
const historyPanel = document.querySelector('.history-panel');
const addTaskBtn = document.getElementById('addTaskBtn');
const addTaskModal = document.getElementById('addTaskModal');
const closeModal = document.getElementById('closeModal');
const cancelBtn = document.getElementById('cancelBtn');
const saveTaskBtn = document.getElementById('saveTaskBtn');
const fileInput = document.getElementById('fileInput');
const fileUploadArea = document.getElementById('fileUploadArea');
const checkErrorsBtn = document.getElementById('checkErrorsBtn');
const loadingSpinner = document.getElementById('loadingSpinner');
const taskInput = document.getElementById('taskInput');
const resultsArea = document.getElementById('resultsArea');
const hintsSection = document.getElementById('hintsSection');

// Состояние приложения
let currentTab = 'main';
let isHistoryCollapsed = false;
let uploadedFile = null;
let isChecking = false;
let currentTaskData = null;
let historyTasks = [];
// let isDarkTheme = true; // По умолчанию темная тема

document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadHistoryTasks();
    updateCheckButtonState();
    initializeTheme();
});

function initializeEventListeners() {
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    if (startSolvingBtn) {
        startSolvingBtn.addEventListener('click', () => switchTab('solve'));
    }

    if (quickUpload) {
        quickUpload.addEventListener('click', handleQuickUpload);
    }

    // Переключатель темы
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    const solveDailyBtn = document.querySelector('.solve-daily-btn');
    if (solveDailyBtn) {
        solveDailyBtn.addEventListener('click', () => {
            switchTab('solve');
            loadDailyTask();
        });
    }

    if (toggleHistoryBtn) {
        toggleHistoryBtn.addEventListener('click', toggleHistory);
    }

    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', openModal);
    }
    if (closeModal) {
        closeModal.addEventListener('click', closeModalHandler);
    }
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModalHandler);
    }
    if (saveTaskBtn) {
        saveTaskBtn.addEventListener('click', saveTask);
    }
    if (fileUploadArea) {
        fileUploadArea.addEventListener('click', () => fileInput.click());
        fileUploadArea.addEventListener('dragover', handleDragOver);
        fileUploadArea.addEventListener('drop', handleDrop);
    }
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
    if (checkErrorsBtn) {
        checkErrorsBtn.addEventListener('click', checkErrors);
    }

    // Initialize new functionality
    initializeFilePreview();
    initializeAutoResize();
    if (taskInput) {
        taskInput.addEventListener('input', () => {
            updateCheckButtonState();
            saveCurrentTaskData();
        });
    }
    const randomTaskBtn = document.querySelector('.random-task-btn');
    if (randomTaskBtn) {
        randomTaskBtn.addEventListener('click', selectRandomTask);
    }
    if (addTaskModal) {
        addTaskModal.addEventListener('click', (e) => {
            if (e.target === addTaskModal) {
                closeModalHandler();
            }
        });
    }
}

function switchTab(tabName) {
    console.log('Switching to tab:', tabName);
    currentTab = tabName;

    navTabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        }
    });

    tabContents.forEach(content => {
        content.style.display = 'none';
    });

    const targetTab = document.getElementById(tabName + 'Tab');
    console.log('Target tab element:', targetTab);
    if (targetTab) {
        targetTab.style.display = tabName === 'solve' ? 'flex' : 'block';

        if (tabName === 'solve') {
            setTimeout(() => {
                attachHistoryEventListeners();
                attachHintEventListeners();
            }, 100);
        }
    } else {
        console.error('Tab not found:', tabName + 'Tab');
    }
}

// Загрузка Daily задачи
function loadDailyTask() {
    if (taskInput) {
        const dailyTask = {
            text: 'Найдите все корни уравнения: x³ - 6x² + 11x - 6 = 0',
            type: 'daily',
            points: 50
        };

        taskInput.value = dailyTask.text;
        currentTaskData = dailyTask;
        updateCheckButtonState();

        taskInput.style.background = 'linear-gradient(45deg, rgba(255, 215, 0, 0.1), rgba(255, 237, 78, 0.1))';
        setTimeout(() => {
            taskInput.style.background = '';
        }, 2000);
    }
}

// Загрузка задач из истории
function loadHistoryTasks() {
    historyTasks = [{
            id: 1,
            text: 'Найдите корни уравнения x² - 5x + 6 = 0',
            progress: 100,
            solved: true,
            lastSolution: 'D = b² - 4ac = 25 - 24 = 1\nx₁ = (5 + 1)/2 = 3\nx₂ = (5 - 1)/2 = 2',
            checkedSolution: 'D = b² - 4ac = 25 - 24 = 1\nx₁ = (5 + 1)/2 = 3\nx₂ = (5 - 1)/2 = 2',
            attempts: 2,
            errorHighlights: []
        },
        {
            id: 2,
            text: 'Докажите формулу (a+b)² = a² + 2ab + b²',
            progress: 30,
            solved: false,
            lastSolution: '(a+b)² = a² + b²\nПоэтому формула верна',
            checkedSolution: '(a+b)² = a² + b² - ОШИБКА!\nПропущено слагаемое 2ab',
            attempts: 1,
            errorHighlights: [
                { start: 10, end: 19, type: 'missing', message: 'Пропущено слагаемое 2ab' }
            ]
        },
        {
            id: 3,
            text: 'Вычислите интеграл ∫x²dx',
            progress: 75,
            solved: false,
            lastSolution: '∫x²dx = x³/3',
            checkedSolution: '∫x²dx = x³/3 + C',
            attempts: 3,
            errorHighlights: [
                { start: 12, end: 12, type: 'missing', message: 'Забыта константа интегрирования C' }
            ]
        }
    ];

    renderHistoryTasks();
}

function renderHistoryTasks() {
    if (!historyContent) return;

    historyContent.innerHTML = historyTasks.map(task => `
        <div class="history-item ${task.solved ? 'solved' : 'unsolved'}" data-task-id="${task.id}">
            <div class="history-item-content">
                <div class="history-status">
                    <i class="fas ${task.solved ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                </div>
                <div class="history-text">
                    <span>${task.text.substring(0, 30)}${task.text.length > 30 ? '...' : ''}</span>
                    <small class="attempts-count">${task.attempts} попыт${task.attempts === 1 ? 'ка' : task.attempts < 5 ? 'ки' : 'ок'}</small>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${task.progress}%"></div>
                    <span class="progress-text">${task.progress}%</span>
                </div>
            </div>
        </div>
    `).join('');

    attachHistoryEventListeners();
}

function attachHistoryEventListeners() {
    document.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', () => selectHistoryItem(item));
    });
}

function attachHintEventListeners() {
    document.querySelectorAll('.hint-card').forEach(card => {
        const header = card.querySelector('.hint-header');
        if (header) {
            header.addEventListener('click', () => toggleHint(card));
        }
    });
}

function handleQuickUpload() {
    const quickFileInput = document.createElement('input');
    quickFileInput.type = 'file';
    quickFileInput.accept = '.pdf,.jpg,.jpeg,.png';
    quickFileInput.style.display = 'none';

    quickFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            switchTab('solve');
            setTimeout(() => {
                handleFile(file);
            }, 300);
        }
    });

    document.body.appendChild(quickFileInput);
    quickFileInput.click();
    document.body.removeChild(quickFileInput);
}

function toggleHistory() {
    if (!toggleHistoryBtn) return;

    isHistoryCollapsed = !isHistoryCollapsed;

    if (isHistoryCollapsed) {
        historyPanel.classList.add('collapsed');
        historyContent.style.display = 'none';
        toggleHistoryBtn.classList.add('rotated');
    } else {
        historyPanel.classList.remove('collapsed');
        historyContent.style.display = 'block';
        toggleHistoryBtn.classList.remove('rotated');
    }
}

function openModal() {
    addTaskModal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeModalHandler() {
    addTaskModal.classList.remove('show');
    document.body.style.overflow = 'auto';
    document.getElementById('newTaskInput').value = '';
}

function saveTask() {
    const newTask = document.getElementById('newTaskInput').value.trim();

    if (newTask) {
        taskInput.value = newTask;
        updateCheckButtonState();
        closeModalHandler();
        showNotification('Задача добавлена!', 'success');
    } else {
        showNotification('Пожалуйста, введите условие задачи', 'error');
    }
}

function handleDragOver(e) {
    e.preventDefault();
    fileUploadArea.style.borderColor = '#667eea';
    fileUploadArea.style.background = 'rgba(102, 126, 234, 0.05)';
}

function handleDrop(e) {
    e.preventDefault();
    fileUploadArea.style.borderColor = '#ccc';
    fileUploadArea.style.background = 'transparent';

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

function handleFile(file) {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
        showNotification('Поддерживаются только PDF, JPG и PNG файлы', 'error');
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        showNotification('Размер файла не должен превышать 10MB', 'error');
        return;
    }

    uploadedFile = file;
    displayUploadedFile(file);
    updateCheckButtonState();
}

function displayUploadedFile(file) {
    const fileUploadArea = document.getElementById('fileUploadArea');

    if (fileUploadArea) {
        fileUploadArea.innerHTML = `
            <div class="uploaded-file">
                <div class="file-info">
                    <i class="fas fa-file-alt" style="font-size: 2rem; color: #667eea; margin-bottom: 1rem;"></i>
                    <p><strong>${file.name}</strong></p>
                    <small>${formatFileSize(file.size)}</small>
                </div>
                <button class="remove-file-btn" onclick="removeFile()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        fileUploadArea.style.border = '2px solid #28a745';
        fileUploadArea.style.background = 'rgba(40, 167, 69, 0.05)';
    }

    if (quickUpload) {
        quickUpload.innerHTML = `
            <i class="fas fa-check-circle" style="color: #28a745; font-size: 2rem; margin-bottom: 1rem;"></i>
            <p style="color: #28a745; font-weight: bold;">Файл загружен</p>
            <small>${file.name}</small>
        `;
    }
}

function removeFile() {
    uploadedFile = null;
    const fileUploadArea = document.getElementById('fileUploadArea');

    fileUploadArea.innerHTML = `
        <div class="upload-placeholder">
            <i class="fas fa-plus upload-icon"></i>
            <p>Добавьте файл с решением</p>
            <small>Поддерживаются: PDF, JPG, PNG</small>
        </div>
    `;

    fileUploadArea.style.border = '2px dashed #ccc';
    fileUploadArea.style.background = 'transparent';

    updateCheckButtonState();
}

function updateCheckButtonState() {
    if (!taskInput || !checkErrorsBtn) return;

    const hasTask = taskInput.value.trim().length > 0;
    const hasFile = uploadedFile !== null;

    checkErrorsBtn.disabled = !hasTask || !hasFile || isChecking;
}

async function checkErrors() {
    if (isChecking) return;

    isChecking = true;
    checkErrorsBtn.classList.add('loading');
    checkErrorsBtn.disabled = true;

    const originalText = checkErrorsBtn.querySelector('.btn-text').textContent;
    checkErrorsBtn.querySelector('.btn-text').textContent = 'Анализируем...';

    try {
        await simulateErrorCheckWithProgress();
        const results = analyzeTaskWithHighlights();
        displayResults(results);
        saveTaskToHistory(results);

        if (results.hasErrors) {
            showHints(results.errors);
        }

    } catch (error) {
        showNotification('Произошла ошибка при проверке', 'error');
    } finally {
        isChecking = false;
        checkErrorsBtn.classList.remove('loading');
        checkErrorsBtn.querySelector('.btn-text').textContent = originalText;
        updateCheckButtonState();
    }
}

// Имитация проверки с прогрессом
async function simulateErrorCheckWithProgress() {
    const steps = [
        'Загрузка изображения...',
        'Распознавание текста...',
        'Анализ математических выражений...',
        'Проверка логики решения...',
        'Формирование отчета...'
    ];

    for (let i = 0; i < steps.length; i++) {
        checkErrorsBtn.querySelector('.btn-text').textContent = steps[i];
        await new Promise(resolve => setTimeout(resolve, 600));
    }
}

// Анализ задачи и генерация случайных ошибок
function analyzeTask() {
    const taskText = taskInput.value.toLowerCase();
    const taskType = determineTaskType(taskText);

    const hasErrors = Math.random() < 0.7;

    let errors = [];
    let hints = [];
    let progress = 0;

    if (hasErrors) {
        errors = generateTaskSpecificErrors(taskType);
        hints = generateTaskSpecificHints(taskType, errors);
        progress = Math.max(20, 100 - errors.length * 25);
    } else {
        progress = 100;
    }

    return {
        hasErrors,
        errors,
        hints,
        progress,
        taskType
    };
}

// Определение типа задачи
function determineTaskType(taskText) {
    if (taskText.includes('уравнение') || taskText.includes('корни')) return 'equation';
    if (taskText.includes('интеграл') || taskText.includes('∫')) return 'integral';
    if (taskText.includes('производная') || taskText.includes('дифференц')) return 'derivative';
    if (taskText.includes('система') || taskText.includes('{')) return 'system';
    if (taskText.includes('докаж') || taskText.includes('доказать')) return 'proof';
    return 'general';
}

// Генерация ошибок в зависимости от типа задачи
function generateTaskSpecificErrors(taskType) {
    const errorTemplates = {
        equation: [
            { type: 'formula', text: 'Неправильно применена формула дискриминанта' },
            { type: 'calculation', text: 'Ошибка в арифметических вычислениях' },
            { type: 'sign', text: 'Неверный знак при переносе слагаемых' }
        ],
        integral: [
            { type: 'formula', text: 'Неправильно применена формула интегрирования' },
            { type: 'constant', text: 'Забыта константа интегрирования C' },
            { type: 'limits', text: 'Неверно вычислены пределы интегрирования' }
        ],
        derivative: [
            { type: 'rule', text: 'Неправильно применено правило дифференцирования' },
            { type: 'chain', text: 'Ошибка в применении правила цепочки' },
            { type: 'simplification', text: 'Ошибка при упрощении выражения' }
        ],
        proof: [
            { type: 'logic', text: 'Нарушена логическая последовательность доказательства' },
            { type: 'assumption', text: 'Неверное или неполное обоснование шага' },
            { type: 'conclusion', text: 'Вывод не следует из предыдущих утверждений' }
        ]
    };

    const templates = errorTemplates[taskType] || errorTemplates.equation;
    const errorCount = Math.floor(Math.random() * 3) + 1;

    return templates.slice(0, errorCount);
}

// Генерация подсказок для исправления ошибок
function generateTaskSpecificHints(taskType, errors) {
    const hintTemplates = {
        formula: 'Проверьте правильность применения математических формул',
        calculation: 'Внимательно пересчитайте арифметические операции',
        sign: 'Обратите внимание на знаки при алгебраических преобразованиях',
        constant: 'Не забывайте добавлять константу интегрирования',
        logic: 'Убедитесь в логической связности всех шагов решения'
    };

    return errors.map((error, index) => ({
        level: index + 1,
        text: hintTemplates[error.type] || 'Проверьте правильность выполнения этого шага',
        errorType: error.type
    }));
}

function displayResults(results) {
    if (!resultsArea) return;

    if (results.hasErrors) {
        const sampleSolution = generateSampleSolution(results.taskType);
        const highlightedSolution = highlightErrors(sampleSolution, results.errorHighlights || []);

        resultsArea.innerHTML = `
            <div class="results-content-clean">
                <!-- Ваше решение с выделенными ошибками -->
                <div class="solution-section-clean">
                    <h4 class="section-title">Ваше последнее решение:</h4>
                    <div class="solution-box-clean">
                        <div class="solution-text-clean">${highlightedSolution}</div>
                    </div>
                </div>
                
                <!-- Результат проверки -->
                <div class="feedback-section-clean">
                    <h4 class="section-title">Результат проверки:</h4>
                    <div class="feedback-box-clean">
                        <div class="corrected-solution">
                            ${generateCorrectedSolution(results.taskType, results.errors)}
                        </div>
                    </div>
                </div>
                
                <!-- Найденные ошибки -->
                <div class="errors-section-clean">
                    <div class="errors-header-clean">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>Найдено ошибок: ${results.errors.length}</span>
                    </div>
                    <div class="errors-list-clean">
                        ${results.errors.map((error, index) => `
                            <div class="error-card-clean" data-error-index="${index}">
                                <div class="error-marker-clean" style="background: ${getErrorColor(error.type)}"></div>
                                <div class="error-text-clean">${error.text}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Прогресс -->
                <div class="progress-section-clean">
                    <div class="progress-label-clean">Текущий прогресс: <strong>${results.progress}%</strong></div>
                    <div class="progress-bar-clean">
                        <div class="progress-fill-clean" style="width: ${results.progress}%"></div>
                    </div>
                </div>
            </div>
        `;

        addErrorHighlightInteractivity();
        updateQuickResult('error', results.progress);
    } else {
        resultsArea.innerHTML = `
            <div class="results-content success-state">
                <div class="success-summary">
                    <h4 style="color: #28a745; margin-bottom: 1rem;">
                        <i class="fas fa-check-circle"></i>
                        Решение верное!
                    </h4>
                    <div class="success-details">
                        <p>🎉 Поздравляем! Ваше решение не содержит ошибок.</p>
                        <div class="task-type-badge">
                            <span>Тип задачи: ${getTaskTypeLabel(results.taskType)}</span>
                        </div>
                    </div>
                    <div class="progress-update">
                        <p>Прогресс решения: <strong>100%</strong></p>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 100%"></div>
                        </div>
                        <div class="success-actions">
                            <button class="btn-secondary" onclick="selectRandomTask()">
                                <i class="fas fa-random"></i> Следующая задача
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (hintsSection) {
            hintsSection.style.display = 'none';
        }
        
        updateQuickResult('success', 100);
        markTaskAsSolved();
    }
}

// Генерация примера решения для демонстрации
function generateSampleSolution(taskType) {
    const solutions = {
        equation: "D = b² - 4ac = (-5)² - 4·1·6 = 25 - 24 = 1\nx₁ = (5 + √1)/2 = (5 + 1)/2 = 3\nx₂ = (5 - √1)/2 = (5 - 1)/2 = 2",
        integral: "∫x²dx = x³/3\nОтвет: x³/3",
        derivative: "f'(x) = d/dx(3x³ - 2x² + x - 1)\nf'(x) = 9x² - 4x + 1",
        proof: "(a+b)² = (a+b)(a+b)\n= a² + ab + ba + b²\n= a² + 2ab + b²",
        system: "x + y = 5  (1)\n2x - y = 1  (2)\nИз (1): y = 5 - x\nПодставляем в (2): 2x - (5 - x) = 1\n3x - 5 = 1\nx = 2, y = 3",
        general: "Решение задачи:\nШаг 1: Анализируем условие\nШаг 2: Применяем формулы\nШаг 3: Получаем ответ"
    };

    return solutions[taskType] || solutions.general;
}

let currentErrorIndex = 0;

function navigateError(direction) {
    const errorHighlights = document.querySelectorAll('.error-highlight[id^="error-"]');
    const totalErrors = errorHighlights.length;

    if (totalErrors === 0) return;

    currentErrorIndex = (currentErrorIndex + direction + totalErrors) % totalErrors;

    const currentError = errorHighlights[currentErrorIndex];
    if (currentError) {
        currentError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        currentError.classList.add('flash');

        setTimeout(() => {
            currentError.classList.remove('flash');
        }, 1500);
    }

    // Обновляем счетчик
    const counter = document.querySelector('.error-counter');
    if (counter) {
        counter.textContent = `Ошибка ${currentErrorIndex + 1} из ${totalErrors}`;
    }
    const prevBtn = document.querySelector('.error-nav-btn:first-child');
    const nextBtn = document.querySelector('.error-nav-btn:last-child');

    if (prevBtn) prevBtn.disabled = currentErrorIndex === 0;
    if (nextBtn) nextBtn.disabled = currentErrorIndex === totalErrors - 1;
}

// Отображение подсказок
function showHints(errors) {
    if (!hintsSection) return;

    const hints = generateTaskSpecificHints(currentTaskData?.taskType || 'general', errors);

    hintsSection.innerHTML = `
        <h5>💡 Подсказки для исправления</h5>
        ${hints.map((hint, index) => `
            <div class="hint-card" data-level="${hint.level}">
                <div class="hint-header">
                    ${Array(hint.level).fill('<i class="fas fa-star"></i>').join('')}
                    <span>Подсказка уровня ${hint.level}</span>
                    <i class="fas fa-chevron-down"></i>
                </div>
                <div class="hint-content">
                    <p>${hint.text}</p>
                    <small class="hint-error-type">Связано с: ${getErrorTypeLabel(hint.errorType)}</small>
                </div>
            </div>
        `).join('')}
    `;

    hintsSection.style.display = 'block';
    attachHintEventListeners();
}

// Сохранение задачи в историю
function saveTaskToHistory(results) {
    if (!currentTaskData) return;

    let existingTask = historyTasks.find(task =>
        task.text === currentTaskData.text ||
        (currentTaskData.id && task.id === currentTaskData.id)
    );

    const sampleSolution = generateSampleSolution(results.taskType);

    if (existingTask) {
        existingTask.progress = results.progress;
        existingTask.solved = !results.hasErrors;
        existingTask.lastSolution = sampleSolution;
        existingTask.checkedSolution = results.hasErrors ?
            `Найдено ошибок: ${results.errors.length}` :
            sampleSolution;
        existingTask.attempts += 1;
        existingTask.errorHighlights = results.errorHighlights || [];
    } else {
        const newTask = {
            id: historyTasks.length + 1,
            text: currentTaskData.text,
            progress: results.progress,
            solved: !results.hasErrors,
            lastSolution: sampleSolution,
            checkedSolution: results.hasErrors ?
                `Найдено ошибок: ${results.errors.length}` :
                sampleSolution,
            attempts: 1,
            taskType: results.taskType,
            errorHighlights: results.errorHighlights || []
        };

        historyTasks.unshift(newTask);
    }

    renderHistoryTasks();
}

function getErrorTypeLabel(type) {
    const labels = {
        formula: 'Ошибка в формуле',
        calculation: 'Вычислительная ошибка',
        sign: 'Ошибка со знаками',
        constant: 'Пропущена константа',
        logic: 'Логическая ошибка',
        rule: 'Неверное правило',
        chain: 'Правило цепочки',
        limits: 'Пределы интегрирования'
    };
    return labels[type] || 'Общая ошибка';
}

function getTaskTypeLabel(type) {
    const labels = {
        equation: 'Уравнения',
        integral: 'Интегралы',
        derivative: 'Производные',
        system: 'Системы уравнений',
        proof: 'Доказательства',
        general: 'Общая математика'
    };
    return labels[type] || 'Математика';
}

function updateQuickResult(type, progress) {
    if (!quickResult) return;

    if (type === 'success') {
        quickResult.innerHTML = `
            <i class="fas fa-check-circle" style="color: #28a745; font-size: 2rem; margin-bottom: 1rem;"></i>
            <p style="color: #28a745; font-weight: bold;">Решение верное!</p>
            <small>Прогресс: ${progress}%</small>
        `;
    } else {
        quickResult.innerHTML = `
            <i class="fas fa-exclamation-triangle" style="color: #ff6b6b; font-size: 2rem; margin-bottom: 1rem;"></i>
            <p style="color: #ff6b6b; font-weight: bold;">Найдены ошибки</p>
            <small>Прогресс: ${progress}%</small>
        `;
    }
}

function selectHistoryItem(item) {
    const taskId = parseInt(item.dataset.taskId);
    const task = historyTasks.find(t => t.id === taskId);

    if (!task) return;

    taskInput.value = task.text;
    currentTaskData = task;

    if (task.solved) {
        checkErrorsBtn.disabled = true;
        checkErrorsBtn.querySelector('.btn-text').textContent = 'Задача решена';
        displayTaskSolution(task);
    } else {
        updateCheckButtonState();
        if (task.checkedSolution) {
            displayPreviousAttempt(task);
        }
    }

    item.style.background = 'rgba(102, 126, 234, 0.1)';
    setTimeout(() => {
        item.style.background = '';
    }, 1000);

    showNotification(`Загружена задача: ${task.text.substring(0, 40)}...`, 'info');
}

// Отображение решенной задачи
function displayTaskSolution(task) {
    if (!resultsArea) return;

    resultsArea.innerHTML = `
        <div class="results-content success-state">
            <div class="success-summary">
                <h4 style="color: #28a745; margin-bottom: 1rem;">
                    <i class="fas fa-check-circle"></i>
                    Задача решена!
                </h4>
                <div class="solution-display">
                    <p><strong>Ваше решение:</strong></p>
                    <div class="solution-text">${task.lastSolution}</div>
                    <p><strong>Проверенное решение:</strong></p>
                    <div class="solution-text">${task.checkedSolution}</div>
                </div>
                <div class="progress-update">
                    <p>Прогресс решения: <strong>100%</strong></p>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 100%"></div>
                    </div>
                </div>
                <small class="attempts-info">Решено за ${task.attempts} попыт${task.attempts === 1 ? 'ку' : task.attempts < 5 ? 'ки' : 'ок'}</small>
            </div>
        </div>
    `;
}

// Отображение предыдущей попытки
function displayPreviousAttempt(task) {
    if (!resultsArea) return;

    const highlightedSolution = highlightErrors(task.lastSolution, task.errorHighlights || []);

    resultsArea.innerHTML = `
        <div class="results-content-clean">
            <!-- Ваше решение с выделенными ошибками -->
            <div class="solution-section-clean">
                <h4 class="section-title">Ваше последнее решение:</h4>
                <div class="solution-box-clean">
                    <div class="solution-text-clean">${highlightedSolution}</div>
                </div>
            </div>
            
            <!-- Результат проверки -->
            <div class="feedback-section-clean">
                <h4 class="section-title">Результат проверки:</h4>
                <div class="feedback-box-clean">
                    <div class="corrected-solution">
                        ${task.checkedSolution || 'Проверка не завершена'}
                    </div>
                </div>
            </div>
            
            <!-- Найденные ошибки -->
            ${task.errorHighlights && task.errorHighlights.length > 0 ? `
                <div class="errors-section-clean">
                    <div        </li>
                         class="errors-header-clean">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>Найдено ошибок: ${task.errorHighlights.length}</span>
                    </div>
                    <div class="errors-list-clean">
                        ${task.errorHighlights.map((error, index) => `
                            <div class="error-card-clean" data-error-index="${index}">
                                <div class="error-marker-clean" style="background: ${getErrorColor(error.type)}"></div>
                                <div class="error-text-clean">${error.message}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <!-- Прогресс -->
            <div class="progress-section-clean">
                <div class="progress-label-clean">Текущий прогресс: <strong>${task.progress}%</strong></div>
                <div class="progress-bar-clean">
                    <div class="progress-fill-clean" style="width: ${task.progress}%"></div>
                </div>
                <div class="attempts-info-clean">Попытка ${task.attempts} из ∞</div>
            </div>
        </div>
    `;

    addErrorHighlightInteractivity();
}
// Сохранение данных текущей задачи
function saveCurrentTaskData() {
    if (!taskInput || !taskInput.value.trim()) return;

    currentTaskData = {
        text: taskInput.value.trim(),
        progress: 0,
        solved: false,
        lastSolution: null,
        checkedSolution: null,
        attempts: 1,
        timestamp: new Date().toISOString()
    };
}

function toggleHint(card) {
    card.classList.toggle('expanded');
}

function selectRandomTask() {
    const randomTasks = [
        { text: 'Решите уравнение: x² - 5x + 6 = 0', type: 'equation' },
        { text: 'Найдите производную функции: f(x) = 3x³ - 2x² + x - 1', type: 'derivative' },
        { text: 'Вычислите интеграл: ∫(2x + 3)dx', type: 'integral' },
        { text: 'Решите систему уравнений: {x + y = 5, 2x - y = 1}', type: 'system' },
        { text: 'Найдите область определения функции: f(x) = √(x - 2)', type: 'general' },
        { text: 'Докажите тождество: sin²x + cos²x = 1', type: 'proof' }
    ];

    const randomTask = randomTasks[Math.floor(Math.random() * randomTasks.length)];

    if (taskInput) {
        taskInput.value = randomTask.text;
        currentTaskData = {
            text: randomTask.text,
            type: randomTask.type,
            progress: 0,
            solved: false
        };

        if (resultsArea) {
            resultsArea.innerHTML = `
                <div class="results-placeholder">
                    <p>Введите файл и задачу, чтобы найти ошибки в вашем решении</p>
                </div>
            `;
        }

        if (hintsSection) {
            hintsSection.style.display = 'none';
        }

        if (checkErrorsBtn) {
            checkErrorsBtn.disabled = false;
            checkErrorsBtn.querySelector('.btn-text').textContent = 'Найти ошибки';
        }

        updateCheckButtonState();

        taskInput.style.background = 'rgba(102, 126, 234, 0.1)';
        setTimeout(() => {
            taskInput.style.background = '';
        }, 1000);

        showNotification(`Загружена случайная задача: ${getTaskTypeLabel(randomTask.type)}`, 'info');
    }
}

function markTaskAsSolved() {
    if (currentTaskData) {
        currentTaskData.solved = true;
        currentTaskData.progress = 100;
    }

    showNotification('🎉 Задача решена! Добавлена в историю', 'success');

    if (checkErrorsBtn) {
        checkErrorsBtn.disabled = true;
        checkErrorsBtn.querySelector('.btn-text').textContent = 'Задача решена';
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;

    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    `;

    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Стили для уведомлений и дополнительных элементов
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .remove-file-btn {
        position: absolute;
        top: 10px;
        right: 10px;
        background: #ff6b6b;
        color: white;
        border: none;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
    }
    
    .remove-file-btn:hover {
        background: #dc3545;
        transform: scale(1.1);
    }
    
    .uploaded-file {
        position: relative;
        text-align: center;
        padding: 2rem;
    }
    
    .file-info p {
        margin: 0.5rem 0;
        color: #333;
    }
`;

document.head.appendChild(notificationStyles);

// Функция выделения ошибок в тексте
function highlightErrors(text, errorHighlights) {
    if (!errorHighlights || errorHighlights.length === 0) {
        return escapeHtml(text);
    }
    const sortedErrors = [...errorHighlights].sort((a, b) => b.start - a.start);

    let result = text;

    sortedErrors.forEach((error, index) => {
        const errorId = `error-${errorHighlights.indexOf(error)}`;
        const errorColor = getErrorColor(error.type);

        if (error.start === error.end) {
            const insertionPoint = error.start;
            const beforeText = result.substring(0, insertionPoint);
            const afterText = result.substring(insertionPoint);

            result = beforeText +
                `<span class="error-insertion" id="${errorId}" data-error-index="${errorHighlights.indexOf(error)}" style="border-left: 3px solid ${errorColor}; position: relative;" title="${error.message}">
                    <i class="fas fa-exclamation-triangle" style="color: ${errorColor}; font-size: 0.8em;"></i>
                </span>` +
                afterText;
        } else {
            const beforeText = result.substring(0, error.start);
            const errorText = result.substring(error.start, error.end + 1);
            const afterText = result.substring(error.end + 1);

            result = beforeText +
                `<span class="error-highlight" id="${errorId}" data-error-index="${errorHighlights.indexOf(error)}" style="background-color: ${errorColor}20; border-bottom: 2px solid ${errorColor}; cursor: pointer;" title="${error.message}">
                    ${escapeHtml(errorText)}
                </span>` +
                afterText;
        }
    });

    return result.replace(/\n/g, '<br>');
}

// Получение цвета для типа ошибки
function getErrorColor(errorType) {
    const colors = {
        'missing': '#ff6b6b',      // Красный для пропущенных элементов
        'wrong': '#ff9f43',        // Оранжевый для неправильных значений
        'extra': '#feca57',        // Желтый для лишних элементов
        'formula': '#ff6348',      // Красно-оранжевый для ошибок в формулах
        'calculation': '#ff7675',  // Розовый для вычислительных ошибок
        'sign': '#fdcb6e',         // Желто-оранжевый для ошибок со знаками
        'logic': '#a29bfe'         // Фиолетовый для логических ошибок
    };
    return colors[errorType] || '#ff6b6b';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Добавление интерактивности для выделенных ошибок
function addErrorHighlightInteractivity() {
    document.querySelectorAll('.error-item-compact').forEach(item => {
        const errorIndex = item.dataset.errorIndex;

        item.addEventListener('mouseenter', () => {
            const errorHighlight = document.getElementById(`error-${errorIndex}`);
            if (errorHighlight) {
                errorHighlight.style.transform = 'scale(1.05)';
                errorHighlight.style.boxShadow = '0 0 10px rgba(255, 107, 107, 0.5)';
                errorHighlight.style.zIndex = '10';
            }
        });

        item.addEventListener('mouseleave', () => {
            const errorHighlight = document.getElementById(`error-${errorIndex}`);
            if (errorHighlight) {
                errorHighlight.style.transform = '';
                errorHighlight.style.boxShadow = '';
                errorHighlight.style.zIndex = '';
            }
        });

        item.addEventListener('click', () => {
            const errorHighlight = document.getElementById(`error-${errorIndex}`);
            if (errorHighlight) {
                errorHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
                errorHighlight.style.animation = 'pulse 1s ease-in-out 3';
            }
        });
    });

    // Подсветка элементов списка при клике на ошибку в тексте
    document.querySelectorAll('.error-highlight, .error-insertion').forEach(highlight => {
        highlight.addEventListener('click', () => {
            const errorIndex = highlight.dataset.errorIndex;
            const listItem = document.querySelector(`.error-item-compact[data-error-index="${errorIndex}"]`);

            if (listItem) {
                listItem.style.background = 'rgba(255, 107, 107, 0.1)';
                listItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

                setTimeout(() => {
                    listItem.style.background = '';
                }, 2000);
            }
        });
    });
}


function analyzeTaskWithHighlights() {
    const taskText = taskInput.value.toLowerCase();
    const taskType = determineTaskType(taskText);

    const hasErrors = Math.random() < 0.7;

    let errors = [];
    let hints = [];
    let progress = 0;
    let errorHighlights = [];

    if (hasErrors) {
        errors = generateTaskSpecificErrors(taskType);
        hints = generateTaskSpecificHints(taskType, errors);
        progress = Math.max(20, 100 - errors.length * 25);
        errorHighlights = generateErrorHighlights(errors);
    } else {
        progress = 100;
    }

    return {
        hasErrors,
        errors,
        hints,
        progress,
        taskType,
        errorHighlights
    };
}

// Генерация позиций ошибок для демонстрации
function generateErrorHighlights(errors) {
    return errors.map((error, index) => {
        const positions = [
            { start: 4, end: 15, type: 'formula', message: 'Неправильно применена формула дискриминанта' },
            { start: 25, end: 27, type: 'calculation', message: 'Ошибка в арифметических вычислениях' },
            { start: 45, end: 45, type: 'missing', message: 'Пропущено слагаемое 2ab' }
        ];

        return positions[index] || { start: 10, end: 15, type: error.type, message: error.text };
    });
}

// Генерация исправленного решения
function generateCorrectedSolution(taskType, errors) {
    const corrections = {
        equation: `D = b² - 4ac = (-5)² - 4·1·6 = 25 - 24 = 1
x₁ = (5 + √1)/2 = (5 + 1)/2 = 3
x₂ = (5 - √1)/2 = (5 - 1)/2 = 2
<div class="correction-note">✓ Формула дискриминанта применена правильно</div>`,

        integral: `∫x²dx = x³/3 + C
<div class="correction-note">✓ Добавлена константа интегрирования C</div>`,

        proof: `(a+b)² = (a+b)(a+b)
= a² + ab + ba + b²
= a² + 2ab + b²
<div class="correction-note">✓ Добавлено пропущенное слагаемое 2ab</div>`,

        derivative: `f'(x) = d/dx(3x³ - 2x² + x - 1)
f'(x) = 9x² - 4x + 1
<div class="correction-note">✓ Правило дифференцирования применено корректно</div>`,

        system: `x + y = 5  (1)
2x - y = 1  (2)
Из (1): y = 5 - x
Подставляем в (2): 2x - (5 - x) = 1
3x - 5 = 1, x = 2
y = 5 - 2 = 3
<div class="correction-note">✓ Система решена методом подстановки</div>`
    };

    return corrections[taskType] || `Исправленное решение
<div class="correction-note">✓ Ошибки исправлены</div>`;
}

// Конфигурация MathJax для отображения математических формул
window.MathJax = {
    tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']]
    },
    svg: {
        fontCache: 'global'
    }
};
// Функции для работы с темой
// function initializeTheme() {
//     const savedTheme = localStorage.getItem('mathsolver-theme');

//     if (savedTheme) {
//         isDarkTheme = savedTheme === 'dark';
//     } else {
//         // темная тема
//         isDarkTheme = true;
//     }

//     applyTheme();
//     updateThemeToggle();
// }

// function toggleTheme() {
//     isDarkTheme = !isDarkTheme;
//     console.log('Switching to theme:', isDarkTheme ? 'dark' : 'light');
//     applyTheme();
//     updateThemeToggle();
//     localStorage.setItem('mathsolver-theme', isDarkTheme ? 'dark' : 'light');
//     document.body.style.transition = 'all 0.3s ease';
//     setTimeout(() => {
//         document.body.style.transition = '';
//     }, 300);
// }

// function applyTheme() {
//     if (isDarkTheme) {
//         document.body.classList.remove('light-theme');
//     } else {
//         document.body.classList.add('light-theme');
//     }
// }

// function updateThemeToggle() {
//     const lightIcon = document.querySelector('.light-icon');
//     const darkIcon = document.querySelector('.dark-icon');
//     const toggleSlider = document.querySelector('.toggle-slider');

//     if (lightIcon && darkIcon && toggleSlider) {
//         if (isDarkTheme) {
//             lightIcon.classList.remove('active');
//             darkIcon.classList.add('active');
//             toggleSlider.style.transform = 'translateX(2px)';
//         } else {
//             lightIcon.classList.add('active');
//             darkIcon.classList.remove('active');
//             toggleSlider.style.transform = 'translateX(26px)';
//         }
//     }
// }

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;

    const bgColor = type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8';
    const glowColor = isDarkTheme ?
        (type === 'success' ? 'rgba(40, 167, 69, 0.3)' : type === 'error' ? 'rgba(220, 53, 69, 0.3)' : 'rgba(23, 162, 184, 0.3)') :
        'rgba(0, 0, 0, 0.1)';

    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 4px 20px ${glowColor};
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        border: ${isDarkTheme ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'};
    `;

    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}
// New file preview functionality
function initializeFilePreview() {
    console.log('Initializing file preview...');

    const fileInput = document.getElementById('fileInput');
    const fileUploadArea = document.getElementById('fileUploadArea');

    if (!fileInput || !fileUploadArea) {
        console.error('Required elements not found:', {
            fileInput: !!fileInput,
            fileUploadArea: !!fileUploadArea
        });
        return;
    }

    console.log('File preview elements found successfully');

    // Click to upload
    fileUploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    // Drag and drop
    fileUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadArea.style.borderColor = '#50c9a9';
        fileUploadArea.style.background = 'rgba(80, 201, 169, 0.1)';
    });

    fileUploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        fileUploadArea.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        fileUploadArea.style.background = 'rgba(10, 10, 10, 0.8)';
    });

    fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadArea.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        fileUploadArea.style.background = 'rgba(10, 10, 10, 0.8)';

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });

    function handleFileUpload(file) {
        console.log('=== HANDLING FILE UPLOAD ===');
        console.log('File:', file.name, file.type, file.size);

        uploadedFile = file;

        // Get elements fresh
        const uploadPlaceholder = document.getElementById('uploadPlaceholder');
        const filePreview = document.getElementById('filePreview');
        const fileInfo = document.getElementById('fileInfo');
        const imagePreview = document.getElementById('imagePreview');
        const pdfPreview = document.getElementById('pdfPreview');

        console.log('Elements check:', {
            uploadPlaceholder: !!uploadPlaceholder,
            filePreview: !!filePreview,
            fileInfo: !!fileInfo,
            imagePreview: !!imagePreview,
            pdfPreview: !!pdfPreview
        });

        // Hide placeholder, show preview
        if (uploadPlaceholder) {
            uploadPlaceholder.style.display = 'none';
            console.log('Hidden placeholder');
        }

        if (filePreview) {
            filePreview.style.display = 'flex';
            console.log('Showed file preview');
        }

        // Update file info
        if (fileInfo) {
            fileInfo.innerHTML = `
                <div style="color: #e0e0e0; font-weight: 500; margin-bottom: 5px;">${file.name}</div>
                <div style="color: #888; font-size: 0.8rem;">${formatFileSize(file.size)}</div>
            `;
            console.log('Updated file info');
        }

        // Preview based on file type
        if (file.type.startsWith('image/')) {
            console.log('Processing as image...');
            if (imagePreview && pdfPreview) {
                imagePreview.style.display = 'block';
                pdfPreview.style.display = 'none';

                const reader = new FileReader();
                reader.onload = function (e) {
                    console.log('Image data loaded, setting src...');
                    imagePreview.src = e.target.result;
                    imagePreview.onload = function () {
                        console.log('✅ Image displayed successfully!');
                    };
                    imagePreview.onerror = function (error) {
                        console.error('❌ Error displaying image:', error);
                    };
                };
                reader.onerror = function (error) {
                    console.error('❌ Error reading file:', error);
                };
                reader.readAsDataURL(file);
            }
        } else if (file.type === 'application/pdf') {
            console.log('Processing as PDF...');
            if (imagePreview && pdfPreview) {
                imagePreview.style.display = 'none';
                pdfPreview.style.display = 'block';

                // Draw PDF placeholder
                const ctx = pdfPreview.getContext('2d');
                pdfPreview.width = 300;
                pdfPreview.height = 400;
                ctx.fillStyle = '#2a2a2a';
                ctx.fillRect(0, 0, 300, 400);
                ctx.fillStyle = '#e0e0e0';
                ctx.font = '16px Inter';
                ctx.textAlign = 'center';
                ctx.fillText('PDF Preview', 150, 200);
                ctx.fillText('(First page)', 150, 220);
                console.log('✅ PDF placeholder displayed');
            }
        }

        // Enable check button if task is also filled
        updateCheckButtonState();
        console.log('=== FILE UPLOAD COMPLETE ===');
    }




}

// Progress bar animation
function animateProgress(targetPercentage, duration = 2000) {
    const progressFill = document.getElementById('progressFill');
    const progressPercentage = document.getElementById('progressPercentage');

    if (!progressFill || !progressPercentage) return;

    let currentPercentage = 0;
    const increment = targetPercentage / (duration / 16); // 60fps

    const animate = () => {
        currentPercentage += increment;
        if (currentPercentage >= targetPercentage) {
            currentPercentage = targetPercentage;
        }

        progressFill.style.width = currentPercentage + '%';
        progressPercentage.textContent = Math.round(currentPercentage) + '%';

        if (currentPercentage < targetPercentage) {
            requestAnimationFrame(animate);
        }
    };

    requestAnimationFrame(animate);
}

// Show/hide progress bar
function showProgress() {
    const checkProgress = document.getElementById('checkProgress');
    if (checkProgress) {
        checkProgress.style.display = 'block';
        animateProgress(0);
    }
}

function hideProgress() {
    const checkProgress = document.getElementById('checkProgress');
    if (checkProgress) {
        checkProgress.style.display = 'none';
    }
}

// Update check button state
function updateCheckButtonState() {
    const checkErrorsBtn = document.getElementById('checkErrorsBtn');
    const taskInput = document.getElementById('taskInput');

    if (!checkErrorsBtn || !taskInput) return;

    const hasTask = taskInput.value.trim().length > 0;
    const hasFile = uploadedFile !== null;

    checkErrorsBtn.disabled = !(hasTask && hasFile);
}

// Auto-resize textarea
function initializeAutoResize() {
    const taskInput = document.getElementById('taskInput');
    if (!taskInput) return;

    taskInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 400) + 'px';
        updateCheckButtonState();
    });
}

// Initialize new functionality
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM Content Loaded - checking elements...');

    // Debug: check if elements exist
    const elements = {
        fileInput: document.getElementById('fileInput'),
        fileUploadArea: document.getElementById('fileUploadArea'),
        uploadPlaceholder: document.getElementById('uploadPlaceholder'),
        filePreview: document.getElementById('filePreview'),
        imagePreview: document.getElementById('imagePreview'),
        pdfPreview: document.getElementById('pdfPreview'),
        fileInfo: document.getElementById('fileInfo')
    };

    console.log('All elements check:', elements);

    // Check if we're on the solve tab
    const solveTab = document.getElementById('solveTab');
    console.log('Solve tab exists:', !!solveTab);

    initializeFilePreview();
    initializeAutoResize();
    updateCheckButtonState();
});

// Enhanced check errors functionality
function checkErrors() {
    const checkErrorsBtn = document.getElementById('checkErrorsBtn');
    const taskInput = document.getElementById('taskInput');

    if (!uploadedFile || !taskInput.value.trim()) {
        alert('Пожалуйста, загрузите файл и введите условие задачи');
        return;
    }

    // Show progress
    showProgress();
    checkErrorsBtn.disabled = true;
    checkErrorsBtn.classList.add('loading');

    // Simulate checking process
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 100) progress = 100;

        animateProgress(progress, 100);

        if (progress >= 100) {
            clearInterval(progressInterval);
            setTimeout(() => {
                hideProgress();
                checkErrorsBtn.disabled = false;
                checkErrorsBtn.classList.remove('loading');
                showResults();
            }, 500);
        }
    }, 200);
}

function showResults() {
    const resultsArea = document.getElementById('resultsArea');
    if (!resultsArea) return;

    // Mock results
    resultsArea.innerHTML = `
        <div class="results-content-clean">
            <div class="solution-section-clean">
                <div class="solution-box-clean">
                    <h4>Ваше решение</h4>
                    <div class="solution-text-clean">
                        <p>Найдены следующие ошибки в решении:</p>
                        <ul>
                            <li class="error-highlight">Неправильно применена формула квадратного корня</li>
                            <li class="error-highlight">Пропущен знак при переносе слагаемого</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Debug function to test file upload manually
function testFileUpload() {
    console.log('=== TESTING FILE UPLOAD ===');

    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.click();
        console.log('File input clicked');
    } else {
        console.error('File input not found');
    }
}

// Make it available globally for testing
window.testFileUpload = testFileUpload;
window.handleFileUpload = function (file) {
    console.log('Global handleFileUpload called with:', file);

    const uploadPlaceholder = document.getElementById('uploadPlaceholder');
    const filePreview = document.getElementById('filePreview');
    const imagePreview = document.getElementById('imagePreview');

    if (uploadPlaceholder) uploadPlaceholder.style.display = 'none';
    if (filePreview) filePreview.style.display = 'flex';

    if (file.type.startsWith('image/') && imagePreview) {
        const reader = new FileReader();
        reader.onload = function (e) {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
            console.log('Image should be visible now');
        };
        reader.readAsDataURL(file);
    }
};
// AI Chat Bot Functionality
class AIChatBot {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.isTyping = false;

        this.initializeElements();
        this.attachEventListeners();
        this.showWelcomeMessage();
    }

    initializeElements() {
        this.chatToggle = document.getElementById('aiChatToggle');
        this.chatOverlay = document.getElementById('aiChatOverlay');
        this.closeChatBtn = document.getElementById('closeChatBtn');
        this.chatMessages = document.getElementById('aiChatMessages');
        this.chatInput = document.getElementById('aiChatInput');
        this.sendBtn = document.getElementById('sendMessageBtn');
        this.chatNotification = document.getElementById('chatNotification');
        this.quickQuestionBtns = document.querySelectorAll('.quick-question-btn');
    }

    attachEventListeners() {
        if (this.chatToggle) {
            this.chatToggle.addEventListener('click', () => this.toggleChat());
        }

        if (this.closeChatBtn) {
            this.closeChatBtn.addEventListener('click', () => this.closeChat());
        }

        if (this.chatOverlay) {
            this.chatOverlay.addEventListener('click', (e) => {
                if (e.target === this.chatOverlay) {
                    this.closeChat();
                }
            });
        }

        if (this.sendBtn) {
            this.sendBtn.addEventListener('click', () => this.sendMessage());
        }

        if (this.chatInput) {
            this.chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            this.chatInput.addEventListener('input', () => {
                this.autoResizeInput();
                this.updateSendButton();
            });
        }

        this.quickQuestionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const question = btn.dataset.question;
                this.chatInput.value = question;
                this.sendMessage();
            });
        });
    }

    toggleChat() {
        if (this.isOpen) {
            this.closeChat();
        } else {
            this.openChat();
        }
    }

    openChat() {
        this.isOpen = true;
        this.chatOverlay.style.display = 'flex';
        this.chatInput.focus();
        this.hideNotification();

        // Add opening animation
        setTimeout(() => {
            this.chatOverlay.style.opacity = '1';
        }, 10);
    }

    closeChat() {
        this.isOpen = false;
        this.chatOverlay.style.display = 'none';
    }

    showNotification() {
        if (this.chatNotification) {
            this.chatNotification.style.display = 'flex';
        }
    }

    hideNotification() {
        if (this.chatNotification) {
            this.chatNotification.style.display = 'none';
        }
    }

    autoResizeInput() {
        this.chatInput.style.height = 'auto';
        this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 100) + 'px';
    }

    updateSendButton() {
        const hasText = this.chatInput.value.trim().length > 0;
        this.sendBtn.disabled = !hasText || this.isTyping;
    }

    async sendMessage() {
        const message = this.chatInput.value.trim();
        if (!message || this.isTyping) return;

        // Add user message
        this.addMessage(message, 'user');
        this.chatInput.value = '';
        this.autoResizeInput();
        this.updateSendButton();

        // Show typing indicator
        this.showTypingIndicator();

        // Simulate AI response (replace with actual API call later)
        setTimeout(() => {
            this.hideTypingIndicator();
            this.generateAIResponse(message);
        }, 1000 + Math.random() * 2000);
    }

    addMessage(content, sender = 'ai', timestamp = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = sender === 'ai' ? 'ai-message' : 'user-message';

        const time = timestamp || this.getCurrentTime();
        const avatar = sender === 'ai' ?
            '<i class="fas fa-robot"></i>' :
            '<i class="fas fa-user"></i>';

        messageDiv.innerHTML = `
            <div class="message-avatar">
                ${avatar}
            </div>
            <div class="message-content">
                <p>${this.formatMessage(content)}</p>
                <div class="message-time">${time}</div>
            </div>
        `;

        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();

        // Store message
        this.messages.push({
            content,
            sender,
            timestamp: time
        });
    }

    formatMessage(content) {
        // Basic formatting for mathematical expressions
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    showTypingIndicator() {
        this.isTyping = true;
        this.updateSendButton();

        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typingIndicator';

        typingDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;

        this.chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        this.isTyping = false;
        this.updateSendButton();

        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    generateAIResponse(userMessage) {
        const responses = this.getContextualResponse(userMessage.toLowerCase());
        const response = responses[Math.floor(Math.random() * responses.length)];

        this.addMessage(response);

        // Show notification if chat is closed
        if (!this.isOpen) {
            this.showNotification();
        }
    }

    getContextualResponse(message) {
        // Math-specific responses
        if (message.includes('квадратн') || message.includes('уравнен')) {
            return [
                'Для решения квадратного уравнения ax² + bx + c = 0 используйте формулу дискриминанта:\n\nD = b² - 4ac\n\nЕсли D > 0, то два корня:\nx₁ = (-b + √D) / 2a\nx₂ = (-b - √D) / 2a',
                'Квадратные уравнения можно решать несколькими способами:\n1. Через дискриминант\n2. Выделением полного квадрата\n3. Теоремой Виета\n\nКакой способ вас интересует?'
            ];
        }

        if (message.includes('производн') || message.includes('дифференц')) {
            return [
                'Основные правила дифференцирования:\n\n• (x^n)\' = n·x^(n-1)\n• (sin x)\' = cos x\n• (cos x)\' = -sin x\n• (e^x)\' = e^x\n• (ln x)\' = 1/x\n\nНужна помощь с конкретной функцией?',
                'Производная показывает скорость изменения функции. Для сложных функций используйте правило цепочки:\n\n(f(g(x)))\' = f\'(g(x)) · g\'(x)'
            ];
        }

        if (message.includes('интеграл')) {
            return [
                'Основные интегралы:\n\n∫x^n dx = x^(n+1)/(n+1) + C\n∫sin x dx = -cos x + C\n∫cos x dx = sin x + C\n∫e^x dx = e^x + C\n\nНе забывайте константу интегрирования C!',
                'Для вычисления интегралов используйте:\n1. Таблицу основных интегралов\n2. Метод замены переменной\n3. Интегрирование по частям\n\nКакой интеграл нужно вычислить?'
            ];
        }

        if (message.includes('помощ') || message.includes('подсказ')) {
            return [
                'Конечно! Я могу помочь с:\n\n📐 Алгеброй и геометрией\n📊 Математическим анализом\n🔢 Арифметикой и теорией чисел\n📈 Статистикой и вероятностью\n\nО чем хотите узнать?',
                'Я готов объяснить любую математическую тему! Можете:\n\n• Задать конкретный вопрос\n• Прислать задачу для разбора\n• Попросить объяснить формулу\n• Узнать алгоритм решения'
            ];
        }

        if (message.includes('спасибо') || message.includes('благодар')) {
            return [
                'Пожалуйста! Рад был помочь 😊\n\nЕсли возникнут еще вопросы по математике, обращайтесь!',
                'Всегда рад помочь с математикой! 🤖\n\nУдачи в решении задач!'
            ];
        }

        // Default responses
        return [
            'Интересный вопрос! Можете уточнить, с какой именно математической темой нужна помощь?',
            'Я специализируюсь на математике. Расскажите подробнее о вашей задаче, и я постараюсь помочь!',
            'Давайте разберем это пошагово. Какая именно часть вызывает затруднения?',
            'Хороший вопрос! Для лучшего ответа мне нужно больше деталей. Можете привести пример?'
        ];
    }

    getCurrentTime() {
        const now = new Date();
        return now.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    scrollToBottom() {
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }

    showWelcomeMessage() {
        // Welcome message is already in HTML, just scroll to bottom
        setTimeout(() => {
            this.scrollToBottom();
        }, 500);
    }
}

// Initialize AI Chat Bot when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    window.aiChatBot = new AIChatBot();
});

// Global function to send message from external sources
window.sendAIMessage = function (message) {
    if (window.aiChatBot) {
        window.aiChatBot.chatInput.value = message;
        window.aiChatBot.sendMessage();
        if (!window.aiChatBot.isOpen) {
            window.aiChatBot.openChat();
        }
    }
};