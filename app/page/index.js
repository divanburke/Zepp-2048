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
  vibrateLight,
  vibrateStrong
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

let titleWidget = null;
let scoreValueWidget = null;
let bestValueWidget = null;
let boardWidget = null;
let newGameButton = null;

let gameOverOverlay = null;
let gameOverTitle = null;
let gameOverScore = null;
let gameOverButton = null;

function cellRect(row, col) {
  return {
    x: BOARD.x + col * (BOARD.cell + BOARD.gap),
    y: BOARD.y + row * (BOARD.cell + BOARD.gap)
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

function renderScore(animate = false) {
  updateWidgetText(scoreValueWidget, state.score);
  updateWidgetText(bestValueWidget, bestScore);

  if (animate) {
    popIn(scoreValueWidget, 133, 61, 90, 20, {
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
      duration: 210,
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
      duration: 210,
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
    titleWidget,
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

  slideInTop(titleWidget, 11, {
    duration: 320,
    distance: 20,
    autoDestroy: false
  });

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

  if (result.wonNow) {
    vibrateStrong();
  } else {
    vibrateLight();
  }

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

      titleWidget = text({
        x: 24,
        y: 11,
        w: 100,
        h: 34,
        value: '2048',
        color: COLORS.text,
        size: 31,
        alignH: align.LEFT,
        alignV: align.CENTER_V
      });

      card({
        x: 133,
        y: 48,
        w: 90,
        h: 37,
        color: COLORS.surface,
        radius: 16
      });

      card({
        x: 229,
        y: 48,
        w: 90,
        h: 37,
        color: COLORS.surface,
        radius: 16
      });

      text({
        x: 133,
        y: 50,
        w: 90,
        h: 12,
        value: 'SCORE',
        color: COLORS.muted,
        size: 10,
        alignH: align.CENTER_H,
        alignV: align.CENTER_V
      });

      text({
        x: 229,
        y: 50,
        w: 90,
        h: 12,
        value: 'BEST',
        color: COLORS.muted,
        size: 10,
        alignH: align.CENTER_H,
        alignV: align.CENTER_V
      });

      scoreValueWidget = text({
        x: 133,
        y: 61,
        w: 90,
        h: 20,
        value: state.score,
        color: COLORS.text,
        size: 18,
        alignH: align.CENTER_H,
        alignV: align.CENTER_V
      });

      bestValueWidget = text({
        x: 229,
        y: 61,
        w: 90,
        h: 20,
        value: bestScore,
        color: COLORS.text,
        size: 18,
        alignH: align.CENTER_H,
        alignV: align.CENTER_V
      });

      newGameButton = pillAligned({
        x: 24,
        y: 48,
        w: 100,
        h: 37,
        text: 'NEW GAME',
        textColor: COLORS.background,
        textSize: 12,
        normalColor: COLORS.accent,
        pressColor: 0x78b97f,
        onClick: startNewGame
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
