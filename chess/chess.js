// Board UI for the WebAssembly chess engine.
//
// The worker owns the game state; this file only renders whatever snapshot it
// last received and turns clicks into UCI move strings.

(function () {
  const el = {};
  let worker = null;
  let state = null;          // latest snapshot from the worker
  let selected = -1;         // board index of the selected piece, -1 for none
  let thinking = false;
  let playerColor = 0;       // 0 = user plays white, 1 = black
  let lastMove = null;       // {from, to} board indices, for highlighting
  let pendingPromotion = null;

  // Solid glyphs for both colours, tinted by CSS. Outline glyphs (♙♘♗) render
  // inconsistently across platforms and vanish on light squares.
  const GLYPH = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' };

  // Board strings are in reading order: index 0 is a8, index 63 is h1.
  const nameOf = (i) => 'abcdefgh'[i % 8] + (8 - Math.floor(i / 8));
  const indexOf = (sq) => (8 - Number(sq[1])) * 8 + ('abcdefgh'.indexOf(sq[0]));

  const MOVETIME = { 0: 200, 1: 500, 2: 1000, 3: 1500 };

  function difficulty() { return Number(el.difficulty.value); }

  // ---------------------------------------------------------------- rendering

  function render() {
    if (!state) return;

    const flipped = playerColor === 1;
    el.board.classList.toggle('flipped', flipped);

    const destinations = new Set();
    if (selected >= 0) {
      const from = nameOf(selected);
      state.legal.forEach((m) => {
        if (m.slice(0, 2) === from) destinations.add(indexOf(m.slice(2, 4)));
      });
    }

    let kingInCheck = -1;
    if (state.inCheck) {
      const king = state.turn === 0 ? 'K' : 'k';
      kingInCheck = state.board.indexOf(king);
    }

    for (let i = 0; i < 64; i++) {
      const cell = el.cells[i];
      const piece = state.board[i];

      cell.textContent = piece === '.' ? '' : GLYPH[piece.toLowerCase()];
      cell.className = 'sq'
        + ((Math.floor(i / 8) + i) % 2 === 0 ? ' light' : ' dark')
        + (piece === '.' ? '' : (piece === piece.toUpperCase() ? ' white' : ' black'))
        + (i === selected ? ' selected' : '')
        + (destinations.has(i) ? (piece === '.' ? ' target' : ' capture') : '')
        + (lastMove && (i === lastMove.from || i === lastMove.to) ? ' lastmove' : '')
        + (i === kingInCheck ? ' check' : '');
    }

    renderStatus();
  }

  function renderStatus() {
    const yourTurn = state.turn === playerColor;
    let text;

    switch (state.status) {
      case 1: {
        const userLost = state.turn === playerColor;
        text = userLost ? 'Checkmate — the engine wins.' : 'Checkmate — you win!';
        break;
      }
      case 2: text = 'Stalemate — draw.'; break;
      case 3: text = 'Draw by the fifty-move rule.'; break;
      case 4: text = 'Draw — insufficient material.'; break;
      default:
        if (thinking) text = 'Thinking…';
        else if (state.inCheck) text = yourTurn ? 'You are in check.' : 'Check!';
        else text = yourTurn ? 'Your move.' : 'Engine to move.';
    }

    el.status.textContent = text;
    el.undo.disabled = thinking || state.moveCount < 2;
  }

  // ------------------------------------------------------------- interaction

  function onSquareClick(i) {
    if (thinking || !state || state.status !== 0) return;
    if (state.turn !== playerColor) return;
    if (pendingPromotion) return;

    const piece = state.board[i];
    const isOwn = piece !== '.'
      && (playerColor === 0 ? piece === piece.toUpperCase() : piece === piece.toLowerCase());

    if (selected >= 0) {
      const matches = state.legal.filter(
        (m) => m.slice(0, 2) === nameOf(selected) && m.slice(2, 4) === nameOf(i)
      );

      if (matches.length > 1) {        // same from/to, different promotion piece
        askPromotion(matches);
        return;
      }
      if (matches.length === 1) {
        playMove(matches[0]);
        return;
      }
    }

    selected = isOwn ? i : -1;         // select own piece, otherwise deselect
    render();
  }

  function askPromotion(moves) {
    pendingPromotion = moves;
    el.promotion.innerHTML = '';

    ['q', 'r', 'b', 'n'].forEach((p) => {
      const move = moves.find((m) => m.endsWith(p));
      if (!move) return;
      const btn = document.createElement('button');
      btn.textContent = GLYPH[p];
      btn.className = playerColor === 0 ? 'white' : 'black';
      btn.title = { q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' }[p];
      btn.onclick = () => {
        pendingPromotion = null;
        el.promotion.hidden = true;
        playMove(move);
      };
      el.promotion.appendChild(btn);
    });

    el.promotion.hidden = false;
  }

  function playMove(uci) {
    selected = -1;
    lastMove = { from: indexOf(uci.slice(0, 2)), to: indexOf(uci.slice(2, 4)) };
    thinking = true;
    worker.postMessage({ type: 'move', uci });
  }

  function requestEngineMove() {
    thinking = true;
    renderStatus();
    worker.postMessage({
      type: 'go',
      difficulty: difficulty(),
      movetime: MOVETIME[difficulty()],
    });
  }

  // ------------------------------------------------------------------ worker

  function onMessage(e) {
    const msg = e.data;
    state = msg.state;

    switch (msg.type) {
      case 'ready':
        el.status.textContent = 'Your move.';
        thinking = false;
        render();
        break;

      case 'moved':
        // Keep `thinking` set while rendering, so the status reads "Thinking…"
        // the moment the user's move appears rather than flashing "Your move."
        // for a frame before the engine is asked.
        if (msg.ok && state.status === 0 && state.turn !== playerColor) {
          render();
          requestEngineMove();
        } else {
          thinking = false;
          render();
        }
        break;

      case 'engineMoved':
        thinking = false;
        if (msg.uci) {
          lastMove = { from: indexOf(msg.uci.slice(0, 2)), to: indexOf(msg.uci.slice(2, 4)) };
        }
        render();
        break;

      case 'state':
        thinking = false;
        lastMove = null;
        selected = -1;
        render();
        // New game as black: the engine opens.
        if (state.status === 0 && state.turn !== playerColor) requestEngineMove();
        break;
    }
  }

  // -------------------------------------------------------------------- setup

  function buildBoard() {
    el.cells = [];
    for (let i = 0; i < 64; i++) {
      const cell = document.createElement('div');
      cell.className = 'sq';
      cell.addEventListener('click', () => onSquareClick(i));
      el.board.appendChild(cell);
      el.cells.push(cell);
    }
  }

  function newGame() {
    selected = -1;
    lastMove = null;
    pendingPromotion = null;
    el.promotion.hidden = true;
    playerColor = Number(el.side.value);
    worker.postMessage({ type: 'newGame' });
  }

  let started = false;
  function start() {
    if (started) return;
    started = true;

    el.board = document.getElementById('chess-board');
    el.status = document.getElementById('chess-status');
    el.difficulty = document.getElementById('chess-difficulty');
    el.side = document.getElementById('chess-side');
    el.newGame = document.getElementById('chess-new');
    el.undo = document.getElementById('chess-undo');
    el.promotion = document.getElementById('chess-promotion');

    buildBoard();
    el.status.textContent = 'Loading engine…';

    worker = new Worker('chess/engine-worker.js');
    worker.onmessage = onMessage;
    worker.onerror = (err) => {
      el.status.textContent = 'Engine failed to load.';
      console.error('chess worker:', err.message || err);
    };

    // Debug handle: lets a specific position be loaded from the console, e.g.
    //   chessDebug.setFen('4k3/P7/8/8/8/8/8/4K3 w - - 0 1')
    window.chessDebug = {
      setFen: (fen) => worker.postMessage({ type: 'setFen', fen }),
      state: () => state,
    };

    el.newGame.addEventListener('click', newGame);
    el.side.addEventListener('change', newGame);
    el.undo.addEventListener('click', () => {
      if (thinking) return;
      selected = -1;
      lastMove = null;
      worker.postMessage({ type: 'undo', full: true });
    });
  }

  // The engine is 134KB of WebAssembly, so it is only fetched once someone
  // actually opens the chess page -- not on every visit to the site.
  document.addEventListener('DOMContentLoaded', () => {
    const page = document.getElementById('chess');
    if (!page) return;
    if (page.classList.contains('active')) start();
    document.querySelectorAll('[data-page="chess"]').forEach((link) => {
      link.addEventListener('click', start);
    });
  });
})();
