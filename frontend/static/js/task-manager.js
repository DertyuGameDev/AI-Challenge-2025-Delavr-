/* === Task Manager with Flask API Integration (with verbose logging) ===
   Этот модуль управляет задачами, загрузкой файлов, отправкой решений,
   опросом статуса и показом результатов. Добавлены подробные логи.
*/

// === Глобальные переменные ===
const input = document.getElementById('aiChatInput');
const btn = document.getElementById('sendMessageBtn');
input.placeholder = 'Нужна одна посылка для разблокировки...'
input.disabled = true
btn.disabled = true

let currentTaskData = null; // Текущая активная задача (объект)
let uploadedFile = null; // Загруженный пользователем файл
let isChecking = false; // Флаг состояния "идёт проверка"
let lastCompletedTask = null; // Последняя завершенная задача с результатом

// === Google Dinosaur Game Variables ===
let dinoGameInterval = null;
let dinoScoreInterval = null;
let dinoGameScore = 0;
let dinoCollisionCheck = null;

// === Stars Update Interval ===
let starsUpdateInterval = null;

// === Кеш для элементов DOM (оптимизация) ===
const domCache = {
    taskInput: null,
    checkErrorsBtn: null,
    fileUploadArea: null,
    resultsArea: null,
    hintsSection: null,
    getTaskInput() {
        if (!this.taskInput) this.taskInput = document.getElementById('taskInput');
        return this.taskInput;
    },
    getCheckErrorsBtn() {
        if (!this.checkErrorsBtn) this.checkErrorsBtn = document.getElementById('checkErrorsBtn');
        return this.checkErrorsBtn;
    },
    getFileUploadArea() {
        if (!this.fileUploadArea) this.fileUploadArea = document.getElementById('fileUploadArea');
        return this.fileUploadArea;
    },
    getResultsArea() {
        if (!this.resultsArea) this.resultsArea = document.getElementById('resultsArea');
        return this.resultsArea;
    },
    getHintsSection() {
        if (!this.hintsSection) this.hintsSection = document.getElementById('revealHintsSection');
        return this.hintsSection;
    },
    clear() {
        this.taskInput = null;
        this.checkErrorsBtn = null;
        this.fileUploadArea = null;
        this.resultsArea = null;
        this.hintsSection = null;
    }
};

// === Google Dinosaur Game Functions (exact copy from FilimonovAlexey/Dino-game) ===
function startDinoGame() {
    const dino = document.getElementById('dino');
    const cactus = document.getElementById('cactus');
    const scoreElement = document.getElementById('dinoScore');

    if (!dino || !cactus) {
        // console.warn('[DinoGame] Game elements not found');
        return;
    }

    // Сброс состояния
    dinoGameScore = 0;
    dino.classList.remove('jump');
    cactus.style.animation = 'none';
    cactus.style.left = '580px'; // Начальная позиция как в оригинале

    if (scoreElement) {
        scoreElement.textContent = 'Счет: 0';
    }

    // Запускаем анимацию кактуса (замедлено: 3s вместо 1s)
    setTimeout(() => {
        cactus.style.animation = 'cactusMov 3s infinite linear';
    }, 100);

    // Обновляем счет каждую секунду
    dinoScoreInterval = setInterval(() => {
        dinoGameScore += 1;
        if (scoreElement) {
            scoreElement.textContent = `Счет: ${dinoGameScore}`;
        }
    }, 1000);

    // Коллизия проверка (как в оригинальной GitHub версии, но замедлено)
    dinoCollisionCheck = setInterval(() => {
        const dinoTop = parseInt(window.getComputedStyle(dino).getPropertyValue("top")) || 150;
        const cactusLeft = parseInt(window.getComputedStyle(cactus).getPropertyValue("left")) || 0;

        // Точная проверка коллизии из оригинальной версии (уменьшенный хитбокс)
        if (cactusLeft < 40 && cactusLeft > 5 && dinoTop >= 145) {
            // GAME OVER - останавливаем игру и обнуляем баллы
            stopDinoGame();
            dinoGameScore = 0;
            if (scoreElement) {
                scoreElement.textContent = 'GAME OVER! Счет: 0';
            }
            // Перезапускаем игру через 1 секунду (полный перезапуск с управлением и хитбоксами)
            setTimeout(() => {
                if (cactus && dino) {
                    // Полностью перезапускаем игру
                    startDinoGame();
                }
            }, 1000);
        }
    }, 10); // Проверка каждые 10ms как в оригинале

    // Добавляем обработчик клавиатуры (как в оригинале)
    const handleKeyPress = (e) => {
        if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === ' ') {
            e.preventDefault();
            jumpDino();
        }
    };

    window.dinoGameKeyHandler = handleKeyPress;
    document.addEventListener('keydown', handleKeyPress);
}

function jumpDino() {
    const dino = document.getElementById('dino');
    if (!dino) return;

    // Точная логика из оригинальной версии
    if (dino.classList != "jump") {
        dino.classList.add("jump");

        // Используем 0.6s ease-in-out для гравитации (как было запрошено ранее)
        setTimeout(function() {
            dino.classList.remove("jump");
        }, 600);
    }
}

function stopDinoGame() {

    if (dinoScoreInterval) {
        clearInterval(dinoScoreInterval);
        dinoScoreInterval = null;
    }

    if (dinoCollisionCheck) {
        clearInterval(dinoCollisionCheck);
        dinoCollisionCheck = null;
    }

    if (window.dinoGameKeyHandler) {
        document.removeEventListener('keydown', window.dinoGameKeyHandler);
        window.dinoGameKeyHandler = null;
    }

    const cactus = document.getElementById('cactus');
    if (cactus) {
        cactus.style.animation = 'none';
    }

    const dino = document.getElementById('dino');
    if (dino) {
        dino.classList.remove('jump');
    }

    dinoGameScore = 0;
}

// === Инициализация ===
function initializeTaskManager() {

    // Сбрасываем флаг проверки при инициализации (на случай если он застрял)
    isChecking = false;

    // Очищаем кеш DOM при инициализации
    domCache.clear();

    const taskInput = domCache.getTaskInput();
    const fileInput = document.getElementById('fileInput');
    const fileUploadArea = domCache.getFileUploadArea();
    const checkErrorsBtn = domCache.getCheckErrorsBtn();
    const randomTaskBtn = document.querySelector('.random-task-btn');
    const dailyTaskBtn = document.querySelector('.solve-daily-btn');

//    console.debug('[TaskManager] Elements:', {
//        taskInput: !!taskInput,
//        fileInput: !!fileInput,
//        fileUploadArea: !!fileUploadArea,
//        checkErrorsBtn: !!checkErrorsBtn,
//        randomTaskBtn: !!randomTaskBtn,
//        dailyTaskBtn: !!dailyTaskBtn
//    });

    // Слушаем ввод задачи
    if (taskInput) {
        taskInput.addEventListener('input', () => {
//            console.debug('[TaskManager] taskInput input event — value length:', taskInput.value.length);
            updateCheckButtonState();
        });
//        console.log('[TaskManager] taskInput listener attached');
    }

    // Клик по области загрузки вызывает выбор файла
    if (fileUploadArea) {
        fileUploadArea.addEventListener('click', () => {
//            console.debug('[TaskManager] fileUploadArea click');
            fileInput?.click();
        });
        fileUploadArea.addEventListener('dragover', handleDragOver);
        fileUploadArea.addEventListener('drop', handleDrop);
//        console.log('[TaskManager] fileUploadArea listeners attached (click, dragover, drop)');
    }

    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
//        console.log('[TaskManager] fileInput change listener attached');
    }

    if (checkErrorsBtn) {
        checkErrorsBtn.addEventListener('click', checkErrors);
//        console.log('[TaskManager] checkErrors button listener attached');
    }

    if (randomTaskBtn) {
        randomTaskBtn.addEventListener('click', loadRandomTaskFromAPI);
//        console.log('[TaskManager] randomTask button listener attached');
    }
    if (dailyTaskBtn) {
        dailyTaskBtn.addEventListener('click', loadDailyTaskFromAPI);
//        console.log('[TaskManager] dailyTask button listener attached');
    }

    // Библиотека задач
    const taskLibraryBtn = document.getElementById('taskLibraryBtn');
    const taskLibraryOverlay = document.getElementById('taskLibraryOverlay');
    const closeLibraryBtn = document.getElementById('closeLibraryBtn');

    if (taskLibraryBtn && taskLibraryOverlay) {
        taskLibraryBtn.addEventListener('click', () => {
            // console.log('[TaskManager] taskLibrary button clicked');
            taskLibraryOverlay.style.display = 'flex';
            loadTaskLibrary();
        });
    }

    if (closeLibraryBtn && taskLibraryOverlay) {
        closeLibraryBtn.addEventListener('click', () => {
            taskLibraryOverlay.style.display = 'none';
        });
    }

    if (taskLibraryOverlay) {
        taskLibraryOverlay.addEventListener('click', (e) => {
            if (e.target === taskLibraryOverlay) {
                taskLibraryOverlay.style.display = 'none';
            }
        });
    }

    updateCheckButtonState();

    // Инициализируем обработчики кликов для карточек подсказок
    initializeHintCards();

    // Скрываем карточки подсказок при инициализации (пока не была запущена проверка)
    const hintsSection = domCache.getHintsSection();
    if (hintsSection) {
        hintsSection.style.display = 'none';
    }

    // console.info('[TaskManager] initialization complete');
}

// === Инициализация карточек подсказок ===
function initializeHintCards() {
    // Карточки теперь создаются динамически в updateHintCards
    // Эта функция больше не нужна, но оставляем для совместимости
    // console.log('[TaskManager] Hint cards will be initialized dynamically');
}

// === Загрузка случайной задачи с API ===
async function loadRandomTaskFromAPI() {
    // console.info('[TaskManager] loadRandomTaskFromAPI() — запрашиваю случайную задачу у API');
    try {
        // Получаем список решенных задач
        let solvedIds = [];
        if (window.userDataManager) {
            solvedIds = window.userDataManager.getSolvedTasks();
        } else {
            solvedIds = JSON.parse(localStorage.getItem('solvedTasks') || '[]');
        }

        const task = await getRandomTask({
            difficulty: '',
            category: '',
            solvedIds: solvedIds
        });
        // console.debug('[TaskManager] API getRandomTask response:', task);
        const taskInput = document.getElementById('taskInput');
        if (taskInput) {
            // Формируем текст задачи только из description (без title)
            const taskText = task.description || task.statement || 'Случайная задача';
            taskInput.value = taskText;
            currentTaskData = task;
            updateCheckButtonState();

            // Скрываем информацию о задаче до проверки
            const taskInfoBox = document.getElementById('taskInfoBox');
            if (taskInfoBox) taskInfoBox.style.display = 'none';

            // console.log(`[TaskManager] Случайная задача загружена (id=${task.id || 'n/a'})`);
        } else {
            // console.warn('[TaskManager] taskInput не найден — не могу подставить задачу в поле');
        }
        showNotification('Случайная задача загружена!', 'info');
    } catch (err) {
        // console.error('[TaskManager] Ошибка при загрузке случайной задачи:', err);
        showNotification('Ошибка при загрузке случайной задачи: ' + err.message, 'error');
    }
}

// === Загрузка daily-задачи с API ===
async function loadDailyTaskFromAPI() {
    // console.info('[TaskManager] loadDailyTaskFromAPI() — запрашиваю daily задачу у API');
    try {
        // Daily задача не зависит от решенных задач, всегда один и тот же на день
        const task = await getDailyTask([]);
        // console.debug('[TaskManager] API getDailyTask response:', task);
        const taskInput = domCache.getTaskInput();
        if (taskInput) {
            // Если daily уже выполнена — показываем сообщение вместо условия
            if (task && task.completed === true) {
                taskInput.value = 'Вы уже выполнили ежедневную задачу';
            } else {
                // Формируем текст задачи только из description (без title)
                const taskText = task.description || task.statement || 'Ежедневная задача';
                taskInput.value = taskText;
            }
            // Помечаем задачу как daily
            currentTaskData = {
                ...task,
                isDaily: true
            };
            updateCheckButtonState();

            // Скрываем информацию о задаче до проверки
            const taskInfoBox = document.getElementById('taskInfoBox');
            if (taskInfoBox) taskInfoBox.style.display = 'none';

            // console.log(`[TaskManager] Daily задача загружена (id=${task.id || 'n/a'})`);
        } else {
            // console.warn('[TaskManager] taskInput не найден — не могу подставить daily задачу');
        }
        showNotification('Daily задача загружена!', 'info');
    } catch (err) {
        // console.error('[TaskManager] Ошибка при загрузке daily-задачи:', err);
        showNotification('Ошибка при загрузке daily-задачи: ' + err.message, 'error');
    }
}

// === Проверка решения (отправка и опрос статуса) ===
async function checkErrors() {
    // console.info('[TaskManager] checkErrors() — запуск проверки решения');
    if (isChecking) {
        // console.warn('[TaskManager] Проверка уже запущена, новая не будет стартована');
        return;
    }

    // Используем кеш для получения элементов
    const checkErrorsBtn = domCache.getCheckErrorsBtn();
    const taskInputForValidation = domCache.getTaskInput();

    // Получаем оригинальный текст из вложенного span (если есть)
    const btnTextSpan = checkErrorsBtn?.querySelector('.btn-text');
    const originalText = btnTextSpan ? btnTextSpan.textContent : (checkErrorsBtn ? checkErrorsBtn.textContent : null);

    // Валидация перед отправкой (до установки isChecking)
    if (!taskInputForValidation || !taskInputForValidation.value.trim()) {
        // console.warn('[TaskManager] Пустое поле задачи — abort');
        showNotification('Введите условие задачи!', 'error');
        return;
    }
    if (!uploadedFile) {
        // console.warn('[TaskManager] Файл не загружен — abort');
        showNotification('Загрузите файл с решением!', 'error');
        return;
    }

    // Только после успешной валидации устанавливаем флаг и блокируем кнопку
    isChecking = true;

    if (checkErrorsBtn) {
        checkErrorsBtn.disabled = true;
        // Обновляем текст в span, если он есть, иначе в самой кнопке
        if (btnTextSpan) {
            btnTextSpan.textContent = 'Отправляем...';
        } else {
            checkErrorsBtn.textContent = 'Отправляем...';
        }
    }

    try {
        // console.log('[TaskManager] Данные валидны — отправляю файл и условие на сервер', {
        //     taskId: currentTaskData?.id || null,
        //     taskPreview: taskInputForValidation.value.slice(0, 120),
        //     fileName: uploadedFile.name,
        //     fileSize: uploadedFile.size
        // });

        // Показываем прогресс-бар
        const checkProgress = document.getElementById('checkProgress');
        const progressFill = document.getElementById('progressFill');
        const progressPercentage = document.getElementById('progressPercentage');
        if (checkProgress) checkProgress.style.display = 'block';
        // Начальный прогресс - 0% (до получения статуса)
        if (progressFill) progressFill.style.width = '0%';
        if (progressPercentage) progressPercentage.textContent = '0%';

        // Блокируем чат во время проверки (объявляем один раз для использования в try и catch)
        const aiChatInput = document.getElementById('aiChatInput');
        const sendMessageBtn = document.getElementById('sendMessageBtn');
        if (aiChatInput) {
            aiChatInput.disabled = true;
            aiChatInput.placeholder = 'Проверка решения... Чат временно недоступен';
        }
        if (sendMessageBtn) {
            sendMessageBtn.disabled = true;
        }

        // Запускаем игру динозаврик
        startDinoGame();

        // Отправляем через api_client.submitSolution(file, taskCondition)
        const submitPayload = await submitSolution(uploadedFile, taskInputForValidation.value.trim());
        // console.debug('[TaskManager] submitSolution response:', submitPayload);

        const submissionId = submitPayload.submission_id || submitPayload.submissionId || submitPayload.id || submitPayload.id_submission;
        if (!submissionId) {
            throw new Error('Не получили submission_id от API');
        }
        // console.log('[TaskManager] Submission id получен:', submissionId);
        showNotification('Решение отправлено! Ожидаем результатов...', 'info');

        // Polling статуса с обновлением прогресса (увеличено до 120 попыток = 4 минуты)
        const result = await pollSolutionStatus(submissionId, 10000, 120, progressFill, progressPercentage);
        // console.info('[TaskManager] Результат проверки получен:', result);

        // Скрываем прогресс-бар и останавливаем игру
        if (checkProgress) checkProgress.style.display = 'none';
        stopDinoGame();

        // Разблокируем чат после проверки (используем уже объявленные переменные)
        if (aiChatInput) {
            aiChatInput.disabled = false;
            aiChatInput.placeholder = 'Напишите ваш вопрос...';
        }
        if (sendMessageBtn) {
            sendMessageBtn.disabled = false;
        }

        // Сохраняем submission_id для использования в displayResults
        result.submission_id = submissionId;

        // Показ результата
        displayResults(result);

    } catch (err) {
        // console.error('[TaskManager] Ошибка в чекере:', err);

        // Разблокируем чат при ошибке (получаем элементы заново, так как они могут быть не объявлены если ошибка произошла до try)
        const aiChatInputError = document.getElementById('aiChatInput');
        const sendMessageBtnError = document.getElementById('sendMessageBtn');
        if (aiChatInputError) {
            aiChatInputError.disabled = false;
            aiChatInputError.placeholder = 'Напишите ваш вопрос...';
        }
        if (sendMessageBtnError) {
            sendMessageBtnError.disabled = false;
        }

        let errorMessage = err.message || 'Ошибка при проверке решения';

        // Если ошибка связана с таймаутом, показываем специальное сообщение
        if (errorMessage.includes('Превышено время ожидания') ||
            errorMessage.includes('timeout') ||
            errorMessage.includes('Timeout') ||
            errorMessage.includes('долгое ожидание')) {
            errorMessage = 'Превышено время ожидания';

            // Показываем ошибку в области результатов
            const resultsArea = domCache.getResultsArea();
            if (resultsArea) {
                resultsArea.innerHTML = `
                    <div class="results-error">
                        <h3>Ошибка проверки</h3>
                        <p>${escapeHtml(errorMessage)}</p>
                        <p style="margin-top: 1rem; color: #888;">Попробуйте отправить решение еще раз или проверьте подключение к интернету.</p>
                    </div>
                `;
            }
        }

        showNotification(errorMessage, 'error');

        // Скрываем прогресс-бар при ошибке и останавливаем игру
        const checkProgress = document.getElementById('checkProgress');
        if (checkProgress) checkProgress.style.display = 'none';
        stopDinoGame();

        // Скрываем карточки подсказок при ошибке
        const hintsSection = domCache.getHintsSection();
        if (hintsSection) hintsSection.style.display = 'none';
    } finally {
        isChecking = false;
        const checkErrorsBtnFinal = domCache.getCheckErrorsBtn();
        if (checkErrorsBtnFinal) {
            checkErrorsBtnFinal.disabled = false;
            // Восстанавливаем текст в span, если он есть
            const btnTextSpanFinal = checkErrorsBtnFinal.querySelector('.btn-text');
            if (btnTextSpanFinal && originalText !== null) {
                btnTextSpanFinal.textContent = originalText;
            } else if (originalText !== null) {
                checkErrorsBtnFinal.textContent = originalText;
            }
        }
        updateCheckButtonState();
        // console.info('[TaskManager] checkErrors() — завершено');
    }
}

// === Опрос статуса решения (polling) ===
/**
 * ЗАЧЕМ НУЖНЫ ПОПЫТКИ (attempts) в polling:
 * 
 * 1. Обработка файла на сервере занимает время (OCR + проверка ошибок = 1-4 минуты)
 * 2. Сервер обрабатывает файл в фоновом потоке (thread), мы не знаем когда он завершится
 * 3. Мы не можем использовать WebSocket или Server-Sent Events (слишком сложно)
 * 4. Поэтому используем polling - периодически спрашиваем сервер "готово ли?"
 * 
 * Как это работает:
 * - Отправляем файл → получаем submission_id
 * - Каждые 2 секунды спрашиваем статус (attempt 1, 2, 3...)
 * - Если статус "Parsing" или "Check solution" → продолжаем опрос
 * - Если статус "OK" → возвращаем результат
 * - Если прошло 120 попыток (4 минуты) → таймаут
 * 
 * Без попыток мы бы не узнали, когда обработка завершилась!
 */
// === Функция для получения прогресса по статусу ===
function getProgressByStatus(status) {
    if (!status) return 0;

    const statusLower = status.toString().trim().toLowerCase();

    // Маппинг статусов на прогресс (всего 5 статусов, каждый +20%)
    const statusProgressMap = {
        'parsing': 20,
        'check solution': 40,
        'processing': 60,
        'ok': 80,
        'completed': 100,
        'done': 100
    };

    // Проверяем точное совпадение
    if (statusProgressMap[statusLower] !== undefined) {
        return statusProgressMap[statusLower];
    }

    // Проверяем частичное совпадение
    if (statusLower.includes('parsing') && !statusLower.includes('error')) {
        return 20;
    }
    if (statusLower.includes('check')) {
        return 40;
    }
    if (statusLower.includes('processing')) {
        return 60;
    }
    if (statusLower.includes('ok') || statusLower.includes('completed')) {
        return statusLower.includes('completed') ? 100 : 80;
    }

    // По умолчанию возвращаем 0
    return 0;
}

async function pollSolutionStatus(solutionId, interval = 10000, maxAttempts = 120, progressFill = null, progressPercentage = null) {
    // console.info('[TaskManager] pollSolutionStatus() — начинаю опрос статуса', {
    //     solutionId,
    //     interval,
    //     maxAttempts
    // });
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            // console.debug(`[TaskManager] polling attempt ${attempt}/${maxAttempts} — запрос статуса для ${solutionId}`);

            const status = await getSubmissionStatus(solutionId);
            // console.debug('[TaskManager] getSubmissionStatus response:', status);

            if (!status) {
                throw new Error('Пустой ответ от сервера');
            }

            const rawStatus = (status.status || status.state || '').toString().trim();
            const rawStatusLower = rawStatus.toLowerCase();
            // console.log(`[TaskManager] Статус (attempt ${attempt}):`, rawStatus);

            // Обновляем прогресс на основе статуса из БД
            const progress = getProgressByStatus(rawStatus);
            if (progressFill) progressFill.style.width = `${progress}%`;
            if (progressPercentage) progressPercentage.textContent = `${progress}%`;
                // console.debug(`[TaskManager] Прогресс обновлен до ${progress}% на основе статуса: ${rawStatus}`);

            if (rawStatusLower === 'completed' || rawStatusLower === 'ok' || rawStatusLower === 'done') {
                // console.info('[TaskManager] Статус = completed — возвращаю результат');
                // Устанавливаем 100%
                if (progressFill) progressFill.style.width = '100%';
                if (progressPercentage) progressPercentage.textContent = '100%';
                return status;
            } else if (rawStatusLower === 'error' || rawStatusLower === 'error parsing' || rawStatusLower === 'failed' || rawStatusLower === 'processing_error') {
                // console.error('[TaskManager] Сервер вернул ошибку статуса:', status);
                throw new Error('Ошибка обработки на сервере: ' + (status.message || status.error || rawStatus));
            } else if (rawStatusLower === 'pending' || rawStatusLower === 'processing' || rawStatusLower === 'in_progress' || rawStatusLower === '' ||
                rawStatusLower === 'parsing' || rawStatusLower === 'check solution' || rawStatusLower.includes('check') ||
                rawStatusLower === 'checking' || rawStatusLower === 'analyzing') {
                // Продолжаем опрос для промежуточных статусов
                // console.debug(`[TaskManager] Статус ${rawStatus || 'pending'} — продолжаем опрос`);
            } else {
                // Неизвестный статус — логируем, но продолжаем
                // console.warn(`[TaskManager] Неизвестный статус: ${rawStatus}, продолжаем опрос`);
            }

            // wait before next attempt
            await new Promise(res => setTimeout(res, interval));
            lastError = null; // Сбрасываем ошибку при успешном запросе
        } catch (err) {
            lastError = err;
            // console.error('[TaskManager] Ошибка при опросе статуса (попытка ' + attempt + '):', err);

            // При сетевых ошибках продолжаем попытки, но логируем
            // Если это последняя попытка, выбрасываем ошибку
            if (attempt === maxAttempts) {
                // console.error('[TaskManager] Превышено максимальное число попыток опроса статуса');
                throw new Error('Превышено время ожидания');
            }

            // Ждем перед следующей попыткой
            await new Promise(res => setTimeout(res, interval));
        }
    }

    // Если дошли сюда, значит все попытки исчерпаны
    // console.error('[TaskManager] Превышено максимальное число попыток опроса статуса');
    throw new Error('Превышено время ожидания');
}

// === Показ результата ===
async function displayResults(result) {
    // console.info('[TaskManager] displayResults() — рендер результата в UI', result);
    const resultsArea = domCache.getResultsArea();
    if (!resultsArea) {
        // console.warn('[TaskManager] resultsArea не найден — невозможно показать результат');
        return;
    }

    // Нормализуем поля из API ответа
    const status = (result.status || '').toString().toLowerCase();
    const solution = result.solution || '';
    const hints = result.hints || [];
    const percent = result.completion_percentage ?? result.completionPercentage ?? result.score ?? 0;
    const difficulty = result.difficulty ?? result.level ?? result.task_difficulty ?? 'неизвестно';

    // Если статус не Completed, показываем ошибку, но все равно пытаемся сохранить данные
    if (status !== 'completed' && status !== 'ok') {
        resultsArea.innerHTML = `
            <div class="results-error">
                <h3>Ошибка проверки</h3>
                <p>Статус: ${escapeHtml(String(status))}</p>
                ${solution ? `<div class="solution-text">${escapeHtml(solution)}</div>` : ''}
            </div>
        `;
        showNotification('Ошибка при проверке решения', 'error');
        // console.log('[TaskManager] Результат: ошибка статуса.', status);

        // Даже при ошибке пытаемся сохранить данные, если есть submission_id
        if (result.submission_id && window.userDataManager) {
            // console.log('[TaskManager] Attempting to save data even with error status');
            const taskId = result.submission_id;
            const category = 'general';
            // Не начисляем звезды при ошибке, но сохраняем попытку
            await window.userDataManager.markTaskSolved(taskId, category, false, 0);
        }
        return;
    }

    // Проверяем, если решение не соответствует условию
    if (solution === 'Решение не соотносится с условием') {
        resultsArea.innerHTML = `
            <div class="results-error">
                <h3>Решение не соотносится с условием</h3>
                <p>Ваше решение не соответствует условию задачи. Пожалуйста, проверьте условие и попробуйте решить задачу заново.</p>
            </div>
        `;

        // Удаляем карточки подсказок
        const hintsSection = domCache.getHintsSection();
        if (hintsSection) {
            hintsSection.style.display = 'none';
            hintsSection.innerHTML = '';
        }

        // Показываем фидбек модели (если есть)
        showModelFeedback(result);

        showNotification('Решение не соответствует условию задачи', 'warning');
        // console.log('[TaskManager] Решение не соответствует условию');
        return;
    }

    // Парсим решение с разметкой ошибок (HTML с тегами)
    const solutionHtml = parseSolutionWithErrors(solution);

    // Определяем, является ли задача daily
    const isDaily = currentTaskData?.isDaily || false;

    // Используем ID задачи из currentTaskData, если есть, иначе используем submission_id
    const taskId = (currentTaskData && currentTaskData.id) ? currentTaskData.id : result.submission_id;

    // Если решение успешное (>= 90%), отмечаем задачу как решенную
    // console.log('[TaskManager] Checking if task should be marked as solved:', {
    //     percent,
    //     hasCurrentTaskData: !!currentTaskData,
    //     taskId: currentTaskData?.id,
    //     submissionId: result.submission_id,
    //     hasUserDataManager: !!window.userDataManager,
    //     isDaily
    // });

    // Проверяем, не решена ли уже эта задача (по statement)
    const taskInput = domCache.getTaskInput();
    const taskStatement = currentTaskData?.description || currentTaskData?.statement || taskInput?.value?.trim() || '';
    const isDuplicate = taskStatement ? await checkDuplicateTask(taskStatement) : false;

    // КРИТИЧЕСКАЯ ПРОВЕРКА: не решена ли задача уже по ID
    // Делаем это ДО любых действий с начислением звезд
    let isAlreadySolvedById = false;
    if (taskId && window.userDataManager) {
        const solvedTasks = window.userDataManager.getSolvedTasks();
        if (solvedTasks && Array.isArray(solvedTasks)) {
            const taskIdStr = String(taskId);
            // Проверяем как строку и как число (на случай разных типов)
            // Также проверяем через some для более надежного сравнения
            isAlreadySolvedById = solvedTasks.includes(taskId) ||
                solvedTasks.includes(taskIdStr) ||
                solvedTasks.includes(Number(taskId)) ||
                solvedTasks.some(id => String(id) === taskIdStr);
        }
        // console.log('[TaskManager] Task already solved check:', {
        //     taskId,
        //     taskIdStr: String(taskId),
        //     isAlreadySolvedById,
        //     solvedTasksCount: solvedTasks ? solvedTasks.length : 0,
        //     solvedTasksSample: solvedTasks ? solvedTasks.slice(0, 3) : []
        // });
    }

    // Определяем начисление звездочек в зависимости от сложности
    // ВАЖНО: Если задача уже решена, звезды НЕ начисляются
    let starsEarned = 0;
    if (!isAlreadySolvedById && !isDuplicate && percent === 100) {
        starsEarned = calculateStarsEarned(difficulty, percent, isDaily, taskId);
        // console.log('[TaskManager] Stars calculated:', starsEarned);
    } else {
        // console.log(`[TaskManager] Task ${taskId} already solved or duplicate, starsEarned set to 0`, {
        //     isAlreadySolvedById,
        //     isDuplicate,
        //     percent
        // });
    }

    if (percent === 100 && window.userDataManager) {
        // Сохраняем эталонное решение в БД, если задача решена успешно и не дубликат
        if (solution && taskStatement && !isDuplicate && !isAlreadySolvedById) {
            try {
                await saveReferenceSolution(taskStatement, solution, currentTaskData);
                // console.log('[TaskManager] Reference solution saved to database');
            } catch (err) {
                // console.error('[TaskManager] Error saving reference solution:', err);
            }
        }

        const category = (currentTaskData && currentTaskData.category) ? currentTaskData.category : 'general';
        // console.log(category)

        // ВАЖНО: Вызываем markTaskSolved ТОЛЬКО если задача еще не решена
        if (taskId && !isDuplicate && !isAlreadySolvedById) {
            // console.log('[TaskManager] Marking task as solved:', {
            //     taskId,
            //     category,
            //     percent,
            //     starsEarned,
            //     hasTaskData: !!currentTaskData
            // });

            // Отмечаем задачу как решенную (возвращает true, если задача была решена впервые)
            const wasFirstTime = await window.userDataManager.markTaskSolved(taskId, category, isDaily, Math.round(percent / 5));

            // console.log('[TaskManager] Task marked as solved, wasFirstTime:', wasFirstTime);

            // КРИТИЧЕСКАЯ ПРОВЕРКА: Начисляем звездочки ТОЛЬКО если задача была решена впервые
            // wasFirstTime === true означает, что markTaskSolved добавил задачу впервые
            if (wasFirstTime === true && starsEarned > 0) {
                // console.log('[TaskManager] Adding stars:', starsEarned, 'for first-time solved task:', taskId);
                await window.userDataManager.addStars(starsEarned);
                // Обновляем звезды в фидбеке в реальном времени
                updateStarsInFeedback();
            } else {
                // console.log(`⚠️ Task ${taskId} already solved or no stars earned`, {
                //     wasFirstTime,
                //     starsEarned,
                //     reason: wasFirstTime === false ? 'already solved' : 'no stars calculated'
                // });
                starsEarned = 0; // Убеждаемся, что звезды не начисляются
            }
        } else if (isDuplicate || isAlreadySolvedById) {
            // console.log('[TaskManager] Duplicate task detected, not marking as solved', {
            //     isDuplicate,
            //     isAlreadySolvedById,
            //     taskId
            // });
            showNotification('Эта задача уже была решена ранее. Звезды не начислены.', 'info');
            starsEarned = 0; // Убеждаемся, что звезды не начисляются
        } else {
            // console.error('[TaskManager] No task ID available (neither currentTaskData.id nor submission_id)');
        }
    } else {
        // console.log('[TaskManager] Task not marked as solved:', {
        //     percent,
        //     hasCurrentTaskData: !!currentTaskData,
        //     taskId: currentTaskData?.id,
        //     hasUserDataManager: !!window.userDataManager
        // });
    }

    // Формируем HTML с результатами - только OCR решение с ошибками
    let html = '';
    if (solution) {
        html = `
            <div class="results-container">
				<div class="solution-text marked-solution">${solutionHtml}</div>
            </div>
        `;
    } else {
        html = `
            <div class="results-container">
                <p>Решение не найдено</p>
            </div>
        `;
    }

    resultsArea.innerHTML = html;

    // Показываем сложность и звезды в окошке после плюсика
    showTaskInfoAfterButtons(difficulty, starsEarned, percent);

    // Обновляем карточки подсказок (только если есть подсказки и решение не 100%)
    if (hints && hints.length > 0 && percent !== 100) {
        updateHintCards(hints);
    } else if (percent === 100) {
        // Скрываем карточки подсказок, если решение полностью правильное
        const hintsSection = domCache.getHintsSection();
        if (hintsSection) {
            hintsSection.style.display = 'none';
            hintsSection.innerHTML = '';
        }
    }

    // Показываем фидбек модели
    showModelFeedback(result);

    // Рендерим MathJax для формул в решении (с задержкой для оптимизации)
    requestAnimationFrame(() => {
        setTimeout(() => {
            if (window.renderMathJax) {
                window.renderMathJax(resultsArea);
            } else if (window.MathJax && window.MathJax.typesetPromise) {
                window.MathJax.typesetPromise([resultsArea]).catch((err) => {
                    // console.warn('MathJax rendering error:', err);
                });
            }
        }, 100);
    });

    if (percent == 100) {
        showNotification(`Отличное решение! 🎉${starsEarned > 0 ? ` Получено ${starsEarned} ⭐` : ''}`, 'success');
    } else if (percent >= 70) {
        showNotification('Хорошее решение, но есть что улучшить', 'info');
    } else {
        showNotification('Решение требует доработки', 'warning');
    }
    const input = document.getElementById('aiChatInput');
    const btn = document.getElementById('sendMessageBtn');
    input.placeholder = 'Нужна одна посылка для разблокировки...'
    input.disabled = false
    btn.disabled = false
    // console.log('[TaskManager] Результат отображен. Процент:', percent);
}

// === Показ информации о задаче (сложность и звезды) ===
function showTaskInfoAfterButtons(difficulty, starsEarned, percent) {
    const taskInfoBox = document.getElementById('taskInfoBox');
    const taskDifficultyDisplay = document.getElementById('taskDifficultyDisplay');
    const taskStarsDisplay = document.getElementById('taskStarsDisplay');
    const taskStarsCount = document.getElementById('taskStarsCount');
    const taskProgressDisplay = document.getElementById('taskProgressDisplay');

    if (taskInfoBox) {
        taskInfoBox.style.display = 'block';
    }

    if (taskDifficultyDisplay) {
        taskDifficultyDisplay.textContent = difficulty || 'неизвестно';
    }

    if (taskProgressDisplay) {
        taskProgressDisplay.textContent = percent + '%';
    }

    if (starsEarned > 0 && percent >= 90) {
        if (taskStarsDisplay) {
            taskStarsDisplay.style.display = 'block';
        }
        if (taskStarsCount) {
            taskStarsCount.textContent = starsEarned;
        }
    } else {
        if (taskStarsDisplay) {
            taskStarsDisplay.style.display = 'none';
        }
    }
}

// === Парсинг решения с разметкой ошибок ===
function parseSolutionWithErrors(solutionHtml) {
    if (!solutionHtml) return '';

    // Сервер использует формат <error>текст<error> для разметки ошибок
    // Оба тега одинаковые - <error>, поэтому нужно найти пары тегов

    // Находим все индексы тегов <error>
    const errorTag = '<error>';
    const errorTagLength = errorTag.length;
    const errorIndices = [];
    let searchIndex = 0;

    while (true) {
        const index = solutionHtml.indexOf(errorTag, searchIndex);
        if (index === -1) break;
        errorIndices.push(index);
        searchIndex = index + errorTagLength;
    }

    // Если нет тегов или нечетное количество, возвращаем экранированный текст
    if (errorIndices.length === 0 || errorIndices.length % 2 !== 0) {
        return escapeHtml(solutionHtml);
    }

    // Обрабатываем пары тегов (открывающий и закрывающий)
    const errorRanges = [];
    const tempMarkers = [];

    for (let i = 0; i < errorIndices.length; i += 2) {
        const startIndex = errorIndices[i] + errorTagLength;
        const endIndex = errorIndices[i + 1];
        const errorText = solutionHtml.substring(startIndex, endIndex);
        const marker = `__ERROR_MARKER_${errorRanges.length}__`;

        errorRanges.push({
            text: errorText,
            marker: marker
        });
        tempMarkers.push({
            start: errorIndices[i],
            end: errorIndices[i + 1] + errorTagLength,
            marker: marker
        });
    }

    // Заменяем ошибки на маркеры (с конца, чтобы не сбить индексы)
    let processed = solutionHtml;
    for (let i = tempMarkers.length - 1; i >= 0; i--) {
        const marker = tempMarkers[i];
        processed = processed.substring(0, marker.start) +
            marker.marker +
            processed.substring(marker.end);
    }

    // Экранируем весь текст для безопасности (кроме маркеров)
    processed = escapeHtml(processed);

    // Заменяем маркеры обратно на выделенные ошибки
    errorRanges.forEach((error) => {
        const escapedError = escapeHtml(error.text);
        processed = processed.replace(error.marker, `<span class="error-marked">${escapedError}</span>`);
    });

    return processed;
}

// === Вычисление звездочек за решение ===
function calculateStarsEarned(difficulty, percent, isDaily = false, taskId = null) {
    if (percent < 100) return 0; // Только за успешное решение

    // Проверяем, была ли задача уже решена ранее
    if (taskId && window.userDataManager) {
        const solvedTasks = window.userDataManager.getSolvedTasks();
        if (solvedTasks && solvedTasks.includes(taskId)) {
            // console.log(`[TaskManager] Task ${taskId} already solved, no stars awarded`);
            return 0; // Задача уже решена - звезды не начисляются
        }
    }

    // Daily задача - всегда 5 звёзд
    if (isDaily) {
        return 5;
    }

    // Фиксированное количество звёзд в зависимости от сложности
    const difficultyStars = {
        'easy': 1,
        'medium': 2,
        'hard': 3,
        'легко': 1,
        'средне': 2,
        'средняя': 2,
        'сложно': 3
    };

    const normalizedDifficulty = difficulty ? difficulty.toLowerCase() : 'medium';
    return difficultyStars[normalizedDifficulty] || 2; // По умолчанию 2 звезды для medium
}

// === Обновление карточек подсказок ===
function updateHintCards(hints) {
    const hintsSection = domCache.getHintsSection();
    if (!hintsSection) {
        // console.warn('[TaskManager] revealHintsSection not found');
        return;
    }

    // Если нет hints, скрываем секцию
    if (!hints || hints.length === 0) {
        hintsSection.style.display = 'none';
        return;
    }

    // console.log('[TaskManager] Updating hint cards with', hints.length, 'hints');

    // Показываем секцию с подсказками
    hintsSection.style.display = 'grid';

    // Очищаем секцию от старых карточек
    hintsSection.innerHTML = '';

    // Создаем карточки динамически по количеству hints (используем DocumentFragment для оптимизации)
    const fragment = document.createDocumentFragment();
    hints.forEach((hint, index) => {
        // Стоимость карточки: 5, 8, 11, 14... (увеличивается на 3)
        const cost = 5 + (index * 3);

        // Создаем новую карточку
        const card = document.createElement('div');
        card.className = 'reveal-hint-card locked';
        card.dataset.cost = cost;
        card.dataset.hintIndex = index;

        // Сохраняем hint в data-атрибуте для использования после покупки
        card.dataset.hint = hint;

        card.innerHTML = `
            <div class="locked-layer">
                <i class="fas fa-star"></i>
                <span>${cost} звезд</span>
            </div>
            <div class="hint-latex-content">
                <p>${escapeHtml(hint)}</p>
            </div>
        `;

        // Добавляем обработчик клика для покупки
        card.addEventListener('click', (e) => {
            e.stopPropagation();
            if (card.classList.contains('locked')) {
                buyHint(card, cost, hint);
            }
        });

        // Добавляем карточку в fragment
        fragment.appendChild(card);
    });

    // Добавляем все карточки одним действием (оптимизация)
    hintsSection.appendChild(fragment);

    // console.log('[TaskManager] Created', hints.length, 'hint cards');
}

// === Покупка подсказки ===
async function buyHint(card, cost, hint) {
    if (!window.userDataManager) {
        showNotification('Система пользователя не инициализирована', 'error');
        return;
    }

    // Получаем актуальные данные из userDataManager
    const userStats = window.userDataManager.getGeneralStats();
    const currentStars = userStats.stars || 0;

    if (currentStars < cost) {
        showNotification(`Недостаточно звезд! Нужно ${cost}, у вас ${currentStars}`, 'error');
        return;
    }

    // Покупаем подсказку (вычитаем звезды)
    const success = await window.userDataManager.spendStars(cost);
    if (!success) {
        showNotification(`Недостаточно звезд! Нужно ${cost}, у вас ${currentStars}`, 'error');
        return;
    }

    // Обновляем звезды в фидбеке после траты
    updateStarsInFeedback();

    // Разблокируем карточку
    card.classList.remove('locked');
    card.classList.add('unlocked');

    // Показываем реальный hint из БД
    const hintContent = card.querySelector('.hint-latex-content');
    if (hintContent) {
        // Используем hint из параметра или из data-атрибута
        const hintText = hint || card.dataset.hint || '';
        hintContent.innerHTML = `<p>${escapeHtml(hintText)}</p>`;

        // Рендерим MathJax для формул в подсказке (с задержкой для оптимизации)
        requestAnimationFrame(() => {
            setTimeout(() => {
                if (window.renderMathJax) {
                    window.renderMathJax(hintContent);
                } else if (window.MathJax && window.MathJax.typesetPromise) {
                    window.MathJax.typesetPromise([hintContent]).catch((err) => {
                        // console.warn('MathJax rendering error:', err);
                    });
                }
            }, 100);
        });
    }

    // Обновляем профиль после покупки
    if (window.profileManager) {
        window.profileManager.updateStats({});
    }

    showNotification(`Подсказка открыта! Потрачено ${cost} ⭐`, 'success');
}

// === Показ фидбека модели ===
function showModelFeedback(result) {
    // Создаем или находим секцию для фидбека
    let feedbackSection = document.getElementById('modelFeedbackSection');
    if (!feedbackSection) {
        // Создаем секцию фидбека после кнопки "Найти ошибки"
        const checkButtonContainer = document.querySelector('.check-button-container');
        if (checkButtonContainer) {
            feedbackSection = document.createElement('div');
            feedbackSection.id = 'modelFeedbackSection';
            feedbackSection.className = 'model-feedback-section';
            checkButtonContainer.parentNode.insertBefore(feedbackSection, checkButtonContainer.nextSibling);
        }
    }

    if (!feedbackSection) return;

    // Формируем фидбек на основе результата
    const percent = result.completion_percentage || 0;
    const hints = result.hints || [];
    const difficulty = result.difficulty || 'medium';
    const isDaily = currentTaskData?.isDaily || false;
    const taskId = (currentTaskData && currentTaskData.id) ? currentTaskData.id : result.submission_id;
    const starsEarned = calculateStarsEarned(difficulty, percent, isDaily, taskId);

    let feedbackText = '';
    if (percent === 100) {
        feedbackText = '✅ Решение выполнено корректно! Все шаги решены правильно.';
    } else if (percent >= 70) {
        feedbackText = '⚠️ Решение в основном правильное, но есть небольшие недочеты. Обратите внимание на помеченные участки.';
    } else if (percent >= 50) {
        feedbackText = '⚠️ В решении есть несколько ошибок. Проверьте помеченные участки и используйте подсказки для исправления.';
    } else {
        feedbackText = '❌ Решение содержит значительные ошибки. Рекомендуется пересмотреть подход к решению задачи.';
    }

    if (hints.length > 0) {
        feedbackText += ' Возможные места ошибок помечены в тексте решения.';
    }

    // Формируем HTML с количеством звезд под фидбеком
    const currentStars = window.userDataManager ? window.userDataManager.getStars() : 0;
    let starsHTML = '';
    if (currentStars !== undefined && currentStars !== null) {
        starsHTML = `
            <div class="feedback-stars" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.1); display: flex; align-items: center; gap: 0.5rem; color: #ffd700;">
                <i class="fas fa-star" style="color: #ffd700;"></i>
                <span style="font-weight: 600;">Ваши звёзды: ${currentStars}</span>
            </div>
        `;
    }

    feedbackSection.innerHTML = `
        <div class="feedback-card">
            <div class="feedback-header">
                <i class="fas fa-robot"></i>
                <h4>Фидбек модели</h4>
            </div>
            <div class="feedback-content">
                <p>${escapeHtml(feedbackText)}</p>
                ${starsHTML}
            </div>
        </div>
    `;

    feedbackSection.style.display = 'block';

    // Запускаем периодическое обновление звездочек (каждые 2 секунды)
    if (starsUpdateInterval) {
        clearInterval(starsUpdateInterval);
    }
    starsUpdateInterval = setInterval(() => {
        updateStarsInFeedback();
    }, 2000);
}

// === Обновление звезд в фидбеке ===
function updateStarsInFeedback() {
    const feedbackSection = document.getElementById('modelFeedbackSection');
    if (!feedbackSection || feedbackSection.style.display === 'none') {
        // Если фидбек скрыт, останавливаем интервал
        if (starsUpdateInterval) {
            clearInterval(starsUpdateInterval);
            starsUpdateInterval = null;
        }
        return;
    }

    const currentStars = window.userDataManager ? window.userDataManager.getStars() : 0;
    const starsElement = feedbackSection.querySelector('.feedback-stars span');
    if (starsElement) {
        starsElement.textContent = `У вас звёзд: ${currentStars}`;
    } else {
        // Если элемента нет, обновляем весь фидбек
        const feedbackContent = feedbackSection.querySelector('.feedback-content');
        if (feedbackContent) {
            const starsHTML = `
                <div class="feedback-stars" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.1); display: flex; align-items: center; gap: 0.5rem; color: #ffd700;">
                    <i class="fas fa-star" style="color: #ffd700;"></i>
                    <span style="font-weight: 600;">У вас звёзд: ${currentStars}</span>
                </div>
            `;
            // Добавляем или обновляем звезды
            const existingStars = feedbackContent.querySelector('.feedback-stars');
            if (existingStars) {
                existingStars.outerHTML = starsHTML;
            } else {
                feedbackContent.insertAdjacentHTML('beforeend', starsHTML);
            }
        }
    }
}

// Делаем функцию глобальной для доступа из других модулей
window.updateStarsInFeedback = updateStarsInFeedback;

// === Проверка дубликатов задач ===
async function checkDuplicateTask(statement) {
    if (!statement || !window.userDataManager) return false;

    try {
        // Получаем список решенных задач
        const solvedTasks = window.userDataManager.getSolvedTasks();
        if (!solvedTasks || solvedTasks.length === 0) return false;

        // Проверяем по statement через API
        const response = await fetch('/api/tasks/check-duplicate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                statement: statement.trim()
            })
        });

        if (response.ok) {
            const data = await response.json();
            return data.is_duplicate || false;
        }
    } catch (err) {
        // console.error('[TaskManager] Error checking duplicate:', err);
    }

    return false;
}

// === Сохранение эталонного решения в БД ===
async function saveReferenceSolution(statement, solution, taskData) {
    try {
        const response = await fetch('/api/tasks/save-reference', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                statement: statement.trim(),
                solution: solution,
                category: taskData?.category || 'general',
                difficulty: taskData?.difficulty || 'medium',
                title: taskData?.title || ''
            })
        });

        if (!response.ok) {
            throw new Error('Ошибка при сохранении эталонного решения');
        }

        return await response.json();
    } catch (err) {
        // console.error('[TaskManager] Error saving reference solution:', err);
        throw err;
    }
}

// === Обработка файлов ===
function handleDragOver(e) {
    e.preventDefault();
    // console.debug('[TaskManager] handleDragOver');
    if (e.currentTarget) e.currentTarget.style.borderColor = '#667eea';
}

function handleDrop(e) {
    e.preventDefault();
    // console.debug('[TaskManager] handleDrop — files:', e.dataTransfer?.files?.length || 0);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
}

function handleFileSelect(e) {
    // console.debug('[TaskManager] handleFileSelect — files:', e.target?.files?.length || 0);
    const file = e.target.files[0];
    if (file) handleFile(file);
}

function handleFile(file) {
    // console.info('[TaskManager] handleFile() — принимаю файл:', {
    //     name: file.name,
    //     size: file.size,
    //     type: file.type
    // });

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'text/plain'];
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.txt'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
        // console.warn('[TaskManager] Неподдерживаемый тип файла:', file.type);
        showNotification('Допустимы только PDF, JPG, PNG и TXT', 'error');
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        // console.warn('[TaskManager] Файл слишком большой:', file.size);
        showNotification('Файл не должен превышать 10MB', 'error');
        return;
    }
    uploadedFile = file;
    displayUploadedFile(file);
    updateCheckButtonState();
    // console.log('[TaskManager] Файл принят и установлен как uploadedFile');
}

function displayUploadedFile(file) {
    // console.debug('[TaskManager] displayUploadedFile()', {
    //     name: file.name,
    //     size: file.size,
    //     type: file.type
    // });
    const area = domCache.getFileUploadArea();
    if (!area) {
        // console.warn('[TaskManager] displayUploadedFile: area not found');
        return;
    }

    // Получаем элементы для превью
    const uploadPlaceholder = area.querySelector('#uploadPlaceholder');
    const filePreview = area.querySelector('#filePreview');
    const imagePreview = area.querySelector('#imagePreview');
    const pdfPreview = area.querySelector('#pdfPreview');
    const fileInfo = area.querySelector('#fileInfo');

    // Скрываем placeholder, показываем preview
    if (uploadPlaceholder) {
        uploadPlaceholder.style.display = 'none';
    }
    if (filePreview) {
        filePreview.style.display = 'flex';
    }

    // Обновляем информацию о файле
    if (fileInfo) {
        fileInfo.innerHTML = `
            <div style="color: #e0e0e0; font-weight: 600; margin-bottom: 0.5rem; font-size: 1.1rem;">
                <i class="fas fa-file-alt" style="margin-right: 0.5rem; color: #00f5ff;"></i>
                ${escapeHtml(file.name)}
            </div>
            <div style="color: #888; font-size: 0.9rem; margin-bottom: 1rem;">
                ${formatFileSize(file.size)}
            </div>
            <button type="button" id="removeFileBtn" style="
                padding: 0.5rem 1.5rem;
                background: rgba(255, 0, 0, 0.2);
                border: 1px solid rgba(255, 0, 0, 0.5);
                color: #ff6b6b;
                border-radius: 8px;
                cursor: pointer;
                font-size: 0.9rem;
                transition: all 0.3s ease;
            ">
                <i class="fas fa-times" style="margin-right: 0.5rem;"></i>
                Удалить файл
            </button>
        `;

        // Навешиваем слушатель на кнопку удаления
        const removeBtn = fileInfo.querySelector('#removeFileBtn');
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Предотвращаем открытие диалога выбора файла
                // console.debug('[TaskManager] removeFileBtn clicked');
                removeFile();
            });

            // Добавляем hover эффект
            removeBtn.addEventListener('mouseenter', () => {
                removeBtn.style.background = 'rgba(255, 0, 0, 0.3)';
                removeBtn.style.borderColor = 'rgba(255, 0, 0, 0.7)';
            });
            removeBtn.addEventListener('mouseleave', () => {
                removeBtn.style.background = 'rgba(255, 0, 0, 0.2)';
                removeBtn.style.borderColor = 'rgba(255, 0, 0, 0.5)';
            });
        }
    }

    // Показываем превью для изображений
    if (file.type.startsWith('image/') && imagePreview) {
        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
            imagePreview.style.maxWidth = '100%';
            imagePreview.style.maxHeight = '400px';
            imagePreview.style.borderRadius = '10px';
            imagePreview.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
            imagePreview.style.marginBottom = '1rem';
        };
        reader.readAsDataURL(file);
    } else if (imagePreview) {
        imagePreview.style.display = 'none';
    }

    // Для PDF можно добавить превью позже, если нужно
    if (pdfPreview) {
        pdfPreview.style.display = 'none';
    }

    // Добавляем визуальное выделение области загрузки
    area.style.border = '2px solid #00f5ff';
    area.style.background = 'rgba(0, 245, 255, 0.05)';
}

function removeFile() {
    // console.info('[TaskManager] removeFile() — удаление загруженного файла');
    uploadedFile = null;
    const area = domCache.getFileUploadArea();
    if (!area) return;

    // Восстанавливаем исходную структуру
    const uploadPlaceholder = area.querySelector('#uploadPlaceholder');
    const filePreview = area.querySelector('#filePreview');
    const imagePreview = area.querySelector('#imagePreview');
    const pdfPreview = area.querySelector('#pdfPreview');
    const fileInfo = area.querySelector('#fileInfo');

    // Показываем placeholder, скрываем preview
    if (uploadPlaceholder) {
        uploadPlaceholder.style.display = 'flex';
    }
    if (filePreview) {
        filePreview.style.display = 'none';
    }
    if (imagePreview) {
        imagePreview.style.display = 'none';
        imagePreview.src = '';
    }
    if (pdfPreview) {
        pdfPreview.style.display = 'none';
    }
    if (fileInfo) {
        fileInfo.innerHTML = '';
    }

    // Сбрасываем стили области загрузки
    area.style.border = '';
    area.style.background = '';

    // Сбрасываем input файла
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.value = '';
    }

    updateCheckButtonState();
}

// Дебаунс для обновления кнопки
let updateCheckButtonTimeout = null;

function updateCheckButtonState() {
    // Дебаунсим обновление кнопки для оптимизации
    if (updateCheckButtonTimeout) {
        clearTimeout(updateCheckButtonTimeout);
    }
    updateCheckButtonTimeout = setTimeout(() => {
        const taskInput = domCache.getTaskInput();
        const checkErrorsBtn = domCache.getCheckErrorsBtn();
        const hasTask = !!(taskInput?.value && taskInput.value.trim().length > 0);
        const hasFile = !!uploadedFile;
        if (checkErrorsBtn) {
            checkErrorsBtn.disabled = !(hasTask && hasFile) || isChecking;
        }
    }, 50);
}

function showNotification(message, type = 'info') {
    const logLine = `[Notification][${type}] ${message}`;
    // Проверяем, что window.showNotification существует и это не наша же функция (избегаем рекурсии)
    if (window.showNotification && typeof window.showNotification === 'function' && window.showNotification !== showNotification) {
        // console.log('[TaskManager] calling window.showNotification:', logLine);
        try {
            window.showNotification(message, type);
        } catch (err) {
            // console.error('[TaskManager] window.showNotification threw error', err);
            // fallback — логируем в консоль
            // if (type === 'error') console.error(logLine);
            // else if (type === 'warning' || type === 'warn') console.warn(logLine);
            // else console.log(logLine);
        }
    } else {
        // fallback — логируем в консоль
        // if (type === 'error') console.error(logLine);
        // else if (type === 'warning' || type === 'warn') console.warn(logLine);
        // else console.log(logLine);
    }
}

// безопасная экранировка для вставки в innerHTML (простейшая)
function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Кеш для ежедневной задачи (чтобы не перезагружалась при изменении фильтров)
let cachedDailyTask = null;

// === Отображение ежедневной задачи ===
function renderDailyTask(dailyTask) {
    if (!dailyTask) return;

    const dailyTaskItem = document.querySelector('.daily-task-item[data-task-type="daily"]');
    if (dailyTaskItem) {
        const dailyTaskText = dailyTaskItem.querySelector('.task-text');
        if (dailyTaskText) {
            // Если есть флаг completed, выводим сообщение вместо текста задачи
            if (dailyTask.completed === true) {
                dailyTaskText.textContent = 'Вы уже выполнили ежедневную задачу';
            } else {
                const taskDescription = dailyTask.description || dailyTask.statement || '';
                // Показываем полный текст задачи (не обрезаем)
                dailyTaskText.textContent = taskDescription;
            }
            // Увеличиваем размер для отображения всего условия
            dailyTaskText.style.fontSize = '1rem';
            dailyTaskText.style.lineHeight = '1.6';
            dailyTaskText.style.padding = '1rem';
            dailyTaskText.style.minHeight = 'auto';
            // Рендерим MathJax для LaTeX
            if (window.renderMathJax) {
                window.renderMathJax(dailyTaskText);
            } else if (window.MathJax && window.MathJax.typesetPromise) {
                window.MathJax.typesetPromise([dailyTaskText]).catch((err) => {
                    // console.warn('MathJax error:', err);
                });
            }
        }

        // Удаляем старый обработчик и добавляем новый
        const newDailyItem = dailyTaskItem.cloneNode(true);
        dailyTaskItem.parentNode.replaceChild(newDailyItem, dailyTaskItem);

        newDailyItem.addEventListener('click', async () => {
            try {
                await loadDailyTaskFromAPI();
                const taskLibraryOverlay = document.getElementById('taskLibraryOverlay');
                if (taskLibraryOverlay) taskLibraryOverlay.style.display = 'none';
                // Переключаемся на вкладку "Решить"
                const solveTab = document.querySelector('[data-tab="solve"]');
                if (solveTab) solveTab.click();
            } catch (err) {
                // console.error('Ошибка при загрузке daily задачи:', err);
                showNotification('Ошибка при загрузке daily задачи', 'error');
            }
        });
    }
}

// === Загрузка фильтров для библиотеки задач ===
async function loadTaskFilters() {
    try {
        const filters = await getTaskFilters();
        const categoryFilter = document.getElementById('categoryFilter');
        const difficultyFilter = document.getElementById('difficultyFilter');

        if (categoryFilter && filters.categories) {
            // Сохраняем текущее значение
            const currentValue = categoryFilter.value;
            // Очищаем и заполняем заново
            categoryFilter.innerHTML = '<option value="">Все темы</option>';
            filters.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categoryFilter.appendChild(option);
            });
            // Восстанавливаем значение, если оно есть
            if (currentValue) {
                categoryFilter.value = currentValue;
            }
        }

        if (difficultyFilter && filters.difficulties) {
            // Сохраняем текущее значение
            const currentValue = difficultyFilter.value;
            // Очищаем и заполняем заново
            difficultyFilter.innerHTML = '<option value="">Все уровни</option>';
            filters.difficulties.forEach(difficulty => {
                const option = document.createElement('option');
                option.value = difficulty;
                option.textContent = difficulty;
                difficultyFilter.appendChild(option);
            });
            // Восстанавливаем значение, если оно есть
            if (currentValue) {
                difficultyFilter.value = currentValue;
            }
        }

        // Добавляем обработчики изменения фильтров
        if (categoryFilter) {
            categoryFilter.removeEventListener('change', handleFilterChange);
            categoryFilter.addEventListener('change', handleFilterChange);
        }
        if (difficultyFilter) {
            difficultyFilter.removeEventListener('change', handleFilterChange);
            difficultyFilter.addEventListener('change', handleFilterChange);
        }
    } catch (err) {
        // console.error('Ошибка при загрузке фильтров:', err);
    }
}

// === Обработчик изменения фильтров ===
function handleFilterChange() {
    loadTaskLibrary();
}

// === Загрузка библиотеки задач ===
async function loadTaskLibrary() {
    // console.info('[TaskManager] loadTaskLibrary() — загружаю задачи из API');
    try {
        // Загружаем фильтры
        await loadTaskFilters();

        // Получаем текущие значения фильтров
        const categoryFilter = document.getElementById('categoryFilter');
        const difficultyFilter = document.getElementById('difficultyFilter');
        const selectedCategory = categoryFilter ? categoryFilter.value : '';
        const selectedDifficulty = difficultyFilter ? difficultyFilter.value : '';

        const response = await getAllTasks(selectedCategory, selectedDifficulty);
        const allTasks = response.tasks || [];
        // console.debug('[TaskManager] Загружено задач:', allTasks.length);

        // Получаем список решенных задач
        let solvedIds = [];
        if (window.userDataManager) {
            solvedIds = window.userDataManager.getSolvedTasks();
        } else {
            solvedIds = JSON.parse(localStorage.getItem('solvedTasks') || '[]');
        }
        const solvedTasks = allTasks.filter(task => solvedIds.includes(task.id));
        const unsolvedTasks = allTasks.filter(task => !solvedIds.includes(task.id));

        // Отображаем решенные задачи
        const solvedGrid = document.getElementById('solvedTasksGrid');
        if (solvedGrid) {
            if (solvedTasks.length === 0) {
                solvedGrid.innerHTML = '<p style="color: #888; padding: 1rem;">Решенных задач пока нет</p>';
            } else {
                solvedGrid.innerHTML = solvedTasks.map(task => `
                    <div class="task-item-card solved" data-task-id="${task.id}">
                        <div class="task-item-title">${escapeHtml(task.title || 'Задача')}</div>
                        <div class="task-item-header" style="margin-top: 0.5rem;">
                            <span class="task-difficulty ${task.difficulty || 'medium'}">${task.difficulty || 'medium'}</span>
                            <span class="task-category">${escapeHtml(task.category || '')}</span>
                            <i class="fas fa-check-circle solved-icon"></i>
                        </div>
                        <div class="task-item-description task-description-latex" data-task-id="${task.id}" style="font-size: 0.95rem; line-height: 1.6; padding: 0.75rem; min-height: 80px;">${task.description || task.statement || ''}</div>
                        <button class="task-item-btn" data-task-id="${task.id}">Посмотреть</button>
                    </div>
                `).join('');
            }
        }

        // Отображаем нерешенные задачи
        const unsolvedGrid = document.getElementById('unsolvedTasksGrid');
        if (unsolvedGrid) {
            if (unsolvedTasks.length === 0) {
                unsolvedGrid.innerHTML = '<p style="color: #888; padding: 1rem;">Нет доступных задач</p>';
            } else {
                unsolvedGrid.innerHTML = unsolvedTasks.map(task => `
                    <div class="task-item-card unsolved" data-task-id="${task.id}">
                        <div class="task-item-title">${escapeHtml(task.title || 'Задача')}</div>
                        <div class="task-item-header" style="margin-top: 0.5rem;">
                            <span class="task-difficulty ${task.difficulty || 'medium'}">${task.difficulty || 'medium'}</span>
                            <span class="task-category">${escapeHtml(task.category || '')}</span>
                        </div>
                        <div class="task-item-description task-description-latex" data-task-id="${task.id}" style="font-size: 0.95rem; line-height: 1.6; padding: 0.75rem; min-height: 80px;">${task.description || task.statement || ''}</div>
                        <div class="task-item-actions">
                            <button class="task-item-btn" data-task-id="${task.id}">Решить</button>
                            <button class="task-solution-btn" data-task-id="${task.id}">Решение</button>
                        </div>
                    </div>
                `).join('');
            }
        }

        // Добавляем обработчики кликов на задачи
        document.querySelectorAll('.task-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const taskId = parseInt(btn.dataset.taskId);
                const task = allTasks.find(t => t.id === taskId);
                if (task) {
                    selectTaskFromLibrary(task);
                }
            });
        });

        // Добавляем обработчики для кнопок "Решение"
        document.querySelectorAll('.task-solution-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const taskId = parseInt(btn.dataset.taskId);
                await showTaskSolution(taskId);
            });
        });

        // Рендерим LaTeX для описаний задач (батчинг для оптимизации) - для всех задач (решенных и нерешенных)
        const latexElements = document.querySelectorAll('.task-description-latex');
        if (latexElements.length > 0) {
            requestAnimationFrame(() => {
                setTimeout(() => {
                    const elementsArray = Array.from(latexElements);
                    if (window.renderMathJax) {
                        // Рендерим для каждого элемента отдельно для лучшей поддержки LaTeX
                        elementsArray.forEach(element => {
                            if (element && element.parentElement) {
                                window.renderMathJax(element);
                            }
                        });
                    } else if (window.MathJax && window.MathJax.typesetPromise) {
                        window.MathJax.typesetPromise(elementsArray).catch((err) => {
                            // console.warn('MathJax error:', err);
                        });
                    }
                }, 100);
            });
        }

        // Daily задача - загружаем из API только если еще не загружена
        if (!cachedDailyTask) {
            try {
                const solvedIds = JSON.parse(localStorage.getItem('solvedTasks') || '[]');
                cachedDailyTask = await getDailyTask(solvedIds);
            } catch (err) {
                // console.warn('Не удалось загрузить daily задачу для библиотеки:', err);
            }
        }

        // Отображаем ежедневную задачу из кеша
        if (cachedDailyTask) {
            renderDailyTask(cachedDailyTask);
        }

        // console.log('[TaskManager] Библиотека задач загружена');
    } catch (err) {
        // console.error('[TaskManager] Ошибка при загрузке библиотеки задач:', err);
        showNotification('Ошибка при загрузке библиотеки задач', 'error');
    }
}

// === Выбор задачи из библиотеки ===
function selectTaskFromLibrary(task) {
    // console.info('[TaskManager] selectTaskFromLibrary() — выбираю задачу', task);
    const taskInput = document.getElementById('taskInput');
    const taskLibraryOverlay = document.getElementById('taskLibraryOverlay');

    if (taskInput) {
        const taskText = task.description || task.statement || '';
        taskInput.value = taskText;
        currentTaskData = task;
        updateCheckButtonState();

        // Рендерим LaTeX в поле задачи (с задержкой для оптимизации)
        if (window.renderMathJax) {
            requestAnimationFrame(() => {
                setTimeout(() => {
                    window.renderMathJax(taskInput.parentElement);
                }, 100);
            });
        }
    }

    if (taskLibraryOverlay) {
        taskLibraryOverlay.style.display = 'none';
    }

    // Переключаемся на вкладку "Решить"
    const solveTab = document.querySelector('[data-tab="solve"]');
    if (solveTab) solveTab.click();

    showNotification('Задача загружена!', 'info');
}

// === Показ решения задачи ===
async function showTaskSolution(taskId) {
    // console.info('[TaskManager] showTaskSolution() — запрашиваю решение задачи', taskId);

    // Создаем модальное окно для решения
    let solutionModal = document.getElementById('taskSolutionModal');
    if (!solutionModal) {
        solutionModal = document.createElement('div');
        solutionModal.id = 'taskSolutionModal';
        solutionModal.className = 'task-solution-modal';
        solutionModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        `;
        solutionModal.innerHTML = `
            <div class="solution-modal-content" style="
                background: rgba(20, 20, 20, 0.95);
                border-radius: 20px;
                padding: 2rem;
                max-width: 800px;
                max-height: 90vh;
                overflow-y: auto;
                border: 1px solid rgba(255, 255, 255, 0.1);
                position: relative;
            ">
                <button class="close-solution-btn" style="
                    position: absolute;
                    top: 1rem;
                    right: 1rem;
                    background: transparent;
                    border: none;
                    color: #fff;
                    font-size: 1.5rem;
                    cursor: pointer;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: background 0.2s;
                ">×</button>
                <h3 style="color: #fff; margin-bottom: 1rem;">Решение задачи</h3>
                <div id="solutionContent" style="color: #e0e0e0; line-height: 1.8;">
                    <p>Загрузка решения...</p>
                </div>
            </div>
        `;
        document.body.appendChild(solutionModal);

        // Обработчик закрытия
        const closeBtn = solutionModal.querySelector('.close-solution-btn');
        closeBtn.addEventListener('click', () => {
            solutionModal.style.display = 'none';
        });
        solutionModal.addEventListener('click', (e) => {
            if (e.target === solutionModal) {
                solutionModal.style.display = 'none';
            }
        });
    }

    solutionModal.style.display = 'flex';
    const solutionContent = document.getElementById('solutionContent');
    solutionContent.innerHTML = '<p>Загрузка решения...</p>';

    try {
        const response = await fetch('/task-solution', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                task_id: taskId
            })
        });

        if (!response.ok) {
            throw new Error('Ошибка при запросе решения');
        }

        const data = await response.json();
        solutionContent.innerHTML = `
            <div style="margin-bottom: 1.5rem;">
                <h4 style="color: #4a90e2; margin-bottom: 0.5rem;">${escapeHtml(data.task_title || 'Задача')}</h4>
                <p style="color: #b0b0b0; margin-bottom: 1rem;">${escapeHtml(data.task_description || '')}</p>
            </div>
            <div class="solution-text-latex" style="white-space: pre; max-height: 60vh; overflow-y: auto; overflow-x: auto;">
                ${escapeHtml(data.solution || 'Решение не найдено')}
            </div>
        `;

        // Рендерим LaTeX
        if (window.renderMathJax) {
            await window.renderMathJax(solutionContent);
        }
    } catch (err) {
        // console.error('Ошибка при загрузке решения:', err);
        solutionContent.innerHTML = '<p style="color: #ff6b6b;">Ошибка при загрузке решения. Попробуйте еще раз.</p>';
    }
}

// === Глобальный экспорт ===
window.taskManager = {
    initialize: initializeTaskManager,
    loadRandomTaskFromAPI,
    loadDailyTaskFromAPI,
    checkErrors,
    removeFile,
    loadTaskLibrary,
    selectTaskFromLibrary,
    getLastCompletedTask: () => lastCompletedTask,
    get lastCompletedTask() {
        return lastCompletedTask;
    }
};


// console.log('[TaskManager] script loaded — ready to initialize.');
