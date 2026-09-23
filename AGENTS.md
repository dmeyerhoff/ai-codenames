# AGENTS.md

This file provides guidance to coding agents (Claude Code, Codex) when working with code in this repository.

## AI Codenames

8 AI models play Codenames together — built as a prototype for the Supercell AI Innovation Lab (Helsinki).

## Tech Stack

React 19 + Vite 7 + TypeScript + Tailwind CSS v4 (uses `@import "tailwindcss"`, no config file) + Framer Motion + Zustand
AI via OpenRouter API (client-side, no backend) | TTS via Web Speech API

## Commands

```bash
npm run dev      # Start Vite dev server
npm run build    # tsc -b && vite build
npm run lint     # ESLint
```

Environment: create `.env` with `VITE_OPENROUTER_API_KEY=<key>`. No test framework configured.

## Architecture

```
src/
├── config/          # models.ts (AI player presets), prompts.ts, wordlists.ts
├── engine/          # orchestrator.ts (game loop), replayOrchestrator.ts, responseParser.ts
├── store/           # gameStore.ts (Zustand — single source of truth)
├── services/        # openrouter.ts (API client), tts.ts
├── components/
│   ├── Board/       # GameBoard, Card, ScoreBar
│   ├── Chat/        # ChatPanel, MessageBubble, AutotypedText
│   ├── Controls/    # GameControls (start, pause, speed, export/import, video toggle)
│   ├── Game/        # CinematicOverlay (video mode UI)
│   ├── Players/     # PlayerPanel, PlayerAvatar, MasterPanel, ModelSelectorModal
│   └── Layout/      # Header
├── hooks/           # useGameLoop, useTTS
└── types/           # game.ts (all TypeScript interfaces)
```

### Game Engine

The orchestrator (`src/engine/orchestrator.ts`) drives the game as an async state machine. Each team turn follows this phase sequence:

`spymaster_thinking` → `clue_reveal` → `team_conversation` → `guessing` → `guess_reactions` → `switch_team`

- **Store access**: The orchestrator reads/writes Zustand state directly via `useGameStore.getState()` (outside React)
- **Fallback system**: If a player's model fails, `safeCallPlayerModel` retries with the "Game Master" model (`masterModel` in store)
- **Response repair**: If an AI response can't be parsed, `repairResponseWithGameMaster` asks the master model to reformat it
- **Speed-aware delays**: All `delay()` calls divide by the current `speed` multiplier; extra delays when `isVideoMode` is true

### Modes

1. **Standard** — full UI with header, sidebars, chat panel
2. **Video mode** (`isVideoMode`) — cinematic overlay with turn splashes, dramatic clue reveals, vignette, repositioned panels
3. **Replay** (`playbackMode`) — replays saved JSON games via `replayOrchestrator.ts` with speed control + TTS

### Model Configuration

`src/config/models.ts` has two player presets toggled by `USE_DEMO`: `true` = expensive frontier models, `false` = budget testing. Each player has: model ID, team, role (spymaster/operative), captain flag, TTS voice ID, and display color.

### Prompts & Parsing

- `src/config/prompts.ts` — builder functions (`buildSpymasterPrompt`, `buildConversationPrompt`, `buildGuessingPrompt`, `buildReactionPrompt`) inject board state, team info, and conversation history
- `src/engine/responseParser.ts` — extracts structured data: `parseClue` finds `CLUE: WORD: NUMBER`, `parseGuess` fuzzy-matches against valid board words

## Critical Conventions

- **Type imports are mandatory**: Use `import type { X }` — Vite throws "does not provide an export" otherwise
- **Tailwind v4**: No `tailwind.config.js`. Custom utilities go in `src/index.css`
- **Hotkeys**: Space = play/pause, Escape/Q = stop & reset, F = toggle footer

## Roadmap

| # | Phase | Status | Description |
|---|-------|--------|-------------|
| 1 | Core Prototype | Done | 8 AI bots play Codenames with refined prompts via OpenRouter |
| 2 | Replay System | Done | Export/import JSON replays with playback controls, speed, scrubber + TTS |
| 3 | Video Mode | In Progress | Cinematic overlay — dramatic clue reveals, turn splashes, subtitles, vignette effects |
| 4 | Promo Video Mode | Planned | Fully scripted 45s–1:30m promotional trailer for screen recording |

### Phase 4: Promo Video Mode

A separate mode for producing a polished promotional video. No API calls — everything is hardcoded and scripted:

- Predetermined board, clues, guesses, and reactions
- Cinematic pacing with timed transitions
- Designed to be screen-recorded as a promotional trailer
- Showcases the product's potential in a controlled, curated sequence
