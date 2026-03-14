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
const menuBtn = document.querySelector('#mobile-menu-toggle');
const overlay = document.querySelector('#sidebar-overlay');

function connect(event) {
    username = document.querySelector('#name').value.trim();
    if(username) {
        usernamePage.classList.add('hidden');
        chatPage.classList.remove('hidden');
        const socket = new SockJS('/ws');
        stompClient = Stomp.over(socket);
        stompClient.connect({}, onConnected, (err) => alert("Connection Error!"));
    }
    event.preventDefault();
}

function onConnected() {
    stompClient.subscribe('/topic/public', onMessageReceived);
    stompClient.send("/app/chat.addUser", {}, JSON.stringify({sender: username, type: 'JOIN'}));
    document.querySelector('#header-avatar').textContent = username.charAt(0).toUpperCase();
}

function sendMessage(event) {
    const msg = messageInput.value.trim();
    if(msg && stompClient) {
        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify({sender: username, content: msg, type: 'CHAT'}));
        messageInput.value = '';
    }
    event.preventDefault();
}

function onMessageReceived(payload) {
    const message = JSON.parse(payload.body);
    const li = document.createElement('li');
    if(message.type === 'JOIN' || message.type === 'LEAVE') {
        li.className = 'event-msg';
        li.style.cssText = "align-self:center; font-size:0.7rem; color:#888; margin:5px 0;";
        li.textContent = `${message.sender} ${message.type === 'JOIN' ? 'joined' : 'left'}`;
    } else {
        li.className = `chat-message ${message.sender === username ? 'sent' : 'received'}`;
        const nameLabel = message.sender === username ? '' : `<span class="sender-name">${message.sender}</span>`;
        li.innerHTML = `${nameLabel}<div>${message.content}</div>`;
    }
    messageArea.appendChild(li);
    messageArea.scrollTop = messageArea.scrollHeight;
}

menuBtn.onclick = () => { sidebar.classList.add('active'); overlay.classList.add('active'); };
overlay.onclick = () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); };
themeToggle.onclick = () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    themeToggle.innerHTML = isDark ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
};

usernameForm.addEventListener('submit', connect, true);
messageForm.addEventListener('submit', sendMessage, true);