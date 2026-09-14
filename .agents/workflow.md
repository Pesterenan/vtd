# .agents/workflow.md - Development Workflow

## Build Order

Execute in this order:

```bash
npm run dev       # Start Vite dev server
npm run build     # Build for production (tsc + vite build)
npm run tauri     # Build Tauri app
npm run tauri:dev # Run Tauri in dev mode
npm run tauri:build # Build Tauri app (production)
```

### Step 1: Development Server
```bash
npm run dev
```
- Starts Vite dev server at `http://localhost:5173`
- Enables hot reload for frontend development
- Required before Tauri dev build

### Step 2: Production Build
```bash
npm run build
```
- Runs TypeScript compilation (`tsc`)
- Builds frontend assets via Vite
- Outputs to `src/dist/`
- **Required before** Tauri build

### Step 3: Tauri Backend Build
```bash
npm run tauri:build
```
- Builds Rust backend (`src-tauri/`)
- Requires Rust 1.77.2+
- Requires system dependencies (see below)

## CI Pipeline

Pre-commit order: **lint → test → tauri build**

### Step 1: Lint
```bash
npm run lint
```
- Runs ESLint with auto-fix (`--fix` flag)
- Catches TypeScript and code quality issues early

### Step 2: Tests
```bash
npm run test
```
- Runs Vitest test suite
- Must pass before proceeding to build

### Step 3: Tauri Build
```bash
npm run tauri:build --ci
```
- Builds complete Tauri application
- Fails if previous steps failed

## System Dependencies

### Linux
```bash
libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf \
libgtk-3-dev libsoup-3.0-dev libjavascriptcoregtk-4.1-dev \
libavformat-dev libavcodec-dev libavutil-dev libswscale-dev \
libavfilter-dev libswresample-dev libavdevice-dev
```

Install with:
```bash
sudo apt-get update
sudo apt-get install -y <packages>
```

### Windows
- No special dependencies required
- FFMPEG must be installed separately for video features

### macOS
- No special dependencies required
- FFMPEG must be installed separately for video features

## Rust Version

**Minimum version:** 1.77.2

Check current version:
```bash
rustc --version
```

Install/update:
```bash
rustup install 1.77.2
rustup default 1.77.2
```

## Git Hooks

Pre-commit hook runs the CI pipeline automatically:
1. Runs `npm run lint`
2. Runs `npm run test`
3. Runs `npm run tauri:build`

If any step fails, the commit is aborted.

## Development Commands Reference

### Frontend Commands
- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run lint` - Linting with auto-fix
- `npm run test` - Run tests

### Backend Commands
- `npm run tauri:dev` - Tauri dev mode
- `npm run tauri:build` - Tauri production build

### Direct Commands
- `cargo build` - Build Rust backend directly
- `cargo test` - Run Rust tests
- `cargo clippy` - Rust linting

## Common Workflows

### Quick Iteration (Development)
```bash
npm run dev
# Edit code, auto-reload
```

### Production Release
```bash
npm run lint
npm run test
npm run build
npm run tauri:build
```

### Debug Specific Component
```bash
npm run dev -- --filter <component-name>
```

### Run Specific Test
```bash
npm run test -- <test-file-name>
```

### Debug Rust Code
```bash
cargo run --bin vtd
# or
cargo test --package vtd
```

## Verification Checklist

Before each commit:
- [ ] Lint passes (`npm run lint`)
- [ ] Tests pass (`npm run test`)
- [ ] Tauri build succeeds (`npm run tauri:build`)
- [ ] No new warnings in console
- [ ] No type errors
