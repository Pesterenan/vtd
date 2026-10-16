# AGENTS.md - Video Thumbnail Designer (vtd)

Tauri 2 desktop app: React 18 + TS frontend (`src/`), Rust backend (`src-tauri/`).

## Commands

- Run `npm run dev` for frontend-only dev (Vite root is `src/`, port 5173).
- Run `npm run tauri:dev` for full app. Run `npm run build` (`tsc && vite build`) before `npm run tauri:build`.
- Run `npm run typecheck` (`tsc --noEmit`) and `npm run lint` (`eslint --fix`) after every frontend change.
- Run `npm run test` (`vitest run`, jsdom, `**/*.test.{ts,tsx}`) after every logic change.
- Never edit `src/dist/` (Vite output, also `frontendDist`). Never commit it.

## Frontend (`src/`)

- Follow existing patterns: `MainWindow` singleton owns app state, `workArea*` owns canvas, `EventBus` (`utils/eventBus.ts`) is the cross-component channel.
- Put canvas logic in `components/workArea*.ts` + `components/elements/*`; put React UI in `components/*/*.tsx` menus.
- Add new tools in `components/tools/` extending `abstractTool.ts` and registering in `toolManager.ts`. Add new filters in `filters/` extending `filter.ts` and registering in `filterManager.ts`.
- Use `invoke()` from `@tauri-apps/api/core` for backend calls; every command returns `CommandResponse<T>` (`{ success, message, data? }`). Always check `success` before using `data`.
- Use `import type` for type-only imports (enforced by lint). Never use `any`, `Object`, or bare `{}` (lint errors).
- Name variables `camelCase`/`UPPER_CASE`, types `PascalCase`, enums `UPPER_CASE`.
- Listen to Rust menu events via EventBus bridge in `mainWindow.ts` (`request-*`, `menu:*`, `workarea:*`, `copy/paste-to-clipboard`). Emit new backend-driven UI actions the same way; do not call Tauri events directly from menus.
- Respect CSP: `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'`. Load images as `data:` URLs only.
- Resolve `@`/`src` to `src/` (see `vite.config.ts`). Mock static assets via `__mocks__/fileMock.ts` under Vitest.

## Backend (`src-tauri/src/`)

- Add commands in `commands/{image,misc,video}.rs`, declare `pub mod` in `commands/mod.rs`, register in `invoke_handler!` in `lib.rs`.
- Return `CommandResponse<T>` from every command. Use `tauri_plugin_dialog` for file pickers, never raw fs paths from frontend.
- Keep menu ids stable (`lib.rs` `on_menu_event`): frontend depends on `request-new-project`, `load-project-response`, `request-save-project(-as)`, `request-project-properties`, `request-close-project`, `menu:import-image`, `menu:extract-video`, `menu:export-image`, `workarea:flip-*`, `workarea:rotate-*`, `copy/paste-to-clipboard`, `vfe:*`.
- Update `AppStatus`/window title via `update_window_title()` when project state changes; toggle `MenuHandles` enabled flags on open/close.
- Create the VFE window only via `misc::create_frame_extractor_window` (second Vite entry `modals/videoFrameExtractor/video-frame-extractor.html`). Prefix its menu events with `vfe:`.
- Require Rust 1.77.2+ (`Cargo.toml` `rust-version`) and system FFmpeg (`ffmpeg-next 8.1`) for video commands. Linux CI also needs webkitgtk/appindicator/librsvg/gtk/soup/ffmpeg dev libs.

## Tests

- Co-locate tests as `<name>.test.ts(x)` next to source. Use `vitest.setup.ts` globals; `vi/describe/it/expect` need no imports.
- Mock canvas/DOM via jsdom; mock image imports (already aliased under `VITEST`).
- Test relaxation applies to `**/*.test.ts` only: `no-non-null-assertion` and `expect-expect` off.
