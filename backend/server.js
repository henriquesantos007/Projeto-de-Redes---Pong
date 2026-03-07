// backend/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Configura o Socket.io e permite que o frontend (rodando em outra porta/pasta) se conecte
const io = new Server(server, {
    cors: { origin: "*" } 
});

// O evento 'connection' é disparado toda vez que um novo navegador se conecta
io.on('connection', (socket) => {
    console.log(`Novo jogador conectado! ID: ${socket.id}`);

    // Escuta as mensagens 'move' vindas EXCLUSIVAMENTE deste jogador
    socket.on('move', (data) => {
        console.log(`O jogador ${socket.id} enviou:`, data);

    });

    // Se o jogador fechar a aba do navegador, esse evento é chamado
    socket.on('disconnect', () => {
        console.log(`Jogador desconectado: ${socket.id}`);
    });
});

const PORTA = 3000;
server.listen(PORTA, () => {
    console.log(`Servidor do Pong rodando na porta ${PORTA} 🚀`);
});