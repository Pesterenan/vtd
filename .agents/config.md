# .agents/config.md - Configuration Settings

## TypeScript Config (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "allowJs": true,
    "allowSyntheticDefaultImports": true,
    "baseUrl": ".",
    "esModuleInterop": true,
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "node",
    "noImplicitAny": true,
    "outDir": "dist",
    "paths": {
      "src/*": ["src/*"],
      "components/*": ["src/components/*"]
    },
    "resolveJsonModule": true,
    "sourceMap": true,
    "skipLibCheck": true,
    "target": "esnext"
  },
  "include": ["src/**/*", "src/types/**/*.d.ts", "vitest.setup.ts"],
  "exclude": ["**/*.spec.ts"]
}
```

### Key Settings

- **`jsx: "react-jsx"`** - Automatic JSX transformation (no import needed)
- **`module: "ESNext"`** with **`moduleResolution: "node"`** - Modern module system
- **`noImplicitAny: true`** - Errors on implicit `any` types
- **`target: "esnext"`** - Latest ES features
- **`skipLibCheck: true`** - Skip type checking in lib files (speeds up build)

### Naming Convention

- **Variables:** `camelCase` or `UPPER_CASE` (leading underscore allowed)
- **Types:** `PascalCase`
- **Enums:** `UPPER_CASE`

Violating these rules triggers lint errors.

## ESLint Config (`.eslintrc.json`)

### Base Rules
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "plugin:vitest/recommended"
  ]
}
```

### Custom Rules

#### `@typescript-eslint/no-explicit-any`
- **Level:** error
- Prevents use of `any` type (use specific types instead)

#### `@typescript-eslint/consistent-type-imports`
- **Level:** error
- Requires consistent type import style (import types vs import side effects)

#### `@typescript-eslint/naming-convention`
```json
{
  "variableLike": {
    "format": ["camelCase", "UPPER_CASE"],
    "leadingUnderscore": "allow"
  },
  "variable": {
    "format": ["camelCase", "UPPER_CASE", "PascalCase"]
  },
  "enum": {
    "format": ["UPPER_CASE"]
  },
  "typeLike": {
    "format": ["PascalCase"]
  }
}
```

#### `@typescript-eslint/ban-types`
- **Level:** error
- Bans `Object` type (use `{}` instead)
- Bans empty object type (use specific types or `Record<string, unknown>`)

### Test File Overrides

Test files (`**/*.test.ts`) have relaxed rules:
```json
{
  "globals": {
    "vi": true,
    "describe": true,
    "it": true,
    "expect": true,
    "beforeEach": true,
    "afterEach": true,
    "beforeAll": true,
    "afterAll": true
  },
  "rules": {
    "@typescript-eslint/no-non-null-assertion": "off",
    "vitest/expect-expect": "off"
  }
}
```

## Tauri Configuration (`tauri.conf.json`)

### Window Settings

**Main Window:**
- Title: "Video Thumbnail Designer"
- Size: 1024x768
- Resizable: true
- Fullscreen: false
- Drag drop: disabled

**Frame Extractor Window:**
- Title: "Extrator de Quadros de Vídeo"
- Size: 800x600
- Resizable: false

### Security (CSP)
```json
{
  "csp": "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'"
}
```

**Directives:**
- `default-src 'self'` - Only allow same-origin resources
- `img-src 'self' data:` - Allow images from same origin and data URLs
- `style-src 'self' 'unsafe-inline'` - Allow styles from same origin and inline styles

### Build Commands

```json
{
  "beforeDevCommand": "npm run dev",
  "beforeBuildCommand": "npm run build",
  "devUrl": "http://localhost:5173",
  "frontendDist": "../src/dist/"
}
```

### Bundle Configuration

**Resources:**
```json
{
  "resources": {
    "resources/*.dll": "./"
  }
}
```

**Icons:**
```json
{
  "icon": [
    "icons/32x32.png",
    "icons/128x128.png",
    "icons/128x128@2x.png",
    "icons/icon.icns",
    "icons/icon.ico"
  ]
}
```

**Windows NSIS:**
```json
{
  "windows": {
    "nsis": {
      "installMode": "currentUser",
      "languages": ["Portuguese"]
    }
  }
}
```

## Rust Configuration (`Cargo.toml`)

### Package Metadata
```toml
[package]
name = "vtd"
version = "0.1.0"
description = "Editor de miniaturas de videos."
authors = ["Pesterenan"]
license = ""
repository = "https://github.com/Pesterenan/vtd#readme"
edition = "2021"
rust-version = "1.77.2"
```

### Library Configuration
```toml
[lib]
name = "app_lib"
crate-type = ["staticlib", "cdylib", "rlib"]
```

### Dependencies

**Runtime Dependencies:**
```toml
[dependencies]
serde_json = "1.0"
serde = { version = "1.0", features = ["derive"] }
base64 = "0.22"
log = "0.4"
tauri = { version = "2.11.2", features = [] }
tauri-plugin-log = "2.8.0"
tauri-plugin-cli = "2.4.1"
tauri-plugin-dialog = "2.7.1"
open = "5.3"
arboard = { version = "3.4", features = ["image-data"] }
image = { version = "0.25", default-features = false, features = ["png", "jpeg"] }
ffmpeg-next = "8.1"
clipboard-win = "5.4"
```

**Build Dependencies:**
```toml
[build-dependencies]
tauri-build = { version = "2.6.2", features = [] }
```

## Capabilities (`capabilities/default.json`)

### Window Permissions
```json
{
  "windows": [
    "main",
    "frame-extractor"
  ]
}
```

### Default Permissions
```json
{
  "permissions": [
    "core:default",
    "core:window:allow-set-title",
    "dialog:default",
    "dialog:allow-open",
    "dialog:allow-save"
  ]
}
```

## Environment Variables

No environment variables are currently used in the project.
