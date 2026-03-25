// 1. Pegando o "pincel" e a "tela"
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 2. Definindo as dimensões fixas dos elementos (como se fossem as regras do mundo)
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 100;
const BALL_SIZE = 10;

// O estado começa vazio, esperando as ordens do servidor
let stateDoServidor = null;
let role = null;
let specpos = null;

// Toda vez que o servidor gritar "gameState" (60 vezes por segundo), nós atualizamos e desenhamos!
socket.on('gameState', (state) => {
    stateDoServidor = state;
    draw(); 
});

socket.on('playerRole', (playerrole) => {
    role = playerrole;
})

socket.on('queuePosition', (pos) => {
    specpos = pos;
})

// 3. A função que pinta tudo na tela
function draw() {
    if (!stateDoServidor) return;

    // Limpa a tela
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Cor dos elementos
    ctx.fillStyle = 'white';

    // Configurações do texto
    ctx.font = '20px Arial';
    ctx.textAlign = 'right'; // alinha à direita
    ctx.fillStyle = 'white';

    // Exibição do RTT (Ping)
    ctx.textAlign = 'left';
    ctx.fillText(`Ping: ${typeof currentPing !== 'undefined' ? currentPing : 0}ms`, 10, 30);

    // Informação da posição da fila de espectadores
    if(specpos){
        ctx.fillText(`Posição na fila: ${specpos}`, canvas.width - 10, 30);
    }

    // Raquete esquerda, se o jogador for o player 1, ele pinta a raquete de verde
    if(role == 'p1'){
        ctx.fillStyle = 'green';
        ctx.fillRect(20, stateDoServidor.p1.y, PADDLE_WIDTH, PADDLE_HEIGHT);
        ctx.fillStyle = 'white';  
    }else {
        ctx.fillRect(20, stateDoServidor.p1.y, PADDLE_WIDTH, PADDLE_HEIGHT);    
    }
    
    // Raquete direita, se o jogador for o player 2, a raquete ficará verde.
    if (role == 'p2'){
        ctx.fillStyle = 'green';
        ctx.fillRect(canvas.width - 30, stateDoServidor.p2.y, PADDLE_WIDTH, PADDLE_HEIGHT);
        ctx.fillStyle = 'white';
    } else {
        ctx.fillRect(canvas.width - 30, stateDoServidor.p2.y, PADDLE_WIDTH, PADDLE_HEIGHT);
    }

    // Bola
    ctx.fillRect(stateDoServidor.ball.x, stateDoServidor.ball.y, BALL_SIZE, BALL_SIZE);
    
    // Linha do meio
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
    // Filtramos para enviar mensagens APENAS se for a seta para cima ou para baixo
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        // Envia a mensagem para o servidor pelo socket
        socket.emit('move', { key: event.key, isPressed: true });
    }
});

// Escuta quando o jogador LIBERA a tecla
document.addEventListener('keyup', (event) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        socket.emit('move', { key: event.key, isPressed: false });
    }
});