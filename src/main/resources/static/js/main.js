'use strict';

let stompClient = null;
let username = null;

const usernamePage = document.querySelector('#username-page');
const chatPage = document.querySelector('#chat-page');
const usernameForm = document.querySelector('#usernameForm');
const messageForm = document.querySelector('#messageForm');
const messageInput = document.querySelector('#message');
const messageArea = document.querySelector('#messageArea');
const themeToggle = document.querySelector('#theme-toggle');
<<<<<<< HEAD
const notificationToggle = document.querySelector('#notification-toggle');
const headerAvatar = document.querySelector('#header-avatar');
const onlineUsersList = document.querySelector('#onlineUsers');
const typingIndicator = document.querySelector('#typingIndicator');
const typingText = document.querySelector('#typingText');
const emojiBtn = document.querySelector('#emojiBtn');
const mobileMenuBtn = document.querySelector('#mobile-menu-toggle');
const chatSidebar = document.querySelector('#chat-sidebar');

// Love Calculator Elements
const calculatorModal = document.querySelector('#calculatorModal');
const loveCalculatorBtn = document.querySelector('#loveCalculatorBtn');
const closeCalculator = document.querySelector('.close-calculator');
const calculateBtn = document.querySelector('#calculateLove');
const yourNameInput = document.querySelector('#yourName');
const partnerNameInput = document.querySelector('#partnerName');
const loveResult = document.querySelector('#loveResult');
const lovePercentage = document.querySelector('#lovePercentage');
const loveMeter = document.querySelector('#loveMeter');
const loveMessage = document.querySelector('#loveMessage');
const loveHearts = document.querySelector('#loveHearts');
const shareLoveResult = document.querySelector('#shareLoveResult');
const resetLoveCalculator = document.querySelector('#resetLoveCalculator');
const clearChatBtn = document.querySelector('#clearChatBtn');
const shareChatBtn = document.querySelector('#shareChatBtn');

// State Variables
let stompClient = null;
let username = null;
let onlineUsers = new Set();
let typingTimeout = null;

// ===== NOTIFICATION SYSTEM =====
let unreadCount = 0;
let originalTitle = document.title;
let notificationInterval = null;

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
=======
const sidebar = document.querySelector('#chat-sidebar');
const menuBtn = document.querySelector('#mobile-menu-toggle');
const overlay = document.querySelector('#sidebar-overlay');

>>>>>>> 4b555f5a06a86f43b26e5570ee9d13e600c6c3f9
function connect(event) {
    username = document.querySelector('#name').value.trim();
    if(username) {
<<<<<<< HEAD
        headerAvatar.textContent = username.charAt(0).toUpperCase();
        if (yourNameInput) yourNameInput.value = username;
        
        usernamePage.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            usernamePage.classList.add('hidden');
            chatPage.classList.remove('hidden');
            chatPage.style.animation = 'fadeIn 0.3s ease';
        }, 300);
=======
        usernamePage.classList.add('hidden');
        chatPage.classList.remove('hidden');
>>>>>>> 4b555f5a06a86f43b26e5570ee9d13e600c6c3f9

        const socket = new SockJS('/ws');
        stompClient = Stomp.over(socket);
        stompClient.connect({}, onConnected, (err) => alert("Error connecting!"));
    }
    event.preventDefault();
}

function onConnected() {
    stompClient.subscribe('/topic/public', onMessageReceived);
    stompClient.send("/app/chat.addUser", {}, JSON.stringify({sender: username, type: 'JOIN'}));
    document.querySelector('#header-avatar').textContent = username.charAt(0).toUpperCase();
}

<<<<<<< HEAD
function onError(error) {
    connectingElement.innerHTML = `
        <i class="fas fa-exclamation-circle" style="color: #667eea;"></i>
        <span style="color: #667eea;">Connection failed! Please refresh.</span>
    `;
    connectingElement.style.color = '#667eea';
    connectingElement.style.background = 'rgba(102, 126, 234, 0.1)';
}

// ===== MESSAGE HANDLING =====
=======
>>>>>>> 4b555f5a06a86f43b26e5570ee9d13e600c6c3f9
function sendMessage(event) {
    const msg = messageInput.value.trim();
    if(msg && stompClient) {
        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify({
            sender: username,
            content: msg,
            type: 'CHAT'
        }));
        messageInput.value = '';
    }
    event.preventDefault();
}

function onMessageReceived(payload) {
    const message = JSON.parse(payload.body);
<<<<<<< HEAD
    
    if(message.type === 'JOIN') {
        onlineUsers.add(message.sender);
        updateOnlineUsersList();
        displaySystemMessage(`${message.sender} joined the chat! 👋`);
        
    } else if (message.type === 'LEAVE') {
        onlineUsers.delete(message.sender);
        updateOnlineUsersList();
        displaySystemMessage(`${message.sender} left the chat! 👋`);
        
    } else {
        displayChatMessage(message);
        notifyNewMessage(message);
=======
    const li = document.createElement('li');

    if(message.type === 'JOIN' || message.type === 'LEAVE') {
        li.className = 'event-msg';
        li.textContent = `${message.sender} ${message.type === 'JOIN' ? 'joined!' : 'left!'}`;
    } else {
        li.className = `chat-message ${message.sender === username ? 'sent' : 'received'}`;
        const nameSpan = message.sender === username ? '' : `<span class="sender-name">${message.sender}</span>`;
        li.innerHTML = `${nameSpan}<div>${message.content}</div>`;
>>>>>>> 4b555f5a06a86f43b26e5570ee9d13e600c6c3f9
    }

    messageArea.appendChild(li);
    messageArea.scrollTop = messageArea.scrollHeight;
}

// Menu Toggle
menuBtn.onclick = () => { sidebar.classList.add('active'); overlay.classList.add('active'); };
overlay.onclick = () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); };

// Theme Toggle
themeToggle.onclick = () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    themeToggle.innerHTML = isDark ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
};

<<<<<<< HEAD
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
    const emojis = ['😊', '😂', '❤️', '👍', '🎉', '🔥', '✨', '💯', '😘', '🥰', '😍', '🌹', '👋', '💕', '💖', '⭐'];
    
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

// ===== LOVE CALCULATOR FUNCTIONS =====
function openLoveCalculator() {
    calculatorModal.classList.add('active');
    yourNameInput.value = username || '';
    partnerNameInput.value = '';
    loveResult.style.display = 'none';
}

function closeLoveCalculator() {
    calculatorModal.classList.remove('active');
}

function calculateLove() {
    const name1 = yourNameInput.value.trim();
    const name2 = partnerNameInput.value.trim();
    
    if (!name1 || !name2) {
        alert('Please enter both names!');
        return;
    }
    
    // Calculate love percentage based on names
    const combined = name1 + name2;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
        hash = ((hash << 5) - hash) + combined.charCodeAt(i);
        hash = hash & hash;
    }
    
    let percentage = Math.abs(hash % 101);
    
    // Ensure minimum 10% and maximum 100%
    percentage = Math.max(10, Math.min(100, percentage));
    
    // Display result
    lovePercentage.textContent = percentage + '%';
    loveMeter.style.width = percentage + '%';
    
    // Set message based on percentage
    let message = '';
    let hearts = '';
    
    if (percentage >= 90) {
        message = '❤️ Perfect Match! Soulmates! ❤️';
        hearts = '💕💖💗';
    } else if (percentage >= 70) {
        message = '💕 Great Match! Very Compatible! 💕';
        hearts = '💕💕💕';
    } else if (percentage >= 50) {
        message = '💗 Good Match! You can work it out! 💗';
        hearts = '💗💗💗';
    } else if (percentage >= 30) {
        message = '💔 Average Match. Needs effort! 💔';
        hearts = '💔💔💔';
    } else {
        message = '💔 Difficult Match. But love wins! 💔';
        hearts = '💔💕💔';
    }
    
    loveMessage.textContent = message;
    loveHearts.textContent = hearts;
    
    loveResult.style.display = 'block';
}

function shareLoveResult() {
    const percentage = lovePercentage.textContent;
    const message = loveMessage.textContent;
    const name1 = yourNameInput.value;
    const name2 = partnerNameInput.value;
    
    const shareText = `💕 Love Calculator Result 💕\n${name1} ❤️ ${name2}\nCompatibility: ${percentage}\n${message}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Love Calculator Result',
            text: shareText,
        }).catch(() => {
            navigator.clipboard.writeText(shareText);
            alert('Result copied to clipboard!');
        });
    } else {
        navigator.clipboard.writeText(shareText);
        alert('Result copied to clipboard!');
    }
}

function resetLoveCalculator() {
    partnerNameInput.value = '';
    loveResult.style.display = 'none';
}

// ===== CLEAR CHAT =====
function clearChat() {
    if (confirm('Clear all messages?')) {
        messageArea.innerHTML = '';
        displaySystemMessage('Chat cleared! Start fresh! ✨');
    }
}

// ===== SHARE CHAT =====
function shareChat() {
    const chatText = 'Join me on Jyoti Chat! 💬\nLet\'s chat!';
    
    if (navigator.share) {
        navigator.share({
            title: 'Jyoti Chat',
            text: chatText,
            url: window.location.href,
        }).catch(() => {
            navigator.clipboard.writeText(window.location.href);
            alert('Chat link copied to clipboard!');
        });
    } else {
        navigator.clipboard.writeText(window.location.href);
        alert('Chat link copied to clipboard!');
    }
}

// ===== AVATAR COLOR UTILITY =====
function getAvatarColor(messageSender) {
    const colors = [
        '#667eea', '#764ba2', '#f43f5e', '#8b5cf6',
        '#ec4899', '#d946ef', '#a855f7', '#6366f1'
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

// Love Calculator
if (loveCalculatorBtn) {
    loveCalculatorBtn.addEventListener('click', openLoveCalculator);
}

if (closeCalculator) {
    closeCalculator.addEventListener('click', closeLoveCalculator);
}

if (calculateBtn) {
    calculateBtn.addEventListener('click', calculateLove);
}

if (shareLoveResult) {
    shareLoveResult.addEventListener('click', shareLoveResult);
}

if (resetLoveCalculator) {
    resetLoveCalculator.addEventListener('click', resetLoveCalculator);
}

// Clear Chat
if (clearChatBtn) {
    clearChatBtn.addEventListener('click', clearChat);
}

// Share Chat
if (shareChatBtn) {
    shareChatBtn.addEventListener('click', shareChat);
}

// Reset notifications on interaction
chatPage.addEventListener('click', resetNotifications);
window.addEventListener('focus', resetNotifications);
messageInput.addEventListener('focus', resetNotifications);

// Close modal on outside click
calculatorModal.addEventListener('click', (e) => {
    if (e.target === calculatorModal) {
        closeLoveCalculator();
    }
});

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
=======
usernameForm.addEventListener('submit', connect, true);
messageForm.addEventListener('submit', sendMessage, true);
>>>>>>> 4b555f5a06a86f43b26e5570ee9d13e600c6c3f9
