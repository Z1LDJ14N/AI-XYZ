// ============= CONFIGURATION =============
const API_ENDPOINT = '/api/chat';
const MAX_HISTORY_LENGTH = 10;

// ============= STATE =============
let messageHistory = [];
let chatHistory = [];
let isLoading = false;
let currentConversation = [];

// ============= INITIALIZATION =============
document.addEventListener('DOMContentLoaded', () => {
    loadChatHistory();
    setupEventListeners();
    autoResizeTextarea();
});

// ============= EVENT LISTENERS =============
function setupEventListeners() {
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');

    // Send button click
    sendBtn.addEventListener('click', sendMessage);

    // Enter to send, Shift+Enter for new line
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Auto resize textarea
    chatInput.addEventListener('input', autoResizeTextarea);
}

// ============= AUTO RESIZE TEXTAREA =============
function autoResizeTextarea() {
    const textarea = document.getElementById('chatInput');
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

// ============= SEND MESSAGE =============
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();

    if (!message || isLoading) return;

    // Clear input
    input.value = '';
    input.style.height = 'auto';

    // Add user message to UI
    addMessageToUI(message, 'user');
    currentConversation.push({ role: 'user', content: message });

    // Set loading state
    isLoading = true;
    const sendBtn = document.getElementById('sendBtn');
    sendBtn.disabled = true;

    try {
        // Show typing indicator
        addTypingIndicator();

        // Send to API
        const response = await fetchAIResponse(message);

        // Remove typing indicator
        removeTypingIndicator();

        if (response.success) {
            const aiMessage = response.message;
            addMessageToUI(aiMessage, 'ai');
            currentConversation.push({ role: 'assistant', content: aiMessage });
        } else {
            addMessageToUI(
                `❌ Error: ${response.error || 'Failed to get response from AI'}`,
                'ai',
                true
            );
        }

        // Save to history
        saveChatToHistory();
    } catch (error) {
        console.error('Error:', error);
        removeTypingIndicator();
        addMessageToUI(
            `❌ Network error: ${error.message}. Please try again.`,
            'ai',
            true
        );
    } finally {
        isLoading = false;
        sendBtn.disabled = false;
        input.focus();
    }
}

// ============= FETCH AI RESPONSE =============
async function fetchAIResponse(message) {
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                conversationHistory: currentConversation
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            return {
                success: false,
                error: errorData.error || `HTTP Error: ${response.status}`
            };
        }

        return await response.json();
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// ============= ADD MESSAGE TO UI =============
function addMessageToUI(text, type, isError = false) {
    const container = document.getElementById('messagesContainer');
    
    // Create message group if needed
    let messageGroup = container.lastElementChild;
    if (!messageGroup || messageGroup.className !== 'message-group') {
        messageGroup = document.createElement('div');
        messageGroup.className = 'message-group';
        container.appendChild(messageGroup);
    }

    // Create message
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;

    const contentDiv = document.createElement('div');
    contentDiv.className = `message-content ${isError ? 'error-message' : ''}`;

    if (type === 'ai' && !isError) {
        // Add typing effect for AI messages
        contentDiv.classList.add('typing-text');
        messageDiv.appendChild(contentDiv);
        messageGroup.appendChild(messageDiv);
        
        // Animate typing
        typeWriterEffect(contentDiv, text);
    } else {
        // Regular message for user
        contentDiv.textContent = text;
        messageDiv.appendChild(contentDiv);
        messageGroup.appendChild(messageDiv);
    }

    // Scroll to bottom
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 0);
}

// ============= TYPING EFFECT =============
function typeWriterEffect(element, text, speed = 30) {
    element.textContent = '';
    let index = 0;

    function type() {
        if (index < text.length) {
            element.textContent += text.charAt(index);
            index++;
            setTimeout(type, speed);
        }
    }

    type();
}

// ============= TYPING INDICATOR =============
function addTypingIndicator() {
    const container = document.getElementById('messagesContainer');
    
    const messageGroup = document.createElement('div');
    messageGroup.className = 'message-group';
    messageGroup.id = 'typing-group';

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai-message';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = `
        <div class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;

    messageDiv.appendChild(contentDiv);
    messageGroup.appendChild(messageDiv);
    container.appendChild(messageGroup);

    container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator() {
    const typingGroup = document.getElementById('typing-group');
    if (typingGroup) {
        typingGroup.remove();
    }
}

// ============= CHAT HISTORY =============
function saveChatToHistory() {
    const timestamp = new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });

    const firstMessage = currentConversation.find(msg => msg.role === 'user')?.content;
    const title = firstMessage?.substring(0, 30) || 'Chat';

    chatHistory.unshift({
        id: Date.now(),
        title: title,
        timestamp: timestamp,
        messages: [...currentConversation]
    });

    if (chatHistory.length > MAX_HISTORY_LENGTH) {
        chatHistory.pop();
    }

    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    renderChatHistory();
}

function loadChatHistory() {
    const saved = localStorage.getItem('chatHistory');
    if (saved) {
        chatHistory = JSON.parse(saved);
        renderChatHistory();
    }
}

function renderChatHistory() {
    const historyList = document.getElementById('chatHistoryList');
    historyList.innerHTML = '';

    chatHistory.forEach(chat => {
        const item = document.createElement('div');
        item.className = 'chat-history-item';
        item.title = chat.title;
        item.innerHTML = `
            <span>📝</span> ${chat.title}
            <span style="font-size: 11px; color: var(--text-secondary);">${chat.timestamp}</span>
        `;
        item.addEventListener('click', () => loadChatFromHistory(chat.id));
        historyList.appendChild(item);
    });
}

function loadChatFromHistory(chatId) {
    const chat = chatHistory.find(c => c.id === chatId);
    if (!chat) return;

    // Clear current messages
    const container = document.getElementById('messagesContainer');
    container.innerHTML = '';

    // Load messages
    currentConversation = chat.messages;
    chat.messages.forEach(msg => {
        addMessageToUI(msg.content, msg.role === 'user' ? 'user' : 'ai');
    });

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

// ============= START NEW CHAT =============
function startNewChat() {
    currentConversation = [];
    const container = document.getElementById('messagesContainer');
    container.innerHTML = `
        <div class="message-group welcome">
            <div class="message ai-message">
                <div class="message-content">
                    <p>👋 Hello! I'm XYZ AI, your advanced chat assistant.</p>
                    <p>How can I help you today?</p>
                </div>
            </div>
        </div>
    `;

    document.getElementById('chatInput').focus();
}
