# .agents/vfe.md - Video Frame Extractor

## Overview

The Video Frame Extractor (VFE) is a separate window that allows users to extract frames from video files and generate thumbnail sprites.

## Architecture

### Window Configuration
- **Label:** `frame-extractor`
- **Size:** 800x600 pixels
- **Resizable:** false
- **Title:** "Extrator de Quadros de Vídeo"
- **Initialization:** Receives video metadata via JavaScript

### Menu Structure
Menu prefix: `vfe:` (isolated from main window events)

```
Extração
├── Extrair Quadro
├── Copiar Quadro
├── ---
└── Fechar
```

## Video Metadata

Video metadata structure (passed to VFE on initialization):

```typescript
{
  duration: f64,      // Video duration in seconds
  file_path: String,   // Video file path
  format: String,     // Video format name (e.g., "mp4", "avi")
  frame_rate: f64,    // Frames per second
  height: i64,        // Video height in pixels
  width: i64,         // Video width in pixels
  total_frames: i64   // Total frame count
}
```

### Metadata Calculation

**Duration:**
```rust
duration = ictx.duration() / 1_000_000.0  // Convert microseconds to seconds
```

**Total Frames:**
```rust
total_frames = duration * frame_rate
```

**Frame Rate:**
```rust
// Prefer avg_frame_rate over rate
if r.numerator > 0 && r.denominator > 0 {
  frame_rate = r.numerator / r.denominator
} else {
  frame_rate = stream.rate()  // or default to 30.0
}
```

## Sprite Generation

### Specifications

- **Grid:** 10x10 thumbnails (100 total)
- **Thumbnail size:** 192x192 pixels (4:3 aspect ratio)
- **Output format:** JPEG quality 85
- **Output:** Base64-encoded JPEG data URL

### Generation Strategy

#### Phase 1: Fast Forward Seek
Attempts to seek forward to each timestamp:

1. Calculate target timestamp: `ts = index * interval`
2. Convert to FFmpeg timebase
3. Perform forward seek with `i64::MAX` flag
4. Decode frames until reaching target PTS
5. Convert and save thumbnail

**Interval calculation:**
```rust
interval = duration / count  // e.g., 10 seconds for 10-second video
```

**Timebase conversion:**
```rust
// If timebase is rational
stream_ts = timestamp * denominator / numerator

// If timebase is integer (microseconds)
stream_ts = timestamp * 1_000_000
```

#### Phase 2: Sequential Pass (Fallback)
If Phase 1 fails for any thumbnail:

1. Flush decoder state
2. Seek to beginning of video (`i64::MIN`)
3. Iterate through packets sequentially
4. Decode frames and match against target timestamps
5. Skip already-captured thumbnails
6. Update progress counter

**Progress tracking:**
- Updates `VFE_SPRITE_PROGRESS` atomic counter
- Emits progress events every 10 thumbnails
- Final progress set to 100% when complete

### Frame Processing Pipeline

```
Video File
    ↓ (FFmpeg open)
VideoContext
    ↓ (get stream)
VideoStream
    ↓ (get parameters)
CodecContext
    ↓ (create decoder)
VideoFrame
    ↓ (convert to RGBA)
RGBAImage
    ↓ (convert to PNG)
PNGBytes
    ↓ (encode to base64)
DataURL
```

### Frame Conversion

**RGBA Conversion:**
1. Convert original format to RGBA using software scaler
2. Scale to target thumbnail dimensions
3. Convert RGBA to PNG format

**RGBA Copy:**
- Extract pixel data from FFmpeg frame
- Convert YUV to RGBA color space
- Create `image::RgbaImage`

## Command Reference

### `video:open_vfe`
Opens the frame extractor window.

**Usage:**
```rust
video::open_vfe()
```

**Behavior:**
- Resets `VFE_CANCELLED` flag
- Creates/open window at label `frame-extractor`
- Sends video metadata to VFE via initialization script

### `video:cancel_vfe`
Cancels running extraction.

**Usage:**
```rust
video::cancel_vfe()
```

**Behavior:**
- Sets `VFE_CANCELLED` to true
- Resets `VFE_SPRITE_PROGRESS` to 0

### `video:get_sprite_progress`
Returns current progress.

**Usage:**
```rust
let progress = video::get_sprite_progress()  // Returns f64 (0.0 to 1.0)
```

**Implementation:**
```rust
VFE_SPRITE_PROGRESS.load(Ordering::Relaxed) as f64 / 100.0
```

### `video:process_video_frame`
Extracts single frame.

**Usage:**
```rust
let result = video::process_video_frame(file_path, time_in_seconds)
```

**Response:**
```typescript
{
  success: boolean,
  message: string,
  data?: string  // Base64 PNG data URL
}
```

## Progress Events

Progress is tracked during sprite generation:

1. **Every 10 thumbnails:** Emit progress update (0%, 10%, 20%, ..., 100%)
2. **Real-time updates:** Log seek/decode timing information

Progress format (emitted to main window):
```json
{
  "progress": 0.1,  // 10%
  "message": "Gerando miniaturas..."
}
```

## Error Handling

### Common Errors

1. **No video stream:** "Nenhum stream de vídeo encontrado."
2. **File not found:** "Arquivo de vídeo não encontrado."
3. **Seek failed:** "Forward seek falhou (código XX)."
4. **No frame found:** "Nenhum quadro encontrado (XX pacotes, YY frames ignorados)."
5. **Encoding failed:** "Erro ao codificar PNG/JPEG: XX"

### Error Response Format

All errors return:
```typescript
{
  success: false,
  message: string,  // Descriptive error message
  data: null
}
```

## Thread Safety

- All processing happens in separate threads
- Commands use `std::thread::spawn` for async processing
- Atomic flags for cancellation (`VFE_CANCELLED`, `VFE_SPRITE_PROGRESS`)
- Main thread handles I/O (file dialogs)
- Worker thread handles video processing

## Performance Optimization

- **Seek optimization:** Try fast forward before falling back to sequential
- **Progressive encoding:** Generate thumbnails incrementally
- **Cancellation support:** Can abort extraction mid-process
- **Thread pooling:** Multiple operations can run concurrently
