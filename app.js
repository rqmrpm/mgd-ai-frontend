document.addEventListener('DOMContentLoaded', () => {
    // =================================================================================
    // --- 1. CONFIGURATION & STATE ---
    // =================================================================================
    
    const API_BASE_URL = 'https://mgd-ai-worker.mgdwork12119241.workers.dev';
    const appContainer = document.getElementById('app-container');

    let state = {
        currentUser: { userId: '1', username: 'TestUser' },
        showSidebar: false,
        currentMode: 'chat', // 'chat' or 'agent'
        conversations: [],
        currentConversationId: null,
        messages: [],
        apiKeys: [],
        isLoading: false,
        modals: { showSettings: false, showAPIManager: false },
        ui: { showActionsMenu: false },
        settings: {
            isVoiceModeEnabled: false,
        },
        voice: {
            isListening: false,
        }
    };

    // Speech Recognition & Synthesis APIs
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = SpeechRecognition ? new SpeechRecognition() : null;
    const synthesis = window.speechSynthesis;

    // =================================================================================
    // --- 2. API HELPERS (No changes here) ---
    // =================================================================================
    const api = { /* ... الكود كما هو ... */ };

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
    
    // ... (بقية دوال render كما هي) ...
    function renderMessages() { /* ... الكود كما هو ... */ }
    function renderConversations() { /* ... الكود كما هو ... */ }

    // =================================================================================
    // --- 4. HTML TEMPLATES ---
    // =================================================================================

    function getHTML_MainInterface() {
        const { showSidebar } = state;
        return `
            <div class="sidebar-overlay ${showSidebar ? '' : 'hidden'}"></div>
            <div class="sidebar ${showSidebar ? '' : 'hidden'}">
                <div class="sidebar-header"><button id="new-chat-btn" class="sidebar-button new-chat-btn"><i data-lucide="plus"></i> <span>محادثة جديدة</span></button></div>
                <div class="sidebar-content" id="conversations-list"></div>
                <div class="sidebar-footer">
                    <button id="api-manager-btn" class="sidebar-button"><i data-lucide="key-round"></i> <span>إدارة APIs</span></button>
                    <button id="settings-btn" class="sidebar-button"><i data-lucide="settings"></i> <span>الإعدادات</span></button>
                    <div class="username-display">${state.currentUser.username}</div>
                </div>
            </div>
            <div class="main-content">
                <div class="main-header">
                    <button id="menu-btn" class="menu-button"><i data-lucide="menu"></i></button>
                    <div class="logo-header">m.ai</div>
                    <div style="width: 40px;"></div>
                </div>
                <div class="messages-area" id="messages-area"></div>
                <div class="input-area">
                    <div class="input-container">
                        ${getHTML_ActionsMenu()}
                        <form id="message-form" class="input-form">
                            <button type="button" id="actions-menu-btn" class="input-action-button"><i data-lucide="plus"></i></button>
                            <textarea id="message-input" class="input-textarea" placeholder="اكتب رسالتك هنا..." rows="1"></textarea>
                            ${state.settings.isVoiceModeEnabled ? `<button type="button" id="mic-btn" class="input-action-button mic-button ${state.voice.isListening ? 'recording' : ''}"><i data-lucide="mic"></i></button>` : ''}
                            <button id="send-btn" type="submit" class="send-button" disabled><i data-lucide="send"></i></button>
                        </form>
                    </div>
                </div>
            </div>`;
    }

    function getHTML_ActionsMenu() {
        const { currentMode, ui } = state;
        return `
            <div class="actions-menu ${ui.showActionsMenu ? 'visible' : ''}">
                <button class="actions-menu-item ${currentMode === 'chat' ? 'active' : ''}" data-mode="chat"><i data-lucide="bot"></i><span>وضع دردشة</span></button>
                <button class="actions-menu-item ${currentMode === 'agent' ? 'active' : ''}" data-mode="agent"><i data-lucide="terminal-square"></i><span>وضع وكيل الفعل</span></button>
                <hr style="border: none; border-top: 1px solid var(--gray-100); margin: 0.5rem 0;"/>
                <label class="actions-menu-item" for="file-upload"><i data-lucide="paperclip"></i><span>إضافة ملف</span></label>
                <input type="file" id="file-upload" style="display: none;" />
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
                        <div class="settings-group">
                            <h3>الصوت</h3>
                            <div class="toggle-switch">
                                <span>تفعيل الإدخال والإخراج الصوتي</span>
                                <input type="checkbox" id="voice-mode-toggle" ${state.settings.isVoiceModeEnabled ? 'checked' : ''} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    }
    
    // ... (بقية دوال HTML كما هي) ...
    function getHTML_APIManagerModal() { /* ... الكود كما هو ... */ }
    function getHTML_EmptyChat() { /* ... الكود كما هو ... */ }
    function getHTML_MessageBubble(msg) { /* ... الكود كما هو ... */ }
    function getHTML_ThinkingIndicator() { /* ... الكود كما هو ... */ }
    function getHTML_ConversationItem(conv) { /* ... الكود كما هو ... */ }

    // =================================================================================
    // --- 5. EVENT HANDLERS & LOGIC ---
    // =================================================================================

    function attachMainListeners() {
        // ... (Listeners for sidebar, modals, new chat, etc. as before) ...
        document.getElementById('menu-btn').addEventListener('click', toggleSidebar);
        document.querySelector('.sidebar-overlay').addEventListener('click', toggleSidebar);
        document.getElementById('api-manager-btn').addEventListener('click', openAPIManager);
        document.getElementById('settings-btn').addEventListener('click', openSettings);
        document.getElementById('new-chat-btn').addEventListener('click', handleNewConversation);

        // New listeners for input area
        document.getElementById('actions-menu-btn').addEventListener('click', toggleActionsMenu);
        const messageInput = document.getElementById('message-input');
        messageInput.addEventListener('input', () => { /* ... */ });
        document.getElementById('message-form').addEventListener('submit', (e) => { e.preventDefault(); handleSendMessage(); });

        if (state.settings.isVoiceModeEnabled) {
            document.getElementById('mic-btn').addEventListener('click', handleMicClick);
        }
    }

    function toggleActionsMenu() {
        state.ui.showActionsMenu = !state.ui.showActionsMenu;
        render();
    }

    function attachSettingsListeners() {
        const modal = document.querySelector('[data-modal-id="settings"]');
        modal.querySelector('.modal-close-btn').addEventListener('click', () => closeModal('settings'));
        modal.querySelector('#voice-mode-toggle').addEventListener('change', (e) => {
            state.settings.isVoiceModeEnabled = e.target.checked;
            if (e.target.checked && !recognition) {
                alert('عذراً، متصفحك لا يدعم ميزة التعرف على الصوت.');
                state.settings.isVoiceModeEnabled = false;
            }
            render(); // Re-render the main interface to show/hide mic button
        });
    }

    // --- Voice Logic ---
    function handleMicClick() {
        if (!recognition) return;
        if (state.voice.isListening) {
            recognition.stop();
        } else {
            recognition.start();
        }
    }

    function setupSpeechRecognition() {
        if (!recognition) return;
        recognition.continuous = false;
        recognition.lang = 'ar-SA';
        recognition.interimResults = false;

        recognition.onstart = () => {
            state.voice.isListening = true;
            render();
        };

        recognition.onend = () => {
            state.voice.isListening = false;
            render();
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            document.getElementById('message-input').value = transcript;
            handleSendMessage(); // إرسال الرسالة تلقائياً بعد نطقها
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
        };
    }

    function speak(text) {
        if (!synthesis || !state.settings.isVoiceModeEnabled) return;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ar-SA';
        synthesis.speak(utterance);
    }

    async function handleSendMessage() {
        // ... (نفس الكود السابق) ...
        try {
            const assistantResponse = await api.sendMessage(state.messages, state.currentConversationId);
            state.messages.push(assistantResponse);
            speak(assistantResponse.content); // <-- نطق رد المساعد
        } catch (error) {
            // ...
        } finally {
            // ...
        }
    }

    // ... (بقية الدوال كما هي) ...
    function attachAPIManagerListeners() { /* ... */ }
    function openAPIManager() { /* ... */ }
    function openSettings() { /* ... */ }
    function closeModal(modalId) { /* ... */ }
    function toggleSidebar() { /* ... */ }
    async function handleNewConversation() { /* ... */ }
    async function handleSelectConversation(convId) { /* ... */ }
    async function initializeUserSession() { /* ... */ }

    // =================================================================================
    // --- 6. INITIALIZATION ---
    // =================================================================================
    
    async function init() {
        setupSpeechRecognition();
        await initializeUserSession();
    }

    init();
});
