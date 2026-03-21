
'use strict';

// State
let stompClient = null;
let username = null;
const imageBtn = document.querySelector('#imageBtn');
const imageInput = document.querySelector('#imageInput');

// ========== VOICE CALL VARIABLES ==========
let peerConnection = null;
let localStream = null;
let currentCall = null;
let callTimer = null;
let callSeconds = 0;
let isMuted = false;
let isSpeakerOn = false;

// WebRTC Configuration - EK BAAR GLOBALLY DEFINE KARO
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
    ],
    iceCandidatePoolSize: 10
};

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

// DOM Elements for calls
const callBtn = document.querySelector('#callBtn');
const callModal = document.querySelector('#callModal');
const closeCallModal = document.querySelector('#closeCallModal');
const callStatus = document.querySelector('#callStatus');
const callTimerEl = document.querySelector('#callTimer');
const callWithEl = document.querySelector('#callWith');
const muteBtn = document.querySelector('#muteBtn');
const endCallBtn = document.querySelector('#endCallBtn');
const speakerBtn = document.querySelector('#speakerBtn');
const incomingCallPopup = document.querySelector('#incomingCallPopup');
const callerName = document.querySelector('#callerName');
const acceptCallBtn = document.querySelector('#acceptCallBtn');
const rejectCallBtn = document.querySelector('#rejectCallBtn');

// Microphone Permission Modal Elements
const micModal = document.querySelector('#micPermissionModal');
const micAllowBtn = document.querySelector('#micAllowBtn');
const micNotAllowBtn = document.querySelector('#micNotAllowBtn');
const micPermissionHint = document.querySelector('#micPermissionHint');
const retryPermissionBtn = document.querySelector('#retryPermissionBtn');
const micPermissionMessage = document.querySelector('#micPermissionMessage');

// Store pending call info
let pendingCallTarget = null;

// 🔐 HARDCODED CREDENTIALS
const VALID_CREDENTIALS = {
    username: 'jyoti',
    password: '9028938995'
};

// Store online users
let onlineUsers = new Map();
let typingTimeout = null;

// ========== LOGIN HANDLING ==========
loginForm.addEventListener('submit', function(event) {
    event.preventDefault();
    
    const enteredUsername = document.querySelector('#login-username').value.trim();
    const enteredPassword = document.querySelector('#login-password').value.trim();
    
    if (enteredUsername === VALID_CREDENTIALS.username && 
        enteredPassword === VALID_CREDENTIALS.password) {
        
        loginPage.classList.add('hidden');
        usernamePage.classList.remove('hidden');
        
        document.querySelector('#login-username').value = '';
        document.querySelector('#login-password').value = '';
        
    } else {
        showLoginError('Invalid username or password!');
    }
});

function showLoginError(message) {
    const existingError = document.querySelector('.error-message');
    if (existingError) existingError.remove();
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    
    const loginCard = document.querySelector('#login-page .login-card');
    const form = document.querySelector('#loginForm');
    loginCard.insertBefore(errorDiv, form);
    
    loginCard.style.animation = 'shake 0.5s ease';
    setTimeout(() => loginCard.style.animation = '', 500);
    
    document.querySelector('#login-password').value = '';
    
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
        
        connectWebSocket();
        document.querySelector('#header-avatar').textContent = username.charAt(0).toUpperCase();
    } else {
        alert('Please enter your name!');
    }
});

// ========== WEBSOCKET CONNECTION ==========
function connectWebSocket() {
    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);
    
    stompClient.connect({}, function(frame) {
        console.log('Connected: ' + frame);
        
        // Subscribe to public topic only
        stompClient.subscribe('/topic/public', onMessageReceived);
        
        // Send JOIN message
        stompClient.send("/app/chat.addUser", {}, 
            JSON.stringify({
                sender: username,
                type: 'JOIN'
            })
        );
        
        // Load note
        loadNote();
        
    }, function(error) {
        console.log('Connection error: ' + error);
        showConnectionError();
    });
}

function showConnectionError() {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message connection-error';
    errorDiv.innerHTML = `
        <i class="fas fa-wifi"></i>
        <span>Connection failed! Please check if server is running.</span>
    `;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 4000);
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
    console.log('📩 Received:', message.type, 'from:', message.sender);
    
    if (message.type === 'JOIN') {
        addEventMessage(message);
        onlineUsers.set(message.sender, true);
        updateUI();
        
    } else if (message.type === 'LEAVE') {
        addEventMessage(message);
        onlineUsers.delete(message.sender);
        updateUI();
        
    } else if (message.type === 'USER_LIST') {
        // 🔥 NEW: Update full user list
        updateUserListFromServer(message.content);
        
    } else if (message.type === 'CHAT') {
        addChatMessage(message);
        
    } else if (message.type === 'IMAGE') {
        addImageMessage(message);
        
    } 
    // Voice call messages
    else if (message.type === 'CALL_REQUEST') {
        handleIncomingCall(message);
    } else if (message.type === 'CALL_ACCEPT') {
        handleCallAccept(message);
    } else if (message.type === 'CALL_REJECT') {
        handleCallReject(message);
    } else if (message.type === 'CALL_END') {
        handleCallEnd(message);
    } else if (message.type === 'OFFER') {
        handleOffer(message);
    } else if (message.type === 'ANSWER') {
        handleAnswer(message);
    } else if (message.type === 'ICE_CANDIDATE') {
        handleIceCandidate(message);
    }
}

// Update UI (online count and user list)
function updateUI() {
    onlineCountSpan.textContent = onlineUsers.size;
    updateOnlineUsersList();
}

// Update user list from server
function updateUserListFromServer(userListString) {
    if (!userListString || userListString === "") return;
    
    const users = userListString.split(',');
    
    // Clear existing users
    onlineUsers.clear();
    
    // Add all users from server
    users.forEach(user => {
        if (user && user.trim() !== "") {
            onlineUsers.set(user.trim(), true);
        }
    });
    
    // Update UI
    updateUI();
    
    console.log('📋 Updated user list:', Array.from(onlineUsers.keys()));
}


// Handle existing users list when new user joins
function handleUserList(message) {
    console.log('📋 Received user list:', message.content);
    
    if (message.content && message.content !== "") {
        const users = message.content.split(',');
        
        users.forEach(user => {
            if (user && user !== username) {
                onlineUsers.set(user, true);
                
                // Show welcome message for existing users
                const welcomeMsg = {
                    sender: user,
                    type: 'JOIN',
                    content: ''
                };
                addEventMessage(welcomeMsg);
            }
        });
        
        onlineCountSpan.textContent = onlineUsers.size;
        updateOnlineUsersList();
        
        console.log(`✅ Loaded ${onlineUsers.size} existing users`);
    }
}

function updateOnlineUsersList() {
    if (!onlineUsersDiv) return;
    
    let html = '';
    onlineUsers.forEach((_, user) => {
        const isCurrent = user === username;
        html += `
            <div class="user-item">
                <div class="avatar small" style="width: 32px; height: 32px; font-size: 0.9rem;">
                    ${user.charAt(0).toUpperCase()}
                </div>
                <span>${user} ${isCurrent ? '(You)' : ''}</span>
                <span class="dot" style="margin-left: auto;"></span>
            </div>
        `;
    });
    
    onlineUsersDiv.innerHTML = html || '<div style="padding: 15px; color: var(--text-light);">No one online</div>';
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
        stompClient.send("/app/chat.removeUser", {}, 
            JSON.stringify({
                sender: username,
                type: 'LEAVE'
            })
        );
    }
});

// ========== IMAGE SHARE FUNCTIONALITY ==========
imageBtn.addEventListener('click', function() {
    imageInput.click();
});

imageInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    
    if (!file) return;
    if (!stompClient) {
        alert('First connect to chat!');
        return;
    }
    if (file.size > 2 * 1024 * 1024) {
        alert('❌ Image too large! Max 2MB');
        imageInput.value = '';
        return;
    }
    
    imageBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i>';
    imageBtn.disabled = true;
    
    const reader = new FileReader();
    
    reader.onload = function(readerEvent) {
        const base64Image = readerEvent.target.result;
        
        const chatMessage = {
            sender: username,
            content: base64Image,
            type: 'IMAGE',
            timestamp: new Date().toISOString()
        };
        
        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));
        
        imageBtn.innerHTML = '<i class="fas fa-image"></i>';
        imageBtn.disabled = false;
    };
    
    reader.onerror = function() {
        alert('Error reading file');
        imageBtn.innerHTML = '<i class="fas fa-image"></i>';
        imageBtn.disabled = false;
    };
    
    reader.readAsDataURL(file);
    imageInput.value = '';
});

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

// ========== VOICE CALL FUNCTIONS ==========

// Call button click
callBtn.addEventListener('click', function() {
    if (!stompClient) {
        alert('Connect to chat first!');
        return;
    }
    showUserListForCall();
});

// Show online users for call
function showUserListForCall() {
    const users = Array.from(onlineUsers.keys()).filter(user => user !== username);
    
    console.log('Online Users:', users);
    
    if (users.length === 0) {
        alert('❌ No other users online!');
        return;
    }
    
    const userListDiv = document.createElement('div');
    userListDiv.className = 'user-select-modal';
    userListDiv.innerHTML = `
        <div class="user-select-content">
            <h3>Select user to call</h3>
            <div class="user-select-list">
                ${users.map(user => `
                    <div class="user-select-item" data-user="${user}">
                        <div class="user-avatar-small">${user.charAt(0).toUpperCase()}</div>
                        <span>${user}</span>
                    </div>
                `).join('')}
            </div>
            <button class="close-select-btn">Cancel</button>
        </div>
    `;
    
    document.body.appendChild(userListDiv);
    
    userListDiv.querySelectorAll('.user-select-item').forEach(item => {
        item.addEventListener('click', function() {
            const selectedUser = this.dataset.user;
            document.body.removeChild(userListDiv);
            checkMicrophonePermission(selectedUser);
        });
    });
    
    userListDiv.querySelector('.close-select-btn').addEventListener('click', function() {
        document.body.removeChild(userListDiv);
    });
}

// Check Microphone Permission
async function checkMicrophonePermission(targetUser) {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('❌ Your browser does not support audio calls! Use Chrome/Firefox/Edge.');
            return;
        }
        
        try {
            const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
            
            if (permissionStatus.state === 'granted') {
                startCall(targetUser);
            } else if (permissionStatus.state === 'prompt') {
                showMicPermissionPopup(targetUser);
            } else if (permissionStatus.state === 'denied') {
                showMicDeniedPopup(targetUser);
            }
            
            permissionStatus.onchange = () => {
                if (permissionStatus.state === 'granted' && pendingCallTarget) {
                    micModal.classList.add('hidden');
                    startCall(pendingCallTarget);
                    pendingCallTarget = null;
                }
            };
            
        } catch (permErr) {
            showMicPermissionPopup(targetUser);
        }
        
    } catch (err) {
        console.error('❌ Browser check error:', err);
        showMicPermissionPopup(targetUser);
    }
}

function showMicPermissionPopup(targetUser) {
    pendingCallTarget = targetUser;
    micPermissionMessage.textContent = 'Voice call ke liye microphone access chahiye. "Allow Microphone" button click karo.';
    micPermissionHint.classList.add('hidden');
    micModal.classList.remove('hidden');
}

function showMicDeniedPopup(targetUser) {
    pendingCallTarget = targetUser;
    micPermissionMessage.textContent = 'Microphone access pehle deny kar diya tha. Browser settings se allow karo:';
    micPermissionHint.classList.remove('hidden');
    micModal.classList.remove('hidden');
}

micAllowBtn.addEventListener('click', async function() {
    if (!pendingCallTarget) {
        micModal.classList.add('hidden');
        return;
    }
    
    try {
        micAllowBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Requesting...';
        micAllowBtn.disabled = true;
        
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tempStream.getTracks().forEach(track => track.stop());
        
        micModal.classList.add('hidden');
        startCall(pendingCallTarget);
        pendingCallTarget = null;
        
    } catch (err) {
        if (err.name === 'NotAllowedError') {
            micPermissionMessage.textContent = 'Aapne microphone access block kar diya. Browser settings se allow karo:';
            micPermissionHint.classList.remove('hidden');
        } else {
            alert('Microphone error: ' + err.message);
            micModal.classList.add('hidden');
        }
    } finally {
        micAllowBtn.innerHTML = '<i class="fas fa-check-circle"></i> Allow Microphone';
        micAllowBtn.disabled = false;
    }
});

micNotAllowBtn.addEventListener('click', function() {
    micModal.classList.add('hidden');
    pendingCallTarget = null;
    alert('❌ Microphone access required for voice call. Call cancelled.');
});

retryPermissionBtn.addEventListener('click', async function() {
    try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tempStream.getTracks().forEach(track => track.stop());
        
        micModal.classList.add('hidden');
        if (pendingCallTarget) {
            startCall(pendingCallTarget);
            pendingCallTarget = null;
        }
    } catch (err) {
        alert('Still not allowed. Please follow browser instructions above.');
    }
});

// ========== START CALL ==========
async function startCall(targetUser) {
    try {
        console.log('🚀 Starting call to:', targetUser);
        
        if (!stompClient) {
            alert('WebSocket not connected!');
            return;
        }
        
        callModal.classList.remove('hidden');
        callStatus.textContent = 'Requesting microphone...';
        callWithEl.textContent = targetUser;
        
        localStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }, 
            video: false 
        });
        
        console.log('✅ Microphone access granted!');
        callStatus.textContent = 'Creating connection...';
        
        peerConnection = new RTCPeerConnection(configuration);
        
        localStream.getAudioTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
        
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('📡 ICE candidate generated');
                stompClient.send("/app/chat.sendMessage", {}, JSON.stringify({
                    type: 'ICE_CANDIDATE',
                    sender: username,
                    target: targetUser,
                    content: JSON.stringify(event.candidate)
                }));
            }
        };
        
        peerConnection.oniceconnectionstatechange = () => {
            console.log('🔄 ICE State:', peerConnection.iceConnectionState);
            if (peerConnection.iceConnectionState === 'connected') {
                callStatus.textContent = 'Connected';
            } else if (peerConnection.iceConnectionState === 'disconnected') {
                callStatus.textContent = 'Disconnected';
            } else if (peerConnection.iceConnectionState === 'failed') {
                callStatus.textContent = 'Connection failed';
                setTimeout(() => endCall(), 2000);
            }
        };
        
        peerConnection.ontrack = (event) => {
            console.log('📻 Received remote audio track');
            if (!document.getElementById('remoteAudio')) {
                const remoteAudio = document.createElement('audio');
                remoteAudio.id = 'remoteAudio';
                remoteAudio.autoplay = true;
                remoteAudio.controls = false;
                remoteAudio.style.display = 'none';
                document.body.appendChild(remoteAudio);
            }
            
            const remoteAudio = document.getElementById('remoteAudio');
            remoteAudio.srcObject = event.streams[0];
            remoteAudio.play().catch(e => console.log('Audio play error:', e));
        };
        
        const offer = await peerConnection.createOffer({
            offerToReceiveAudio: true
        });
        
        await peerConnection.setLocalDescription(offer);
        
        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify({
            type: 'CALL_REQUEST',
            sender: username,
            target: targetUser
        }));
        
        currentCall = targetUser;
        
        setTimeout(() => {
            if (peerConnection && peerConnection.localDescription) {
                console.log('📤 Sending OFFER to:', targetUser);
                stompClient.send("/app/chat.sendMessage", {}, JSON.stringify({
                    type: 'OFFER',
                    sender: username,
                    target: targetUser,
                    content: JSON.stringify(peerConnection.localDescription)
                }));
            }
        }, 500);
        
        startTimer();
        console.log('🎉 Call initiated, waiting for answer...');
        
    } catch (err) {
        console.error('❌ Error in startCall:', err);
        alert('Call failed: ' + err.message);
        callModal.classList.add('hidden');
        if (localStream) {
            localStream.getTracks().forEach(t => t.stop());
            localStream = null;
        }
    }
}

// ========== HANDLE INCOMING CALL ==========
function handleIncomingCall(message) {
    if (message.target !== username) return;
    console.log('📞 Incoming call from:', message.sender);
    
    callerName.textContent = message.sender;
    incomingCallPopup.classList.remove('hidden');
}

// ========== ACCEPT CALL ==========
acceptCallBtn.addEventListener('click', async function() {
    const caller = callerName.textContent;
    incomingCallPopup.classList.add('hidden');
    
    try {
        console.log('Accepting call from:', caller);
        
        callModal.classList.remove('hidden');
        callStatus.textContent = 'Requesting microphone...';
        callWithEl.textContent = caller;
        
        localStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true
            }, 
            video: false 
        });
        
        console.log('✅ Microphone access granted!');
        callStatus.textContent = 'Connecting...';
        
        peerConnection = new RTCPeerConnection(configuration);
        
        localStream.getAudioTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
        
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                stompClient.send("/app/chat.sendMessage", {}, JSON.stringify({
                    type: 'ICE_CANDIDATE',
                    sender: username,
                    target: caller,
                    content: JSON.stringify(event.candidate)
                }));
            }
        };
        
        peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE State:', peerConnection.iceConnectionState);
            if (peerConnection.iceConnectionState === 'connected') {
                callStatus.textContent = 'Connected';
            }
        };
        
        peerConnection.ontrack = (event) => {
            console.log('📻 Received remote audio track');
            if (!document.getElementById('remoteAudio')) {
                const remoteAudio = document.createElement('audio');
                remoteAudio.id = 'remoteAudio';
                remoteAudio.autoplay = true;
                remoteAudio.style.display = 'none';
                document.body.appendChild(remoteAudio);
            }
            const remoteAudio = document.getElementById('remoteAudio');
            remoteAudio.srcObject = event.streams[0];
        };
        
        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify({
            type: 'CALL_ACCEPT',
            sender: username,
            target: caller
        }));
        
        currentCall = caller;
        startTimer();
        
    } catch (err) {
        console.error('Error accepting call:', err);
        alert('Could not access microphone: ' + err.message);
        callModal.classList.add('hidden');
    }
});

// ========== REJECT CALL ==========
rejectCallBtn.addEventListener('click', function() {
    const caller = callerName.textContent;
    incomingCallPopup.classList.add('hidden');
    
    stompClient.send("/app/chat.sendMessage", {}, JSON.stringify({
        type: 'CALL_REJECT',
        sender: username,
        target: caller
    }));
});

// ========== HANDLE OFFER ==========
async function handleOffer(message) {
    if (message.target !== username) return;
    
    console.log('📞 Received OFFER from:', message.sender);
    
    // Store the offer for when user accepts
    window.pendingOffer = {
        sender: message.sender,
        offer: JSON.parse(message.content)
    };
}

// ========== HANDLE ANSWER ==========
async function handleAnswer(message) {
    if (message.target !== username || !peerConnection) return;
    
    console.log('📞 Received ANSWER from:', message.sender);
    const answer = JSON.parse(message.content);
    await peerConnection.setRemoteDescription(answer);
}

// ========== HANDLE ICE CANDIDATE ==========
async function handleIceCandidate(message) {
    if (message.target !== username || !peerConnection) return;
    
    const candidate = JSON.parse(message.content);
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
}

// ========== HANDLE CALL ACCEPT ==========
function handleCallAccept(message) {
    if (message.target !== username) return;
    console.log('✅ Call accepted by:', message.sender);
    callStatus.textContent = 'Connected';
}

// ========== HANDLE CALL REJECT ==========
function handleCallReject(message) {
    if (message.target !== username) return;
    alert(`${message.sender} rejected the call`);
    endCall();
}

// ========== HANDLE CALL END ==========
function handleCallEnd(message) {
    if (message.target !== username && message.sender !== currentCall) return;
    endCall();
}

// ========== END CALL ==========
function endCall() {
    console.log('Ending call...');
    
    if (callTimer) {
        clearInterval(callTimer);
        callTimer = null;
    }
    
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    if (localStream) {
        localStream.getAudioTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    const remoteAudio = document.getElementById('remoteAudio');
    if (remoteAudio) {
        remoteAudio.srcObject = null;
        remoteAudio.remove();
    }
    
    callModal.classList.add('hidden');
    incomingCallPopup.classList.add('hidden');
    
    if (currentCall) {
        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify({
            type: 'CALL_END',
            sender: username,
            target: currentCall
        }));
    }
    
    currentCall = null;
    callSeconds = 0;
}

endCallBtn.addEventListener('click', endCall);
closeCallModal.addEventListener('click', endCall);

// ========== TIMER FUNCTIONS ==========
function startTimer() {
    callSeconds = 0;
    updateTimerDisplay();
    
    if (callTimer) clearInterval(callTimer);
    callTimer = setInterval(() => {
        callSeconds++;
        updateTimerDisplay();
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(callSeconds / 60);
    const seconds = callSeconds % 60;
    callTimerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// ========== MUTE TOGGLE ==========
muteBtn.addEventListener('click', function() {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            isMuted = !isMuted;
            audioTrack.enabled = !isMuted;
            muteBtn.innerHTML = isMuted ? 
                '<i class="fas fa-microphone-slash"></i>' : 
                '<i class="fas fa-microphone"></i>';
            muteBtn.classList.toggle('muted', isMuted);
        }
    }
});

// ========== SPEAKER TOGGLE ==========
speakerBtn.addEventListener('click', function() {
    isSpeakerOn = !isSpeakerOn;
    speakerBtn.innerHTML = isSpeakerOn ? 
        '<i class="fas fa-volume-up"></i>' : 
        '<i class="fas fa-volume-mute"></i>';
    speakerBtn.classList.toggle('speaker-on', isSpeakerOn);
});



// ========== NOTE FUNCTIONALITY ==========
let currentNote = '';

// Load note from backend
async function loadNote() {
    try {
        const response = await fetch('/api/notes');
        const data = await response.json();
        
        currentNote = data.content;
        
        const noteBanner = document.getElementById('noteBanner');
        const noteText = document.getElementById('noteText');
        const noteUpdatedBy = document.getElementById('noteUpdatedBy');
        const noteUpdatedTime = document.getElementById('noteUpdatedTime');
        
        if (noteBanner) {
            noteBanner.classList.remove('hidden');
            noteText.textContent = data.content;
            
            if (data.lastUpdatedBy) {
                noteUpdatedBy.innerHTML = `<i class="fas fa-user"></i> ${data.lastUpdatedBy}`;
            } else {
                noteUpdatedBy.innerHTML = `<i class="fas fa-user"></i> system`;
            }
            
            if (data.lastUpdated) {
                noteUpdatedTime.innerHTML = `<i class="fas fa-clock"></i> ${data.lastUpdated}`;
            } else {
                noteUpdatedTime.innerHTML = `<i class="fas fa-clock"></i> Just now`;
            }
        }
        
    } catch (error) {
        console.error('Error loading note:', error);
        const noteText = document.getElementById('noteText');
        if (noteText) {
            noteText.textContent = '✨ Welcome to JyoSah Chat! ✨';
        }
    }
}

// Show edit note modal
function showEditNoteModal() {
    // Create modal if not exists
    let modal = document.getElementById('editNoteModal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'editNoteModal';
        modal.className = 'edit-note-modal hidden';
        modal.innerHTML = `
            <div class="edit-note-modal-content">
                <h3><i class="fas fa-edit"></i> Edit Note</h3>
                <textarea id="noteInput" placeholder="Write your note here... (max 500 chars)" maxlength="500"></textarea>
                <div class="char-counter">
                    <span id="charCount">0</span>/500 characters
                </div>
                <div class="modal-buttons">
                    <button class="save-note-btn">💾 Save Note</button>
                    <button class="cancel-note-btn">❌ Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Character counter
        const textarea = modal.querySelector('#noteInput');
        const charCount = modal.querySelector('#charCount');
        
        textarea.addEventListener('input', () => {
            charCount.textContent = textarea.value.length;
        });
        
        // Save button
        modal.querySelector('.save-note-btn').addEventListener('click', saveNote);
        
        // Cancel button
        modal.querySelector('.cancel-note-btn').addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }
    
    // Set current note in textarea
    const textarea = document.getElementById('noteInput');
    const charCount = document.getElementById('charCount');
    
    if (textarea) {
        textarea.value = currentNote;
        if (charCount) charCount.textContent = currentNote.length;
    }
    
    modal.classList.remove('hidden');
}

// Save note to backend
async function saveNote() {
    const textarea = document.getElementById('noteInput');
    const newNote = textarea.value.trim();
    
    if (!newNote) {
        showToast('Note cannot be empty!', 'error');
        return;
    }
    
    if (newNote.length > 500) {
        showToast('Note too long! Maximum 500 characters.', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/notes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: newNote,
                username: username || 'Anonymous'
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            currentNote = newNote;
            
            // Update UI
            const noteText = document.getElementById('noteText');
            const noteUpdatedBy = document.getElementById('noteUpdatedBy');
            const noteUpdatedTime = document.getElementById('noteUpdatedTime');
            
            if (noteText) noteText.textContent = newNote;
            if (noteUpdatedBy) noteUpdatedBy.innerHTML = `<i class="fas fa-user"></i> ${username || 'Anonymous'}`;
            if (noteUpdatedTime) {
                const now = new Date();
                const formattedTime = now.toLocaleString('en-IN', { 
                    day: 'numeric', 
                    month: 'short', 
                    year: 'numeric',
                    hour: '2-digit', 
                    minute: '2-digit'
                });
                noteUpdatedTime.innerHTML = `<i class="fas fa-clock"></i> ${formattedTime}`;
            }
            
            // Close modal
            const modal = document.getElementById('editNoteModal');
            if (modal) modal.classList.add('hidden');
            
            // Show success message
            showToast('✅ Note updated successfully!', 'success');
            
        } else {
            showToast(data.error || 'Failed to update note', 'error');
        }
        
    } catch (error) {
        console.error('Error saving note:', error);
        showToast('Failed to save note. Check connection.', 'error');
    }
}

// Toast notification function
function showToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add edit button event listener
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', (e) => {
        const editBtn = e.target.closest('#editNoteBtn');
        if (editBtn) {
            if (username) {
                showEditNoteModal();
            } else {
                showToast('Please login first to edit note', 'error');
            }
        }
    });
});
