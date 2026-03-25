const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.use(express.static('../frontend'));

const server = http.createServer(app);

// Configura o Socket.io e permite que o frontend rodando em outro computador se conecte
const io = new Server(server, {
    cors: { origin: "*" } 
});

// ─── Constantes do jogo ───────────────────────────────────────────────────────
const CANVAS_WIDTH   = 800;
const CANVAS_HEIGHT  = 400;
const PADDLE_HEIGHT  = 100;
const PADDLE_WIDTH   = 10;
const PADDLE_SPEED   = 5;
const BALL_SIZE      = 10;
const P1_X           = 20;
const P2_X           = CANVAS_WIDTH - 30;

const WINNING_SCORE      = 7;    // Pontos para vencer
const BALL_SPEED_INITIAL = 4;    // Velocidade inicial da bola
const BALL_SPEED_MAX     = 12;   // Velocidade máxima da bola
const BALL_SPEED_INCREMENT = 0.3; // Quanto aumenta por rebatida

// Variável para guardar quem está jogando no momento
let players = {
    p1: null, // Guardará o socket.id do Jogador 1 (Esquerda)
    p2: null  // Guardará o socket.id do Jogador 2 (Direita)
};

const inputs = {
    p1: { up: false, down: false },
    p2: { up: false, down: false }
};

let spectatorsQueue = [];

// ─── Estado do jogo ───────────────────────────────────────────────────────────
let score = { p1: 0, p2: 0 };
let gameOver = false;
let winner = null;
let gameRunning = false; // Só roda quando os 2 jogadores estão conectados

let gameState = {
    // Não precisamos do 'x' das raquetes, pois elas só movem para cima e para baixo no eixo 'y'
    p1: { y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2},
    p2: { y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2},
    ball: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 }
};

// currentSpeed guarda o módulo da velocidade atual (cresce a cada rebatida)
let currentSpeed = BALL_SPEED_INITIAL;
let ballSpeed    = { x: BALL_SPEED_INITIAL, y: BALL_SPEED_INITIAL };
let rallyCount   = 0; // número de rebatidas desde o último ponto

// ─── Helpers ──────────────────────────────────────────────────────────────────
function resetBall(scoredSide) {
    gameState.ball.x = CANVAS_WIDTH / 2;
    gameState.ball.y = CANVAS_HEIGHT / 2;
    currentSpeed = BALL_SPEED_INITIAL;
    rallyCount   = 0;

    // Quem tomou o ponto recebe o saque (bola vai em direção a ele)
    const dir = scoredSide === 'p1' ? 1 : -1; // p1 marcou → bola vai p/ p2
    ballSpeed.x = BALL_SPEED_INITIAL * dir;
    ballSpeed.y = BALL_SPEED_INITIAL * (Math.random() < 0.5 ? 1 : -1);
}

function resetPaddles() {
    gameState.p1.y = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
    gameState.p2.y = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
}

function resetGame() {
    score      = { p1: 0, p2: 0 };
    gameOver   = false;
    winner     = null;
    rallyCount = 0;
    resetPaddles();
    resetBall('p2'); // bola começa indo para p1
    io.emit('scoreUpdate', score);
    io.emit('gameOver', null); // limpa tela de fim de jogo
}

function checkGameRunning() {
    gameRunning = !gameOver && players.p1 !== null && players.p2 !== null;
}

// ─── Conexão ──────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
    console.log(`Novo cliente conectado: ${socket.id}`);

    if (!players.p1) {
        players.p1 = socket.id;
        socket.emit('playerRole', 'p1');
        console.log(`${socket.id} → P1`);
    } else if (!players.p2) {
        players.p2 = socket.id;
        socket.emit('playerRole', 'p2');
        console.log(`${socket.id} → P2`);
    } else {
        spectatorsQueue.push(socket.id);
        socket.emit('playerRole', 'spectator');
        console.log(`${socket.id} → Fila (pos ${spectatorsQueue.length})`);
        atualizarPosicoesDaFila();
    }

    // Envia o placar atual para quem acabou de entrar
    socket.emit('scoreUpdate', score);
    if (gameOver && winner) socket.emit('gameOver', winner);

    checkGameRunning();

    // ── Movimento ──
    socket.on('move', (data) => {
        let key = null;
        if (socket.id === players.p1) key = 'p1';
        else if (socket.id === players.p2) key = 'p2';

        if (key && !gameOver) {
            if (data.key === 'ArrowUp')   inputs[key].up   = data.isPressed;
            if (data.key === 'ArrowDown') inputs[key].down = data.isPressed;
        }
    });

    // ── Reiniciar (qualquer jogador pode pedir) ──
    socket.on('requestRestart', () => {
        if (socket.id === players.p1 || socket.id === players.p2) {
            console.log(`Reinício solicitado por ${socket.id}`);
            resetGame();
            checkGameRunning();
        }
    });

    // ── Desconexão ──
    socket.on('disconnect', () => {
        console.log(`Desconectado: ${socket.id}`);

        if (players.p1 === socket.id) {
            players.p1 = null;
            inputs.p1  = { up: false, down: false };
            promoverEspectador('p1');

        } else if (players.p2 === socket.id) {
            players.p2 = null;
            inputs.p2  = { up: false, down: false };
            promoverEspectador('p2');

        } else {
            spectatorsQueue = spectatorsQueue.filter(id => id !== socket.id);
            atualizarPosicoesDaFila();
        }

        checkGameRunning();
    });

    // ── Ping / RTT ──
    socket.on('ping', (ts) => socket.emit('pong', ts));
});

// ─── Game Loop ────────────────────────────────────────────────────────────────
setInterval(() => {
    if (!gameRunning) {
        // Ainda transmite o estado para todos verem a tela parada
        io.emit('gameState', gameState);
        return;
    }

    // — Raquetes —
    if (inputs.p1.up)   gameState.p1.y = Math.max(0, gameState.p1.y - PADDLE_SPEED);
    if (inputs.p1.down) gameState.p1.y = Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, gameState.p1.y + PADDLE_SPEED);
    if (inputs.p2.up)   gameState.p2.y = Math.max(0, gameState.p2.y - PADDLE_SPEED);
    if (inputs.p2.down) gameState.p2.y = Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, gameState.p2.y + PADDLE_SPEED);

    // — Bola —
    gameState.ball.x += ballSpeed.x;
    gameState.ball.y += ballSpeed.y;

    // Colisão teto / chão
    if (gameState.ball.y <= 0) {
        ballSpeed.y = Math.abs(ballSpeed.y);
    }
    if (gameState.ball.y >= CANVAS_HEIGHT - BALL_SIZE) {
        ballSpeed.y = -Math.abs(ballSpeed.y);
    }

    // Colisão raquete P1
    if (
        gameState.ball.x <= P1_X + PADDLE_WIDTH &&
        gameState.ball.x >= P1_X &&
        gameState.ball.y + BALL_SIZE >= gameState.p1.y &&
        gameState.ball.y <= gameState.p1.y + PADDLE_HEIGHT
    ) {
        rallyCount++;
        currentSpeed = Math.min(BALL_SPEED_MAX, BALL_SPEED_INITIAL + rallyCount * BALL_SPEED_INCREMENT);

        // Ângulo baseado em onde bateu na raquete
        const hitPos = (gameState.ball.y + BALL_SIZE / 2) - (gameState.p1.y + PADDLE_HEIGHT / 2);
        const normalized = hitPos / (PADDLE_HEIGHT / 2); // -1 a 1

        ballSpeed.x = Math.abs(currentSpeed);
        ballSpeed.y = normalized * currentSpeed;
        gameState.ball.x = P1_X + PADDLE_WIDTH + 1;
    }

    // Colisão raquete P2
    if (
        gameState.ball.x + BALL_SIZE >= P2_X &&
        gameState.ball.x + BALL_SIZE <= P2_X + PADDLE_WIDTH + 5 &&
        gameState.ball.y + BALL_SIZE >= gameState.p2.y &&
        gameState.ball.y <= gameState.p2.y + PADDLE_HEIGHT
    ) {
        rallyCount++;
        currentSpeed = Math.min(BALL_SPEED_MAX, BALL_SPEED_INITIAL + rallyCount * BALL_SPEED_INCREMENT);

        const hitPos = (gameState.ball.y + BALL_SIZE / 2) - (gameState.p2.y + PADDLE_HEIGHT / 2);
        const normalized = hitPos / (PADDLE_HEIGHT / 2);

        ballSpeed.x = -Math.abs(currentSpeed);
        ballSpeed.y = normalized * currentSpeed;
        gameState.ball.x = P2_X - BALL_SIZE - 1;
    }

    // — Pontuação —
    if (gameState.ball.x < 0) {
        // Bola saiu pela esquerda → P2 pontua
        score.p2++;
        io.emit('scoreUpdate', score);

        if (score.p2 >= WINNING_SCORE) {
            endGame('p2');
        } else {
            resetBall('p2'); // bola vai em direção a p1 (quem tomou o gol)
            resetPaddles();
        }
    }

    if (gameState.ball.x > CANVAS_WIDTH) {
        // Bola saiu pela direita → P1 pontua
        score.p1++;
        io.emit('scoreUpdate', score);

        if (score.p1 >= WINNING_SCORE) {
            endGame('p1');
        } else {
            resetBall('p1'); // bola vai em direção a p2
            resetPaddles();
        }
    }

    io.emit('gameState', { ...gameState, ballSpeed: currentSpeed });

}, 1000 / 60);

// ─── Fim de jogo ──────────────────────────────────────────────────────────────
function endGame(winnerKey) {
    gameOver   = true;
    winner     = winnerKey;
    gameRunning = false;

    // Para os inputs
    inputs.p1 = { up: false, down: false };
    inputs.p2 = { up: false, down: false };

    io.emit('gameOver', winnerKey);
    console.log(`Fim de jogo! Vencedor: ${winnerKey.toUpperCase()}`);

    // Quem perdeu vai para o FINAL da fila e a vaga é aberta
    const loserKey    = winnerKey === 'p1' ? 'p2' : 'p1';
    const loserSocket = players[loserKey];

    if (loserSocket) {
        // Avisa o perdedor
        io.to(loserSocket).emit('playerRole', 'spectator');
        io.to(loserSocket).emit('youLost');

        // Move para o final da fila
        spectatorsQueue.push(loserSocket);
        players[loserKey] = null;
        atualizarPosicoesDaFila();

        // Promove o próximo na fila após uma pequena pausa
        setTimeout(() => {
            promoverEspectador(loserKey);
            checkGameRunning();
        }, 3000); // Aguarda 3s para dar tempo de ver a tela de fim
    }
}

// ─── Helpers de fila ─────────────────────────────────────────────────────────
function promoverEspectador(vaga) {
    if (spectatorsQueue.length > 0) {
        const novoId = spectatorsQueue.shift();
        players[vaga] = novoId;
        console.log(`${novoId} promovido para ${vaga.toUpperCase()}`);

        io.to(novoId).emit('playerRole', vaga);
        io.to(novoId).emit('queuePosition', null);
        atualizarPosicoesDaFila();

        checkGameRunning();

        // Se agora temos os dois jogadores e o jogo acabou, reinicia automaticamente
        if (players.p1 && players.p2 && gameOver) {
            setTimeout(() => {
                resetGame();
                checkGameRunning();
            }, 1500);
        }
    }
}

function atualizarPosicoesDaFila() {
    spectatorsQueue.forEach((socketId, index) => {
        io.to(socketId).emit('queuePosition', index + 1);
    });
}

// ─── Inicialização ────────────────────────────────────────────────────────────
const PORTA = 3000;

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`Porta ${PORTA} já em uso.`);
        process.exit(1);
    } else {
        console.error(err);
    }
});

server.listen(PORTA, () => {
    console.log(`Servidor Pong rodando na porta ${PORTA} 🚀`);
});