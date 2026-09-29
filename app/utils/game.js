export const SIZE = 4;

const DIRECTIONS = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right'
};

let nextTileId = 1;

function createEmptyBoard() {
  return Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => null)
  );
}

function cloneBoard(board) {
  return board.map((row) =>
    row.map((tile) => (tile ? { ...tile } : null))
  );
}

function newTile(value, row, col, id = null) {
  const tileId = id === null ? nextTileId++ : id;
  return {
    id: tileId,
    value,
    row,
    col
  };
}

function getLine(direction, index) {
  if (direction === DIRECTIONS.LEFT) {
    return Array.from({ length: SIZE }, (_, col) => ({
      row: index,
      col
    }));
  }

  if (direction === DIRECTIONS.RIGHT) {
    return Array.from({ length: SIZE }, (_, i) => ({
      row: index,
      col: SIZE - 1 - i
    }));
  }

  if (direction === DIRECTIONS.UP) {
    return Array.from({ length: SIZE }, (_, row) => ({
      row,
      col: index
    }));
  }

  return Array.from({ length: SIZE }, (_, i) => ({
    row: SIZE - 1 - i,
    col: index
  }));
}

function emptyCells(board) {
  const cells = [];

  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (!board[row][col]) {
        cells.push({ row, col });
      }
    }
  }

  return cells;
}

function spawnTile(state, random = Math.random) {
  const cells = emptyCells(state.board);

  if (cells.length === 0) {
    return null;
  }

  const cell = cells[Math.floor(random() * cells.length)];
  const value = random() < 0.9 ? 2 : 4;
  const tile = newTile(value, cell.row, cell.col);

  state.board[cell.row][cell.col] = tile;

  return tile;
}

function hasAvailableMoves(board) {
  if (emptyCells(board).length > 0) {
    return true;
  }

  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const value = board[row][col].value;

      if (row + 1 < SIZE && board[row + 1][col].value === value) {
        return true;
      }

      if (col + 1 < SIZE && board[row][col + 1].value === value) {
        return true;
      }
    }
  }

  return false;
}

function isValidSavedGame(saved) {
  if (!saved || !Array.isArray(saved.board) || saved.board.length !== SIZE) {
    return false;
  }

  for (const row of saved.board) {
    if (!Array.isArray(row) || row.length !== SIZE) {
      return false;
    }

    for (const tile of row) {
      if (
        tile !== null &&
        (!tile ||
          typeof tile.id !== 'number' ||
          typeof tile.value !== 'number' ||
          tile.value < 2)
      ) {
        return false;
      }
    }
  }

  return Number.isFinite(Number(saved.score));
}

function restoreBoard(savedBoard) {
  const board = createEmptyBoard();
  let maxId = 0;

  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const tile = savedBoard[row][col];

      if (tile) {
        const id = Number(tile.id);
        board[row][col] = newTile(Number(tile.value), row, col, id);
        maxId = Math.max(maxId, id);
      }
    }
  }

  nextTileId = Math.max(nextTileId, maxId + 1);

  return board;
}

export function createGame(saved = null) {
  if (isValidSavedGame(saved)) {
    const board = restoreBoard(saved.board);
    const score = Number(saved.score) || 0;

    return {
      board,
      score,
      won: Boolean(saved.won),
      over: !hasAvailableMoves(board)
    };
  }

  const state = {
    board: createEmptyBoard(),
    score: 0,
    won: false,
    over: false
  };

  spawnTile(state);
  spawnTile(state);

  return state;
}

export function boardToValues(board) {
  return board.map((row) =>
    row.map((tile) => (tile ? tile.value : 0))
  );
}

export function moveGame(state, direction, random = Math.random) {
  if (!Object.values(DIRECTIONS).includes(direction) || state.over) {
    return {
      state,
      moved: false,
      moves: [],
      merges: [],
      spawned: null,
      scoreDelta: 0,
      wonNow: false
    };
  }

  const board = cloneBoard(state.board);
  const moves = [];
  const merges = [];
  let changed = false;
  let scoreDelta = 0;
  let wonNow = false;

  for (let lineIndex = 0; lineIndex < SIZE; lineIndex++) {
    const cells = getLine(direction, lineIndex);
    const tiles = cells
      .map(({ row, col }) => board[row][col])
      .filter(Boolean);

    const output = [];
    let cursor = 0;
    let sourceIndex = 0;

    while (sourceIndex < tiles.length) {
      const current = tiles[sourceIndex];
      const destination = cells[cursor];

      if (
        sourceIndex + 1 < tiles.length &&
        tiles[sourceIndex + 1].value === current.value
      ) {
        const consumed = tiles[sourceIndex + 1];

        const merged = {
          id: current.id,
          value: current.value * 2,
          row: destination.row,
          col: destination.col
        };

        output.push(merged);

        moves.push({
          id: current.id,
          fromRow: current.row,
          fromCol: current.col,
          toRow: destination.row,
          toCol: destination.col,
          merged: true
        });

        moves.push({
          id: consumed.id,
          fromRow: consumed.row,
          fromCol: consumed.col,
          toRow: destination.row,
          toCol: destination.col,
          consumed: true
        });

        merges.push({
          id: current.id,
          consumedId: consumed.id,
          row: destination.row,
          col: destination.col,
          value: merged.value
        });

        if (merged.value >= 2048 && !state.won) {
          wonNow = true;
        }

        scoreDelta += merged.value;
        changed = true;
        sourceIndex += 2;
      } else {
        const moved = {
          id: current.id,
          value: current.value,
          row: destination.row,
          col: destination.col
        };

        output.push(moved);

        if (
          current.row !== destination.row ||
          current.col !== destination.col
        ) {
          moves.push({
            id: current.id,
            fromRow: current.row,
            fromCol: current.col,
            toRow: destination.row,
            toCol: destination.col,
            merged: false
          });

          changed = true;
        }

        sourceIndex += 1;
      }

      cursor += 1;
    }

    for (const cell of cells) {
      board[cell.row][cell.col] = null;
    }

    for (let i = 0; i < output.length; i++) {
      const tile = output[i];
      const destination = cells[i];
      tile.row = destination.row;
      tile.col = destination.col;
      board[destination.row][destination.col] = tile;
    }
  }

  if (!changed) {
    return {
      state,
      moved: false,
      moves: [],
      merges: [],
      spawned: null,
      scoreDelta: 0,
      wonNow: false
    };
  }

  const nextState = {
    board,
    score: state.score + scoreDelta,
    won: state.won || wonNow,
    over: false
  };

  const spawned = spawnTile(nextState, random);
  nextState.over = !hasAvailableMoves(nextState.board);

  return {
    state: nextState,
    moved: true,
    moves,
    merges,
    spawned,
    scoreDelta,
    wonNow
  };
}

export function serializeGame(state) {
  return {
    board: state.board.map((row) =>
      row.map((tile) =>
        tile
          ? {
              id: tile.id,
              value: tile.value
            }
          : null
      )
    ),
    score: state.score,
    won: state.won
  };
}

export const DIRECTIONS_EXPORT = DIRECTIONS;
