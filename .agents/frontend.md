# .agents/frontend.md - React Frontend Architecture

## Core Components

### App.tsx
Main entry point and application lifecycle management.

**Responsibilities:**
- Initialize application state
- Setup event listeners
- Manage window titles
- Handle global events

**State Management:**
- Project state (current file, display title, is_modified)
- Active tool
- Current theme

### mainWindow.ts
Main window setup and management.

**Window Properties:**
- Label: `main`
- Size: 1024x768
- Resizable: true

**Title Updates:**
- Shows current file name when loaded
- Appends `*` when modified
- Shows app name when no project loaded

### workArea.ts
Canvas-based editing area.

**Features:**
- HTML5 Canvas for rendering
- Layer management
- Transform controls
- Filter application

**Events:**
- `workarea:initialized` - Canvas ready
- `workarea:update` - Canvas content changed
- `workarea:clear` - Clear all layers

### transformBox.ts
Transform controls overlay.

**Controls:**
- Scale slider
- Rotate slider
- X/Y position inputs
- Apply/Cancel buttons

### tools/

#### ToolManager
Manages active tool and event delegation.

**Tools:**
- `handTool` - Pan/canvas navigation
- `textTool` - Add text objects
- `gradientTool` - Add gradient fills
- `zoomTool` - Zoom canvas
- `multiTool` - Multi-object selection

**Event Handling:**
```typescript
export type ToolEventHandler = "onMouseDown" | "onMouseMove" | "onMouseUp" | "onKeyDown" | "onKeyUp"
```

**Delegate Pattern:**
```typescript
this.delegate(method, evt) {
  if (!this.current || !this.isWorkAreaActive) return;
  if (method === "onKeyDown" || method === "onKeyUp") {
    const activeEl = document.activeElement;
    if (activeEl?.tagName === "TEXTAREA" || activeEl?.tagName === "INPUT") return;
  }
  const handler = this.current[method];
  handler.call(this.current, evt);
}
```

#### abstractTool
Base class for all tools.

**Methods:**
- `equip()` - Activate tool
- `unequip()` - Deactivate tool
- `draw()` - Render on canvas
- Event handlers (onMouseDown, onMouseMove, etc.)

#### textTool
Text object tool.

**Features:**
- Click to place text
- Drag to move text
- Keyboard shortcuts (Enter=accept, Escape=cancel)
- Default font: 16px Times New Roman

#### gradientTool
Gradient fill tool.

**Features:**
- Click to define gradient points
- Supports linear and radial gradients
- Color picker for gradient colors

#### zoomTool
Canvas zoom tool.

**Features:**
- Zoom in/out with keyboard (+=zoom in, -=zoom out)
- Wheel to zoom
- Zoom level display

#### handTool
Pan/navigation tool.

**Features:**
- Drag to pan canvas
- Scroll wheel to pan (if configured)

### modals/

#### VideoFrameExtractor (VFE)
Video frame extraction modal.

**Components:**
- Video metadata display
- Frame navigator
- Thumbnail preview
- Progress indicator

**Events:**
- `vfe:video-metadata` - Received video metadata
- `vfe:extract-frame` - Extract frame request
- `vfe:copy-frame` - Copy frame request
- `vfe:close` - Close VFE window

### contexts/

#### EventBusContext
Custom event bus for inter-component communication.

**Events:**
- `menu:loading-show` - Show loading indicator
- `menu:import-image` - Import image request
- `menu:extract-video` - Extract video request
- `menu:export-image` - Export image request
- `workarea:*` - Work area events
- `vfe:*` - VFE events (isolated from main window)
- `tool:*` - Tool events

#### AlertsContext
Toast notification system.

**Features:**
- Success/error/warning/info messages
- Auto-dismiss after 3 seconds
- Manual dismiss

#### LoadingContext
Loading overlay management.

**Features:**
- Show/hind loading indicator
- Progress tracking
- Cancel operation

### hooks/

#### useLoading
Loading state hook.

**Usage:**
```typescript
const { isLoading, loadingMessage, setLoading, setLoadingMessage } = useLoading();
```

#### useAlerts
Alert notification hook.

**Usage:**
```typescript
const { showAlert, clearAlerts } = useAlerts();
```

#### useEventBus
Event subscription hook.

**Usage:**
```typescript
const { subscribe, unsubscribe, emit } = useEventBus();
```

#### useDragToAdjust
Drag-to-adjust hook for fine-tuning values.

**Usage:**
```typescript
const { isDragging, value, startDrag, updateValue, endDrag } = useDragToAdjust(initialValue);
```

#### useLayerDrag
Layer drag and drop hook.

**Usage:**
```typescript
const { layers, dragLayer, dropLayer, updateLayerPosition } = useLayerDrag();
```

### utils/

#### eventBus
Custom event system implementation.

**Methods:**
- `on(event, callback)` - Subscribe to event
- `off(event, callback)` - Unsubscribe from event
- `emit(event, data)` - Emit event with data

#### vector
Vector math operations.

**Functions:**
- `create(x, y)` - Create vector
- `add(v1, v2)` - Add vectors
- `subtract(v1, v2)` - Subtract vectors
- `multiply(v, scalar)` - Multiply vector by scalar
- `rotate(v, angle)` - Rotate vector
- `distance(v1, v2)` - Distance between vectors

#### boundingBox
Bounding box calculations.

**Functions:**
- `create(x, y, width, height)` - Create bounding box
- `contains(box, point)` - Check if point is in box
- `intersect(box1, box2)` - Calculate intersection
- `union(box1, box2)` - Calculate union

#### transforms
Transform operations.

**Functions:**
- `scale(vector, scale)` - Scale transform
- `rotate(vector, angle)` - Rotate transform
- `translate(vector, dx, dy)` - Translate transform
- `compose(transforms)` - Compose multiple transforms

#### easing
Animation easing functions.

**Functions:**
- `linear(t)` - Linear easing
- `easeIn(t)` - Ease in
- `easeOut(t)` - Ease out
- `easeInOut(t)` - Ease in out
- `quadratic(t)` - Quadratic easing
- `cubic(t)` - Cubic easing

#### formatFrameIntoTime
Convert frame number to time display.

**Usage:**
```typescript
formatFrameIntoTime(frameNumber, fps)  // Returns "00:00:00"
```

#### getElementById
Custom getElementById for React elements.

**Usage:**
```typescript
getElementById(element, id)  // Returns element or null
```

#### bb
Bounding box utility shortcuts.

**Functions:**
- `bbWidth(bb)` - Get bounding box width
- `bbHeight(bb)` - Get bounding box height
- `bbX(bb)` - Get bounding box X
- `bbY(bb)` - Get bounding box Y

### types/

#### custom.d.ts
Custom TypeScript types.

**Types:**
- `Position` - { x: number, y: number }
- `Size` - { width: number, height: number }
- `Transform` - { scale: number, rotation: number, x: number, y: number }
- `Layer` - Layer object structure
- `Tool` - Tool interface

#### vitest-globals.d.ts
Vitest type declarations.

**Globals:**
- `vi` - Mock function
- `describe` - Test description
- `it` - Test case
- `expect` - Assert function
- `beforeEach` - Before each test
- `afterEach` - After each test
- `beforeAll` - Before all tests
- `afterAll` - After all tests

## Component Communication

### Event Flow

```
Menu Action
    ↓ (emit event)
EventBus
    ↓ (broadcast)
Relevant Components
    ↓ (handle event)
Update State/UI
```

### Event Naming Convention

- `menu:*` - Menu-related events
- `workarea:*` - Work area events
- `vfe:*` - VFE events (isolated)
- `tool:*` - Tool events
- `layer:*` - Layer events
- `app:*` - Application events

## Build Pipeline

1. **TypeScript Compilation:** `tsc`
   - Type checking
   - ESNext output
   - Source maps

2. **Vite Build:** `vite build`
   - Bundle JavaScript
   - Minify code
   - Copy assets
   - Output to `dist/`

3. **Tauri Codegen:** `tauri generate`
   - Generate TypeScript types from Rust
   - Generate frontend bindings

## CSS Architecture

### Module System
- Component-specific CSS in `.module.css` files
- Global styles in `index.css`
- Utility classes via CSS modules

### Naming Convention
- BEM-style naming for components
- Descendant selectors for nested elements
- CSS custom properties for themes
