// Tenta conectar ao servidor
const socket = io();

socket.on('connect', () => {
    console.log('Conectado ao servidor com sucesso! Meu ID é:', socket.id);
});