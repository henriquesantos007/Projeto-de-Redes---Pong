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

// Variável para guardar quem está jogando
let players = {
    p1: null, // Guardará o socket.id do Jogador 1 (Esquerda)
    p2: null  // Guardará o socket.id do Jogador 2 (Direita)
};

// Nossa Fila de espera (FIFO)
let spectatorsQueue = [];

// O evento 'connection' é disparado toda vez que um novo navegador se conecta
io.on('connection', (socket) => {
    console.log(`Novo jogador conectado! ID: ${socket.id}`);

    // --- LÓGICA DE ATRIBUIÇÃO E FILA ---
    if (!players.p1) {
        players.p1 = socket.id;
        console.log(`${socket.id} assumiu a Raquete 1 (Esquerda)`);
        socket.emit('playerRole', 'p1'); 
    } else if (!players.p2) {
        players.p2 = socket.id;
        console.log(`${socket.id} assumiu a Raquete 2 (Direita)`);
        socket.emit('playerRole', 'p2');
    } else {
        // Se as vagas estão cheias, entra para o final da fila
        spectatorsQueue.push(socket.id);
        console.log(`${socket.id} entrou para a fila de espectadores. Posição: ${spectatorsQueue.length}`);
        socket.emit('playerRole', 'spectator');
    }

    // Escuta as mensagens 'move' vindas EXCLUSIVAMENTE deste jogador
    socket.on('move', (data) => {
        console.log(`O jogador ${socket.id} enviou:`, data);
    });

    //--- LÓGICA DE DESCONEXÃO E PROMOÇÃO (Liberando a vaga) ---
    socket.on('disconnect', () => {
        console.log(`Usuário desconectado: ${socket.id}`);
        // Se quem saiu era um dos jogadores, liberamos a vaga para o próximo
        if (players.p1 === socket.id) {
            players.p1 = null;
            console.log('A vaga do Jogador 1 está livre novamente.');
            promoverEspectador('p1'); // Tenta promover alguém da fila

        } else if (players.p2 === socket.id) {
            players.p2 = null;
            console.log('A vaga do Jogador 2 está livre novamente.');
            promoverEspectador('p2'); // Tenta promover alguém da fila

        } else {
            // Se um espectador desistir e fechar a aba, precisamos tirá-lo da fila
            // para não tentar promover um "fantasma" depois
            spectatorsQueue = spectatorsQueue.filter(id => id !== socket.id);
        }
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

// Função auxiliar para gerenciar a fila
function promoverEspectador(vaga) {
    if (spectatorsQueue.length > 0) {
        // O método shift() remove o primeiro elemento do array e nos devolve ele
        const novoJogadorId = spectatorsQueue.shift(); 
        
        // Atribui a vaga ao ex-espectador
        players[vaga] = novoJogadorId; 
        console.log(`Espectador ${novoJogadorId} foi promovido para a vaga ${vaga.toUpperCase()}!`);
        
        // Mensagem DIRECIONADA: Avisa especificamente este usuário que ele subiu de cargo
        io.to(novoJogadorId).emit('playerRole', vaga); 
    }
}