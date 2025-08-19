// AI Chat Pro - Main Application Logic
// This file contains the core functionality for the chat application

class ChatApp {
    constructor() {
        // Configuration
        this.API_KEY = 'AIzaSyBSZUCrHWZcopKuyp9bZ6vIc-XqiTFYyBQ'; // API key for GitHub Pages
        this.API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
        this.MAX_MESSAGES = 10000;
        this.STORAGE_KEY = 'ai_chat_messages';
        this.THEME_KEY = 'ai_chat_theme';
        
        // System prompt - can be modified by developers here
        this.SYSTEM_PROMPT = `Kamu adalah AI pintar yang menjawab dengan gaya santai, ramah, dan jelas. 
        Berikan respons yang helpful, akurat, dan mudah dipahami. 
        Jika diminta menjelaskan sesuatu yang kompleks, gunakan contoh atau analogi yang relatable.
        Selalu maintain tone yang positif dan supportive.`;
        
        // App state
        this.messages = [];
        this.isLoading = false;
        this.isOnline = navigator.onLine;
        
        // Initialize app
        this.initializeElements();
        this.loadMessages();
        this.loadTheme();
        this.setupEventListeners();
        this.updateUI();
        this.autoResize();
        
        console.log('AI Chat Pro initialized successfully');
    }
    
    // Initialize DOM elements
    initializeElements() {
        this.elements = {
            chatMessages: document.getElementById('chatMessages'),
            messageInput: document.getElementById('messageInput'),
            sendButton: document.getElementById('sendButton'),
            loadingIndicator: document.getElementById('loadingIndicator'),
            statusDot: document.getElementById('statusDot'),
            statusText: document.getElementById('statusText'),
            themeToggle: document.getElementById('themeToggle'),
            themeIcon: document.getElementById('themeIcon'),
            charCounter: document.getElementById('charCounter'),
            memoryInfo: document.getElementById('memoryInfo'),
            errorToast: document.getElementById('errorToast'),
            errorMessage: document.getElementById('errorMessage'),
            closeToast: document.getElementById('closeToast')
        };
    }
    
    // Setup all event listeners
    setupEventListeners() {
        // Send message events
        this.elements.sendButton.addEventListener('click', () => this.sendMessage());
        this.elements.messageInput.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.elements.messageInput.addEventListener('input', () => this.handleInputChange());
        
        // Theme toggle
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // Online/offline status
        window.addEventListener('online', () => this.updateOnlineStatus(true));
        window.addEventListener('offline', () => this.updateOnlineStatus(false));
        
        // Error toast close
        this.elements.closeToast.addEventListener('click', () => this.hideErrorToast());
        
        // Auto-hide error toast after 5 seconds
        let errorToastTimeout;
        const showErrorToast = this.showErrorToast.bind(this);
        this.showErrorToast = (message) => {
            showErrorToast(message);
            clearTimeout(errorToastTimeout);
            errorToastTimeout = setTimeout(() => this.hideErrorToast(), 5000);
        };
    }
    
    // Handle keyboard input
    handleKeyDown(e) {
        if (e.key === 'Enter') {
            if (e.shiftKey) {
                // Shift+Enter: add new line (default behavior)
                return;
            } else {
                // Enter: send message
                e.preventDefault();
                this.sendMessage();
            }
        }
    }
    
    // Handle input changes (character counter, auto-resize)
    handleInputChange() {
        const input = this.elements.messageInput;
        const length = input.value.length;
        
        // Update character counter
        this.elements.charCounter.textContent = `${length}/2000`;
        
        // Auto-resize textarea
        this.autoResize();
        
        // Update send button state
        this.elements.sendButton.disabled = length === 0 || this.isLoading;
    }
    
    // Auto-resize textarea based on content
    autoResize() {
        const input = this.elements.messageInput;
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    }
    
    // Send message to AI
    async sendMessage() {
        const input = this.elements.messageInput;
        const message = input.value.trim();
        
        if (!message || this.isLoading) return;
        
        // Check online status
        if (!this.isOnline) {
            this.showErrorToast('No internet connection. Please check your network and try again.');
            return;
        }
        
        // Add user message
        this.addMessage(message, 'user');
        input.value = '';
        this.handleInputChange();
        
        // Show loading state
        this.setLoading(true);
        
        try {
            // Prepare conversation context
            const conversationHistory = this.prepareConversationHistory();
            
            // Make API call
            const response = await this.callGeminiAPI(conversationHistory, message);
            
            // Add AI response
            this.addMessage(response, 'ai');
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.showErrorToast('Failed to get AI response. Please try again.');
            
            // Remove user message if API call failed
            if (this.messages.length > 0 && this.messages[this.messages.length - 1].type === 'user') {
                this.messages.pop();
                this.saveMessages();
                this.renderMessages();
            }
        } finally {
            this.setLoading(false);
        }
    }
    
    // Prepare conversation history for API call
    prepareConversationHistory() {
        // Get recent messages for context (limit to last 20 exchanges to manage token usage)
        const recentMessages = this.messages.slice(-40);
        
        const contents = [];
        
        // Add system instruction
        contents.push({
            role: 'user',
            parts: [{ text: this.SYSTEM_PROMPT }]
        });
        
        contents.push({
            role: 'model',
            parts: [{ text: 'Understood. I will respond in a friendly, casual, and clear manner as requested.' }]
        });
        
        // Add conversation history
        recentMessages.forEach(msg => {
            if (msg.type === 'user') {
                contents.push({
                    role: 'user',
                    parts: [{ text: msg.content }]
                });
            } else if (msg.type === 'ai') {
                contents.push({
                    role: 'model',
                    parts: [{ text: msg.content }]
                });
            }
        });
        
        return contents;
    }
    
    // Call Gemini API directly (for GitHub Pages)
    async callGeminiAPI(conversationHistory, newMessage) {
        const requestBody = {
            contents: [
                ...conversationHistory,
                {
                    role: 'user',
                    parts: [{ text: newMessage }]
                }
            ],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
            },
            safetySettings: [
                {
                    category: 'HARM_CATEGORY_HARASSMENT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                    category: 'HARM_CATEGORY_HATE_SPEECH',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                    category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                }
            ]
        };
        
        const response = await fetch(`${this.API_URL}?key=${this.API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }
        
        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Invalid response format from API');
        }
        
        return data.candidates[0].content.parts[0].text;
    }
    
    // Add message to conversation
    addMessage(content, type) {
        const message = {
            id: Date.now() + Math.random(),
            content,
            type,
            timestamp: new Date().toISOString()
        };
        
        this.messages.push(message);
        
        // Manage memory limit
        if (this.messages.length > this.MAX_MESSAGES) {
            this.messages = this.messages.slice(-this.MAX_MESSAGES);
        }
        
        this.saveMessages();
        this.renderMessages();
        this.updateMemoryInfo();
        
        // Auto-scroll to bottom
        setTimeout(() => this.scrollToBottom(), 100);
    }
    
    // Render all messages
    renderMessages() {
        const container = this.elements.chatMessages;
        
        if (this.messages.length === 0) {
            // Show welcome message if no messages
            container.innerHTML = `
                <div class="welcome-message">
                    <div class="welcome-content">
                        <i data-feather="message-circle"></i>
                        <h3>Welcome to AI Chat Pro</h3>
                        <p>Start a conversation with our AI assistant powered by Gemini 2.0 Flash</p>
                    </div>
                </div>
            `;
            feather.replace();
            return;
        }
        
        container.innerHTML = '';
        
        this.messages.forEach(message => {
            const messageEl = this.createMessageElement(message);
            container.appendChild(messageEl);
        });
        
        feather.replace();
    }
    
    // Create individual message element
    createMessageElement(message) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${message.type}`;
        messageEl.innerHTML = `
            <div class="message-bubble">
                ${this.formatMessageContent(message.content)}
                <small class="message-time">${this.formatTime(message.timestamp)}</small>
            </div>
        `;
        return messageEl;
    }
    
    // Format message content (handle line breaks, etc.)
    formatMessageContent(content) {
        return content
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    }
    
    // Format timestamp for display
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
        });
    }
    
    // Scroll chat to bottom
    scrollToBottom() {
        const container = this.elements.chatMessages;
        container.scrollTop = container.scrollHeight;
    }
    
    // Set loading state
    setLoading(loading) {
        this.isLoading = loading;
        this.elements.loadingIndicator.style.display = loading ? 'flex' : 'none';
        this.elements.sendButton.disabled = loading || this.elements.messageInput.value.trim() === '';
        this.elements.messageInput.disabled = loading;
        
        if (loading) {
            this.scrollToBottom();
        }
    }
    
    // Update online/offline status
    updateOnlineStatus(online) {
        this.isOnline = online;
        this.elements.statusDot.className = `status-dot ${online ? '' : 'offline'}`;
        this.elements.statusText.textContent = online ? 'Online' : 'Offline';
        
        if (!online) {
            this.showErrorToast('Connection lost. Please check your internet connection.');
        }
    }
    
    // Theme management
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem(this.THEME_KEY, newTheme);
        
        // Update theme icon
        const iconName = newTheme === 'dark' ? 'moon' : 'sun';
        this.elements.themeIcon.setAttribute('data-feather', iconName);
        feather.replace();
    }
    
    // Load saved theme
    loadTheme() {
        const savedTheme = localStorage.getItem(this.THEME_KEY) || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        // Update theme icon
        const iconName = savedTheme === 'dark' ? 'moon' : 'sun';
        this.elements.themeIcon.setAttribute('data-feather', iconName);
    }
    
    // Save messages to localStorage
    saveMessages() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.messages));
        } catch (error) {
            console.error('Failed to save messages:', error);
            this.showErrorToast('Failed to save conversation. Storage may be full.');
        }
    }
    
    // Load messages from localStorage
    loadMessages() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                this.messages = JSON.parse(saved);
                
                // Validate and clean up loaded messages
                this.messages = this.messages.filter(msg => 
                    msg && msg.content && msg.type && msg.timestamp
                );
                
                // Ensure memory limit
                if (this.messages.length > this.MAX_MESSAGES) {
                    this.messages = this.messages.slice(-this.MAX_MESSAGES);
                    this.saveMessages();
                }
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
            this.messages = [];
        }
    }
    
    // Update memory info display
    updateMemoryInfo() {
        this.elements.memoryInfo.textContent = `Memory: ${this.messages.length}/${this.MAX_MESSAGES}`;
    }
    
    // Update UI components
    updateUI() {
        this.renderMessages();
        this.updateMemoryInfo();
        this.updateOnlineStatus(this.isOnline);
        this.handleInputChange();
    }
    
    // Show error toast
    showErrorToast(message) {
        this.elements.errorMessage.textContent = message;
        this.elements.errorToast.style.display = 'flex';
        feather.replace();
    }
    
    // Hide error toast
    hideErrorToast() {
        this.elements.errorToast.style.display = 'none';
    }
    
    // Clear all messages (for future use)
    clearMessages() {
        this.messages = [];
        this.saveMessages();
        this.renderMessages();
        this.updateMemoryInfo();
    }
    
    // Export messages (for future use)
    exportMessages() {
        const data = {
            messages: this.messages,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-chat-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chatApp = new ChatApp();
});

// Handle page visibility change (pause/resume)
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && window.chatApp) {
        window.chatApp.updateOnlineStatus(navigator.onLine);
    }
});
