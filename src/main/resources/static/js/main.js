'use strict';

// DOM Elements
const usernamePage = document.querySelector('#username-page');
const chatPage = document.querySelector('#chat-page');
const usernameForm = document.querySelector('#usernameForm');
const messageForm = document.querySelector('#messageForm');
const messageInput = document.querySelector('#message');
const messageArea = document.querySelector('#messageArea');
const connectingElement = document.querySelector('.connecting');
const themeToggle = document.querySelector('#theme-toggle');
const notificationToggle = document.querySelector('#notification-toggle');
const headerAvatar = document.querySelector('#header-avatar');
const onlineUsersList = document.querySelector('#onlineUsers');
const typingIndicator = document.querySelector('#typingIndicator');
const typingText = document.querySelector('#typingText');
const emojiBtn = document.querySelector('#emojiBtn');
const attachBtn = document.querySelector('#attachBtn');
const mobileMenuBtn = document.querySelector('#mobile-menu-toggle');
const chatSidebar = document.querySelector('#chat-sidebar');

// State Variables
let stompClient = null;
let username = null;
let onlineUsers = new Set();
let typingTimeout = null;

// ===== NOTIFICATION SYSTEM - COMPLETELY SILENT =====
let unreadCount = 0;
let originalTitle = document.title;
let notificationInterval = null;

// Silent function - no sound, just visual
function notifyNewMessage(message) {
    if (message.sender === username || message.type !== 'CHAT') {
        return;
    }
    
    unreadCount++;
    startTitleBlink();
}

function startTitleBlink() {
    if (notificationInterval) return;
    
    notificationInterval = setInterval(() => {
        if (unreadCount > 0) {
            document.title = document.title === originalTitle 
                ? `📨 (${unreadCount}) Jyoti Chat` 
                : originalTitle;
        }
    }, 800);
}

function resetNotifications() {
    unreadCount = 0;
    
    if (notificationInterval) {
        clearInterval(notificationInterval);
        notificationInterval = null;
    }
    
    document.title = originalTitle;
}

// ===== THEME MANAGEMENT =====
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = themeToggle.querySelector('i');
    icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
}

// ===== MOBILE MENU TOGGLE =====
function toggleMobileMenu() {
    chatSidebar.classList.toggle('active');
    
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
        
        overlay.addEventListener('click', () => {
            chatSidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
    
    overlay.classList.toggle('active');
}

// ===== CONNECTION FUNCTIONS =====
function connect(event) {
    username = document.querySelector('#name').value.trim();
    
    if(username) {
        headerAvatar.textContent = username.charAt(0).toUpperCase();
        
        usernamePage.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            usernamePage.classList.add('hidden');
            chatPage.classList.remove('hidden');
            chatPage.style.animation = 'fadeIn 0.3s ease';
        }, 300);

        // WebSocket connection
        const socket = new SockJS('/ws');
        stompClient = Stomp.over(socket);
        
        stompClient.debug = null;
        
        stompClient.connect({}, onConnected, onError);
    }
    event.preventDefault();
}

function onConnected() {
    stompClient.subscribe('/topic/public', onMessageReceived);
    stompClient.subscribe('/topic/users', onUserListUpdate);
    
    stompClient.send("/app/chat.addUser",
        {},
        JSON.stringify({sender: username, type: 'JOIN'})
    );
    
    connectingElement.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => {
        connectingElement.classList.add('hidden');
    }, 300);
    
    onlineUsers.add(username);
    updateOnlineUsersList();
    
    resetNotifications();
}

function onError(error) {
    connectingElement.innerHTML = `
        <i class="fas fa-exclamation-circle" style="color: #ff6b6b;"></i>
        <span style="color: #ff6b6b;">Connection failed! Please refresh.</span>
    `;
    connectingElement.style.color = '#f56565';
    connectingElement.style.background = 'rgba(245, 101, 101, 0.1)';
}

// ===== MESSAGE HANDLING =====
function sendMessage(event) {
    const messageContent = messageInput.value.trim();
    
    if(messageContent && stompClient) {
        const chatMessage = {
            sender: username,
            content: messageContent,
            type: 'CHAT',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));
        
        messageInput.value = '';
        stopTyping();
    }
    event.preventDefault();
}

function onMessageReceived(payload) {
    const message = JSON.parse(payload.body);
    
    if(message.type === 'JOIN') {
        onlineUsers.add(message.sender);
        updateOnlineUsersList();
        displaySystemMessage(`${message.sender} joined the chat! 🎉`);
        
    } else if (message.type === 'LEAVE') {
        onlineUsers.delete(message.sender);
        updateOnlineUsersList();
        displaySystemMessage(`${message.sender} left the chat! 👋`);
        
    } else {
        displayChatMessage(message);
        notifyNewMessage(message); // Visual only, no sound
    }
}

function displayChatMessage(message) {
    const messageElement = document.createElement('li');
    messageElement.classList.add('chat-message');
    
    const isSentByMe = message.sender === username;
    messageElement.classList.add(isSentByMe ? 'sent' : 'received');
    
    const wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = message.sender.charAt(0).toUpperCase();
    avatar.style.background = getAvatarColor(message.sender);
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    
    if (!isSentByMe) {
        const sender = document.createElement('div');
        sender.className = 'message-sender';
        sender.textContent = message.sender;
        bubble.appendChild(sender);
    }
    
    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = message.content;
    bubble.appendChild(content);
    
    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = message.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    bubble.appendChild(time);
    
    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);
    messageElement.appendChild(wrapper);
    
    messageArea.appendChild(messageElement);
    messageArea.scrollTop = messageArea.scrollHeight;
}

function displaySystemMessage(text) {
    const messageElement = document.createElement('li');
    messageElement.classList.add('event-message');
    
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    
    messageElement.appendChild(paragraph);
    messageArea.appendChild(messageElement);
    messageArea.scrollTop = messageArea.scrollHeight;
}

// ===== USER LIST MANAGEMENT =====
function onUserListUpdate(payload) {
    const users = JSON.parse(payload.body);
    onlineUsers = new Set(users);
    updateOnlineUsersList();
}

function updateOnlineUsersList() {
    if (!onlineUsersList) return;
    
    onlineUsersList.innerHTML = '';
    document.querySelector('#online-count').textContent = onlineUsers.size;
    
    const sortedUsers = Array.from(onlineUsers).sort();
    
    sortedUsers.forEach(user => {
        const userElement = createUserElement(user);
        onlineUsersList.appendChild(userElement);
    });
}

function createUserElement(username) {
    const div = document.createElement('div');
    div.className = 'user-item';
    
    const avatar = document.createElement('div');
    avatar.className = 'user-avatar online';
    avatar.textContent = username.charAt(0).toUpperCase();
    avatar.style.background = getAvatarColor(username);
    
    const info = document.createElement('div');
    info.className = 'user-info';
    
    const name = document.createElement('div');
    name.className = 'user-name';
    name.textContent = username;
    
    const status = document.createElement('div');
    status.className = 'user-status';
    status.textContent = username === this?.username ? 'You' : 'Online';
    
    info.appendChild(name);
    info.appendChild(status);
    
    div.appendChild(avatar);
    div.appendChild(info);
    
    return div;
}

// ===== TYPING INDICATOR =====
function handleTyping() {
    if (!stompClient) return;
    
    if (typingTimeout) {
        clearTimeout(typingTimeout);
    }
    
    showTypingIndicator(username);
    
    typingTimeout = setTimeout(() => {
        hideTypingIndicator();
    }, 2000);
}

function showTypingIndicator(typingUser) {
    if (typingUser !== username) {
        typingText.textContent = `${typingUser} is typing...`;
        typingIndicator.classList.remove('hidden');
    }
}

function hideTypingIndicator() {
    typingIndicator.classList.add('hidden');
}

function stopTyping() {
    if (typingTimeout) {
        clearTimeout(typingTimeout);
        hideTypingIndicator();
    }
}

// ===== EMOJI PICKER =====
function showEmojiPicker() {
    const emojis = ['😊', '😂', '❤️', '👍', '🎉', '🔥', '✨', '💯', '😘', '🥰', '😍', '🌹'];
    
    const picker = document.createElement('div');
    picker.className = 'emoji-picker-simulated';
    picker.id = 'emojiPicker';
    
    emojis.forEach(emoji => {
        const span = document.createElement('span');
        span.textContent = emoji;
        span.onclick = () => {
            messageInput.value += emoji;
            messageInput.focus();
            picker.remove();
        };
        picker.appendChild(span);
    });
    
    const existingPicker = document.querySelector('#emojiPicker');
    if (existingPicker) {
        existingPicker.remove();
    }
    
    document.querySelector('.chat-content').appendChild(picker);
    
    setTimeout(() => {
        document.addEventListener('click', function removePicker(e) {
            if (!picker.contains(e.target) && e.target !== emojiBtn) {
                picker.remove();
                document.removeEventListener('click', removePicker);
            }
        });
    }, 100);
}

// ===== FILE ATTACHMENT =====
function handleFileAttachment() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,.pdf,.doc,.docx,.txt';
    fileInput.style.display = 'none';
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            displaySystemMessage(`📎 ${username} shared a file: ${file.name}`);
            
            if (stompClient) {
                const fileMessage = {
                    sender: username,
                    content: `📎 Shared file: ${file.name}`,
                    type: 'CHAT',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
                stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(fileMessage));
            }
        }
    });
    
    document.body.appendChild(fileInput);
    fileInput.click();
    setTimeout(() => fileInput.remove(), 1000);
}

// ===== AVATAR COLOR UTILITY =====
function getAvatarColor(messageSender) {
    const colors = [
        '#ff6b6b', '#ff8e8e', '#ff9a9e', '#fad0c4',
        '#ffb8b8', '#ffcccc', '#ffd9d9', '#ffe6e6'
    ];
    
    let hash = 0;
    for (let i = 0; i < messageSender.length; i++) {
        hash = 31 * hash + messageSender.charCodeAt(i);
    }
    const index = Math.abs(hash % colors.length);
    return colors[index];
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    
    // Add overlay styles
    const style = document.createElement('style');
    style.textContent = `
        .sidebar-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
            animation: fadeIn 0.3s ease;
        }
        
        .sidebar-overlay.active {
            display: block;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
    `;
    document.head.appendChild(style);
});

// ===== EVENT LISTENERS =====
usernameForm.addEventListener('submit', connect, true);
messageForm.addEventListener('submit', sendMessage, true);
messageInput.addEventListener('input', handleTyping);

// Theme toggle
if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
}

// Mobile menu toggle
if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', toggleMobileMenu);
}

// Emoji picker
if (emojiBtn) {
    emojiBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showEmojiPicker();
    });
}

// File attachment
if (attachBtn) {
    attachBtn.addEventListener('click', handleFileAttachment);
}

// Reset notifications on interaction
chatPage.addEventListener('click', resetNotifications);
window.addEventListener('focus', resetNotifications);
messageInput.addEventListener('focus', resetNotifications);

// Close emoji picker on outside click
document.addEventListener('click', () => {
    const picker = document.querySelector('#emojiPicker');
    if (picker) {
        picker.remove();
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (stompClient && stompClient.connected) {
        stompClient.send("/app/chat.removeUser",
            {},
            JSON.stringify({sender: username, type: 'LEAVE'})
        );
    }
});
// ===== LOVE CALCULATOR - COMPACT =====

// Add calculator button to sidebar
function addCalculatorButton() {
    const sidebar = document.querySelector('.chat-sidebar');
    if (!sidebar) return;
    
    const calculatorSection = document.createElement('div');
    calculatorSection.className = 'love-calculator-section';
    calculatorSection.innerHTML = `
        <button class="calculator-button" id="calculatorButton">
            <i class="fas fa-heart"></i>
            Love Calculator
            <i class="fas fa-heart"></i>
        </button>
    `;
    
    sidebar.appendChild(calculatorSection);
}

// Create calculator modal
function createCalculatorModal() {
    const modal = document.createElement('div');
    modal.className = 'calculator-modal';
    modal.id = 'calculatorModal';
    modal.innerHTML = `
        <div class="calculator-content">
            <div class="calculator-header">
                <h3>❤️ Love Calculator</h3>
                <p>Check your love %</p>
                <button class="close-calculator" id="closeCalculator">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="calculator-body" id="calculatorBody">
                <div class="input-group-calc">
                    <label>Your Name</label>
                    <input type="text" id="name1" placeholder="Your name..." maxlength="15">
                </div>
                <div class="input-group-calc">
                    <label>Partner's Name</label>
                    <input type="text" id="name2" placeholder="Partner name..." maxlength="15">
                </div>
                
                <button class="calculate-btn" id="calculateBtn">
                    <i class="fas fa-calculator"></i>
                    Calculate
                </button>
                
                <div id="resultDiv" style="display: none;">
                    <div class="result-box">
                        <div class="result-hearts" id="resultHearts">❤️</div>
                        <div class="result-percentage" id="resultPercentage">0%</div>
                        <div class="result-meter">
                            <div class="meter-fill" id="resultMeter" style="width: 0%"></div>
                        </div>
                        <div class="result-message" id="resultMessage"></div>
                        
                        <button class="share-result-btn" id="shareResult">
                            <i class="fas fa-share-alt"></i> Share
                        </button>
                        <button class="reset-btn" id="resetCalc">
                            <i class="fas fa-redo"></i> Again
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    document.getElementById('calculatorButton').addEventListener('click', showCalculator);
    document.getElementById('closeCalculator').addEventListener('click', hideCalculator);
    document.getElementById('calculateBtn').addEventListener('click', calculateLove);
    
    // Click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) hideCalculator();
    });
}

// Show calculator
function showCalculator() {
    document.getElementById('calculatorModal').classList.add('active');
    document.getElementById('name1').focus();
    resetCalculator();
}

// Hide calculator
function hideCalculator() {
    document.getElementById('calculatorModal').classList.remove('active');
}

// Reset calculator
function resetCalculator() {
    const name1 = document.getElementById('name1');
    const name2 = document.getElementById('name2');
    const resultDiv = document.getElementById('resultDiv');
    
    if (name1) name1.value = '';
    if (name2) name2.value = '';
    if (resultDiv) resultDiv.style.display = 'none';
}

// Calculate love percentage
function calculateLove() {
    const name1 = document.getElementById('name1').value.trim();
    const name2 = document.getElementById('name2').value.trim();
    
    if (!name1 || !name2) {
        alert('Please enter both names!');
        return;
    }
    
    // Simple calculation
    const combined = name1 + name2;
    let total = 0;
    
    for (let i = 0; i < combined.length; i++) {
        total += combined.charCodeAt(i);
    }
    
    // Percentage between 50-100%
    let percentage = (total % 51) + 50;
    
    // Special for Jyoti
    if (name1.toLowerCase().includes('jyoti') || name2.toLowerCase().includes('jyoti')) {
        percentage = Math.max(percentage, 90);
    }
    
    // Show result
    document.getElementById('resultPercentage').textContent = percentage + '%';
    document.getElementById('resultMeter').style.width = percentage + '%';
    
    // Message based on percentage
    let message = '';
    let hearts = '';
    
    if (percentage >= 90) {
        message = "💕 Perfect Match!";
        hearts = "💕💖💗";
    } else if (percentage >= 80) {
        message = "❤️ Great Love!";
        hearts = "❤️💕";
    } else if (percentage >= 70) {
        message = "💝 Good Couple!";
        hearts = "💝";
    } else if (percentage >= 60) {
        message = "💘 Can Work!";
        hearts = "💘";
    } else {
        message = "💔 Try Again";
        hearts = "💔";
    }
    
    document.getElementById('resultMessage').textContent = message;
    document.getElementById('resultHearts').textContent = hearts;
    document.getElementById('resultDiv').style.display = 'block';
    
    // Add event listeners for buttons
    document.getElementById('shareResult').onclick = shareResult;
    document.getElementById('resetCalc').onclick = resetCalculator;
    
    // Confetti
    createConfetti(15);
}

// Share result
function shareResult() {
    if (!stompClient) {
        alert('Wait for connection...');
        return;
    }
    
    const name1 = document.getElementById('name1').value.trim();
    const name2 = document.getElementById('name2').value.trim();
    const percentage = document.getElementById('resultPercentage').textContent;
    const message = document.getElementById('resultMessage').textContent;
    
    const shareMessage = {
        sender: username,
        content: `❤️ *Love Calculator*\n${name1} + ${name2} = ${percentage}\n${message}`,
        type: 'CHAT',
        timestamp: new Date().toLocaleTimeString()
    };
    
    stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(shareMessage));
    alert('✅ Shared!');
    hideCalculator();
}

// Confetti
function createConfetti(count) {
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.background = ['#ff6b6b', '#ff4757', '#ff8e8e'][Math.floor(Math.random() * 3)];
            confetti.style.width = Math.random() * 6 + 3 + 'px';
            confetti.style.height = confetti.style.width;
            
            document.body.appendChild(confetti);
            setTimeout(() => confetti.remove(), 2500);
        }, i * 30);
    }
}

// Add to DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (!chatPage.classList.contains('hidden')) {
                setTimeout(() => {
                    addCalculatorButton();
                    createCalculatorModal();
                }, 1000);
                observer.disconnect();
            }
        });
    });
    
    observer.observe(chatPage, { attributes: true, attributeFilter: ['class'] });
});

