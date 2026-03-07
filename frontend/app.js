// frontend/app.js

// 1. Pegando o "pincel" e a "tela"
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 2. Definindo as dimensões fixas dos elementos (como se fossem as regras do mundo)
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 100;
const BALL_SIZE = 10;

// O estado começa vazio, esperando as ordens do servidor
let stateDoServidor = null;

// Toda vez que o servidor gritar "gameState" (60 vezes por segundo), nós atualizamos e desenhamos!
socket.on('gameState', (state) => {
    stateDoServidor = state;
    draw(); 
});

// 3. A função que pinta tudo na tela
function draw() {
    // Se ainda não recebemos a primeira foto do servidor, não tenta desenhar para não dar erro
    if (!stateDoServidor) return;

    // Limpa a tela inteira com a cor preta a cada quadro
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Cor do "pincel" para os elementos do jogo
    ctx.fillStyle = 'white';

    // Desenha a Raquete 1 (Esquerda) - O 'x' é fixo, o 'y' vem do servidor!
    ctx.fillRect(20, stateDoServidor.p1.y, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Desenha a Raquete 2 (Direita) - O 'x' é fixo perto da borda
    ctx.fillRect(canvas.width - 30, stateDoServidor.p2.y, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Desenha a Bola
    ctx.fillRect(stateDoServidor.ball.x, stateDoServidor.ball.y, BALL_SIZE, BALL_SIZE);
    
    // Desenha a linha pontilhada do meio (a rede)
    ctx.setLineDash([5, 15]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.strokeStyle = 'white';
    ctx.stroke();
}

// Chama a função pela primeira vez para ver o resultado
draw();


// Escuta quando o jogador APERTA a tecla
document.addEventListener('keydown', (event) => {
    // Filtramos para enviar mensagens APENAS se for a setinha para cima ou para baixo
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        // Envia a mensagem para o servidor pelo socket
        socket.emit('move', { key: event.key, isPressed: true });
    }
});

// Escuta quando o jogador SOLTA a tecla
document.addEventListener('keyup', (event) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        socket.emit('move', { key: event.key, isPressed: false });
    }
});