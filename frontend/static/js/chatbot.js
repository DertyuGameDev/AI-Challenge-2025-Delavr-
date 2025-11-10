/* AI Chatbot Management */

let isChatOpen = false;
let chatMessages = [];


function initializeChatbot() {
    console.log('[Chatbot] Initializing chatbot...');
    const aiChatToggle = document.getElementById('aiChatToggle');
    const aiChatOverlay = document.getElementById('aiChatOverlay');
    const closeChatBtn = document.getElementById('closeChatBtn');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const aiChatInput = document.getElementById('aiChatInput');
    const quickQuestionBtns = document.querySelectorAll('.quick-question-btn');

    console.log('[Chatbot] Elements found:', {
        aiChatToggle: !!aiChatToggle,
        aiChatOverlay: !!aiChatOverlay,
        closeChatBtn: !!closeChatBtn,
        sendMessageBtn: !!sendMessageBtn,
        aiChatInput: !!aiChatInput,
        quickQuestionBtns: quickQuestionBtns.length
    });

    // Кнопки прикрепления файла удалены по запросу пользователя

    if (aiChatToggle) {
        aiChatToggle.addEventListener('click', toggleChat);
        console.log('[Chatbot] Toggle button listener attached');
    }

    if (closeChatBtn) {
        closeChatBtn.addEventListener('click', closeChat);
        console.log('[Chatbot] Close button listener attached');
    }

    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', (e) => {
            console.log('[Chatbot] Send button clicked');
            e.preventDefault();
            sendMessage();
        });
        console.log('[Chatbot] Send button listener attached');
    } else {
        console.error('[Chatbot] Send button not found!');
    }

    if (aiChatInput) {
        aiChatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                console.log('[Chatbot] Enter key pressed');
                sendMessage();
            }
        });

        aiChatInput.addEventListener('input', autoResizeTextarea);
        console.log('[Chatbot] Input listeners attached');
    } else {
        console.error('[Chatbot] Chat input not found!');
    }

    quickQuestionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const question = btn.dataset.question;
            if (question) {
                if (aiChatInput) {
                    aiChatInput.value = question;
                }
                sendMessage();
            }
        });
    });
    console.log('[Chatbot] Quick question buttons listeners attached');

    if (aiChatOverlay) {
        aiChatOverlay.addEventListener('click', (e) => {
            if (e.target === aiChatOverlay) {
                closeChat();
            }
        });
    }

    console.log('[Chatbot] Initialization complete');
}


function toggleChat() {
    if (isChatOpen) {
        closeChat();
    } else {
        openChat();
    }
}

function openChat() {
    const aiChatOverlay = document.getElementById('aiChatOverlay');
    if (aiChatOverlay) {
        aiChatOverlay.style.display = 'flex';
        isChatOpen = true;
        
        setTimeout(() => {
            const aiChatInput = document.getElementById('aiChatInput');
            if (aiChatInput) {
                aiChatInput.focus();
            }
        }, 100);
    }
}

function closeChat() {
    const aiChatOverlay = document.getElementById('aiChatOverlay');
    if (aiChatOverlay) {
        aiChatOverlay.style.display = 'none';
        isChatOpen = false;
    }
}

let isProcessing = false; // Флаг обработки сообщения

async function sendMessage() {
    console.log('[Chatbot] sendMessage() called');

    const aiChatInput = document.getElementById('aiChatInput');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    
    // Блокируем ввод во время обработки
    if (isProcessing) {
        console.log('[Chatbot] Already processing, ignoring message');
        return;
    }
    
    const message = aiChatInput?.value.trim();
    
    console.log('[Chatbot] Message:', message);
    
    if (!message) {
        console.log('[Chatbot] No message, returning');
        return;
    }

    // Блокируем input и кнопку отправки
    isProcessing = true;
    if (aiChatInput) {
        aiChatInput.disabled = true;
        aiChatInput.style.opacity = '0.6';
        aiChatInput.style.cursor = 'not-allowed';
    }
    if (sendMessageBtn) {
        sendMessageBtn.disabled = true;
        sendMessageBtn.style.opacity = '0.6';
        sendMessageBtn.style.cursor = 'not-allowed';
    }

    // Добавляем сообщение пользователя
    addMessage('user', message);
    if (aiChatInput) {
        aiChatInput.value = '';
        autoResizeTextarea.call(aiChatInput);
    }

    try {
        // Обычный ответ AI через LLM
        console.log('[Chatbot] Generating AI response for message:', message);
        addMessage('ai', 'Думаю...');
        try {
            const response = await generateAIResponse(message);
            console.log('[Chatbot] AI response received:', response);
            // Удаляем сообщение "Думаю..."
            const messages = document.getElementById('aiChatMessages');
            if (messages && messages.lastElementChild) {
                messages.removeChild(messages.lastElementChild);
            }
            addMessage('ai', response);
        } catch (err) {
            console.error('[Chatbot] Ошибка при генерации ответа:', err);
            const messages = document.getElementById('aiChatMessages');
            if (messages && messages.lastElementChild) {
                messages.removeChild(messages.lastElementChild);
            }
            addMessage('ai', 'Произошла ошибка при обработке запроса. Попробуйте еще раз.');
        }
    } finally {
        // Разблокируем input и кнопку отправки
        isProcessing = false;
        if (aiChatInput) {
            aiChatInput.disabled = false;
            aiChatInput.style.opacity = '1';
            aiChatInput.style.cursor = 'text';
        }
        if (sendMessageBtn) {
            sendMessageBtn.disabled = false;
            sendMessageBtn.style.opacity = '1';
            sendMessageBtn.style.cursor = 'pointer';
        }
    }
}

// Обработка отправки файла в чат
async function handleChatFileSubmission(file, taskDescription) {
    addMessage('ai', 'Анализирую ваше решение...');
    
    try {
        // Отправляем файл на сервер для проверки
        const response = await submitSolution(file, taskDescription || 'Проверьте решение в прикрепленном файле');
        const submissionId = response.submission_id || response.submissionId;
        
        if (submissionId) {
            // Опрашиваем статус
            let attempts = 0;
            const maxAttempts = 30;
            const pollInterval = setInterval(async () => {
                attempts++;
                try {
                    const statusData = await getSubmissionStatus(submissionId);
                    const status = (statusData.status || '').toLowerCase();
                    
                    if (status === 'completed' || status === 'ok') {
                        clearInterval(pollInterval);
                        
                        // Формируем ответ с результатами
                        const solution = statusData.solution || '';
                        const hints = statusData.hints || [];
                        const percent = statusData.completion_percentage || 0;
                        
                        let aiResponse = `Проверка завершена! Решение выполнено на ${percent}%.\n\n`;
                        
                        if (solution) {
                            // Убираем теги ошибок для текстового ответа в чате
                            const cleanSolution = solution
                                .replace(/<error[^>]*>(.*?)<\/error>/gi, '[$1]')
                                .replace(/<error[^>]*>(.*?)<\\error>/gi, '[$1]');
                            aiResponse += `Ваше решение:\n${cleanSolution}\n\n`;
                        }
                        
                        if (hints.length > 0) {
                            aiResponse += `Подсказки:\n${hints.map((h, i) => `${i + 1}. ${h}`).join('\n')}`;
                        }
                        
                        // Удаляем сообщение "Анализирую..."
                        const messages = document.getElementById('aiChatMessages');
                        if (messages && messages.lastElementChild) {
                            messages.removeChild(messages.lastElementChild);
                        }
                        
                        addMessage('ai', aiResponse);
                    } else if (status === 'error parsing' || attempts >= maxAttempts) {
                        clearInterval(pollInterval);
                        const messages = document.getElementById('aiChatMessages');
                        if (messages && messages.lastElementChild) {
                            messages.removeChild(messages.lastElementChild);
                        }
                        addMessage('ai', 'Произошла ошибка при обработке файла. Попробуйте еще раз.');
                    }
                } catch (err) {
                    console.error('Error polling status:', err);
                    if (attempts >= maxAttempts) {
                        clearInterval(pollInterval);
                    }
                }
            }, 2000);
        }
    } catch (err) {
        console.error('Error submitting file:', err);
        const messages = document.getElementById('aiChatMessages');
        if (messages && messages.lastElementChild) {
            messages.removeChild(messages.lastElementChild);
        }
        addMessage('ai', 'Произошла ошибка при отправке файла: ' + err.message);
    }
}

function addMessage(sender, text) {
    const aiChatMessages = document.getElementById('aiChatMessages');
    if (!aiChatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = sender === 'user' ? 'user-message' : 'ai-message';
    
    const currentTime = new Date().toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });

    if (sender === 'user') {
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${text}</p>
                <div class="message-time">${currentTime}</div>
            </div>
            <div class="message-avatar">
                <i class="fas fa-user"></i>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <p>${text}</p>
                <div class="message-time">${currentTime}</div>
            </div>
        `;
    }

    aiChatMessages.appendChild(messageDiv);
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;

    // Render MathJax for LaTeX formulas
    if (sender === 'ai' && window.MathJax) {
        MathJax.typesetPromise([messageDiv]).catch((err) => {
            console.warn('MathJax rendering error:', err);
        });
    }

    chatMessages.push({ sender, text, time: currentTime });
}

async function generateAIResponse(message) {
    try {
        // Получаем текущую задачу из поля ввода
        let taskDescription = '';
        const taskInput = document.getElementById('taskInput');
        if (taskInput && taskInput.value && taskInput.value.trim()) {
            taskDescription = taskInput.value.trim();
        }
        
        // Если есть последняя завершенная задача с результатом, добавляем её тоже
        if (window.taskManager && window.taskManager.lastCompletedTask) {
            const completedTask = window.taskManager.lastCompletedTask;
            if (completedTask && completedTask.statement) {
                if (taskDescription) {
                    taskDescription += `\n\n--- Предыдущее решение ---\n`;
                }
                taskDescription += `Задача: ${completedTask.statement}\nРешение выполнено на ${completedTask.percent}%.\nРешение: ${completedTask.solution || 'Нет решения'}`;
                if (completedTask.hints && completedTask.hints.length > 0) {
                    taskDescription += `\nПодсказки: ${completedTask.hints.join(', ')}`;
                }
            }
        }
        
        // Отправляем запрос на сервер для получения ответа от LLM
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                task_description: taskDescription // Передаем текущую задачу и последнюю завершенную
            })
        });
        
        if (!response.ok) {
            throw new Error('Ошибка при запросе к LLM');
        }
        
        const data = await response.json();
        return data.response || 'Извините, не удалось получить ответ.';
    } catch (err) {
        console.error('Ошибка при запросе к LLM:', err);
        // Fallback на простые ответы
        return 'Извините, произошла ошибка. Попробуйте переформулировать вопрос.';
    }
}

function autoResizeTextarea() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
}

// Export for use in other modules
window.chatbotManager = {
    initialize: initializeChatbot,
    openChat,
    closeChat,
    sendMessage: (message) => {
        const aiChatInput = document.getElementById('aiChatInput');
        if (aiChatInput) {
            aiChatInput.value = message;
            sendMessage();
        }
    }
};