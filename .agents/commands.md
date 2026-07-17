# .agents/commands.md - Rust Backend Commands

## Command Response Structure

All commands return `CommandResponse<T>`:
```typescript
{
  success: boolean,
  message: string,
  data?: T
}
```

## Image Commands

### `image:load_image`
Opens file dialog for images, returns base64 data URL.

**Parameters:**
- `app: AppHandle` - Tauri app handle
- Returns: `CommandResponse<String>` with base64 image data

**Supported formats:**
- Bitmap: `jpg`, `jpeg`, `png`, `bmp`
- Vector: `svg`

**Implementation:** Reads file → encodes to base64 → returns `data:image/TYPE;base64,{encoded}`

### `image:export_canvas`
Exports canvas content to file.

**Parameters:**
- `app: AppHandle` - Tauri app handle
- `format: String` - Output format (`jpeg`, `png`, `bmp`)
- `data_string: String` - Base64 encoded canvas data
- Returns: `CommandResponse<()>`

**Notes:**
- Format `jpeg` accepts extensions `jpeg` or `jpg`
- Other formats use single extension

## Video Commands

### `video:load_video`
Extracts video metadata and returns it.

**Parameters:**
- `app: AppHandle` - Tauri app handle
- Returns: `CommandResponse<VideoMetadata>`

**VideoMetadata structure:**
```typescript
{
  duration: f64,      // Video duration in seconds
  file_path: String,   // Video file path
  format: String,     // Video format name (e.g., "mp4", "avi")
  frame_rate: f64,    // Frames per second
  height: i64,        // Video height in pixels
  width: i64,         // Video width in pixels
  total_frames: i64   // Total frame count (duration * fps)
}
```

**System requirement:** FFMPEG must be installed on system

### `video:process_video_frame`
Extracts single frame at specified timestamp.

**Parameters:**
- `file_path: String` - Video file path
- `time_in_seconds: f64` - Timestamp in seconds
- Returns: `CommandResponse<String>` with base64 PNG data

**Process:**
1. Opens video with FFmpeg
2. Seeks to timestamp (forward seek first)
3. Decodes frame to RGBA
4. Converts to PNG format
5. Returns base64 data URL

**Error handling:** Returns error if frame not found or seek fails

### `video:generate_thumbnail_sprite`
Generates grid of thumbnails from video.

**Parameters:**
- `file_path: String` - Video file path
- `duration: f64` - Video duration in seconds
- Returns: `CommandResponse<String>` with base64 JPEG data

**Grid specs:**
- 10x10 thumbnails (100 total)
- Each thumbnail: 192x192 pixels (4:3 aspect ratio)
- JPEG quality: 85

**Generation strategy:**
1. **Phase 1 - Fast forward seek:** Try seeking forward to each timestamp
2. **Phase 2 - Sequential pass:** If Phase 1 fails, use packet sequence for sequential decoding

**Progress tracking:**
- Updates `VFE_SPRITE_PROGRESS` atomic counter (0-100%)
- Progress emitted to main window via event

**Cancellable:** User can cancel via `video:cancel_vfe` command

### `video:open_vfe`
Opens frame extractor window.

**Parameters:**
- `app: AppHandle` - Tauri app handle
- Returns: `CommandResponse<()>`

**Behavior:**
- Clears `VFE_CANCELLED` flag
- Opens separate window (800x600, not resizable)
- Sends video metadata to VFE via initialization script
- Window label: `frame-extractor`

### `video:cancel_vfe`
Cancels running VFE extraction.

**Parameters:**
- `app: AppHandle` - Tauri app handle
- Returns: `CommandResponse<()>`

**Behavior:**
- Sets `VFE_CANCELLED` to true
- Resets `VFE_SPRITE_PROGRESS` to 0

### `video:get_sprite_progress`
Returns current sprite generation progress.

**Parameters:**
- `app: AppHandle` - Tauri app handle
- Returns: `CommandResponse<f64>` (0.0 to 1.0)

**Implementation:** Returns `VFE_SPRITE_PROGRESS / 100.0`

## Misc Commands

### `misc:ping`
Heartbeat command for health check.

**Parameters:**
- Returns: `CommandResponse<()>`

**Response:** `{ success: true, message: "pong" }`

### `misc:open_external_link`
Opens URL in default browser.

**Parameters:**
- `url: String` - URL to open
- Returns: `CommandResponse<()>`

### `misc:change_theme`
Changes application theme.

**Parameters:**
- `app: AppHandle` - Tauri app handle
- `theme: String` - Theme name
- Returns: `CommandResponse<()>`

**Behavior:** Emits `theme-update` event with theme name

### `misc:enable_copy`
Enables/disables copy menu item.

**Parameters:**
- `app: AppHandle` - Tauri app handle
- `is_enabled: boolean` - Enable/disable state
- Returns: `CommandResponse<()>`

### `misc:enable_paste`
Enables/disables paste menu item.

**Parameters:**
- `app: AppHandle` - Tauri app handle
- `is_enabled: boolean` - Enable/disable state
- Returns: `CommandResponse<()>`

### `misc:check_clipboard`
Checks if clipboard contains image or file.

**Parameters:**
- `app: AppHandle` - Tauri app handle
- Returns: `CommandResponse<ClipboardStatus>`

**ClipboardStatus structure:**
```typescript
{
  has_image: boolean
}
```

**Detection order:**
1. Try arboard (for bitmap image data)
2. If arboard fails, try clipboard-win (for file paths on Windows)

### `misc:read_clipboard_image`
Reads image from clipboard.

**Parameters:**
- `app: AppHandle` - Tauri app handle
- Returns: `CommandResponse<String>` with base64 data

**Process:**
1. Try arboard first (fastest for bitmap images)
2. If arboard fails, try clipboard-win (Windows file paths)
3. If both fail, return error response

### `misc:save_project_file`
Saves project to file.

**Parameters:**
- `app: AppHandle` - Tauri app handle
- `project_data: String` - JSON project data
- `file_path: Option<String>` - Optional specific path
- Returns: `CommandResponse<String>` with saved file path

**Behavior:**
- If `file_path` provided: writes directly to path
- If `file_path` is None: opens save dialog

## Command Registration

All commands are registered in `src-tauri/src/lib.rs`:

```rust
tauri::generate_handler![
  image::load_image,
  image::export_canvas,
  video::load_video,
  video::process_video_frame,
  video::generate_thumbnail_sprite,
  video::open_vfe,
  video::cancel_vfe,
  video::get_sprite_progress,
  misc::ping,
  misc::open_external_link,
  misc::change_theme,
  misc::enable_copy,
  misc::enable_paste,
  misc::check_clipboard,
  misc::read_clipboard_image,
  misc::save_project_file,
  initialize_project_state,
]
```
