# Zepp-2048

A native 2048 game for Amazfit Bip 6 using the official Zepp OS project structure and ZeppCore.

The Zepp project lives in the `app/` directory.

## Development

Open the `app/` directory in VS Code, then run:

    npm install
    zeus dev

## Architecture

- Official Zepp OS template-style app structure
- ZeppCore for UI, animation, input, storage, navigation, device helpers and vibration
- Pure JavaScript 2048 game engine
- Persistent game and best score
- Native swipe controls
- Animated tile movement, spawning and merging
