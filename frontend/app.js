// ─── 1. CONFIGURAÇÃO DO CANVA E ESTADOS ───────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 100;
const BALL_SIZE = 10;
const LERP_FACTOR = 0.15; // Suavidade do movimento (0.1 a 0.3)

// Estados do Servidor (Autoridade)
let stateDoServidor = null;
let role = null;
let specpos = null;
let score = { p1: 0, p2: 0 };
let gameOverData = null;
let ballSpeedDisplay = 4;
let isWaitingOpponent = false; // Guarda se estamos esperando jogador

// Estados Visuais do Cliente (Interpolados para suavidade)
let clientState = {
    p1: { y: 150 },
    p2: { y: 150 },
    ball: { x: 400, y: 200 }
};

// Função de Interpolação Linear
function lerp(start, end, factor) {
    return start + (end - start) * factor;
}

// ─── 2. EVENTOS DE REDE (APENAS ATUALIZAM DADOS) ──────────────────────────────
socket.on('gameState', (state) => {
    stateDoServidor = state;
    if (state.ballSpeed !== undefined) ballSpeedDisplay = state.ballSpeed;
});

socket.on('playerRole', (r) => {
    role = r;
    // Opcional: chamar funções de UI do index.html se existirem
    if (typeof updateRestartButton === 'function') updateRestartButton();
});

socket.on('waitingStatus', (status) => {
    // vefica se ha pelo menos dois jogadores
    isWaitingOpponent = status;
});

socket.on('queuePosition', (pos) => { specpos = pos; });
socket.on('scoreUpdate', (s) => { score = s; });
socket.on('gameOver', (w) => { gameOverData = w; });

// ─── 3. LOOP DE RENDERIZAÇÃO (O "CORAÇÃO" VISUAL) ─────────────────────────────
function renderLoop() {
    // A. INTERPOLAÇÃO: Desliza o estado visual para o estado do servidor
    if (stateDoServidor) {
        clientState.p1.y = lerp(clientState.p1.y, stateDoServidor.p1.y, LERP_FACTOR);
        clientState.p2.y = lerp(clientState.p2.y, stateDoServidor.p2.y, LERP_FACTOR);
        clientState.ball.x = lerp(clientState.ball.x, stateDoServidor.ball.x, LERP_FACTOR);
        clientState.ball.y = lerp(clientState.ball.y, stateDoServidor.ball.y, LERP_FACTOR);
    }

    // B. LIMPEZA E FUNDO
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGrid();
    drawCenterLine();
    drawScore();

    // C. DESENHO DOS ELEMENTOS (Usando clientState para ser fluido)
    drawPaddle(20, clientState.p1.y, 'p1');
    drawPaddle(canvas.width - 30, clientState.p2.y, 'p2');

    // -- FANTASMA DO SERVIDOR (Para apresentação) --
    if (stateDoServidor) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'; // Bolinha branca bem transparente
        ctx.fillRect(stateDoServidor.ball.x, stateDoServidor.ball.y, BALL_SIZE, BALL_SIZE);
        ctx.restore();
    }
    
    drawBall(clientState.ball.x, clientState.ball.y);

    // D. HUD E OVERLAYS
    drawHUD();
    if (gameOverData){
        drawGameOver(gameOverData)
    } else if (isWaitingOpponent) {
        drawWaitingScreen();
    }

    requestAnimationFrame(renderLoop);
}

// ─── 4. FUNÇÕES DE DESENHO ESPECIALIZADAS ─────────────────────────────────────

function drawGrid() {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    ctx.restore();
}

function drawCenterLine() {
    ctx.save();
    ctx.setLineDash([6, 10]);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.restore();
}

function drawScore() {
    ctx.save();
    ctx.font = 'bold 56px "Courier New", monospace';
    ctx.textAlign = 'center';
    
    ctx.fillStyle = role === 'p1' ? '#00ff88' : 'rgba(255,255,255,0.7)';
    ctx.fillText(score.p1, canvas.width / 2 - 80, 70);
    
    ctx.fillStyle = role === 'p2' ? '#00ff88' : 'rgba(255,255,255,0.7)';
    ctx.fillText(score.p2, canvas.width / 2 + 80, 70);
    ctx.restore();
}

function drawPaddle(x, y, player) {
    ctx.save();
    const isMe = role === player;
    
    // Efeito de brilho se for o jogador atual
    if (isMe) {
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 15;
    }

    const gradient = ctx.createLinearGradient(x, y, x + PADDLE_WIDTH, y + PADDLE_HEIGHT);
    if (isMe) {
        gradient.addColorStop(0, '#00ff88');
        gradient.addColorStop(1, '#00cc66');
    } else {
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(1, '#aaaaaa');
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.restore();
}

function drawBall(x, y) {
    ctx.save();
    const speedRatio = Math.min(ballSpeedDisplay / 12, 1);
    
    // Cor muda de branco para vermelho conforme a velocidade
    const g = Math.floor(255 - speedRatio * 255);
    ctx.fillStyle = `rgb(255, ${g}, 0)`;
    ctx.shadowColor = `rgba(255, ${g}, 0, 0.8)`;
    ctx.shadowBlur = 6 + speedRatio * 14;

    ctx.fillRect(x, y, BALL_SIZE, BALL_SIZE);
    ctx.restore();
}

function drawHUD() {
    ctx.save();
    ctx.font = '13px "Courier New", monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';

    const ping = typeof currentPing !== 'undefined' ? currentPing : 0;
    ctx.fillText(`PING: ${ping}ms`, 10, canvas.height - 10);
    ctx.fillText(`VEL: ${Math.round(ballSpeedDisplay * 10)}%`, 10, canvas.height - 25);

    if (role === 'spectator' && specpos) {
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`⏳ FILA: #${specpos}`, canvas.width - 10, canvas.height - 10);
    }
    ctx.restore();
}

function drawGameOver(winnerKey) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    const isWinner = role === winnerKey;
    
    if (isWinner) {
        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 50px Arial';
        ctx.fillText('VITÓRIA!', canvas.width / 2, canvas.height / 2);
    } else {
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 50px Arial';
        ctx.fillText(role === 'spectator' ? 'FIM DE JOGO' : 'DERROTA', canvas.width / 2, canvas.height / 2);
    }
    ctx.restore();
}

function drawWaitingScreen() {
    ctx.save();
    
    // Fundo semitransparente escuro (igual ao do Game Over)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Texto de "Aguardando Oponente"
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd700'; // Cor amarela (ou #00ff88 se preferir verde)
    ctx.font = 'bold 30px "Share Tech Mono", monospace';
    
    // Adiciona o texto bem no centro
    ctx.fillText('⏳ AGUARDANDO OPONENTE...', canvas.width / 2, canvas.height / 2);
    
    // Pequeno subtítulo abaixo
    ctx.font = '16px "Share Tech Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('O jogo começará quando outro jogador conectar', canvas.width / 2, canvas.height / 2 + 40);
    
    ctx.restore();
}

// ─── 5. CONTROLES E INICIALIZAÇÃO ─────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        socket.emit('move', { key: e.key, isPressed: true });
    }
    if (e.key.toLowerCase() === 'r' && (role === 'p1' || role === 'p2')) {
        socket.emit('requestRestart');
        gameOverData = null;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        socket.emit('move', { key: e.key, isPressed: false });
    }
});

// Inicia o Loop
requestAnimationFrame(renderLoop);