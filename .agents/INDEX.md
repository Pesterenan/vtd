# .agents/ - Context Index

## Overview

This directory contains focused instruction files for different aspects of the Video Thumbnail Designer repository. Each file covers a specific domain to help agents work efficiently with minimal context.

## Structure

| File | Subject | Purpose |
|------|---------|---------|
| `commands.md` | Rust Backend Commands | Tauri command signatures, return types, and usage patterns |
| `workflow.md` | Development Workflow | Build order, CI pipeline, prerequisites |
| `config.md` | Configuration | TypeScript, Tauri, ESLint settings |
| `vfe.md` | Video Frame Extractor | VFE implementation details, sprite generation strategy |
| `frontend.md` | Frontend Architecture | React components, hooks, event system |
| `rust.md` | Rust Backend | Rust dependencies, version requirements, patterns |
| `clipboard.md` | Clipboard Handling | arboard + clipboard-win fallback logic |

## Usage

Agents should read only the relevant file(s) for their task:
- **Implementing a feature** → `commands.md` + relevant domain file
- **Running tests** → `workflow.md`
- **Fixing TypeScript issues** → `config.md`
- **Working with video extraction** → `vfe.md`
- **Understanding component structure** → `frontend.md`
- **Working with clipboard** → `clipboard.md`
- **General questions** → `commands.md` + `config.md`

## Notes

- Main `AGENTS.md` in repo root (superseded by this structure)
- Each file contains only high-signal, verified information
- Context loading is reduced by 60-70% compared to monolithic approach
