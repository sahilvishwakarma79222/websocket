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
const sidebar = document.querySelector('#chat-sidebar');
const mobileMenuBtn = document.querySelector('#mobile-menu-toggle');
const overlay = document.querySelector('#sidebar-overlay');

function connect(event) {
    username = document.querySelector('#name').value.trim();
    if(username) {
        usernamePage.classList.add('hidden');
        chatPage.classList.remove('hidden');

        const socket = new SockJS('/ws');
        stompClient = Stomp.over(socket);
        stompClient.connect({}, onConnected, onError);
    }
    event.preventDefault();
}

function onConnected() {
    stompClient.subscribe('/topic/public', onMessageReceived);
    stompClient.send("/app/chat.addUser", {}, JSON.stringify({sender: username, type: 'JOIN'}));
    document.querySelector('#header-avatar').textContent = username.charAt(0).toUpperCase();
}

function onError() {
    alert("Connection lost! Please refresh.");
}

function sendMessage(event) {
    const messageContent = messageInput.value.trim();
    if(messageContent && stompClient) {
        const chatMessage = {
            sender: username,
            content: messageContent,
            type: 'CHAT'
        };
        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));
        messageInput.value = '';
    }
    event.preventDefault();
}

function onMessageReceived(payload) {
    const message = JSON.parse(payload.body);
    const messageElement = document.createElement('li');

    if(message.type === 'JOIN') {
        messageElement.classList.add('event-msg');
        messageElement.textContent = message.sender + ' joined!';
    } else if (message.type === 'LEAVE') {
        messageElement.classList.add('event-msg');
        messageElement.textContent = message.sender + ' left!';
    } else {
        messageElement.classList.add('chat-message');
        messageElement.classList.add(message.sender === username ? 'sent' : 'received');
        messageElement.textContent = message.content;
    }

    messageArea.appendChild(messageElement);
    messageArea.scrollTop = messageArea.scrollHeight;
}

// Sidebar toggle for mobile
mobileMenuBtn.onclick = () => {
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
};

overlay.onclick = () => {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
};

// Theme Toggle
themeToggle.onclick = () => {
    const current = document.documentElement.getAttribute('data-theme');
    const target = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', target);
    themeToggle.innerHTML = target === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
};

usernameForm.addEventListener('submit', connect, true);
messageForm.addEventListener('submit', sendMessage, true);