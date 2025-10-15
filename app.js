document.addEventListener('DOMContentLoaded', () => {
    // =================================================================================
    // --- 1. CONFIGURATION & STATE ---
    // =================================================================================
    
    const API_BASE_URL = 'https://mgd-ai-worker.mgdwork12119241.workers.dev';
    const appContainer = document.getElementById('app-container');

    const WELCOME_MESSAGE_CONTENT = `مرحباً بك في **m.ai**! أنا مساعدك الذكي الشخصي، ومهمتي هي أن أكون بوابتك إلى عالم الذكاء الاصطناعي.\n\nأنا لست نموذجاً واحداً، بل أنا "مُجمّع" (Aggregator) قوي يمكنك تخصيصه بالكامل. حالياً، أنت تتحدث معي في **وضع الضيف**، وهو وضع تجريبي بقدرات محدودة.\n\n**لإطلاق العنان لقدراتي الكاملة، تحتاج إلى تزويدي بمفاتيح API الخاصة بك.**\n\n---\n\n#### **ماذا يمكنك أن تفعل بعد تفعيل مفاتيح API؟**\n\nبمجرد إضافة مفاتيحك، سأتحول إلى مساعد خارق يمكنه:\n\n1.  **الوصول إلى أفضل النماذج:** سأقوم تلقائياً بتوزيع طلباتك على أسرع وأقوى نماذج الذكاء الاصطناعي التي توفرها (مثل Groq, Gemini, Claude, GPT-4o).\n2.  **حفظ محادثاتك بأمان:** يمكنك ربط حساب GitHub الخاص بك لحفظ جميع محادثاتك بشكل دائم في مستودع خاص (Private Repository).\n3.  **تنفيذ الأفعال (قريباً):** في "وضع وكيل الفعل"، سأتمكن من التفاعل مع تطبيقات أخرى نيابة عنك.\n\n---\n\n#### **كيف تقوم بتفعيل مفاتيح API؟**\n\n1.  **أنشئ حساباً في m.ai:** من القائمة الجانبية، اضغط على "تسجيل الدخول / حساب جديد" لحفظ مفاتيحك.\n2.  **اذهب إلى "إدارة APIs"**: سيظهر هذا الخيار في القائمة بعد تسجيل الدخول.\n3.  **احصل على مفتاح API من أحد المزودين (معظمهم يقدم باقات مجانية قوية):**\n    *   **Groq (الأسرع حالياً):** [https://console.groq.com/keys](https://console.groq.com/keys)\n    *   **Google Gemini:** [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)\n    *   **DeepSeek:** [https://platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys)\n\n4.  **أضف المفتاح في m.ai:** انسخ المفتاح وألصقه في نافذة "إدارة APIs".\n\nبمجرد إضافة مفتاح واحد، ستكون جاهزاً للانطلاق!`;

    let state = {
        currentUser: null,
        showSidebar: false,
        conversations: [],
        currentConversationId: null,
        messages: [],
        apiKeys: [],
        isLoading: false,
        modals: {
            showAuth: false,
            isRegisterMode: false,
            showAPIManager: false,
        }
    };

    // =================================================================================
    // --- 2. API HELPERS ---
    // =================================================================================
    const api = {
        _call: async (endpoint, method, body = null, isAuth = false) => {
            const headers = { 'Content-Type': 'application/json' };
            if (state.currentUser && !isAuth) {
                headers['Authorization'] = `Bearer ${state.currentUser.userId}`;
            }
            
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
        register: (username, whatsapp) => api._call('/auth/register', 'POST', { username, whatsapp, action: 'register' }, true),
        login: (username, whatsapp) => api._call('/auth/login', 'POST', { username, whatsapp, action: 'login' }, true),
        getKeys: () => api._call('/api/keys', 'GET'),
        addKey: (keyData) => api._call('/api/keys', 'POST', keyData),
        deleteKey: (keyId) => api._call(`/api/keys/${keyId}`, 'DELETE'),
        getConversations: () => api._call('/api/conversations', 'GET'),
        getMessages: (convId) => api._call(`/api/conversations/${convId}`, 'GET'),
        sendMessage: (messages, conversationId) => api._call('/api/chat', 'POST', { messages, conversationId }),
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
        if (state.modals.showAuth) {
            appContainer.insertAdjacentHTML('beforeend', getHTML_AuthModal());
            attachAuthListeners();
        }
        if (state.modals.showAPIManager) {
            appContainer.insertAdjacentHTML('beforeend', getHTML_APIManagerModal());
            attachAPIManagerListeners();
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
        if (!state.currentUser) {
            listEl.innerHTML = '<p style="padding: 1rem; text-align: center; color: var(--gray-500);">سجل الدخول لعرض محادثاتك المحفوظة.</p>';
            return;
        }
        if (state.conversations.length === 0) {
            listEl.innerHTML = '<p style="padding: 1rem; text-align: center; color: var(--gray-500);">لا توجد محادثات بعد.</p>';
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
        const { showSidebar, currentUser } = state;
        const userDisplayHTML = currentUser
            ? `<span class="username">${currentUser.username}</span>`
            : `<span class="guest">وضع الضيف</span>`;

        return `
            <div class="sidebar-overlay ${showSidebar ? '' : 'hidden'}"></div>
            <div class="sidebar ${showSidebar ? '' : 'hidden'}">
                <div class="sidebar-header"><button id="new-chat-btn" class="sidebar-button new-chat-btn"><i data-lucide="plus"></i> <span>محادثة جديدة</span></button></div>
                <div class="sidebar-content" id="conversations-list"></div>
                <div class="sidebar-footer">
                    <button id="api-manager-btn" class="sidebar-button"><i data-lucide="key-round"></i> <span>إدارة APIs</span></button>
                    ${!currentUser ? '<button id="auth-btn" class="sidebar-button"><i data-lucide="log-in"></i> <span>تسجيل الدخول / حساب جديد</span></button>' : ''}
                    <div class="user-display">${userDisplayHTML}</div>
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

    function getHTML_AuthModal() {
        const { isRegisterMode } = state.modals;
        return `
            <div class="modal-overlay" data-modal-id="auth">
                <div class="modal-content auth-modal">
                    <div class="modal-header">
                        <h2 class="modal-title">${isRegisterMode ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}</h2>
                        <button class="modal-close-btn"><i data-lucide="x"></i></button>
                    </div>
                    <div class="modal-body">
                        <form id="auth-form" class="auth-form">
                            <div class="form-group">
                                <label for="username">اسم المستخدم</label>
                                <input type="text" id="username" required>
                            </div>
                            <div class="form-group">
                                <label for="whatsapp">رقم الواتساب</label>
                                <input type="text" id="whatsapp" required>
                            </div>
                            <button type="submit">${isRegisterMode ? 'إنشاء حساب' : 'دخول'}</button>
                            <button type="button" class="switch-auth-mode">
                                ${isRegisterMode ? 'لديك حساب بالفعل؟ سجل الدخول' : 'ليس لديك حساب؟ سجل الآن'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>`;
    }

    function getHTML_APIManagerModal() {
        let keysHTML = state.apiKeys.length === 0
            ? `<p style="text-align:center; color: var(--gray-500); padding: 2rem 0;">لم تقم بإضافة أي مفاتيح بعد.</p>`
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
    
    function getHTML_EmptyChat() { return `<div class="empty-chat"><div><svg width="120" height="120" viewBox="0 0 200 200" style="margin: 0 auto 1rem;"><text x="100" y="120" font-size="90" font-weight="bold" text-anchor="middle" fill="#000">m.ai</text></svg><h2>كيف يمكنني مساعدتك؟</h2><p>ابدأ بكتابة رسالة في الأسفل.</p></div></div>`; }
    function getHTML_MessageBubble(msg) { const content = (msg.content || '').replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>'); return `<div class="message-wrapper ${msg.role}">${msg.role === 'assistant' ? `<div class="assistant-header"><div class="assistant-avatar">m</div><span class="assistant-name">m.ai</span></div>` : ''}<div class="message-bubble">${content}</div></div>`; }
    function getHTML_ThinkingIndicator() { return `<div class="message-wrapper assistant"><div class="thinking-indicator"><div class="assistant-avatar"><i data-lucide="loader-circle" class="thinking-spinner"></i></div><span class="assistant-name">يفكر...</span></div></div>`; }
    function getHTML_ConversationItem(conv) { const isActive = conv.conversation_id === state.currentConversationId; return `<button class="sidebar-button conv-button ${isActive ? 'active' : ''}" data-conv-id="${conv.conversation_id}"><div><div class="conv-title">${conv.title}</div><div class="conv-date">${new Date(conv.updated_at).toLocaleDateString('ar')}</div></div></button>`; }

    // =================================================================================
    // --- 5. EVENT HANDLERS & LOGIC ---
    // =================================================================================

    function attachMainListeners() {
        document.getElementById('menu-btn').addEventListener('click', toggleSidebar);
        document.querySelector('.sidebar-overlay').addEventListener('click', toggleSidebar);
        document.getElementById('new-chat-btn').addEventListener('click', handleNewConversation);
        
        const authBtn = document.getElementById('auth-btn');
        if (authBtn) {
            authBtn.addEventListener('click', () => { state.modals.showAuth = true; render(); });
        }
        
        document.getElementById('api-manager-btn').addEventListener('click', openAPIManager);

        const messageInput = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-btn');
        messageInput.addEventListener('input', () => {
            sendBtn.disabled = messageInput.value.trim().length === 0;
            messageInput.style.height = 'auto';
            messageInput.style.height = `${messageInput.scrollHeight}px`;
        });
        document.getElementById('message-form').addEventListener('submit', (e) => { e.preventDefault(); handleSendMessage(); });
    }

    function attachAuthListeners() {
        const modal = document.querySelector('[data-modal-id="auth"]');
        modal.querySelector('.modal-close-btn').addEventListener('click', () => {
            state.modals.showAuth = false;
            render();
        });
        modal.querySelector('.switch-auth-mode').addEventListener('click', () => {
            state.modals.isRegisterMode = !state.modals.isRegisterMode;
            render();
        });
        modal.querySelector('#auth-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const whatsapp = document.getElementById('whatsapp').value;
            if (!username || !whatsapp) return alert('الرجاء ملء جميع الحقول');

            try {
                const data = state.modals.isRegisterMode
                    ? await api.register(username, whatsapp)
                    : await api.login(username, whatsapp);
                
                if (data.success) {
                    state.currentUser = { userId: data.userId, username: data.username };
                    state.modals.showAuth = false;
                    await initializeUserSession();
                }
            } catch (err) { /* error already alerted by api._call */ }
        });
    }
    
    function attachAPIManagerListeners() {
        const modal = document.querySelector('[data-modal-id="api-manager"]');
        modal.querySelector('.modal-close-btn').addEventListener('click', () => {
            state.modals.showAPIManager = false;
            render();
        });
        modal.querySelector('#api-key-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!state.currentUser) {
                alert('يجب عليك تسجيل الدخول أولاً لحفظ مفاتيح API.');
                state.modals.showAPIManager = false;
                state.modals.showAuth = true;
                render();
                return;
            }
            
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
            item.querySelector('.delete-btn').addEventListener('click', async () => {
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

    function toggleSidebar() {
        state.showSidebar = !state.showSidebar;
        render();
    }

    async function openAPIManager() {
        state.modals.showAPIManager = true;
        if (state.currentUser) {
            try {
                const data = await api.getKeys();
                state.apiKeys = data.keys || [];
            } catch (e) { /* error handled by _call */ }
        } else {
            state.apiKeys = [];
        }
        render();
    }

    async function handleSendMessage() {
        const messageInput = document.getElementById('message-input');
        const content = messageInput.value.trim();
        if (!content || state.isLoading) return;
        
        if (!state.currentUser && state.messages.length === 0) {
            state.messages.push({ role: 'user', content });
            state.messages.push({ role: 'assistant', content: WELCOME_MESSAGE_CONTENT });
            messageInput.value = '';
            renderMessages();
            return;
        }
        
        const userMessage = { role: 'user', content };
        state.messages.push(userMessage);
        
        if (!state.currentConversationId) {
            state.currentConversationId = state.currentUser ? `conv_${Date.now()}` : 'guest_session';
        }
        
        state.isLoading = true;
        messageInput.value = '';
        messageInput.style.height = 'auto';
        document.getElementById('send-btn').disabled = true;
        renderMessages();

        try {
            const assistantResponse = await api.sendMessage(state.messages, state.currentConversationId);
            state.messages.push(assistantResponse);
        } catch (error) {
            state.messages.push({ role: 'assistant', content: `عذراً، حدث خطأ. قد تحتاج إلى تسجيل الدخول لاستخدام هذه الميزة.\n\n*${error.message}*` });
        } finally {
            state.isLoading = false;
            renderMessages();
        }
    }

    async function handleNewConversation() {
        state.currentConversationId = null;
        state.messages = [];
        render();
    }

    async function handleSelectConversation(convId) {
        if (state.currentConversationId === convId || !state.currentUser) return;
        state.currentConversationId = convId;
        state.isLoading = true;
        render();
        try {
            const data = await api.getMessages(convId);
            state.messages = data.messages || [];
        } catch(error) { 
            state.messages = []; 
        } finally {
            state.isLoading = false;
            render();
        }
    }

    async function initializeUserSession() {
        if (state.currentUser) {
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
        } else {
            state.conversations = [];
            await handleNewConversation();
        }
        render();
    }

    // =================================================================================
    // --- 6. INITIALIZATION ---
    // =================================================================================
    
    async function init() {
        await initializeUserSession();
    }

    init();
});
