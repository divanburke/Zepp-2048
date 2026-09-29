export const STORAGE = {
  GAME: 'zepp2048.game',
  BEST: 'zepp2048.best'
};

export const BOARD = {
  x: 24,
  y: 94,
  size: 342,
  padding: 18,
  cell: 63,
  gap: 18,
  radius: 26,
  tileRadius: 18
};

export const COLORS = {
  background: 0x090b0e,
  surface: 0x12171c,
  board: 0x11161b,
  emptyTile: 0x1a2128,
  accent: 0x98d69b,
  accentBright: 0xb9efa9,
  text: 0xffffff,
  muted: 0x85919c,
  overlay: 0x07090c,
  overlayText: 0xffffff,
  tile: {
    2: 0x1c2b22,
    4: 0x24402e,
    8: 0x2d5a38,
    16: 0x397344,
    32: 0x478f50,
    64: 0x5aa95d,
    128: 0x72c76b,
    256: 0x8fdd7f,
    512: 0xacef94,
    1024: 0xc8f5a9,
    2048: 0xe0ffc0
  },
  tileTextDark: 0x10150f
};

export function getTileStyle(value) {
  if (value <= 2048 && COLORS.tile[value] !== undefined) {
    return {
      background: COLORS.tile[value],
      text: value >= 1024 ? COLORS.tileTextDark : COLORS.text
    };
  }

  return {
    background: COLORS.accentBright,
    text: COLORS.tileTextDark
  };
}

export function getTileTextSize(value) {
  if (value < 100) return 32;
  if (value < 1000) return 27;
  if (value < 10000) return 22;
  return 18;
}
