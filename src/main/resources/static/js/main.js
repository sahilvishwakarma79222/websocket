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
const notificationToggle = document.querySelector('#notification-toggle'); // ADDED
const headerAvatar = document.querySelector('#header-avatar');
const onlineUsersList = document.querySelector('#onlineUsers');
const typingIndicator = document.querySelector('#typingIndicator');
const typingText = document.querySelector('#typingText');
const emojiBtn = document.querySelector('#emojiBtn');
const attachBtn = document.querySelector('#attachBtn');

// State Variables
let stompClient = null;
let username = null;
let onlineUsers = new Set();
let typingTimeout = null;

// ===== NOTIFICATION SYSTEM =====
let notificationsEnabled = true; // Default ON
let unreadCount = 0;
let originalTitle = document.title;
let notificationInterval = null;

// Initialize notification preferences
function initNotifications() {
    // Load from localStorage
    const savedPref = localStorage.getItem('notificationsEnabled');
    if (savedPref !== null) {
        notificationsEnabled = savedPref === 'true';
    }
    updateNotificationButton();
}

// Toggle notifications on/off
function toggleNotifications() {
    notificationsEnabled = !notificationsEnabled;
    localStorage.setItem('notificationsEnabled', notificationsEnabled);
    updateNotificationButton();
    
    // Reset if turning off
    if (!notificationsEnabled) {
        resetNotifications();
    }
    
    // Show toast message
    showToast(notificationsEnabled ? '🔔 Notifications ON' : '🔕 Notifications OFF');
}

// Update notification button icon
function updateNotificationButton() {
    if (!notificationToggle) return;
    
    const icon = notificationToggle.querySelector('i');
    if (notificationsEnabled) {
        icon.className = 'fas fa-bell';
        notificationToggle.title = 'Turn off notifications';
    } else {
        icon.className = 'fas fa-bell-slash';
        notificationToggle.title = 'Turn on notifications';
    }
}

// Show new message notification
function notifyNewMessage(message) {
    // Only notify if:
    // 1. Notifications are enabled
    // 2. Message is from someone else
    // 3. It's a CHAT message (not JOIN/LEAVE)
    if (!notificationsEnabled || message.sender === username || message.type !== 'CHAT') {
        return;
    }
    
    unreadCount++;
    startTitleBlink();
}

// Start title blinking
function startTitleBlink() {
    if (notificationInterval) return; // Already blinking
    
    notificationInterval = setInterval(() => {
        if (unreadCount > 0) {
            // Toggle between original title and notification title
            document.title = document.title === originalTitle 
                ? `📨 (${unreadCount}) New Message` 
                : originalTitle;
        }
    }, 800); // Blink every 800ms
}

// Reset notifications (when user focuses on chat)
function resetNotifications() {
    unreadCount = 0;
    
    if (notificationInterval) {
        clearInterval(notificationInterval);
        notificationInterval = null;
    }
    
    document.title = originalTitle;
}

// Show toast message
function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--surface-color);
        color: var(--text-primary);
        padding: 8px 16px;
        border-radius: 20px;
        box-shadow: var(--shadow);
        z-index: 1000;
        animation: slideUp 0.3s ease, fadeOut 0.3s ease 2s forwards;
        font-size: 14px;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 2300);
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

// ===== CONNECTION FUNCTIONS =====
function connect(event) {
    username = document.querySelector('#name').value.trim();
    
    if(username) {
        // Update header avatar
        headerAvatar.textContent = username.charAt(0).toUpperCase();
        
        // Show chat page with animation
        usernamePage.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            usernamePage.classList.add('hidden');
            chatPage.classList.remove('hidden');
            chatPage.style.animation = 'fadeIn 0.3s ease';
        }, 300);

        // Initialize WebSocket connection
        const socket = new SockJS('/ws');
        stompClient = Stomp.over(socket);
        
        // Disable debug logs
        stompClient.debug = null;
        
        stompClient.connect({}, onConnected, onError);
    }
    event.preventDefault();
}

function onConnected() {
    // Subscribe to public topic
    stompClient.subscribe('/topic/public', onMessageReceived);
    
    // Subscribe to user join/leave events
    stompClient.subscribe('/topic/users', onUserListUpdate);
    
    // Tell server about new user
    stompClient.send("/app/chat.addUser",
        {},
        JSON.stringify({sender: username, type: 'JOIN'})
    );
    
    // Hide connecting indicator
    connectingElement.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => {
        connectingElement.classList.add('hidden');
    }, 300);
    
    // Add current user to online list
    onlineUsers.add(username);
    updateOnlineUsersList();
    
    // Show welcome message
    showSystemMessage(`Welcome, ${username}! 👋`);
    
    // Reset notifications when connected
    resetNotifications();
}

function onError(error) {
    connectingElement.innerHTML = `
        <i class="fas fa-exclamation-circle" style="color: #f56565;"></i>
        <span style="color: #f56565;">Connection failed! Please refresh.</span>
    `;
    connectingElement.style.color = '#f56565';
    connectingElement.style.background = 'rgba(245, 101, 101, 0.1)';
}

// ===== MESSAGE HANDLING =====
function sendMessage(event) {
    const messageContent = messageInput.value.trim();
    
    if(messageContent && stompClient) {
        // Create message object
        const chatMessage = {
            sender: username,
            content: messageContent,
            type: 'CHAT',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        // Send message
        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));
        
        // Clear input
        messageInput.value = '';
        
        // Remove typing indicator
        stopTyping();
    }
    event.preventDefault();
}

function onMessageReceived(payload) {
    const message = JSON.parse(payload.body);
    
    if(message.type === 'JOIN') {
        // Handle user join
        onlineUsers.add(message.sender);
        updateOnlineUsersList();
        showSystemMessage(`${message.sender} joined the chat! 🎉`);
        
    } else if (message.type === 'LEAVE') {
        // Handle user leave
        onlineUsers.delete(message.sender);
        updateOnlineUsersList();
        showSystemMessage(`${message.sender} left the chat! 👋`);
        
    } else {
        // Handle chat message
        displayChatMessage(message);
        
        // ===== CALL NOTIFICATION HERE =====
        notifyNewMessage(message);
    }
    
    // Play notification sound for new messages (if not from self)
    if (message.sender !== username && message.type === 'CHAT') {
        playNotificationSound();
    }
}

function displayChatMessage(message) {
    const messageElement = document.createElement('li');
    messageElement.classList.add('chat-message');
    
    // Determine if message is sent by current user
    const isSentByMe = message.sender === username;
    messageElement.classList.add(isSentByMe ? 'sent' : 'received');
    
    // Create message wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper';
    
    // Add avatar
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = message.sender.charAt(0).toUpperCase();
    avatar.style.background = getAvatarColor(message.sender);
    
    // Create message bubble
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    
    // Add sender name (for received messages)
    if (!isSentByMe) {
        const sender = document.createElement('div');
        sender.className = 'message-sender';
        sender.textContent = message.sender;
        bubble.appendChild(sender);
    }
    
    // Add message content
    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = message.content;
    bubble.appendChild(content);
    
    // Add timestamp
    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = message.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    bubble.appendChild(time);
    
    // Assemble message
    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);
    messageElement.appendChild(wrapper);
    
    // Add to message area
    messageArea.appendChild(messageElement);
    
    // Scroll to bottom
    messageArea.scrollTop = messageArea.scrollHeight;
}

function showSystemMessage(text) {
    const messageElement = document.createElement('li');
    messageElement.classList.add('event-message');
    
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    
    messageElement.appendChild(paragraph);
    messageArea.appendChild(messageElement);
    
    // Scroll to bottom
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
    
    // Update online count
    document.querySelector('#online-count').textContent = onlineUsers.size;
    
    // Sort users alphabetically
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
    
    // Clear existing timeout
    if (typingTimeout) {
        clearTimeout(typingTimeout);
    }
    
    // Show typing indicator (simulated locally)
    showTypingIndicator(username);
    
    // Set timeout to hide typing indicator
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

// ===== EMOJI PICKER (SIMULATED) =====
function showEmojiPicker() {
    // Simple emoji picker simulation
    const emojis = ['😊', '😂', '❤️', '👍', '🎉', '🔥', '✨', '💯'];
    
    // Create emoji picker container
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
    
    // Remove existing picker if any
    const existingPicker = document.querySelector('#emojiPicker');
    if (existingPicker) {
        existingPicker.remove();
    }
    
    // Add picker to DOM
    document.querySelector('.chat-content').appendChild(picker);
    
    // Remove picker when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function removePicker(e) {
            if (!picker.contains(e.target) && e.target !== emojiBtn) {
                picker.remove();
                document.removeEventListener('click', removePicker);
            }
        });
    }, 100);
}

// ===== FILE ATTACHMENT (SIMULATED) =====
function handleFileAttachment() {
    // Simulate file attachment
    alert('📎 File attachment feature coming soon!');
}

// ===== NOTIFICATION SOUND =====
function playNotificationSound() {
    // Only play sound if notifications are enabled
    if (!notificationsEnabled) return;
    
    // Create audio context for notification sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create oscillator for a simple beep
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5 note
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
}

// ===== AVATAR COLOR UTILITY =====
function getAvatarColor(messageSender) {
    let hash = 0;
    for (let i = 0; i < messageSender.length; i++) {
        hash = 31 * hash + messageSender.charCodeAt(i);
    }
    const index = Math.abs(hash % colors.length);
    return colors[index];
}

// Color palette for avatars
const colors = [
    '#667eea', '#764ba2', '#f56565', '#48bb78',
    '#4299e1', '#ed8936', '#9f7aea', '#fc8181'
];

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNotifications(); // Initialize notifications
    
    // Add welcome animation
    document.querySelector('.username-page-container').style.animation = 'slideUp 0.6s ease';
});

// ===== EVENT LISTENERS =====
usernameForm.addEventListener('submit', connect, true);
messageForm.addEventListener('submit', sendMessage, true);

// Typing indicator
messageInput.addEventListener('input', handleTyping);

// Theme toggle
if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
}

// NOTIFICATION TOGGLE - ADD THIS
if (notificationToggle) {
    notificationToggle.addEventListener('click', toggleNotifications);
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

// Reset notifications when user interacts with chat
chatPage.addEventListener('click', () => {
    resetNotifications();
});

window.addEventListener('focus', () => {
    resetNotifications();
});

messageInput.addEventListener('focus', () => {
    resetNotifications();
});

// Enter key to send (already handled by form submit)
// Click outside to close emoji picker
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

// Add CSS animation for fadeOut
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translate(-50%, 20px);
        }
        to {
            opacity: 1;
            transform: translate(-50%, 0);
        }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);