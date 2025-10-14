document.addEventListener('DOMContentLoaded', () => {
    const appContainer = document.getElementById('app-container');
    
    // --- CONFIGURATION ---
    // !!! هام جداً: استبدل هذا الرابط برابط العامل الخاص بك بعد نشره !!!
    const API_BASE_URL = 'https://mgd-ai-worker.your-subdomain.workers.dev'; 
    
    // --- STATE MANAGEMENT ---
    let state = {
        isLoggedIn: false,
        currentUser: null, // { userId, username }
        showSidebar: true,
        currentMode: 'chat', // 'chat' or 'agent'
        conversations: [],
        currentConversationId: null,
        messages: [],
        apiKeys: [],
        isLoading: false,
        // Auth screen state
        authScreen: {
            isRegistering: false,
            username: '',
            whatsappNumber: ''
        },
        // Modal states
        modals: {
            showSettings: false,
            showAPIManager: false,
            showAPIProviders: false,
        }
    };

    // --- API HELPERS ---
    const api = {
        _call: async (endpoint, method, body = null, requiresAuth = false) => {
            const headers = { 'Content-Type': 'application/json' };
            if (requiresAuth && state.currentUser?.userId) {
                headers['Authorization'] = `Bearer ${state.currentUser.userId}`;
            }

            const options = {
                method,
                headers,
            };

            if (body) {
                options.body = JSON.stringify(body);
            }

            try {
                const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
                return response.json();
            } catch (error) {
                console.error(`API call to ${endpoint} failed:`, error);
                alert(`فشل الاتصال بالخادم: ${error.message}`);
                throw error;
            }
        },
        auth: (action, username, whatsapp_number) => api._call('/auth/login', 'POST', { action, username, whatsapp_number }),
        register: (username, whatsapp_number) => api._call('/auth/register', 'POST', { action: 'register', username, whatsapp_number }),
        getKeys: () => api._call('/api/keys', 'GET', null, true),
        addKey: (keyData) => api._call('/api/keys', 'POST', keyData, true),
        deleteKey: (keyId) => api._call(`/api/keys/${keyId}`, 'DELETE', null, true),
        sendMessage: (messages) => api._call('/api/chat', 'POST', { messages }, true),
    };

    // --- RENDER FUNCTIONS ---
    const render = () => {
        if (!state.isLoggedIn) {
            renderAuthScreen();
        } else {
            renderMainInterface();
        }
        renderModals();
    };

    const renderAuthScreen = () => {
        const { isRegistering, username, whatsappNumber } = state.authScreen;
        appContainer.innerHTML = `
            <div class="auth-screen">
                <div class="auth-container">
                    <div class="auth-header">
                        <div class="auth-logo">
                            <svg width="80" height="80" viewBox="0 0 200 200"><text x="100" y="100" font-size="90" font-weight="bold" text-anchor="middle" fill="#000">m.ai</text></svg>
                        </div>
                        <h1 class="auth-title">مرحباً بك في m.ai</h1>
                        <p class="auth-subtitle">مساعدك الذكي المدعوم بالذكاء الصناعي</p>
                    </div>
                    <div class="auth-box">
                        <h2>${isRegistering ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}</h2>
                        <div class="auth-form-group">
                            <label for="username">اسم المستخدم</label>
                            <input type="text" id="username" class="auth-input" value="${username}" placeholder="أدخل اسم المستخدم">
                        </div>
                        <div class="auth-form-group">
                            <label for="whatsapp">رقم الواتساب</label>
                            <input type="tel" id="whatsapp" class="auth-input" value="${whatsappNumber}" placeholder="+963...">
                        </div>
                        <button id="auth-btn" class="auth-button">${isRegistering ? 'إنشاء حساب' : 'تسجيل الدخول'}</button>
                        <div style="text-align: center; margin-top: 1rem;">
                            <button id="toggle-auth-btn" class="auth-toggle-button">
                                ${isRegistering ? 'لديك حساب؟ سجل الدخول' : 'ليس لديك حساب؟ سجل الآن'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        attachAuthListeners();
    };

    const renderMainInterface = () => {
        const { showSidebar, currentMode } = state;
        appContainer.innerHTML = `
            <div class="main-interface">
                <div class="sidebar ${showSidebar ? '' : 'hidden'}">
                    <div class="sidebar-header">
                        <button id="new-chat-btn" class="sidebar-button new-chat-btn">
                            <i data-lucide="plus"></i> <span>محادثة جديدة</span>
                        </button>
                    </div>
                    <div class="sidebar-content" id="conversations-list">
                        <!-- Conversations will be rendered here -->
                    </div>
                    <div class="sidebar-footer">
                        <div class="space-y-2">
                            <button id="mode-switch-btn" class="sidebar-button">
                                <i data-lucide="${currentMode === 'chat' ? 'bot' : 'terminal-square'}"></i>
                                <span>${currentMode === 'chat' ? 'وضع المحادثة' : 'وضع الوكيل'}</span>
                            </button>
                            <button id="api-manager-btn" class="sidebar-button">
                                <i data-lucide="key-round"></i> <span>إدارة APIs</span>
                            </button>
                            <button id="settings-btn" class="sidebar-button">
                                <i data-lucide="settings"></i> <span>الإعدادات</span>
                            </button>
                        </div>
                        <div class="username-display">${state.currentUser.username}</div>
                    </div>
                </div>
                <div class="main-content">
                    <div class="main-header">
                        <button id="menu-btn" class="menu-button"><i data-lucide="menu"></i></button>
                        <div class="flex items-center gap-2">
                            <svg width="32" height="32" viewBox="0 0 200 200"><text x="100" y="120" font-size="90" font-weight="bold" text-anchor="middle" fill="#000">m.ai</text></svg>
                        </div>
                        <div style="width: 40px;"></div>
                    </div>
                    <div class="messages-area" id="messages-area">
                        <!-- Messages will be rendered here -->
                    </div>
                    <div class="input-area">
                        <div class="input-container">
                            <form id="message-form" class="input-form">
                                <textarea id="message-input" class="input-textarea" placeholder="اكتب رسالتك هنا..." rows="1"></textarea>
                                <button id="send-btn" type="submit" class="send-button" disabled>
                                    <i data-lucide="send"></i>
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
        renderConversations();
        renderMessages();
        attachMainListeners();
    };
    
    const renderConversations = () => {
        const listEl = document.getElementById('conversations-list');
        if (!listEl) return;
        // This is a placeholder. Conversation management needs to be implemented.
        listEl.innerHTML = `
            <button class="sidebar-button conv-button active">
                <div>
                    <div class="conv-title">محادثة جديدة</div>
                    <div class="conv-date">${new Date().toLocaleDateString('ar')}</div>
                </div>
            </button>
        `;
    };

    const renderMessages = () => {
        const messagesArea = document.getElementById('messages-area');
        if (!messagesArea) return;

        if (state.messages.length === 0) {
            messagesArea.innerHTML = `
                <div class="empty-chat">
                    <div>
                        <svg width="120" height="120" viewBox="0 0 200 200" style="margin: 0 auto 1rem;"><text x="100" y="120" font-size="90" font-weight="bold" text-anchor="middle" fill="#000">m.ai</text></svg>
                        <h2 class="empty-chat-title">كيف يمكنني مساعدتك؟</h2>
                        <p class="empty-chat-subtitle">ابدأ محادثة جديدة أو اختر واحدة من القائمة</p>
                    </div>
                </div>`;
            return;
        }

        let messagesHTML = '<div class="messages-container">';
        state.messages.forEach(msg => {
            messagesHTML += `
                <div class="message-wrapper ${msg.role}">
                    ${msg.role === 'assistant' ? `
                        <div class="assistant-header">
                            <div class="assistant-avatar">m</div>
                            <span class="assistant-name">m.ai</span>
                        </div>
                    ` : ''}
                    <div class="message-bubble">${msg.content}</div>
                </div>
            `;
        });

        if (state.isLoading) {
            messagesHTML += `
                <div class="message-wrapper assistant">
                    <div class="thinking-indicator">
                        <div class="assistant-avatar">
                            <i data-lucide="loader-circle" class="thinking-spinner"></i>
                        </div>
                        <span class="assistant-name">يفكر...</span>
                    </div>
                </div>
            `;
        }
        messagesHTML += '</div>';
        messagesArea.innerHTML = messagesHTML;
        lucide.createIcons();
        messagesArea.scrollTop = messagesArea.scrollHeight;
    };

    const renderModals = () => {
        // Remove existing modals
        document.querySelectorAll('.modal-overlay').forEach(el => el.remove());

        if (state.modals.showAPIManager) renderAPIManagerModal();
        if (state.modals.showAPIProviders) renderAPIProvidersModal();
        if (state.modals.showSettings) renderSettingsModal();
        
        lucide.createIcons();
    };

    const renderAPIManagerModal = () => {
        let keysHTML = state.apiKeys.length === 0
            ? `<p style="text-align:center; color: var(--gray-500); padding: 2rem 0;">لم تقم بإضافة أي مفاتيح بعد</p>`
            : state.apiKeys.map(key => `
                <div class="api-key-item">
                    <div class="api-key-info">
                        <div class="name">${key.custom_name}</div>
                        <div class="type">${key.key_type} - ${key.key_function}</div>
                        <div class="key-preview">${key.api_key.substring(0, 4)}...${key.api_key.slice(-4)}</div>
                    </div>
                    <div class="api-key-actions">
                        <button class="delete-btn" data-key-id="${key.id}"><i data-lucide="trash-2"></i></button>
                    </div>
                </div>
            `).join('');

        const modalHTML = `
            <div class="modal-overlay" id="api-manager-overlay">
                <div class="modal-content api-manager-modal">
                    <div class="modal-header">
                        <h2 class="modal-title">إدارة مفاتيح APIs</h2>
                        <button class="modal-close-btn" data-modal="showAPIManager"><i data-lucide="x"></i></button>
                    </div>
                    <div class="modal-body">
                        <button id="show-providers-btn" class="api-providers-btn">
                            <i data-lucide="external-link"></i> <span>عرض مزودي خدمات APIs</span>
                        </button>
                        <form id="api-key-form" class="api-key-form
