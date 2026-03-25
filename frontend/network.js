// Tenta conectar ao servidor
const socket = io();
let currentPing = 0;

socket.on('connect', () => {
    console.log('Conectado ao servidor com sucesso! Meu ID é:', socket.id);

    // Dispara um ping a cada 1 segundo para testar o RTT
    setInterval(() => {
        socket.emit('ping', Date.now());
    }, 1000);
});

// Recebe a resposta do servidor e calcula o RTT
socket.on('pong', (clientTime) => {
    currentPing = Date.now() - clientTime;
});