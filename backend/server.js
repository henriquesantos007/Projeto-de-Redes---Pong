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

// Variável para guardar quem está jogando no momento
let players = {
    p1: null, // Guardará o socket.id do Jogador 1 (Esquerda)
    p2: null  // Guardará o socket.id do Jogador 2 (Direita)
};

// Inputs: Guardam o estado das teclas de cada jogador
const inputs = {
    p1: { up: false, down: false },
    p2: { up: false, down: false }
};

// As regras do jogo pertencem ao servidor
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const PADDLE_HEIGHT = 100;

// Nossa Fila de espera composta por espectadores (FIFO)
let spectatorsQueue = [];

// O Estado Global do Jogo, ou seja, a posição da bola e a posição dos paddles
let gameState = {
    // Não precisamos do 'x' das raquetes, pois elas só movem para cima e para baixo no eixo 'y'
    p1: { y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2},
    p2: { y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2},
    ball: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 }
};

const PADDLE_SPEED = 5; // Velocidade da raquete (quantos pixels ela anda por frame)
const BALL_SIZE = 10; // Dimensão da bola (quadrada) para calcular a colisão
const PADDLE_WIDTH = 10; // Largura da raquete para calcular a colisão

// O X das raquetes é fixo, precisamos definir aqui para calcular a colisão
const P1_X = 20; 
const P2_X = CANVAS_WIDTH - 30;

// Velocidade autônoma da bola (quantos pixels ela anda nos eixos X e Y por frame)
let ballSpeed = { x: 5, y: 5 };

// Função para centralizar a bola após um ponto
function resetBall() {
    gameState.ball.x = CANVAS_WIDTH / 2;
    gameState.ball.y = CANVAS_HEIGHT / 2;
    // Inverte a direção horizontal para quem tomou o ponto receber o saque
    ballSpeed.x *= -1; 
}

// O evento 'connection' é disparado toda vez que um novo navegador se conecta
io.on('connection', (socket) => {
    console.log(`Novo jogador conectado! ID: ${socket.id}`);

    // --- Lógica de atribuição de jogadores e preenchimento da fila de espectadores ---
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
        atualizarPosicoesDaFila()
    }

    // Escuta as mensagens 'move' vindas EXCLUSIVAMENTE dos jogadores
    socket.on('move', (data) => {
        // Descobre quem enviou a mensagem
        let playerKey = null;
        if (socket.id === players.p1) playerKey = 'p1';
        else if (socket.id === players.p2) playerKey = 'p2';

        // Se foi um jogador válido (e não um espectador), atualiza o estado da tecla
        if (playerKey) {
            if (data.key === 'ArrowUp') {
                inputs[playerKey].up = data.isPressed;
            } else if (data.key === 'ArrowDown') {
                inputs[playerKey].down = data.isPressed;
            }
        }
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
            spectatorsQueue = spectatorsQueue.filter(id => id !== socket.id)

            atualizarPosicoesDaFila()
        }
    });
});


// O GAME LOOP (O Coração do Jogo)
// O setInterval executa uma função repetidamente. 
// 1000 milissegundos / 60 = ~16.6ms (Isso nos dá 60 quadros por segundo)
setInterval(() => {
    // --- FÍSICA DAS RAQUETES ---
    // Movimento do Jogador 1 (Esquerda)
    if (inputs.p1.up) {
        // Sobe (diminui o Y), mas não passa do teto (0)
        gameState.p1.y = Math.max(0, gameState.p1.y - PADDLE_SPEED);
    }
    if (inputs.p1.down) {
        // Desce (aumenta o Y), mas não passa do chão (Altura da Tela - Altura da Raquete)
        gameState.p1.y = Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, gameState.p1.y + PADDLE_SPEED);
    }

    // Movimento do Jogador 2 (Direita)
    if (inputs.p2.up) {
        gameState.p2.y = Math.max(0, gameState.p2.y - PADDLE_SPEED);
    }
    if (inputs.p2.down) {
        gameState.p2.y = Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, gameState.p2.y + PADDLE_SPEED);
    }

    // --- FÍSICA DA BOLA ---
    // Movimento Contínuo (A bola anda sozinha)
    gameState.ball.x += ballSpeed.x;
    gameState.ball.y += ballSpeed.y;

    // Colisão com o Teto e o Chão
    // Se bater em cima (0) ou embaixo (altura máxima), inverte a velocidade do eixo Y
    if (gameState.ball.y <= 0 || gameState.ball.y >= CANVAS_HEIGHT - BALL_SIZE) {
        ballSpeed.y *= -1;
    }

    // Colisão com a Raquete 1 (Esquerda)
    if (gameState.ball.x <= P1_X + PADDLE_WIDTH && // Bateu na frente da raquete
        gameState.ball.x >= P1_X &&                // Não passou totalmente dela
        gameState.ball.y + BALL_SIZE >= gameState.p1.y && // Tá abaixo do topo da raquete
        gameState.ball.y <= gameState.p1.y + PADDLE_HEIGHT) { // Tá acima da base da raquete
        
        ballSpeed.x *= -1; // Rebate a bola (Inverte o eixo X)
        gameState.ball.x = P1_X + PADDLE_WIDTH; // Empurra a bola pra fora pra não bugar dentro
    }

    // Colisão com a Raquete 2 (Direita)
    if (gameState.ball.x + BALL_SIZE >= P2_X &&
        gameState.ball.x + BALL_SIZE <= P2_X + PADDLE_WIDTH &&
        gameState.ball.y + BALL_SIZE >= gameState.p2.y &&
        gameState.ball.y <= gameState.p2.y + PADDLE_HEIGHT) {
        
        ballSpeed.x *= -1; 
        gameState.ball.x = P2_X - BALL_SIZE; 
    }

    // Pontuação (A bola saiu pela esquerda ou direita)
    if (gameState.ball.x < 0 || gameState.ball.x > CANVAS_WIDTH) {
        // Alguém fez ponto! Por enquanto, só resetamos a bola.
        resetBall();
    }

    // Transmite o novo estado para todo mundo
    io.emit('gameState', gameState);
}, 1000 / 60);

const PORTA = 3000;

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`A porta ${PORTA} já está em uso. O servidor já está rodando!`);
        process.exit(1);
    } else {
        console.error(err);
    }
}); // Verificação utilizada para saber se a porta já está em uso.

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
        io.to(novoJogadorId).emit('queuePosition', null); // Remove o texto que aparece em relação à fila da tela
        atualizarPosicoesDaFila(); // Atualiza fila de espectadores
    }
}

// Função para avisar cada espectador de sua posição exata na fila
function atualizarPosicoesDaFila() {
    spectatorsQueue.forEach((socketId, index) => {
        // Envia a posição (index + 1) apenas para o socket específico
        io.to(socketId).emit('queuePosition', index + 1);
    });
}