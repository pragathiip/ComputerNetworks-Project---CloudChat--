const socket = new WebSocket('ws://localhost:12345');

// Predefined list of valid users (username, password)
const validUsers = [
    { username: 'user1', password: 'password123' },
    { username: 'user2', password: 'password456' }
];

// Chat elements
const nicknameInput = document.getElementById('nickname-input');
const setNicknameButton = document.getElementById('set-nickname-button');
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const sendMessageButton = document.getElementById('send-message-button');

// File upload elements
const fileInput = document.getElementById('file-input');
const uploadButton = document.getElementById('upload-button');
const fileList = document.getElementById('file-list');

// Authentication elements
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('login-button');
const authSection = document.getElementById('auth-section');
const chatSection = document.getElementById('chat-section');

let isAuthenticated = false;

// Authenticate user
loginButton.addEventListener('click', () => {
    const username = usernameInput.value;
    const password = passwordInput.value;

    const user = validUsers.find(
        (user) => user.username === username && user.password === password
    );

    if (user) {
        isAuthenticated = true;
        authSection.style.display = 'none';
        chatSection.style.display = 'block';
        console.log('User authenticated');
    } else {
        alert('Invalid username or password');
    }
});

// Handle WebSocket events
socket.addEventListener('open', () => {
    console.log('Connected to WebSocket server');
});

socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'message') {
        const messageElement = document.createElement('div');
        messageElement.textContent = `${data.sender}: ${data.message}`;
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    } else if (data.type === 'notification') {
        const notificationElement = document.createElement('div');
        notificationElement.textContent = data.message;
        notificationElement.style.fontStyle = 'italic';
        chatBox.appendChild(notificationElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    } else if (data.type === 'history') {
        data.messages.forEach((msg) => {
            const messageElement = document.createElement('div');
            messageElement.textContent = `${msg.sender}: ${msg.message}`;
            chatBox.appendChild(messageElement);
        });
        chatBox.scrollTop = chatBox.scrollHeight;
    }
});

// Set nickname
setNicknameButton.addEventListener('click', () => {
    const nickname = nicknameInput.value;
    if (nickname && isAuthenticated) {
        socket.send(JSON.stringify({ type: 'nickname', nickname }));
    } else {
        alert('You must be logged in to set a nickname.');
    }
});

// Send message
sendMessageButton.addEventListener('click', () => {
    const message = messageInput.value;
    if (message && isAuthenticated) {
        socket.send(JSON.stringify({ type: 'message', message }));
        messageInput.value = '';
    } else {
        alert('You must be logged in to send a message.');
    }
});

// Upload file
uploadButton.addEventListener('click', () => {
    const file = fileInput.files[0];
    if (!file) {
        alert('Please select a file to upload.');
        return;
    }

    if (!isAuthenticated) {
        alert('You must be logged in to upload a file.');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    fetch('http://localhost:12346/upload', {
        method: 'POST',
        body: formData,
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.message === 'File uploaded successfully') {
                alert(data.message);
                fetchFileList(); // Refresh file list after successful upload
            } else {
                alert('Failed to upload file.');
            }
        })
        .catch((error) => {
            console.error('Error uploading file:', error);
            alert('Failed to upload file.');
        });
});

// Fetch file list
function fetchFileList() {
    fetch('http://localhost:12346/files')
        .then((response) => response.json())
        .then((files) => {
            fileList.innerHTML = ''; // Clear existing file list
            files.forEach((file) => {
                const listItem = document.createElement('li');
                listItem.innerHTML = `<a href="http://localhost:12346/uploads/${file}" target="_blank">${file}</a>`;
                fileList.appendChild(listItem);
            });
        })
        .catch((error) => {
            console.error('Error fetching file list:', error);
        });
}

// Fetch the initial file list when the page loads
fetchFileList();
