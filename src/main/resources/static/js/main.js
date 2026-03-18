'use strict';

// State
let stompClient = null;
let username = null;
const imageBtn = document.querySelector('#imageBtn');
const imageInput = document.querySelector('#imageInput');

// DOM Elements
const loginPage = document.querySelector('#login-page');
const usernamePage = document.querySelector('#username-page');
const chatPage = document.querySelector('#chat-page');
const loginForm = document.querySelector('#loginForm');
const usernameForm = document.querySelector('#usernameForm');
const messageForm = document.querySelector('#messageForm');
const messageInput = document.querySelector('#message');
const messageArea = document.querySelector('#messageArea');
const themeToggle = document.querySelector('#theme-toggle');
const sidebar = document.querySelector('#chat-sidebar');
const menuBtn = document.querySelector('#mobile-menu-toggle');
const overlay = document.querySelector('#sidebar-overlay');
const onlineUsersDiv = document.querySelector('#onlineUsers');
const onlineCountSpan = document.querySelector('#online-count');
const typingIndicator = document.querySelector('#typingIndicator');
const typingText = document.querySelector('#typingText');

// 🔐 HARDCODED CREDENTIALS - Sirf yehi chalega
const VALID_CREDENTIALS = {
    username: 'jyoti',
    password: '9028938995'
};

// Store online users
let onlineUsers = new Map();
let typingTimeout = null;

// ========== LOGIN HANDLING WITH VALIDATION ==========
loginForm.addEventListener('submit', function(event) {
    event.preventDefault();
    
    const enteredUsername = document.querySelector('#login-username').value.trim();
    const enteredPassword = document.querySelector('#login-password').value.trim();
    
    // 🎯 Check if credentials match
    if (enteredUsername === VALID_CREDENTIALS.username && 
        enteredPassword === VALID_CREDENTIALS.password) {
        
        // Success - Move to username page
        loginPage.classList.add('hidden');
        usernamePage.classList.remove('hidden');
        
        // Clear fields
        document.querySelector('#login-username').value = '';
        document.querySelector('#login-password').value = '';
        
    } else {
        // ❌ Error - Show beautiful error
        showLoginError('Invalid username or password!');
    }
});

// ========== SHOW ERROR FUNCTION ==========
function showLoginError(message) {
    // Remove existing error if any
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Create error element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    
    // Add to login card
    const loginCard = document.querySelector('#login-page .login-card');
    const form = document.querySelector('#loginForm');
    
    // Insert error before form
    loginCard.insertBefore(errorDiv, form);
    
    // Shake animation on card
    loginCard.style.animation = 'shake 0.5s ease';
    setTimeout(() => {
        loginCard.style.animation = '';
    }, 500);
    
    // Clear password field
    document.querySelector('#login-password').value = '';
    
    // Auto remove error after 3 seconds
    setTimeout(() => {
        if (errorDiv) {
            errorDiv.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => errorDiv.remove(), 300);
        }
    }, 3000);
}

// ========== USERNAME JOIN ==========
usernameForm.addEventListener('submit', function(event) {
    event.preventDefault();
    
    const nameInput = document.querySelector('#name');
    const displayName = nameInput.value.trim();
    
    if (displayName) {
        username = displayName;
        
        usernamePage.classList.add('hidden');
        chatPage.classList.remove('hidden');
        
        // Connect to WebSocket
        connectWebSocket();
        
        // Update avatar
        document.querySelector('#header-avatar').textContent = username.charAt(0).toUpperCase();
    } else {
        // Show error if name is empty
        alert('Please enter your name!');
    }
});

// ========== WEBSOCKET CONNECTION ==========
function connectWebSocket() {
    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);
    
    stompClient.connect({}, function(frame) {
        console.log('Connected: ' + frame);
        
        // Subscribe to public topic
        stompClient.subscribe('/topic/public', onMessageReceived);
        
        // Tell everyone you joined
        stompClient.send("/app/chat.addUser", {}, 
            JSON.stringify({
                sender: username,
                type: 'JOIN'
            })
        );
        
    }, function(error) {
        console.log('Connection error: ' + error);
        showConnectionError();
    });
}

// ========== CONNECTION ERROR ==========
function showConnectionError() {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message connection-error';
    errorDiv.innerHTML = `
        <i class="fas fa-wifi"></i>
        <span>Connection failed! Please check if server is running.</span>
    `;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 4000);
}

// ========== MESSAGE HANDLING ==========
messageForm.addEventListener('submit', function(event) {
    event.preventDefault();
    
    const messageContent = messageInput.value.trim();
    
    if (messageContent && stompClient) {
        const chatMessage = {
            sender: username,
            content: messageContent,
            type: 'CHAT',
            timestamp: new Date().toISOString()
        };
        
        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));
        messageInput.value = '';
    }
});

// ========== RECEIVE MESSAGES ==========
function onMessageReceived(payload) {
    const message = JSON.parse(payload.body);
    
    if (message.type === 'JOIN' || message.type === 'LEAVE') {
        addEventMessage(message);
    } else if (message.type === 'CHAT') {
        addChatMessage(message);
    } 
    // ✅ YEH NAYA BLOCK ADD KARO
    else if (message.type === 'IMAGE') {
        addImageMessage(message);
    }
}

// ========== UI UPDATE FUNCTIONS ==========
function addChatMessage(message) {
    const li = document.createElement('li');
    li.className = `chat-message ${message.sender === username ? 'sent' : 'received'}`;
    
    const time = message.timestamp ? 
        new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 
        'just now';
    
    let nameHtml = '';
    if (message.sender !== username) {
        nameHtml = `<span class="sender-name">${message.sender}</span>`;
    }
    
    li.innerHTML = `
        ${nameHtml}
        <div>${message.content}</div>
        <span class="message-time">${time}</span>
    `;
    
    messageArea.appendChild(li);
    messageArea.scrollTop = messageArea.scrollHeight;
}

function addEventMessage(message) {
    const li = document.createElement('li');
    li.className = 'event-msg';
    
    const action = message.type === 'JOIN' ? 'joined' : 'left';
    const emoji = message.type === 'JOIN' ? '👋' : '👋';
    
    li.textContent = `${emoji} ${message.sender} ${action} the chat`;
    messageArea.appendChild(li);
    messageArea.scrollTop = messageArea.scrollHeight;
    
    // Update online count for join/leave
    if (message.type === 'JOIN') {
        onlineUsers.set(message.sender, true);
    } else {
        onlineUsers.delete(message.sender);
    }
    onlineCountSpan.textContent = onlineUsers.size;
}

// ========== THEME TOGGLE ==========
themeToggle.addEventListener('click', function() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    
    if (isDark) {
        document.documentElement.setAttribute('data-theme', 'light');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
});

themeToggle.innerHTML = '<i class="fas fa-moon"></i>';

// ========== MOBILE MENU ==========
menuBtn.addEventListener('click', function() {
    sidebar.classList.add('active');
    overlay.classList.add('active');
});

overlay.addEventListener('click', function() {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
});

// ========== EMOJI BUTTON ==========
document.querySelector('#emojiBtn').addEventListener('click', function() {
    messageInput.value += ' 😊';
    messageInput.focus();
});

// ========== DISCONNECT HANDLING ==========
window.addEventListener('beforeunload', function() {
    if (stompClient && username) {
        stompClient.send("/app/chat.addUser", {}, 
            JSON.stringify({
                sender: username,
                type: 'LEAVE'
            })
        );
    }
});

// ========== ✅ IMAGE SHARE FUNCTIONALITY ==========
// Yeh sab kuch file ke end me paste karo

// Image button click - file selector open
imageBtn.addEventListener('click', function() {
    imageInput.click();
});

// Image selected
imageInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    
    // Agar file nahi hai to return
    if (!file) return;
    
    // Check - kya WebSocket connected hai?
    if (!stompClient) {
        alert('First connect to chat!');
        return;
    }
    
    // Check file size (max 2MB rakho pehle test ke liye)
    if (file.size > 2 * 1024 * 1024) {
        alert('❌ Image too large! Max 2MB');
        imageInput.value = '';
        return;
    }
    
    // Loading button
    imageBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i>';
    imageBtn.disabled = true;
    
    // Convert to Base64
    const reader = new FileReader();
    
    reader.onload = function(readerEvent) {
        // Base64 image mil gaya
        const base64Image = readerEvent.target.result;
        
        // WebSocket se bhejo
        const chatMessage = {
            sender: username,
            content: base64Image,
            type: 'IMAGE',
            timestamp: new Date().toISOString()
        };
        
        stompClient.send("/app/chat.sendMessage", {}, 
            JSON.stringify(chatMessage));
        
        // Button wapas normal
        imageBtn.innerHTML = '<i class="fas fa-image"></i>';
        imageBtn.disabled = false;
    };
    
    reader.onerror = function() {
        alert('Error reading file');
        imageBtn.innerHTML = '<i class="fas fa-image"></i>';
        imageBtn.disabled = false;
    };
    
    // Read as Data URL
    reader.readAsDataURL(file);
    
    // Clear input
    imageInput.value = '';
});
// ========== ✅ IMAGE MESSAGE DISPLAY ==========
function addImageMessage(message) {
    const li = document.createElement('li');
    li.className = `chat-message ${message.sender === username ? 'sent' : 'received'} image-message`;
    
    const time = message.timestamp ? 
        new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 
        'just now';
    
    let nameHtml = '';
    if (message.sender !== username) {
        nameHtml = `<span class="sender-name">${message.sender}</span>`;
    }
    
    li.innerHTML = `
        ${nameHtml}
        <div class="image-container">
            <img src="${message.content}" 
                 alt="Shared image" 
                 style="max-width: 100%; border-radius: 8px; cursor: pointer;"
                 onclick="window.open(this.src, '_blank')"
                 title="Click to view full size">
        </div>
        <span class="message-time">${time}</span>
    `;
    
    messageArea.appendChild(li);
    messageArea.scrollTop = messageArea.scrollHeight;
}