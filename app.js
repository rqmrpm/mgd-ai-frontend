document.addEventListener('DOMContentLoaded', () => {
    // =================================================================================
    // --- 1. CONFIGURATION & STATE ---
    // =================================================================================
    
    const API_BASE_URL = 'https://mgd-ai-worker.mgdwork12119241.workers.dev';
    const appContainer = document.getElementById('app-container');

    let state = {
        isLoggedIn: false,
        currentUser: null, // { userId, username }
        showSidebar: window.innerWidth > 768,
        currentMode: 'chat', // 'chat' or 'agent'
        conversations: [],
        currentConversationId: null,
        messages: [],
        apiKeys: [],
        isLoading: false,
        // Modal states
        modals: {
            showSettings: false,
            showAPIManager: false,
            showAPIProviders: false,
        }
    };

    // =================================================================================
    // --- 2. API HELPERS (The Bridge to Your Worker) ---
    // =================================================================================

    const api = {
        _call: async (endpoint, method, body = null) => {
            const headers = { 'Content-Type': 'application/json' };
            // Get user ID from state for authenticated requests
            const userId = localStorage.getItem('userId');
            if (userId) {
                headers['Authorization'] = `Bearer ${userId}`;
            }

            const options = { method, headers };
            if (body) options.body = JSON.stringify(body);

            try {
                const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || `خطأ ${response.status}`);
                }
                return data;
            } catch (error) {
                console.error(`API call to ${endpoint} failed:`, error);
                alert(`فشل الاتصال بالخادم: ${error.message}`);
                throw error;
            }
        },
        auth: (action, username, whatsapp_number) => api._call(`/auth/${action}`, 'POST', { username, whatsapp_number }),
        getKeys: () => api._call('/api/keys', 'GET'),
        addKey: (keyData) => api._call('/api/keys', 'POST', keyData),
        deleteKey: (keyId) => api._call(`/api/keys/${keyId}`, 'DELETE'),
        sendMessage: (messages, conversationId) => api._call('/api/chat', 'POST', { messages, conversationId }),
        getConversations: () => api._call('/api/conversations', 'GET'),
        getMessages: (convId) => api._call(`/api/conversations/${convId}`, 'GET'),
    };

    // =================================================================================
    // --- 3. RENDER FUNCTIONS (Building the UI) ---
    // =================================================================================

    function render() {
        appContainer.innerHTML = '';
        appContainer.className = '';

        if (state.isLoggedIn) {
            appContainer.innerHTML = getHTML_MainInterface();
            renderMessages();
            renderConversations();
            attachMainListeners();
        } else {
            appContainer.innerHTML = getHTML_AuthScreen();
            attachAuthListeners();
        }
        lucide.createIcons();
    }
    
    function renderMessages() {
        const messagesArea = document.getElementById('messages-area');
        if (!messagesArea) return;

        if (state.messages.length === 0 && !state.isLoading) {
            messagesArea.innerHTML = getHTML_EmptyChat();
            return;
        }

        let messagesHTML = '<div class="messages-container">';
        state.messages.forEach(msg => {
            messagesHTML += getHTML_MessageBubble(msg);
        });

        if (state.isLoading) {
            messagesHTML += getHTML_ThinkingIndicator();
        }
        messagesHTML += '</div>';
        messagesArea.innerHTML = messagesHTML;
        lucide.createIcons();
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    function renderConversations() {
        const listEl = document.getElementById('conversations-list');
        if (!listEl) return;
        if (state.conversations.length === 0) {
            listEl.innerHTML = '<p class="no-convs">لا توجد محادثات سابقة</p>';
            return;
        }
        listEl.innerHTML = state.conversations.map(conv => getHTML_ConversationItem(conv)).join('');
        
        // Attach listeners to new conversation items
        listEl.querySelectorAll('.conv-button').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const convId = e.currentTarget.dataset.convId;
                await handleSelectConversation(convId);
            });
        });
    }
    
    // ... (Add other render functions for modals if needed)

    // =================================================================================
    // --- 4. HTML TEMPLATES (The building blocks of the UI) ---
    // =================================================================================

    function getHTML_AuthScreen() {
        return `
            <div class="auth-screen">
                <div class="auth-container">
                    <div class="auth-header">
                        <div class="auth-logo"><svg width="80" height="80" viewBox="0 0 200 200"><text x="100" y="100" font-size="90" font-weight="bold" text-anchor="middle" fill="#000">m.ai</text></svg></div>
                        <h1 class="auth-title">مرحباً بك في m.ai</h1>
                        <p class="auth-subtitle">مساعدك الذكي المدعوم بالذكاء الصناعي</p>
                    </div>
                    <div class="auth-box">
                        <h2 id="auth-title">تسجيل الدخول</h2>
                        <div class="auth-form-group">
                            <label for="username">اسم المستخدم</label>
                            <input type="text" id="username-input" class="auth-input" placeholder="أدخل اسم المستخدم">
                        </div>
                        <div class="auth-form-group">
                            <label for="whatsapp">رقم الواتساب</label>
                            <input type="tel" id="whatsapp-input" class="auth-input" placeholder="+963...">
                        </div>
                        <button id="auth-btn" class="auth-button">تسجيل الدخول</button>
                        <div style="text-align: center; margin-top: 1rem;">
                            <button id="toggle-auth-btn" class="auth-toggle-button">ليس لديك حساب؟ سجل الآن</button>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    function getHTML_MainInterface() {
        const { showSidebar, currentMode } = state;
        return `
            <div class="main-interface">
                <div class="sidebar ${showSidebar ? '' : 'hidden'}">
                    <div class="sidebar-header">
                        <button id="new-chat-btn" class="sidebar-button new-chat-btn"><i data-lucide="plus"></i> <span>محادثة جديدة</span></button>
                    </div>
                    <div class="sidebar-content" id="conversations-list"></div>
                    <div class="sidebar-footer">
                        <div class="space-y-2">
                            <button id="mode-switch-btn" class="sidebar-button"><i data-lucide="${currentMode === 'chat' ? 'bot' : 'terminal-square'}"></i><span>${currentMode === 'chat' ? 'وضع المحادثة' : 'وضع الوكيل'}</span></button>
                            <button id="api-manager-btn" class="sidebar-button"><i data-lucide="key-round"></i> <span>إدارة APIs</span></button>
                            <button id="settings-btn" class="sidebar-button"><i data-lucide="settings"></i> <span>الإعدادات</span></button>
                        </div>
                        <div class="username-display">${state.currentUser.username}</div>
                    </div>
                </div>
                <div class="main-content">
                    <div class="main-header">
                        <button id="menu-btn" class="menu-button"><i data-lucide="menu"></i></button>
                        <div class="logo-header"><svg width="32" height="32" viewBox="0 0 200 200"><text x="100" y="120" font-size="90" font-weight="bold" text-anchor="middle" fill="#000">m.ai</text></svg></div>
                        <div style="width: 40px;"></div>
                    </div>
                    <div class="messages-area" id="messages-area"></div>
                    <div class="input-area">
                        <div class="input-container">
                            <form id="message-form" class="input-form">
                                <textarea id="message-input" class="input-textarea" placeholder="اكتب رسالتك هنا..." rows="1"></textarea>
                                <button id="send-btn" type="submit" class="send-button" disabled><i data-lucide="send"></i></button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    function getHTML_EmptyChat() {
        return `<div class="empty-chat"><div><svg width="120" height="120" viewBox="0 0 200 200" style="margin: 0 auto 1rem;"><text x="100" y="120" font-size="90" font-weight="bold" text-anchor="middle" fill="#000">m.ai</text></svg><h2>كيف يمكنني مساعدتك؟</h2><p>ابدأ بكتابة رسالة في الأسفل.</p></div></div>`;
    }

    function getHTML_MessageBubble(msg) {
        const content = msg.content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `
            <div class="message-wrapper ${msg.role}">
                ${msg.role === 'assistant' ? `<div class="assistant-header"><div class="assistant-avatar">m</div><span class="assistant-name">m.ai</span></div>` : ''}
                <div class="message-bubble">${content}</div>
            </div>`;
    }

    function getHTML_ThinkingIndicator() {
        return `<div class="message-wrapper assistant"><div class="thinking-indicator"><div class="assistant-avatar"><i data-lucide="loader-circle" class="thinking-spinner"></i></div><span class="assistant-name">يفكر...</span></div></div>`;
    }
    
    function getHTML_ConversationItem(conv) {
        const isActive = conv.conversation_id === state.currentConversationId;
        return `<button class="sidebar-button conv-button ${isActive ? 'active' : ''}" data-conv-id="${conv.conversation_id}"><div><div class="conv-title">${conv.title}</div><div class="conv-date">${new Date(conv.updated_at).toLocaleDateString('ar')}</div></div></button>`;
    }

    // =================================================================================
    // --- 5. EVENT HANDLERS & LOGIC ---
    // =================================================================================

    function attachAuthListeners() {
        const toggleBtn = document.getElementById('toggle-auth-btn');
        const authBtn = document.getElementById('auth-btn');
        const authTitle = document.getElementById('auth-title');
        let isRegistering = false;

        toggleBtn.addEventListener('click', () => {
            isRegistering = !isRegistering;
            authTitle.innerText = isRegistering ? 'إنشاء حساب جديد' : 'تسجيل الدخول';
            authBtn.innerText = isRegistering ? 'إنشاء حساب' : 'تسجيل الدخول';
            toggleBtn.innerText = isRegistering ? 'لديك حساب؟ سجل الدخول' : 'ليس لديك حساب؟ سجل الآن';
        });

        authBtn.addEventListener('click', async () => {
            const username = document.getElementById('username-input').value.trim();
            const whatsapp_number = document.getElementById('whatsapp-input').value.trim();

            if (!username || !whatsapp_number) return alert('الرجاء ملء جميع الحقول.');

            authBtn.disabled = true;
            authBtn.innerText = 'جاري التحقق...';

            try {
                const action = isRegistering ? 'register' : 'login';
                const data = await api.auth(action, username, whatsapp_number);
                
                // Save user info to localStorage for persistence
                localStorage.setItem('userId', data.userId);
                localStorage.setItem('username', data.username);
                
                await initializeUserSession();

            } catch (error) {
                // Error is already alerted by api._call
            } finally {
                authBtn.disabled = false;
                authBtn.innerText = isRegistering ? 'إنشاء حساب' : 'تسجيل الدخول';
            }
        });
    }

    function attachMainListeners() {
        document.getElementById('menu-btn').addEventListener('click', () => {
            state.showSidebar = !state.showSidebar;
            document.querySelector('.sidebar').classList.toggle('hidden');
        });
        
        document.getElementById('new-chat-btn').addEventListener('click', handleNewConversation);

        const messageInput = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-btn');
        
        messageInput.addEventListener('input', () => {
            sendBtn.disabled = messageInput.value.trim().length === 0;
            // Auto-resize textarea
            messageInput.style.height = 'auto';
            messageInput.style.height = `${messageInput.scrollHeight}px`;
        });

        document.getElementById('message-form').addEventListener('submit', (e) => {
            e.preventDefault();
            handleSendMessage();
        });
        
        // Add listeners for settings, api manager etc. later
    }

    async function handleSendMessage() {
        const messageInput = document.getElementById('message-input');
        const content = messageInput.value.trim();
        if (!content || state.isLoading) return;

        const userMessage = { role: 'user', content };
        state.messages.push(userMessage);
        state.isLoading = true;
        messageInput.value = '';
        messageInput.style.height = 'auto';
        document.getElementById('send-btn').disabled = true;
        
        renderMessages();

        try {
            const assistantResponse = await api.sendMessage(state.messages, state.currentConversationId);
            state.messages.push(assistantResponse);
        } catch (error) {
            state.messages.push({ role: 'assistant', content: `عذراً، حدث خطأ: ${error.message}` });
        } finally {
            state.isLoading = false;
            renderMessages();
        }
    }
    
    async function handleNewConversation() {
        // Generate a unique ID for the new conversation
        state.currentConversationId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        state.messages = [];
        state.conversations.unshift({
            conversation_id: state.currentConversationId,
            title: 'محادثة جديدة',
            updated_at: new Date().toISOString()
        });
        render();
    }
    
    async function handleSelectConversation(convId) {
        if (state.currentConversationId === convId) return;
        
        state.currentConversationId = convId;
        state.isLoading = true;
        render(); // Re-render to show active conversation and loading state for messages
        
        try {
            const data = await api.getMessages(convId);
            state.messages = data.messages || [];
        } catch(error) {
            alert('فشل في جلب الرسائل');
            state.messages = [];
        } finally {
            state.isLoading = false;
            render(); // Re-render with the loaded messages
        }
    }

    async function initializeUserSession() {
        state.isLoggedIn = true;
        state.currentUser = {
            userId: localStorage.getItem('userId'),
            username: localStorage.getItem('username')
        };
        
        try {
            const data = await api.getConversations();
            state.conversations = data.conversations || [];
            if (state.conversations.length > 0) {
                // Load the most recent conversation
                await handleSelectConversation(state.conversations[0].conversation_id);
            } else {
                // Or start a new one
                await handleNewConversation();
            }
        } catch (error) {
            alert('فشل في جلب المحادثات السابقة. سنبدأ محادثة جديدة.');
            await handleNewConversation();
        }
    }

    // =================================================================================
    // --- 6. INITIALIZATION ---
    // =================================================================================
    
    async function init() {
        const userId = localStorage.getItem('userId');
        if (userId) {
            await initializeUserSession();
        } else {
            render();
        }
    }

    init();
});
