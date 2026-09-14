# AGENTS.md - Video Thumbnail Designer (vtd)

## Architecture

This is a **Tauri 2 desktop application** with:
- **Rust backend** (`src-tauri/`) handling video processing via FFmpeg
- **React/TypeScript frontend** (`src/`) using Vite + jsdom for canvas operations
- Two main windows: `main` (work area) and `frame-extractor` (VFE modal)

## Core Commands

### Rust Backend Commands (`src-tauri/src/commands/`)

All commands return `CommandResponse<T>`: `{ success: boolean, message: string, data?: T }`

#### Image Commands
- `image:load_image` - Open file dialog, load image as base64
- `image:export_canvas` - Export canvas to file (jpeg/png)

#### Video Commands  
- `video:load_video` - Open file dialog, extract metadata (duration, fps, width, height, total_frames)
- `video:process_video_frame` - Extract single frame at timestamp, return base64 PNG
- `video:generate_thumbnail_sprite` - Generate 10x10 grid of thumbnails as JPEG
- `video:open_vfe` - Open frame extractor window
- `video:cancel_vfe` - Cancel running extraction
- `video:get_sprite_progress` - Return progress percentage (0-100)

#### Misc Commands
- `misc:ping` - Heartbeat
- `misc:open_external_link` - Open URL
- `misc:change_theme` - Switch theme
- `misc:enable_copy` / `misc:enable_paste` - Toggle clipboard permissions
- `misc:check_clipboard` - Detect if clipboard has image or file
- `misc:read_clipboard_image` - Read image from clipboard (tries arboard first, falls back to file paths)
- `misc:save_project_file` - Save project as JSON
- `misc:create_frame_extractor_window` - Open VFE modal with video metadata

## Standard Commands

```bash
npm run dev       # Start development server
npm run build     # Build for production (tsc + vite build)
npm run lint      # Run ESLint with auto-fix
npm run test      # Run Vitest tests
npm run tauri     # Build Tauri app
npm run tauri:dev # Run Tauri in dev mode
npm run tauri:build # Build Tauri app
```

## Development Workflow

### Build Order
1. `npm run dev` - Starts Vite dev server
2. `npm run build` - Runs TypeScript compilation and Vite build
3. `npm run tauri:build` - Builds Rust backend (requires Rust 1.77.2+)

### CI Pipeline
Pre-commit order: **lint → test → tauri build**
- Lint first to catch issues early
- Tests run after lint passes  
- Tauri build runs last (requires system dependencies)

**System dependencies for Linux CI:**
```bash
libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf \
libgtk-3-dev libsoup-3.0-dev libjavascriptcoregtk-4.1-dev \
libavformat-dev libavcodec-dev libavutil-dev libswscale-dev \
libavfilter-dev libswresample-dev libavdevice-dev
```

## Tauri Configuration

### Window Settings
- Main window: 1024x768, resizable, not fullscreen
- Frame extractor: 800x600, not resizable
- Window title shows current file name or `*` when modified

### CSP Policy
```
default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'
```

### Build Commands
- `beforeDevCommand`: `npm run dev`
- `beforeBuildCommand`: `npm run build`  
- `devUrl`: `http://localhost:5173`

## Menu Structure

### File Menu
- Novo projeto / Carregar projeto / Salvar projeto / Salvar projeto como...
- Importar imagem / Extrair frame de vídeo / Exportar imagem
- Propriedades / Fechar projeto

### Edit Menu
- Copiar / Colar (CmdOrCtrl+C/V)

### Transform Menu
- Inverter horizontalmente / Inverter verticalmente
- Virar 90 graus horário / Virar 90 graus anti-horário

### Image Menu
- Contains Transform submenu

### Help Menu
- Sobre

## VFE (Video Frame Extractor)

### Key Features
- Opens as separate window with its own menu
- Menu prefix: `vfe:` (isolated from main window events)
- Shows video metadata on initialization
- Progress tracking during sprite generation (0-100%)

### Sprite Generation Strategy
1. **Fast forward seek** - First attempt (uses reference timestamp)
2. **Sequential pass** - Fallback if forward seek fails (uses packet sequence)

### Thumbnail Specs
- Grid: 10x10 thumbnails (100 total)
- Default size: 192x192 (4:3 aspect ratio)
- Format: JPEG quality 85

## TypeScript Config

- `module`: "ESNext" with `moduleResolution: "node"`
- `jsx`: "react-jsx"
- `target`: "esnext"
- `noImplicitAny`: true
- `allowJs`: true
- `allowSyntheticDefaultImports`: true

### Naming Convention
- Variables: `camelCase` or `UPPER_CASE` (leading underscore allowed)
- Types: `PascalCase`
- Enums: `UPPER_CASE`
- `@typescript-eslint/no-explicit-any`: error
- `@typescript-eslint/consistent-type-imports`: error

### Test Globals (vitest)
Test files (`**/*.test.ts`) have relaxed rules:
- `vitest/expect-expect`: off
- `@typescript-eslint/no-non-null-assertion`: off

## Frontend Architecture

### Core Components
- `App.tsx` - Main entry point
- `mainWindow.ts` - Main window setup
- `workArea.ts` - Canvas for editing
- `transformBox.ts` - Transform controls
- `tools/` - ToolManager, handTool, textTool, gradientTool, zoomTool, multiTool
- `modals/` - VideoFrameExtractor modal
- `contexts/` - EventBusContext, AlertsContext, LoadingContext

### Utils
- `eventBus` - Custom event system
- `vector.ts` - Vector math operations
- `boundingBox.ts` - Bounding box calculations
- `transforms.ts` - Transform operations (scale, rotate, translate)
- `easing.ts` - Animation easing functions

## Project Structure

```
vtd/
├── src/                    # React/TypeScript frontend
│   ├── components/        # UI components
│   ├── hooks/             # Custom React hooks
│   ├── modals/            # Modal dialogs
│   ├── types/             # TypeScript types
│   ├── utils/             # Utility functions
│   └── dist/              # Vite build output
└── src-tauri/             # Rust backend
    ├── src/               # Rust code
    │   ├── commands/      # Tauri commands
    │   └── lib.rs         # Main library
    ├── capabilities/      # Tauri capabilities
    ├── icons/             # App icons
    └── tauri.conf.json    # Tauri configuration
```

## TDD Workflow (Skill: tdd-maker)

Created the `tdd-maker` skill at `~/.config/opencode/skills/tdd-maker/` to generate `.test.ts` files in TDD (red) style.

**Usage:**
```
Load skill tdd-maker. Task N from DEVELOPMENT_PLAN.md: create tests for <component>
```

**Flow:** skill creates tests → you implement → `npm run test` to verify

## Important Notes

### FFMPEG Requirement
Required on **Windows/macOS/Linux** for video extraction. Must be installed system-wide before using video features.

### Clipboard Handling
- Primary: arboard (for bitmap image data)
- Fallback: clipboard-win (for file paths on Windows)

### Rust Version
Minimum: **1.77.2** (specified in `Cargo.toml`)

### Codegen
- TypeScript types generated from Rust via Tauri
- Frontend assets built by Vite
- Resources embedded in Tauri bundle

## Testing

- Vitest for React tests
- Jest DOM integration for DOM testing
- Test files use `.test.ts` suffix
- Snapshots for component rendering
- Integration tests for critical flows

---

*Generated from analysis of repository configuration and codebase.*
