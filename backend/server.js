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

// 1. As regras do "Mundo" pertencem ao servidor
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const PADDLE_HEIGHT = 100;

// 2. O Estado Global do Jogo (A Verdade Absoluta)
let gameState = {
    // Não precisamos do 'x' das raquetes, pois elas só movem para cima e para baixo no eixo 'y'
    p1: { y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2 },
    p2: { y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2 },
    ball: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 }
};

// 3. O GAME LOOP (O Coração do Jogo)
// O setInterval executa uma função repetidamente. 
// 1000 milissegundos / 60 = ~16.6ms (Isso nos dá 60 quadros por segundo)
setInterval(() => {
    // A função io.emit() é um Broadcast: ela grita a mensagem para TODOS os sockets conectados ao mesmo tempo!
    io.emit('gameState', gameState);
}, 1000 / 60);

const PORTA = 3000;
server.listen(PORTA, () => {
    console.log(`Servidor do Pong rodando na porta ${PORTA} 🚀`);
});