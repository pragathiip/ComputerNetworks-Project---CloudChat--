const WebSocket = require('ws');
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Set up WebSocket server
const wsServer = new WebSocket.Server({ port: 12345 });
const clients = new Map();
const messageHistory = [];

wsServer.on('connection', (socket) => {
    let clientNickname = 'Anonymous';

    console.log('Client connected');

    // Notify other clients
    broadcastNotification('A user has connected.');

    // Handle incoming messages
    socket.on('message', (data) => {
        const parsedData = JSON.parse(data);

        if (parsedData.type === 'nickname') {
            clientNickname = parsedData.nickname;
            clients.set(socket, clientNickname);
            console.log(`Client set nickname: ${clientNickname}`);
            // Send message history to the new client
            socket.send(JSON.stringify({ type: 'history', messages: messageHistory }));
        } else if (parsedData.type === 'message') {
            const message = {
                sender: clientNickname,
                message: parsedData.message,
            };
            messageHistory.push(message);
            if (messageHistory.length > 100) messageHistory.shift(); // Limit history size

            // Broadcast to all clients
            broadcastMessage(clientNickname, parsedData.message);
        }
    });

    socket.on('close', () => {
        console.log(`${clientNickname} disconnected`);
        clients.delete(socket);
        broadcastNotification(`${clientNickname} has disconnected.`);
    });
});

function broadcastMessage(sender, message) {
    wsServer.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'message', sender, message }));
        }
    });
}

function broadcastNotification(message) {
    wsServer.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'notification', message }));
        }
    });
}

console.log('WebSocket server running on ws://localhost:12345');

// Set up HTTP server for file uploads
const app = express();

// Directory to store uploaded files
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    },
});
const upload = multer({ storage });

// Serve uploaded files
app.use('/uploads', express.static(uploadDir));

// Endpoint for file uploads
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }
    console.log(`File uploaded: ${req.file.originalname}`);
    res.status(200).json({ message: 'File uploaded successfully', filename: req.file.originalname });
});

// Endpoint to fetch the list of uploaded files
app.get('/files', (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Unable to fetch files' });
        }
        res.status(200).json(files);
    });
});

app.listen(12346, () => {
    console.log('HTTP server running on http://localhost:12346');
});
