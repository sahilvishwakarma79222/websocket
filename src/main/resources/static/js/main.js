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

// WebRTC Configuration
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};


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
        
        // ✅ Update onlineUsers Map
        if (message.type === 'JOIN') {
            onlineUsers.set(message.sender, true);
        } else if (message.type === 'LEAVE') {
            onlineUsers.delete(message.sender);
        }
        
        // Update count
        onlineCountSpan.textContent = onlineUsers.size;
        
        // Update sidebar users list
        updateOnlineUsersList();
        
    } else if (message.type === 'CHAT') {
        addChatMessage(message);
    } else if (message.type === 'IMAGE') {
        addImageMessage(message);
    } 
    // 📞 Voice Call Messages
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

// ✅ Add this function if not present
function updateOnlineUsersList() {
    const onlineUsersDiv = document.querySelector('#onlineUsers');
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



// ========== VOICE CALL FUNCTIONS ==========

// Call button click
callBtn.addEventListener('click', function() {
    if (!stompClient) {
        alert('Connect to chat first!');
        return;
    }
    
    // Show online users list
    showUserListForCall();
});

// ========== FIXED: Show online users for call ==========
function showUserListForCall() {
    // ✅ ONLINE USERS MAP se users lo (DOM se nahi)
    const users = Array.from(onlineUsers.keys()).filter(user => user !== username);
    
    console.log('Online Users Map:', onlineUsers);
    console.log('Current User:', username);
    console.log('Available Users:', users);
    
    if (users.length === 0) {
        alert('❌ No other users online!');
        return;
    }
    
    // Create a better user selection UI
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
    
    // Add click handlers
    userListDiv.querySelectorAll('.user-select-item').forEach(item => {
        item.addEventListener('click', function() {
            const selectedUser = this.dataset.user;
            document.body.removeChild(userListDiv);
            startCall(selectedUser);
        });
    });
    
    userListDiv.querySelector('.close-select-btn').addEventListener('click', function() {
        document.body.removeChild(userListDiv);
    });
}

// Start call
// ========== COMPLETE FIXED: startCall ==========
async function startCall(targetUser) {
    try {
        console.log('🚀 Starting call to:', targetUser);
        
        // ✅ Check 1: WebSocket connected?
        if (!stompClient) {
            alert('WebSocket not connected!');
            return;
        }
        
        // ✅ Check 2: Browser support?
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('❌ Your browser does not support audio calls! Use Chrome/Firefox/Edge.');
            return;
        }
        
        // ✅ Check 3: Target valid?
        if (!targetUser) {
            alert('No user selected');
            return;
        }
        
        // Show call modal
        callModal.classList.remove('hidden');
        callStatus.textContent = 'Requesting microphone...';
        callWithEl.textContent = targetUser;
        
        // ✅ Step 1: Get microphone with clear error handling
        try {
            console.log('📢 Requesting microphone access...');
            localStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }, 
                video: false 
            });
            console.log('✅ Microphone access granted!');
            callStatus.textContent = 'Microphone ready...';
        } catch (micErr) {
            console.error('❌ Microphone error:', micErr);
            
            if (micErr.name === 'NotAllowedError') {
                alert('❌ Microphone access denied! Please allow microphone in browser settings and refresh.');
            } else if (micErr.name === 'NotFoundError') {
                alert('❌ No microphone found! Connect a microphone and try again.');
            } else if (micErr.name === 'NotReadableError') {
                alert('❌ Microphone is busy! Close other apps using microphone.');
            } else {
                alert('❌ Microphone error: ' + micErr.message);
            }
            
            callModal.classList.add('hidden');
            return;
        }
        
        // ✅ Step 2: Create peer connection
        try {
            console.log('🔧 Creating peer connection...');
            peerConnection = new RTCPeerConnection(configuration);
            console.log('✅ Peer connection created');
        } catch (pcErr) {
            console.error('❌ Peer connection error:', pcErr);
            alert('Failed to create connection: ' + pcErr.message);
            callModal.classList.add('hidden');
            return;
        }
        
        // ✅ Step 3: Add audio tracks
        try {
            console.log('🎵 Adding audio tracks...');
            localStream.getAudioTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
                console.log('  - Track added:', track.label, 'enabled:', track.enabled);
            });
        } catch (trackErr) {
            console.error('❌ Track error:', trackErr);
        }
        
        // ✅ Step 4: Setup ICE candidate handler
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('📡 ICE candidate generated');
                try {
                    stompClient.send("/app/chat.sendMessage", {}, JSON.stringify({
                        type: 'ICE_CANDIDATE',
                        sender: username,
                        target: targetUser,
                        content: JSON.stringify(event.candidate)
                    }));
                } catch (sendErr) {
                    console.error('❌ Failed to send ICE candidate:', sendErr);
                }
            }
        };
        
        // ✅ Step 5: Monitor connection state
        peerConnection.oniceconnectionstatechange = () => {
            console.log('🔄 ICE State:', peerConnection.iceConnectionState);
            if (peerConnection.iceConnectionState === 'connected') {
                callStatus.textContent = 'Connected';
            } else if (peerConnection.iceConnectionState === 'disconnected') {
                callStatus.textContent = 'Disconnected';
            } else if (peerConnection.iceConnectionState === 'failed') {
                callStatus.textContent = 'Connection failed';
                alert('Call failed! Check your network.');
                endCall();
            }
        };
        
        // ✅ Step 6: Create offer
        try {
            console.log('📞 Creating offer...');
            const offer = await peerConnection.createOffer({
                offerToReceiveAudio: true,
                voiceActivityDetection: true
            });
            console.log('✅ Offer created:', offer);
            
            console.log('⚙️ Setting local description...');
            await peerConnection.setLocalDescription(offer);
            console.log('✅ Local description set');
        } catch (offerErr) {
            console.error('❌ Offer creation error:', offerErr);
            alert('Failed to create call offer: ' + offerErr.message);
            callModal.classList.add('hidden');
            return;
        }
        
        // ✅ Step 7: Send call request
        try {
            console.log('📤 Sending CALL_REQUEST to:', targetUser);
            stompClient.send("/app/chat.sendMessage", {}, JSON.stringify({
                type: 'CALL_REQUEST',
                sender: username,
                target: targetUser
            }));
        } catch (sendErr) {
            console.error('❌ Failed to send CALL_REQUEST:', sendErr);
        }
        
        // ✅ Step 8: Store current call
        currentCall = targetUser;
        
        // ✅ Step 9: Send offer after delay
        setTimeout(() => {
            if (peerConnection && peerConnection.localDescription) {
                try {
                    console.log('📤 Sending OFFER to:', targetUser);
                    stompClient.send("/app/chat.sendMessage", {}, JSON.stringify({
                        type: 'OFFER',
                        sender: username,
                        target: targetUser,
                        content: JSON.stringify(peerConnection.localDescription)
                    }));
                    console.log('✅ Offer sent successfully');
                } catch (sendErr) {
                    console.error('❌ Failed to send OFFER:', sendErr);
                }
            } else {
                console.warn('⚠️ No local description to send');
            }
        }, 500);
        
        // ✅ Step 10: Start timer
        startTimer();
        console.log('🎉 Call initiated successfully!');
        
    } catch (err) {
        console.error('❌ Unexpected error in startCall:', err);
        alert('Unexpected error: ' + err.message);
        callModal.classList.add('hidden');
    }
}

// Handle incoming call
function handleIncomingCall(message) {
    if (message.target !== username) return;
    
    // Show incoming call popup
    callerName.textContent = message.sender;
    incomingCallPopup.classList.remove('hidden');
    
    // Play ringtone (optional)
    // playRingtone();
}

// Accept call
// ========== FIXED: Accept Call with Better Error Handling ==========
acceptCallBtn.addEventListener('click', async function() {
    const caller = callerName.textContent;
    incomingCallPopup.classList.add('hidden');
    
    try {
        console.log('Accepting call from:', caller);
        
        // Check browser support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Your browser does not support audio calls!');
            return;
        }
        
        // Show call modal
        callModal.classList.remove('hidden');
        callStatus.textContent = 'Requesting microphone...';
        callWithEl.textContent = caller;
        
        // Get audio stream
        localStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }, 
            video: false 
        });
        
        console.log('Microphone access granted!');
        callStatus.textContent = 'Connecting...';
        
        // Create peer connection
        peerConnection = new RTCPeerConnection(configuration);
        
        // Add audio tracks
        localStream.getAudioTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
        
        // Handle ICE candidates
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
        
        // Handle connection state
        peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE State:', peerConnection.iceConnectionState);
            if (peerConnection.iceConnectionState === 'connected') {
                callStatus.textContent = 'Connected';
            }
        };
        
        // Send accept
        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify({
            type: 'CALL_ACCEPT',
            sender: username,
            target: caller
        }));
        
        currentCall = caller;
        startTimer();
        
    } catch (err) {
        console.error('Error accepting call:', err);
        
        if (err.name === 'NotAllowedError') {
            alert('❌ Microphone access denied! Please allow microphone access.');
        } else if (err.name === 'NotFoundError') {
            alert('❌ No microphone found!');
        } else {
            alert('❌ Could not access microphone: ' + err.message);
        }
        
        callModal.classList.add('hidden');
    }
});

// Reject call
rejectCallBtn.addEventListener('click', function() {
    const caller = callerName.textContent;
    incomingCallPopup.classList.add('hidden');
    
    stompClient.send("/app/chat.sendMessage", {}, JSON.stringify({
        type: 'CALL_REJECT',
        sender: username,
        target: caller
    }));
});

// Handle call accept
function handleCallAccept(message) {
    if (message.target !== username) return;
    
    callStatus.textContent = 'Connected';
}

// Handle call reject
function handleCallReject(message) {
    if (message.target !== username) return;
    
    alert(`${message.sender} rejected the call`);
    endCall();
}

// Handle offer
async function handleOffer(message) {
    if (message.target !== username || !peerConnection) return;
    
    const offer = JSON.parse(message.content);
    await peerConnection.setRemoteDescription(offer);
    
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    stompClient.send("/app/chat.sendMessage", {}, JSON.stringify({
        type: 'ANSWER',
        sender: username,
        target: message.sender,
        content: JSON.stringify(answer)
    }));
}

// Handle answer
async function handleAnswer(message) {
    if (message.target !== username || !peerConnection) return;
    
    const answer = JSON.parse(message.content);
    await peerConnection.setRemoteDescription(answer);
}

// Handle ICE candidate
async function handleIceCandidate(message) {
    if (message.target !== username || !peerConnection) return;
    
    const candidate = JSON.parse(message.content);
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
}

// Handle call end
function handleCallEnd(message) {
    if (message.target !== username && message.sender !== currentCall) return;
    endCall();
}

// End call
function endCall() {
    console.log('Ending call...');
    
    // Stop timer
    if (callTimer) {
        clearInterval(callTimer);
        callTimer = null;
    }
    
    // Close peer connection
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    // Stop audio tracks
    if (localStream) {
        localStream.getAudioTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    // Remove remote audio
    const remoteAudio = document.getElementById('remoteAudio');
    if (remoteAudio) {
        remoteAudio.srcObject = null;
        remoteAudio.remove();
    }
    
    // Hide modals
    callModal.classList.add('hidden');
    
    // Notify other user if call was active
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

// End call button
endCallBtn.addEventListener('click', endCall);

// Close modal
closeCallModal.addEventListener('click', endCall);

// Timer functions
// ========== Timer Functions ==========
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

// Mute toggle
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

// Speaker toggle
speakerBtn.addEventListener('click', function() {
    isSpeakerOn = !isSpeakerOn;
    // Note: Speaker toggle requires audio output device selection
    // This is a basic implementation
    speakerBtn.innerHTML = isSpeakerOn ? 
        '<i class="fas fa-volume-up"></i>' : 
        '<i class="fas fa-volume-mute"></i>';
    speakerBtn.classList.toggle('speaker-on', isSpeakerOn);
});

// ========== MICROPHONE PERMISSION MODAL ==========
const micModal = document.querySelector('#micPermissionModal');
const micAllowBtn = document.querySelector('#micAllowBtn');
const micNotAllowBtn = document.querySelector('#micNotAllowBtn');
const micPermissionHint = document.querySelector('#micPermissionHint');
const retryPermissionBtn = document.querySelector('#retryPermissionBtn');
const micPermissionMessage = document.querySelector('#micPermissionMessage');

// Store pending call info
let pendingCallTarget = null;

// ========== FIXED: Show user list for call with permission check ==========
function showUserListForCall() {
    const users = Array.from(onlineUsers.keys()).filter(user => user !== username);
    
    console.log('Online Users:', users);
    
    if (users.length === 0) {
        alert('❌ No other users online!');
        return;
    }
    
    // Create user selection modal
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
    
    // Add click handlers
    userListDiv.querySelectorAll('.user-select-item').forEach(item => {
        item.addEventListener('click', function() {
            const selectedUser = this.dataset.user;
            document.body.removeChild(userListDiv);
            
            // ✅ PEHLE MICROPHONE PERMISSION CHECK KARO
            checkMicrophonePermission(selectedUser);
        });
    });
    
    userListDiv.querySelector('.close-select-btn').addEventListener('click', function() {
        document.body.removeChild(userListDiv);
    });
}

// ========== Check Microphone Permission ==========
// ========== FIXED: Browser Detection ==========
async function checkMicrophonePermission(targetUser) {
    try {
        // ✅ Better browser check
        console.log('🔍 Checking browser support...');
        console.log('User Agent:', navigator.userAgent);
        
        // Check if browser supports mediaDevices
        if (!navigator.mediaDevices) {
            console.log('❌ navigator.mediaDevices not found');
            
            // Try older prefix for some browsers
            if (navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia) {
                console.log('✅ But older API found - Chrome should work');
                // Continue anyway - Chrome supports this
            } else {
                alert('❌ Aapka browser voice call support nahi karta! Chrome/Firefox/Edge use karo.');
                return;
            }
        }
        
        // Check getUserMedia specifically
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.log('❌ getUserMedia not found');
            
            // For Chrome, it should exist - maybe we need to request first
            if (window.isSecureContext === false) {
                alert('⚠️ HTTPS required for voice calls! Localhost pe ho tab bhi theek hai?');
                return;
            }
            
            // Try to create it (some browsers need this)
            navigator.mediaDevices = {};
        }
        
        // Create getUserMedia if not exists (polyfill for older Chrome)
        if (!navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia = function(constraints) {
                const getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
                if (!getUserMedia) {
                    return Promise.reject(new Error('getUserMedia not supported'));
                }
                
                return new Promise((resolve, reject) => {
                    getUserMedia.call(navigator, constraints, resolve, reject);
                });
            };
        }
        
        console.log('✅ Browser should support calls, checking permission...');
        
        // Continue with permission check
        try {
            const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
            console.log('Current permission status:', permissionStatus.state);
            
            if (permissionStatus.state === 'granted') {
                console.log('✅ Permission already granted');
                startCall(targetUser);
            } else if (permissionStatus.state === 'prompt') {
                console.log('❓ Permission not asked yet');
                showMicPermissionPopup(targetUser);
            } else if (permissionStatus.state === 'denied') {
                console.log('❌ Permission denied');
                showMicDeniedPopup(targetUser);
            }
            
            permissionStatus.onchange = () => {
                console.log('Permission changed to:', permissionStatus.state);
                if (permissionStatus.state === 'granted' && pendingCallTarget) {
                    micModal.classList.add('hidden');
                    startCall(pendingCallTarget);
                    pendingCallTarget = null;
                }
            };
            
        } catch (permErr) {
            console.log('Permissions API not supported, falling back to direct request');
            // Permissions API not supported (some browsers)
            showMicPermissionPopup(targetUser);
        }
        
    } catch (err) {
        console.error('❌ Browser check error:', err);
        
        // Chrome mein bhi agar ye error aa raha to direct try karo
        if (navigator.userAgent.includes('Chrome')) {
            console.log('Chrome detected, trying direct microphone access...');
            showMicPermissionPopup(targetUser);
        } else {
            alert('❌ Aapka browser voice call support nahi karta! Chrome/Firefox use karo.');
        }
    }
}

// ========== Show Microphone Permission Popup ==========
function showMicPermissionPopup(targetUser) {
    pendingCallTarget = targetUser;
    
    micPermissionMessage.textContent = 'Voice call ke liye microphone access chahiye. "Allow Microphone" button click karo.';
    micPermissionHint.classList.add('hidden');
    micModal.classList.remove('hidden');
}

// ========== Show Denied Popup with Instructions ==========
function showMicDeniedPopup(targetUser) {
    pendingCallTarget = targetUser;
    
    micPermissionMessage.textContent = 'Microphone access pehle deny kar diya tha. Browser settings se allow karo:';
    micPermissionHint.classList.remove('hidden');
    micModal.classList.remove('hidden');
}

// ========== Allow Button Click ==========
micAllowBtn.addEventListener('click', async function() {
    if (!pendingCallTarget) {
        micModal.classList.add('hidden');
        return;
    }
    
    try {
        // Show loading state
        micAllowBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Requesting...';
        micAllowBtn.disabled = true;
        
        // Request microphone permission
        const tempStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true
            } 
        });
        
        // Got permission! Stop the temp stream
        tempStream.getTracks().forEach(track => track.stop());
        
        console.log('✅ Permission granted via popup');
        
        // Hide modal
        micModal.classList.add('hidden');
        
        // Start call
        startCall(pendingCallTarget);
        pendingCallTarget = null;
        
    } catch (err) {
        console.error('❌ Permission denied:', err);
        
        if (err.name === 'NotAllowedError') {
            // User clicked "Block" in browser popup
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

// ========== Not Allow Button Click ==========
micNotAllowBtn.addEventListener('click', function() {
    micModal.classList.add('hidden');
    pendingCallTarget = null;
    alert('❌ Microphone access required for voice call. Call cancelled.');
});

// ========== Retry Button Click ==========
retryPermissionBtn.addEventListener('click', async function() {
    try {
        // Try requesting again
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tempStream.getTracks().forEach(track => track.stop());
        
        // Success!
        micModal.classList.add('hidden');
        if (pendingCallTarget) {
            startCall(pendingCallTarget);
            pendingCallTarget = null;
        }
    } catch (err) {
        console.error('Still denied:', err);
        alert('Still not allowed. Please follow browser instructions above.');
    }
});

// ========== Update startCall function to handle errors better ==========
// ========== COMPLETE WORKING startCall FUNCTION ==========
async function startCall(targetUser) {
    try {
        console.log('🚀 Starting call to:', targetUser);
        
        // ✅ Configuration with STUN servers (IMPORTANT)
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
        
        // Show call modal
        callModal.classList.remove('hidden');
        callStatus.textContent = 'Requesting microphone...';
        callWithEl.textContent = targetUser;
        
        // ✅ Get microphone with better constraints
        localStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                channelCount: 1,
                sampleRate: 48000,
                sampleSize: 16
            }, 
            video: false 
        });
        
        console.log('✅ Microphone access granted!');
        console.log('Audio tracks:', localStream.getAudioTracks().length);
        callStatus.textContent = 'Creating connection...';
        
        // ✅ Create peer connection with config
        peerConnection = new RTCPeerConnection(configuration);
        
        // ✅ Add audio tracks properly
        localStream.getAudioTracks().forEach(track => {
            console.log('Adding audio track:', track.label, 'enabled:', track.enabled);
            peerConnection.addTrack(track, localStream);
        });
        
        // ✅ Better ICE candidate handling
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('📡 ICE candidate generated:', event.candidate.type, event.candidate.protocol);
                
                // Send ICE candidate
                stompClient.send("/app/chat.sendMessage", {}, JSON.stringify({
                    type: 'ICE_CANDIDATE',
                    sender: username,
                    target: targetUser,
                    content: JSON.stringify(event.candidate)
                }));
            } else {
                console.log('✅ ICE candidate gathering complete');
            }
        };
        
        // ✅ Monitor all connection states
        peerConnection.oniceconnectionstatechange = () => {
            console.log('🔄 ICE Connection State:', peerConnection.iceConnectionState);
            
            switch(peerConnection.iceConnectionState) {
                case 'checking':
                    callStatus.textContent = 'Checking connection...';
                    break;
                case 'connected':
                    callStatus.textContent = 'Connected';
                    console.log('✅ CALL CONNECTED!');
                    break;
                case 'completed':
                    console.log('✅ Connection completed');
                    break;
                case 'disconnected':
                    callStatus.textContent = 'Disconnected';
                    console.log('⚠️ Connection disconnected');
                    break;
                case 'failed':
                    callStatus.textContent = 'Connection failed';
                    console.log('❌ Connection failed');
                    setTimeout(() => endCall(), 2000);
                    break;
                case 'closed':
                    console.log('Connection closed');
                    break;
            }
        };
        
        peerConnection.onconnectionstatechange = () => {
            console.log('🔗 Overall Connection State:', peerConnection.connectionState);
        };
        
        peerConnection.onsignalingstatechange = () => {
            console.log('📶 Signaling State:', peerConnection.signalingState);
        };
        
        peerConnection.onicegatheringstatechange = () => {
            console.log('🧊 ICE Gathering State:', peerConnection.iceGatheringState);
        };
        
        // ✅ Handle incoming audio stream
        peerConnection.ontrack = (event) => {
            console.log('📻 Received remote audio track');
            // Create audio element and play it
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
            
            // Try to play
            remoteAudio.play().catch(e => console.log('Audio play error:', e));
        };
        
        // ✅ Create offer with better options
        console.log('📞 Creating offer...');
        const offer = await peerConnection.createOffer({
            offerToReceiveAudio: true,
            voiceActivityDetection: true
        });
        
        console.log('✅ Offer created:', offer.type);
        
        // ✅ Set local description
        console.log('⚙️ Setting local description...');
        await peerConnection.setLocalDescription(offer);
        console.log('✅ Local description set');
        
        // ✅ Send call request
        console.log('📤 Sending CALL_REQUEST to:', targetUser);
        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify({
            type: 'CALL_REQUEST',
            sender: username,
            target: targetUser
        }));
        
        currentCall = targetUser;
        
        // ✅ Send offer after short delay
        setTimeout(() => {
            if (peerConnection && peerConnection.localDescription) {
                console.log('📤 Sending OFFER to:', targetUser);
                stompClient.send("/app/chat.sendMessage", {}, JSON.stringify({
                    type: 'OFFER',
                    sender: username,
                    target: targetUser,
                    content: JSON.stringify(peerConnection.localDescription)
                }));
            } else {
                console.warn('⚠️ No local description to send');
            }
        }, 500);
        
        // ✅ Start timer
        startTimer();
        console.log('🎉 Call initiation complete, waiting for answer...');
        
    } catch (err) {
        console.error('❌ Error in startCall:', err);
        
        // Better error messages
        if (err.name === 'NotAllowedError') {
            alert('❌ Microphone access denied! Please allow microphone and try again.');
        } else if (err.name === 'NotFoundError') {
            alert('❌ No microphone found! Please connect a microphone.');
        } else if (err.name === 'NotReadableError') {
            alert('❌ Microphone is busy! Close other apps using microphone.');
        } else if (err.name === 'AbortError') {
            alert('❌ Microphone request aborted. Try again.');
        } else if (err.name === 'OverconstrainedError') {
            alert('❌ Microphone constraints cannot be satisfied.');
        } else if (err.name === 'TypeError') {
            alert('❌ Invalid microphone options.');
        } else {
            alert('❌ Call failed: ' + (err.message || 'Unknown error'));
        }
        
        callModal.classList.add('hidden');
        
        // Clean up
        if (localStream) {
            localStream.getTracks().forEach(t => t.stop());
            localStream = null;
        }
    }
}

