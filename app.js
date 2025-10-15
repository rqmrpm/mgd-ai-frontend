document.addEventListener('DOMContentLoaded', () => {
    // =================================================================================
    // --- 1. CONFIGURATION & STATE ---
    // =================================================================================
    
    const API_BASE_URL = 'https://mgd-ai-worker.mgdwork12119241.workers.dev';
    const appContainer = document.getElementById('app-container');

    let state = {
        isLoggedIn: true, 
        currentUser: { userId: '1', username: 'TestUser' },
        showSidebar: false,
        currentMode: 'chat',
        conversations: [],
        currentConversationId: null,
        messages: [],
        apiKeys: [],
        isLoading: false,
        modals: {
            showSettings: false,
            showAPIManager: false,
        }
    };

    // =================================================================================
    // --- 2. API HELPERS ---
    // =================================================================================

    const api = {
        _call: async (endpoint, method, body = null) => {
            const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.currentUser.userId}` };
            const options = { method, headers, body: body ? JSON.stringify(body) : null };
            try {
                const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || `خطأ ${response.status}`);
                return data;
            } catch (error) {
                console.error(`API call to ${endpoint} failed:`, error);
                alert(`فشل الاتصال بالخادم: ${error.message}`);
                throw error;
            }
        },
        getKeys: () => api._call('/api/keys', 'GET'),
        addKey: (keyData) => api._call('/api/keys', 'POST', keyData),
        deleteKey: (keyId) => api._call(`/api/keys/${keyId}`, 'DELETE'),
        sendMessage: (messages, conversationId) => api._call('/api/chat', 'POST', { messages, conversationId }),
        getConversations: () => api._call('/api/conversations', 'GET'),
        getMessages: (convId) => api._call(`/api/conversations/${convId}`, 'GET'),
    };

    // =================================================================================
    // --- 3. RENDER FUNCTIONS ---
    // =================================================================================

    function render() {
        appContainer.innerHTML = getHTML_MainInterface();
        renderMessages();
        renderConversations();
        renderModals();
        attachMainListeners();
        lucide.createIcons();
    }
    
    function renderModals() {
        document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
        if (state.modals.showAPIManager) {
            appContainer.insertAdjacentHTML('beforeend', getHTML_APIManagerModal());
            attachAPIManagerListeners();
        }
        if (state.modals.showSettings) {
            appContainer.insertAdjacentHTML('beforeend', getHTML_SettingsModal());
            attachSettingsListeners();
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
        state.messages.forEach(msg => { messagesHTML += getHTML_MessageBubble(msg); });
        if (state.isLoading) { messagesHTML += getHTML_ThinkingIndicator(); }
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
        listEl.querySelectorAll('.conv-button').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                await handleSelectConversation(e.currentTarget.dataset.convId);
            });
        });
    }

    // =================================================================================
    // --- 4. HTML TEMPLATES ---
    // =================================================================================

    function getHTML_MainInterface() {
        const { showSidebar, currentMode } = state;
        return `
            <div class="sidebar-overlay ${showSidebar ? '' : 'hidden'}"></div>
            <div class="sidebar ${showSidebar ? '' : 'hidden'}">
                <div class="sidebar-header"><button id="new-chat-btn" class="sidebar-button new-chat-btn"><i data-lucide="plus"></i> <span>محادثة جديدة</span></button></div>
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
            </div>`;
    }

    function getHTML_APIManagerModal() {
        let keysHTML = state.apiKeys.length === 0
            ? `<p style="text-align:center; color: var(--gray-500); padding: 2rem 0;">لم تقم بإضافة أي مفاتيح بعد</p>`
            : state.apiKeys.map(key => `
                <div class="api-key-item" data-key-id="${key.id}">
                    <div class="api-key-info">
                        <div class="name">${key.custom_name}</div>
                        <div class="type">${key.key_type} - ${key.key_function}</div>
                        <div class="key-preview">${key.api_key.substring(0, 4)}...${key.api_key.slice(-4)}</div>
                    </div>
                    <div class="api-key-actions">
                        <button class="delete-btn"><i data-lucide="trash-2"></i></button>
                    </div>
                </div>`).join('');

        return `
            <div class="modal-overlay" data-modal-id="api-manager">
                <div class="modal-content api-manager-modal">
                    <div class="modal-header">
                        <h2 class="modal-title">إدارة مفاتيح APIs</h2>
                        <button class="modal-close-btn"><i data-lucide="x"></i></button>
                    </div>
                    <div class="modal-body">
                        <form id="api-key-form" class="api-key-form">
                            <h3>إضافة مفتاح جديد</h3>
                            <div class="form-group"><input type="text" id="key-name" placeholder="اسم المفتاح (مثال: My Groq)" required></div>
                            <div class="form-group"><select id="key-type" required><option value="">اختر النوع</option><option value="معالجة">معالجة</option><option value="تخزين">تخزين</option><option value="فعل">فعل</option></select></div>
                            <div class="form-group"><input type="text" id="key-function" placeholder="الوظيفة (مثال: Groq, OpenAI, GitHub)" required></div>
                            <div class="form-group"><input type="text" id="key-value" placeholder="قيمة المفتاح (sk-...)" required></div>
                            <div class="form-group"><textarea id="key-prompt" placeholder="شخصية المساعد (اختياري)" rows="2"></textarea></div>
                            <button type="submit">إضافة المفتاح</button>
                        </form>
                        <div class="api-key-list"><h3>المفاتيح المضافة:</h3><div id="api-keys-container">${keysHTML}</div></div>
                    </div>
                </div>
            </div>`;
    }

    function getHTML_SettingsModal() {
        return `
            <div class="modal-overlay" data-modal-id="settings">
                <div class="modal-content settings-modal">
                    <div class="modal-header">
                        <h2 class="modal-title">الإعدادات</h2>
                        <button class="modal-close-btn"><i data-lucide="x"></i></button>
                    </div>
                    <div class="modal-body">
                        <div class="info-box">
                            <p><strong>اسم المستخدم:</strong> ${state.currentUser.username}</p>
                        </div>
                        <p style="margin-top: 1rem; color: var(--gray-600);">سيتم إضافة المزيد من الإعدادات هنا مستقبلاً.</p>
                    </div>
                </div>
            </div>`;
    }
    
    function getHTML_EmptyChat() { return `<div class="empty-chat"><div><svg width="120" height="120" viewBox="0 0 200 200" style="margin: 0 auto 1rem;"><text x="100" y="120" font-size="90" font-weight="bold" text-anchor="middle" fill="#000">m.ai</text></svg><h2>كيف يمكنني مساعدتك؟</h2><p>ابدأ بكتابة رسالة في الأسفل.</p></div></div>`; }
    function getHTML_MessageBubble(msg) { const content = (msg.content || '').replace(/</g, "&lt;").replace(/>/g, "&gt;"); return `<div class="message-wrapper ${msg.role}">${msg.role === 'assistant' ? `<div class="assistant-header"><div class="assistant-avatar">m</div><span class="assistant-name">m.ai</span></div>` : ''}<div class="message-bubble">${content}</div></div>`; }
    function getHTML_ThinkingIndicator() { return `<div class="message-wrapper assistant"><div class="thinking-indicator"><div class="assistant-avatar"><i data-lucide="loader-circle" class="thinking-spinner"></i></div><span class="assistant-name">يفكر...</span></div></div>`; }
    function getHTML_ConversationItem(conv) { const isActive = conv.conversation_id === state.currentConversationId; return `<button class="sidebar-button conv-button ${isActive ? 'active' : ''}" data-conv-id="${conv.conversation_id}"><div><div class="conv-title">${conv.title}</div><div class="conv-date">${new Date(conv.updated_at).toLocaleDateString('ar')}</div></div></button>`; }

    // =================================================================================
    // --- 5. EVENT HANDLERS & LOGIC ---
    // =================================================================================

    function attachMainListeners() {
        document.getElementById('menu-btn').addEventListener('click', toggleSidebar);
        document.querySelector('.sidebar-overlay').addEventListener('click', toggleSidebar);
        document.getElementById('api-manager-btn').addEventListener('click', openAPIManager);
        document.getElementById('settings-btn').addEventListener('click', openSettings);
        document.getElementById('new-chat-btn').addEventListener('click', handleNewConversation);
        const messageInput = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-btn');
        messageInput.addEventListener('input', () => {
            sendBtn.disabled = messageInput.value.trim().length === 0;
            messageInput.style.height = 'auto';
            messageInput.style.height = `${messageInput.scrollHeight}px`;
        });
        document.getElementById('message-form').addEventListener('submit', (e) => { e.preventDefault(); handleSendMessage(); });
    }

    function toggleSidebar() {
        state.showSidebar = !state.showSidebar;
        document.querySelector('.sidebar').classList.toggle('hidden');
        document.querySelector('.sidebar-overlay').classList.toggle('hidden');
    }

    async function openAPIManager() {
        state.modals.showAPIManager = true;
        render(); // Render the modal structure first
        try {
            const data = await api.getKeys();
            state.apiKeys = data.keys || [];
            render(); // Re-render to populate the modal with keys
        } catch (e) { /* error already alerted */ }
    }

    function openSettings() {
        state.modals.showSettings = true;
        render();
    }

    function closeModal(modalId) {
        if (modalId === 'api-manager') state.modals.showAPIManager = false;
        if (modalId === 'settings') state.modals.showSettings = false;
        render();
    }

    function attachAPIManagerListeners() {
        const modal = document.querySelector('[data-modal-id="api-manager"]');
        modal.querySelector('.modal-close-btn').addEventListener('click', () => closeModal('api-manager'));
        
        modal.querySelector('#api-key-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const keyData = {
                custom_name: form.querySelector('#key-name').value,
                key_type: form.querySelector('#key-type').value,
                key_function: form.querySelector('#key-function').value,
                api_key: form.querySelector('#key-value').value,
                personality_prompt: form.querySelector('#key-prompt').value,
            };
            if (!keyData.custom_name || !keyData.key_type || !keyData.key_function || !keyData.api_key) {
                return alert('الرجاء ملء الحقول الإجبارية');
            }
            try {
                const newKey = await api.addKey(keyData);
                state.apiKeys.push({ ...keyData, id: newKey.id });
                render();
            } catch (err) { /* error already alerted */ }
        });

        modal.querySelectorAll('.api-key-item').forEach(item => {
            item.querySelector('.delete-btn').addEventListener('click', async (e) => {
                const keyId = item.dataset.keyId;
                if (confirm('هل أنت متأكد من حذف هذا المفتاح؟')) {
                    try {
                        await api.deleteKey(keyId);
                        state.apiKeys = state.apiKeys.filter(k => k.id != keyId);
                        render();
                    } catch (err) { /* error already alerted */ }
                }
            });
        });
    }

    function attachSettingsListeners() {
        const modal = document.querySelector('[data-modal-id="settings"]');
        modal.querySelector('.modal-close-btn').addEventListener('click', () => closeModal('settings'));
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
        state.currentConversationId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        state.messages = [];
        state.conversations.unshift({ conversation_id: state.currentConversationId, title: 'محادثة جديدة', updated_at: new Date().toISOString() });
        render();
    }

    async function handleSelectConversation(convId) {
        if (state.currentConversationId === convId) return;
        state.currentConversationId = convId;
        state.isLoading = true;
        render();
        try {
            const data = await api.getMessages(convId);
            state.messages = data.messages || [];
        } catch(error) { state.messages = []; } 
        finally {
            state.isLoading = false;
            render();
        }
    }

    async function initializeUserSession() {
        try {
            const data = await api.getConversations();
            state.conversations = data.conversations || [];
            if (state.conversations.length > 0) {
                await handleSelectConversation(state.conversations[0].conversation_id);
            } else {
                await handleNewConversation();
            }
        } catch (error) {
            await handleNewConversation();
        }
    }

    // =================================================================================
    // --- 6. INITIALIZATION ---
    // =================================================================================
    
    async function init() {
        await initializeUserSession();
    }

    init();
});
