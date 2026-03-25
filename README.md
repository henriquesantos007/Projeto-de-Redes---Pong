# Pong Multiplayer - Redes de Computadores 🏓🌐

Este projeto é uma implementação multiplayer online do clássico jogo Pong, desenvolvido como objeto de estudo prático para a disciplina de Redes de Computadores. 

O foco principal não é a complexidade gráfica, mas sim a construção de uma infraestrutura de rede robusta para jogos em tempo real, abordando problemas clássicos de sistemas distribuídos como latência, concorrência e sincronização de estados.

## 🧠 Arquitetura e Conceitos de Redes Aplicados

Para mitigar problemas de dessincronização (*Desync*) e evitar trapaças por parte dos clientes, o projeto adota os seguintes padrões:

* **Arquitetura Cliente-Servidor Autoritativo:** O frontend (navegador) atua apenas como um terminal de entrada e saída. Ele captura os *inputs* do teclado e renderiza os gráficos. O servidor (Node.js) detém a autoridade absoluta sobre o estado do jogo (*Source of Truth*), calculando a física, as colisões (AABB) e distribuindo as coordenadas unificadas para todos os nós da rede.
* **WebSockets (TCP):** Devido à restrição de segurança dos navegadores que impede o uso de *sockets* UDP puros, a comunicação em tempo real é feita via WebSockets (utilizando a biblioteca Socket.io). Isso cria um túnel TCP bidirecional e persistente, permitindo o *Broadcast* contínuo do estado do jogo a 60 Hz (Game Loop) com baixíssima latência.
* **Protocolo de Aplicação Customizado:** Troca de mensagens baseada em *payloads* JSON minimalistas para economizar largura de banda.
* **Gerenciamento de Sessão e Fila FIFO:** O servidor é *Stateful* e gerencia dinamicamente as conexões. Os dois primeiros clientes assumem o controle das raquetes (P1 e P2). Conexões subsequentes são alocadas em uma fila de espera ordenada (Espectadores) e promovidas automaticamente em caso de desconexão (queda do socket) de um dos jogadores ativos.

## 🛠️ Tecnologias Utilizadas

* **Backend:** Node.js, Express, Socket.io
* **Frontend:** HTML5 (Canvas API), CSS3, JavaScript Vanilla (Puro)
* **VLAN:** Radmin

## 📁 Estrutura do Repositório

O projeto adota uma estrutura de monorepo simplificada:

* `/backend`: Contém a lógica do servidor, motor de física e gerenciamento de rede (`server.js`).
* `/frontend`: Contém a interface do cliente, lógica de renderização (`app.js`) e ponte de comunicação com o servidor (`network.js`).

## 🚀 Como Executar Localmente

Para rodar este projeto na sua máquina, você precisará ter o **Node.js** instalado.

### Preparando o Servidor (Backend)

Abra o terminal e navegue até a pasta do backend:
```bash
cd backend
```
Instale as dependências da rede (Express e Socket.io):
```bash
npm install
```
Inicie o servidor:
```bash
node server.js
```
O terminal exibirá a mensagem de que o servidor está rodando na porta 3000 e aguardará conexões.

### Executando o Cliente (Frontend)
Com o terminal do servidor rodando em segundo plano, abra o jogo no navegador:
1. Abra o seu radmin;
2. Copie o seu IP do radmin;
3. Cole o IP e adicione :3000 ao fim do IP e carregue a página web;
4. Para simular o Multiplayer: Abra uma nova aba ou janela anônima e acesse o mesmo IP em conjunto com a porta 3000;
5. Para testar a fila de espera: Abra uma terceira aba. O terminal do servidor informará que este novo nó entrou como espectador. Feche a aba do Jogador 1 ou 2 para ver a promoção automática acontecendo em tempo real.
---
Desenvolvido para fins acadêmicos e estudo de protocolos de comunicação em tempo real.
