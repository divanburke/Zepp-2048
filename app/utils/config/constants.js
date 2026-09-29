export const STORAGE = {
  GAME: 'zepp2048.game',
  BEST: 'zepp2048.best'
};

export const BOARD = {
  x: 24,
  y: 94,
  size: 342,
  cell: 78,
  gap: 10,
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
    2: 0x26342b,
    4: 0x30453a,
    8: 0x3b5948,
    16: 0x476a50,
    32: 0x557b59,
    64: 0x669066,
    128: 0x7ca774,
    256: 0x93bc83,
    512: 0xa9cf91,
    1024: 0xc0e2a0,
    2048: 0xd3f2ad
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
