import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

const firebaseConfig = {
  apiKey: "AIzaSyBWWD5Uj6PwQQMPTVMaKcIJ7J1XtF_ZvkQ",
  authDomain: "agentmsgdb.firebaseapp.com",
  databaseURL: "https://agentmsgdb-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "agentmsgdb",
  storageBucket: "agentmsgdb.firebasestorage.app",
  messagingSenderId: "675476869633",
  appId: "1:675476869633:web:f37fd6020dbda64854e600"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');

let currentMessageIndex = 1;
let guestMessages = {};
let isWaitingForUser = false;

function formatTime() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function addMessage(text, sender) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}`;

  const bubbleDiv = document.createElement('div');
  bubbleDiv.className = 'message-bubble';

  const textDiv = document.createElement('div');
  textDiv.className = 'message-text';
  textDiv.textContent = text;

  const timeSpan = document.createElement('span');
  timeSpan.className = 'message-time';
  timeSpan.textContent = formatTime();

  bubbleDiv.appendChild(textDiv);
  bubbleDiv.appendChild(timeSpan);
  messageDiv.appendChild(bubbleDiv);
  chatMessages.appendChild(messageDiv);

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTypingIndicator() {
  const typingDiv = document.createElement('div');
  typingDiv.className = 'message agent';
  typingDiv.id = 'typingIndicator';

  const bubbleDiv = document.createElement('div');
  bubbleDiv.className = 'message-bubble';

  const typingContent = document.createElement('div');
  typingContent.className = 'typing-indicator';
  typingContent.innerHTML = `
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
  `;

  bubbleDiv.appendChild(typingContent);
  typingDiv.appendChild(bubbleDiv);
  chatMessages.appendChild(typingDiv);

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
  const typingIndicator = document.getElementById('typingIndicator');
  if (typingIndicator) {
    typingIndicator.remove();
  }
}

function displayNextAgentMessage() {
  const messageKey = `msg${currentMessageIndex}`;
  const messageText = guestMessages[messageKey];

  if (messageText) {
    showTypingIndicator();

    setTimeout(() => {
      removeTypingIndicator();
      addMessage(messageText, 'agent');

      isWaitingForUser = true;
      messageInput.disabled = false;
      sendButton.disabled = false;
      messageInput.focus();
    }, 1500);
  } else {
    messageInput.disabled = true;
    sendButton.disabled = true;
    messageInput.placeholder = "No more messages...";
  }
}

function handleSendMessage() {
  const text = messageInput.value.trim();

  if (text && isWaitingForUser) {
    addMessage(text, 'guest');
    messageInput.value = '';

    messageInput.disabled = true;
    sendButton.disabled = true;
    isWaitingForUser = false;

    currentMessageIndex++;

    setTimeout(() => {
      displayNextAgentMessage();
    }, 500);
  }
}

sendButton.addEventListener('click', handleSendMessage);

messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    handleSendMessage();
  }
});

const guestMsgsRef = ref(database, 'GuestMsgs');
onValue(guestMsgsRef, (snapshot) => {
  const data = snapshot.val();
  if (data) {
    guestMessages = data;

    if (currentMessageIndex === 1 && Object.keys(guestMessages).length > 0) {
      displayNextAgentMessage();
    }
  }
});
