// Runs the WebAssembly engine off the main thread.
//
// Search is a blocking CPU loop -- on the main thread it would freeze the page
// (no rendering, no clicks) for the whole thinking time. In a worker the board
// stays responsive and the UI just waits for a message.
//
// The engine owns the game state, so every command replies with a full
// snapshot rather than the UI trying to mirror it.

importScripts('chess-engine.js');

let engine = null;
let api = {};

function snapshot() {
  return {
    board: api.board(),                                  // 64 chars, a8..h1
    turn: api.sideToMove(),                              // 0 white, 1 black
    status: api.status(),                                // see engine_status()
    inCheck: api.inCheck() === 1,
    moveCount: api.moveCount(),
    legal: api.legalMoves().split(' ').filter(Boolean),
    fen: api.fen(),
  };
}

createChessEngine().then((mod) => {
  engine = mod;

  // cwrap once; calling through ccall every time re-parses the signature.
  api = {
    init:        engine.cwrap('engine_init',         null,     []),
    newGame:     engine.cwrap('engine_new_game',     null,     []),
    setFen:      engine.cwrap('engine_set_fen',      'number', ['string']),
    fen:         engine.cwrap('engine_fen',          'string', []),
    board:       engine.cwrap('engine_board',        'string', []),
    legalMoves:  engine.cwrap('engine_legal_moves',  'string', []),
    sideToMove:  engine.cwrap('engine_side_to_move', 'number', []),
    inCheck:     engine.cwrap('engine_in_check',     'number', []),
    moveCount:   engine.cwrap('engine_move_count',   'number', []),
    status:      engine.cwrap('engine_status',       'number', []),
    makeMove:    engine.cwrap('engine_make_move',    'number', ['string']),
    undo:        engine.cwrap('engine_undo',         'number', []),
    playBest:    engine.cwrap('engine_play_best',    'string', ['number', 'number']),
  };

  api.init();
  postMessage({ type: 'ready', state: snapshot() });
});

onmessage = (e) => {
  const msg = e.data;
  if (!engine) return;                    // commands before ready are dropped

  switch (msg.type) {
    case 'newGame':
      api.newGame();
      postMessage({ type: 'state', state: snapshot() });
      break;

    // Load an arbitrary position. Not wired to any UI control; it exists so a
    // specific position can be set from the console when debugging.
    case 'setFen':
      api.setFen(msg.fen);
      postMessage({ type: 'state', state: snapshot() });
      break;

    case 'move': {
      const ok = api.makeMove(msg.uci) === 1;
      postMessage({ type: 'moved', ok, uci: msg.uci, state: snapshot() });
      break;
    }

    case 'go': {
      const uci = api.playBest(msg.difficulty, msg.movetime);
      postMessage({ type: 'engineMoved', uci, state: snapshot() });
      break;
    }

    case 'undo':
      // Two plies, so the human is on move again rather than facing their own
      // position with the engine to reply.
      api.undo();
      if (msg.full) api.undo();
      postMessage({ type: 'state', state: snapshot() });
      break;
  }
};
