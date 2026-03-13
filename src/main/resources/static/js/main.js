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