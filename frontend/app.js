// frontend/app.js

// 1. Pegando o "pincel" e a "tela"
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 2. Definindo as dimensões fixas dos elementos (como se fossem as regras do mundo)
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 100;
const BALL_SIZE = 10;

// 3. Criando o "Estado Local" inicial do jogo (depois, o servidor que vai ditar isso)
let gameState = {
    p1: { x: 20, y: canvas.height / 2 - PADDLE_HEIGHT / 2 },
    p2: { x: canvas.width - 30, y: canvas.height / 2 - PADDLE_HEIGHT / 2 },
    ball: { x: canvas.width / 2, y: canvas.height / 2 }
};

// 4. A função que pinta tudo na tela
function draw() {
    // Limpa a tela inteira com a cor preta a cada quadro
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Cor do "pincel" para os elementos do jogo
    ctx.fillStyle = 'white';

    // Desenha a Raquete 1 (Esquerda)
    ctx.fillRect(gameState.p1.x, gameState.p1.y, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Desenha a Raquete 2 (Direita)
    ctx.fillRect(gameState.p2.x, gameState.p2.y, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Desenha a Bola
    ctx.fillRect(gameState.ball.x, gameState.ball.y, BALL_SIZE, BALL_SIZE);
    
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