import { BasePage } from '@zeppos/zml/base-page';
import {
  onGesture,
  GESTURE_UP,
  GESTURE_DOWN,
  GESTURE_LEFT,
  GESTURE_RIGHT
} from '@zos/interaction';

import { LAYOUT } from 'zosLoader:./index.[pf].layout.js';

import {
  setupPage,
  card,
  text,
  pillAligned,
  prop,
  align,
  onBackKey,
  goBack,
  fadeIn,
  fadeOut,
  slideInTop,
  popIn,
  move as animateMove,
  saveObject,
  loadObject,
  vibrateLight
} from 'zeppcore';

import {
  BOARD,
  COLORS,
  STORAGE,
  getTileStyle,
  getTileTextSize
} from '../utils/config/constants.js';

import {
  createGame,
  moveGame,
  serializeGame,
  DIRECTIONS_EXPORT
} from '../utils/game.js';

const WIDTH = LAYOUT.width;
const HEIGHT = LAYOUT.height;

const tileViews = new Map();

let state = null;
let bestScore = 0;
let busy = false;

let scoreValueWidget = null;
let bestValueWidget = null;
let boardWidget = null;
let newGameButton = null;

let gameOverOverlay = null;
let gameOverTitle = null;
let gameOverScore = null;
let gameOverButton = null;

let restartOverlay = null;
let restartTitle = null;
let restartMessage = null;
let restartCancelButton = null;
let restartConfirmButton = null;

function cellRect(row, col) {
  return {
    x: BOARD.x + BOARD.padding + col * (BOARD.cell + BOARD.gap),
    y: BOARD.y + BOARD.padding + row * (BOARD.cell + BOARD.gap)
  };
}

function updateWidgetText(widget, value) {
  widget.setProperty(prop.MORE, {
    text: String(value)
  });
}

function createTileView(tile, animate = true) {
  const rect = cellRect(tile.row, tile.col);
  const style = getTileStyle(tile.value);

  const background = card({
    x: rect.x,
    y: rect.y,
    w: BOARD.cell,
    h: BOARD.cell,
    color: style.background,
    radius: BOARD.tileRadius
  });

  const label = text({
    x: rect.x,
    y: rect.y,
    w: BOARD.cell,
    h: BOARD.cell,
    value: String(tile.value),
    color: style.text,
    size: getTileTextSize(tile.value),
    alignH: align.CENTER_H,
    alignV: align.CENTER_V
  });

  const view = {
    background,
    label,
    row: tile.row,
    col: tile.col,
    value: tile.value
  };

  tileViews.set(tile.id, view);

  if (animate) {
    background.setProperty(prop.MORE, {
      alpha: 0
    });

    label.setProperty(prop.MORE, {
      alpha: 0
    });

    popIn(background, rect.x, rect.y, BOARD.cell, BOARD.cell, {
      duration: 180,
      scale: 0.78,
      autoDestroy: false
    });

    popIn(label, rect.x, rect.y, BOARD.cell, BOARD.cell, {
      duration: 180,
      scale: 0.78,
      autoDestroy: false
    });
  }

  return view;
}

function removeAllTiles() {
  for (const view of tileViews.values()) {
    fadeOut(view.background, {
      duration: 90
    });

    fadeOut(view.label, {
      duration: 90
    });
  }

  tileViews.clear();
}

function clearGameOverOverlay() {
  if (!gameOverOverlay) {
    return;
  }

  fadeOut(gameOverOverlay, {
    duration: 100
  });

  if (gameOverTitle) {
    fadeOut(gameOverTitle, {
      duration: 100
    });
  }

  if (gameOverScore) {
    fadeOut(gameOverScore, {
      duration: 100
    });
  }

  if (gameOverButton) {
    fadeOut(gameOverButton.button, {
      duration: 100
    });

    fadeOut(gameOverButton.text, {
      duration: 100
    });
  }

  gameOverOverlay = null;
  gameOverTitle = null;
  gameOverScore = null;
  gameOverButton = null;
}

function showGameOverOverlay() {
  if (gameOverOverlay || !state.over) {
    return;
  }

  gameOverOverlay = card({
    x: BOARD.x,
    y: BOARD.y,
    w: BOARD.size,
    h: BOARD.size,
    color: COLORS.overlay,
    radius: BOARD.radius
  });

  gameOverTitle = text({
    x: BOARD.x + 20,
    y: BOARD.y + 93,
    w: BOARD.size - 40,
    h: 44,
    value: 'GAME OVER',
    color: COLORS.overlayText,
    size: 30,
    alignH: align.CENTER_H,
    alignV: align.CENTER_V
  });

  gameOverScore = text({
    x: BOARD.x + 20,
    y: BOARD.y + 140,
    w: BOARD.size - 40,
    h: 28,
    value: 'Score ' + state.score,
    color: COLORS.muted,
    size: 17,
    alignH: align.CENTER_H,
    alignV: align.CENTER_V
  });

  gameOverButton = pillAligned({
    x: BOARD.x + 76,
    y: BOARD.y + 190,
    w: BOARD.size - 152,
    h: 46,
    text: 'TRY AGAIN',
    textColor: COLORS.background,
    textSize: 17,
    normalColor: COLORS.accent,
    pressColor: 0x78b97f,
    onClick: () => {
      startNewGame();
    }
  });

  const overlayWidgets = [
    gameOverOverlay,
    gameOverTitle,
    gameOverScore,
    gameOverButton.button,
    gameOverButton.text
  ];

  for (const widget of overlayWidgets) {
    widget.setProperty(prop.MORE, {
      alpha: 0
    });
  }

  fadeIn(gameOverOverlay, {
    duration: 160,
    autoDestroy: false
  });

  fadeIn(gameOverTitle, {
    duration: 190,
    autoDestroy: false
  });

  fadeIn(gameOverScore, {
    duration: 300,
    autoDestroy: false
  });

  fadeIn(gameOverButton.button, {
    duration: 230,
    autoDestroy: false
  });

  fadeIn(gameOverButton.text, {
    duration: 230,
    autoDestroy: false
  });
}

function clearRestartConfirmation() {
  if (!restartOverlay) {
    return;
  }

  const widgets = [
    restartOverlay,
    restartTitle,
    restartMessage,
    restartCancelButton?.button,
    restartCancelButton?.text,
    restartConfirmButton?.button,
    restartConfirmButton?.text
  ];

  for (const widget of widgets) {
    if (widget) {
      fadeOut(widget, {
        duration: 100
      });
    }
  }

  restartOverlay = null;
  restartTitle = null;
  restartMessage = null;
  restartCancelButton = null;
  restartConfirmButton = null;
}

function showRestartConfirmation() {
  if (restartOverlay || busy) {
    return;
  }

  restartOverlay = card({
    x: BOARD.x,
    y: BOARD.y,
    w: BOARD.size,
    h: BOARD.size,
    color: COLORS.overlay,
    radius: BOARD.radius
  });

  restartTitle = text({
    x: BOARD.x + 20,
    y: BOARD.y + 92,
    w: BOARD.size - 40,
    h: 44,
    value: 'RESTART?',
    color: COLORS.overlayText,
    size: 30,
    alignH: align.CENTER_H,
    alignV: align.CENTER_V
  });

  restartMessage = text({
    x: BOARD.x + 30,
    y: BOARD.y + 137,
    w: BOARD.size - 60,
    h: 44,
    value: 'Your current game will be lost.',
    color: COLORS.muted,
    size: 15,
    alignH: align.CENTER_H,
    alignV: align.CENTER_V
  });

  restartCancelButton = pillAligned({
    x: BOARD.x + 38,
    y: BOARD.y + 196,
    w: 112,
    h: 46,
    text: 'CANCEL',
    textColor: COLORS.text,
    textSize: 15,
    normalColor: COLORS.surface,
    pressColor: COLORS.emptyTile,
    onClick: clearRestartConfirmation
  });

  restartConfirmButton = pillAligned({
    x: BOARD.x + 162,
    y: BOARD.y + 196,
    w: 142,
    h: 46,
    text: 'RESTART',
    textColor: COLORS.background,
    textSize: 15,
    normalColor: COLORS.accent,
    pressColor: 0x78b97f,
    onClick: () => {
      clearRestartConfirmation();
      startNewGame();
    }
  });

  const widgets = [
    restartOverlay,
    restartTitle,
    restartMessage,
    restartCancelButton.button,
    restartCancelButton.text,
    restartConfirmButton.button,
    restartConfirmButton.text
  ];

  for (const widget of widgets) {
    widget.setProperty(prop.MORE, {
      alpha: 0
    });
  }

  fadeIn(restartOverlay, {
    duration: 140,
    autoDestroy: false
  });

  fadeIn(restartTitle, {
    duration: 180,
    autoDestroy: false
  });

  fadeIn(restartMessage, {
    duration: 220,
    autoDestroy: false
  });

  fadeIn(restartCancelButton.button, {
    duration: 240,
    autoDestroy: false
  });

  fadeIn(restartCancelButton.text, {
    duration: 240,
    autoDestroy: false
  });

  fadeIn(restartConfirmButton.button, {
    duration: 260,
    autoDestroy: false
  });

  fadeIn(restartConfirmButton.text, {
    duration: 260,
    autoDestroy: false
  });
}

function renderScore(animate = false) {
  updateWidgetText(scoreValueWidget, state.score);
  updateWidgetText(bestValueWidget, bestScore);

  if (animate) {
    popIn(scoreValueWidget, 138, 38, 82, 26, {
      duration: 130,
      scale: 0.86,
      autoDestroy: false
    });
  }
}

function animateTileMove(entry) {
  const view = tileViews.get(entry.id);

  if (!view) {
    return;
  }

  const from = cellRect(entry.fromRow, entry.fromCol);
  const to = cellRect(entry.toRow, entry.toCol);

  view.row = entry.toRow;
  view.col = entry.toCol;

  animateMove(
    view.background,
    from.x,
    from.y,
    to.x,
    to.y,
    {
      duration: 420,
      autoDestroy: false
    }
  );

  animateMove(
    view.label,
    from.x,
    from.y,
    to.x,
    to.y,
    {
      duration: 420,
      autoDestroy: false
    }
  );
}

function updateTileValue(view, value) {
  const style = getTileStyle(value);

  view.value = value;

  view.background.setProperty(prop.MORE, {
    color: style.background
  });

  view.label.setProperty(prop.MORE, {
    text: String(value),
    color: style.text,
    text_size: getTileTextSize(value)
  });
}

function animateMerge(merge) {
  const target = tileViews.get(merge.id);
  const consumed = tileViews.get(merge.consumedId);

  if (consumed) {
    fadeOut(consumed.background, {
      duration: 95
    });

    fadeOut(consumed.label, {
      duration: 95,
      onComplete: () => {
        tileViews.delete(merge.consumedId);
      }
    });
  }

  if (!target) {
    return;
  }

  updateTileValue(target, merge.value);

  const rect = cellRect(merge.row, merge.col);

  popIn(target.background, rect.x, rect.y, BOARD.cell, BOARD.cell, {
    duration: 230,
    scale: 0.72,
    autoDestroy: false
  });

  popIn(target.label, rect.x, rect.y, BOARD.cell, BOARD.cell, {
    duration: 230,
    scale: 0.72,
    autoDestroy: false
  });
}

function launchShell() {
  const shellWidgets = [
    scoreValueWidget,
    bestValueWidget,
    boardWidget,
    newGameButton.button,
    newGameButton.text
  ];

  for (const widget of shellWidgets) {
    widget.setProperty(prop.MORE, {
      alpha: 0
    });
  }

  fadeIn(scoreValueWidget, {
    duration: 240,
    autoDestroy: false
  });

  fadeIn(bestValueWidget, {
    duration: 280,
    autoDestroy: false
  });

  fadeIn(boardWidget, {
    duration: 350,
    autoDestroy: false
  });

  fadeIn(newGameButton.button, {
    duration: 260,
    autoDestroy: false
  });

  fadeIn(newGameButton.text, {
    duration: 260,
    autoDestroy: false
  });
}

function renderInitialBoard() {
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const tile = state.board[row][col];

      if (tile) {
        createTileView(tile, true);
      }
    }
  }
}

function startNewGame() {
  busy = true;
  clearGameOverOverlay();
  removeAllTiles();

  state = createGame();
  bestScore = Math.max(bestScore, state.score);
  renderScore(false);

  saveObject(STORAGE.GAME, serializeGame(state));
  saveObject(STORAGE.BEST, bestScore);

  setTimeout(() => {
    renderInitialBoard();
    busy = false;
  }, 110);
}

function handleMove(direction) {
  if (busy || !state || state.over) {
    return;
  }

  const result = moveGame(state, direction);

  if (!result.moved) {
    vibrateLight();
    return;
  }

  busy = true;
  state = result.state;

  bestScore = Math.max(bestScore, state.score);
  renderScore(true);

  for (const entry of result.moves) {
    animateTileMove(entry);
  }

  for (const merge of result.merges) {
    animateMerge(merge);
  }

  saveObject(STORAGE.GAME, serializeGame(state));
  saveObject(STORAGE.BEST, bestScore);

  setTimeout(() => {
    if (result.spawned) {
      createTileView(result.spawned, true);
    }

    if (state.over) {
      showGameOverOverlay();
    }

    busy = false;
  }, 135);
}

Page(
  BasePage({
    onInit() {
      setupPage({
        hideStatusBar: true
      });

      const savedGame = loadObject(STORAGE.GAME, null);
      bestScore = Number(loadObject(STORAGE.BEST, 0)) || 0;
      state = createGame(savedGame);
    },

    build() {
      card({
        x: 0,
        y: 0,
        w: WIDTH,
        h: HEIGHT,
        color: COLORS.background,
        radius: 0
      });

      card({
        x: 24,
        y: 20,
        w: 295,
        h: 52,
        color: COLORS.surface,
        radius: 26
      });

      card({
        x: 28,
        y: 24,
        w: 92,
        h: 44,
        color: COLORS.background,
        radius: 22
      });

      card({
        x: 130,
        y: 24,
        w: 86,
        h: 44,
        color: COLORS.background,
        radius: 22
      });

      card({
        x: 234,
        y: 24,
        w: 78,
        h: 44,
        color: COLORS.background,
        radius: 22
      });

      text({
        x: 130,
        y: 28,
        w: 86,
        h: 12,
        value: 'SCORE',
        color: COLORS.muted,
        size: 10,
        alignH: align.CENTER_H,
        alignV: align.CENTER_V
      });

      text({
        x: 234,
        y: 28,
        w: 78,
        h: 12,
        value: 'BEST',
        color: COLORS.muted,
        size: 10,
        alignH: align.CENTER_H,
        alignV: align.CENTER_V
      });

      scoreValueWidget = text({
        x: 130,
        y: 40,
        w: 86,
        h: 24,
        value: state.score,
        color: COLORS.text,
        size: 18,
        alignH: align.CENTER_H,
        alignV: align.CENTER_V
      });

      bestValueWidget = text({
        x: 234,
        y: 40,
        w: 78,
        h: 24,
        value: bestScore,
        color: COLORS.text,
        size: 18,
        alignH: align.CENTER_H,
        alignV: align.CENTER_V
      });

      newGameButton = pillAligned({
        x: 24,
        y: 20,
        w: 104,
        h: 52,
        text: 'NEW GAME',
        textColor: COLORS.background,
        textSize: 13,
        normalColor: COLORS.accent,
        pressColor: 0x78b97f,
        onClick: showRestartConfirmation
      });

      boardWidget = card({
        x: BOARD.x,
        y: BOARD.y,
        w: BOARD.size,
        h: BOARD.size,
        color: COLORS.board,
        radius: BOARD.radius
      });

      renderInitialBoard();
      launchShell();

      onGesture({
        callback: (gesture) => {
        if (gesture === GESTURE_UP) {
          handleMove(DIRECTIONS_EXPORT.UP);
        } else if (gesture === GESTURE_DOWN) {
          handleMove(DIRECTIONS_EXPORT.DOWN);
        } else if (gesture === GESTURE_LEFT) {
          handleMove(DIRECTIONS_EXPORT.LEFT);
        } else if (gesture === GESTURE_RIGHT) {
          handleMove(DIRECTIONS_EXPORT.RIGHT);
        }

        // Always consume the gesture so a right-edge swipe cannot trigger
        // the default page-back behavior.
        return true;
      }
      });

      onBackKey(() => {
        goBack();
      });
    },

    onDestroy() {
      if (state) {
        saveObject(STORAGE.GAME, serializeGame(state));
        saveObject(STORAGE.BEST, bestScore);
      }
    }
  })
);
