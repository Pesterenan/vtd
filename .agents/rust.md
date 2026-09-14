# .agents/rust.md - Rust Backend

## Dependencies

### Core Dependencies
```toml
[dependencies]
serde_json = "1.0"           # JSON serialization
serde = { version = "1.0", features = ["derive"] }  # Serialization
base64 = "0.22"               # Base64 encoding/decoding
log = "0.4"                   # Logging
tauri = { version = "2.11.2" } # Tauri framework
```

### Plugin Dependencies
```toml
tauri-plugin-log = "2.8.0"    # Logging plugin
tauri-plugin-cli = "2.4.1"    # CLI arguments plugin
tauri-plugin-dialog = "2.7.1" # File dialog plugin
```

### External Dependencies
```toml
open = "5.3"                  # URL opener
arboard = { version = "3.4", features = ["image-data"] }  # Clipboard (bitmap)
image = { version = "0.25", default-features = false, features = ["png", "jpeg"] }  # Image processing
ffmpeg-next = "8.1"           # FFmpeg bindings
clipboard-win = "5.4"         # Clipboard (Windows file paths)
```

### Build Dependencies
```toml
[build-dependencies]
tauri-build = { version = "2.6.2" }  # Tauri build script
```

### Rust Version
**Minimum:** 1.77.2

## Project Structure

```
src-tauri/
├── src/
│   ├── main.rs          # Application entry point
│   ├── lib.rs           # Library and command registration
│   └── commands/
│       ├── mod.rs       # Command module declarations
│       ├── image.rs     # Image commands
│       ├── video.rs     # Video commands
│       └── misc.rs      # Miscellaneous commands
├── capabilities/
│   └── default.json     # Tauri capabilities configuration
├── icons/               # Application icons
├── tauri.conf.json      # Tauri configuration
└── Cargo.toml           # Rust project manifest
```

## Module Structure

### commands/mod.rs
Module system for command organization.

**Structure:**
```rust
pub mod image;
pub mod misc;
pub mod video;
```

**Command Response:**
```rust
#[derive(Serialize)]
pub struct CommandResponse<T: Serialize> {
    pub success: bool,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
}
```

### lib.rs
Main library with command registration.

**Menu Handles:**
```rust
pub struct MenuHandles {
    save_project: MenuItem,
    save_project_as: MenuItem,
    properties: MenuItem,
    close_project: MenuItem,
    export_image: MenuItem,
    copy: MenuItem,
    paste: MenuItem,
    flip_horiz: MenuItem,
    flip_vert: MenuItem,
    rotate_90_cw: MenuItem,
    rotate_90_ccw: MenuItem,
}
```

**App Status:**
```rust
#[derive(Default)]
struct AppStatus {
    current_file_path: Option<PathBuf>,
    display_title: Option<String>,
    is_modified: bool,
}
```

**Window Title Builder:**
```rust
fn build_window_title(status: &AppStatus) -> String {
    if let Some(path) = &status.current_file_path {
        let file_name = path.file_name().unwrap_or_default().to_string_lossy().into_owned();
        let mut title = format!("{} - {}", APP_NAME, file_name);
        if status.is_modified {
            title.push_str(" *");
        }
        title
    } else if let Some(display_title) = &status.display_title {
        format!("{} - {}", APP_NAME, display_title)
    } else {
        APP_NAME.to_string()
    }
}
```

**Command Registration:**
```rust
tauri::generate_handler![
    image::load_image,
    image::export_canvas,
    video::load_video,
    video::generate_thumbnail_sprite,
    video::process_video_frame,
    video::open_vfe,
    video::cancel_vfe,
    video::get_sprite_progress,
    misc::ping,
    misc::open_external_link,
    misc::change_theme,
    misc::create_frame_extractor_window,
    misc::send_frame_to_work_area,
    misc::enable_copy,
    misc::enable_paste,
    misc::check_clipboard,
    misc::read_clipboard_image,
    misc::save_project_file,
    initialize_project_state,
]
```

## Command Patterns

### File Dialog Pattern
```rust
#[tauri::command]
pub async fn my_command(app: AppHandle) -> CommandResponse<T> {
    let (tx, rx) = mpsc::channel();
    
    app.dialog()
        .file()
        .add_filter("Filter", &["ext1", "ext2"])
        .set_title("Title")
        .pick_file(move |file_path| {
            let _ = tx.send(file_path);
        });
    
    match rx.recv() {
        Ok(Some(path)) => {
            // Process file
            let result = process_path(&path);
            CommandResponse { success: result.is_ok(), ... }
        }
        _ => CommandResponse { success: false, message: "Cancelled." }
    }
}
```

### Window Creation Pattern
```rust
#[tauri::command]
pub fn create_window(app: AppHandle, label: String, url: String) -> CommandResponse<()> {
    let window = WebviewWindowBuilder::new(
        &app,
        &label,
        WebviewUrl::App(url),
    )
    .inner_size(width, height)
    .resizable(resizable)
    .build()?;
    
    let _ = window.set_menu(menu);
    
    CommandResponse { success: true, ... }
}
```

### Event Emission Pattern
```rust
#[tauri::command]
pub async fn emit_event(app: AppHandle, event_name: String, data: T) -> CommandResponse<()> {
    let _ = app.emit(&event_name, &data);
    CommandResponse { success: true, ... }
}
```

### Thread-Based Processing
```rust
#[tauri::command]
pub async fn heavy_computation(params: T) -> CommandResponse<U> {
    let result = std::thread::spawn(move || {
        // Heavy computation
    }).join();
    
    match result {
        Ok(computation_result) => CommandResponse { success: true, data: Some(computation_result) },
        Err(_) => CommandResponse { success: false, message: "Thread panic".to_string() },
    }
}
```

## FFmpeg Integration

### Initialization
```rust
ffmpeg_next::init().unwrap_or(());
```

### Video Input
```rust
let ictx = ffmpeg_next::format::input(&path)
    .map_err(|e| format!("Error: {}", e))?;
```

### Stream Selection
```rust
let stream = ictx.streams()
    .best(ffmpeg_next::media::Type::Video)
    .ok_or_else(|| "No video stream found".to_string())?;
```

### Frame Decoding
```rust
let context = ffmpeg_next::codec::context::Context::from_parameters(stream.parameters());
let mut decoder = context.decoder().video();

let frame = ffmpeg_next::frame::Video::empty();
decoder.receive_frame(&mut frame)?;
```

### Frame Conversion
```rust
let mut sws = ffmpeg_next::software::scaling::Context::get(
    frame.format(),
    frame.width(),
    frame.height(),
    ffmpeg_next::format::Pixel::RGBA,
    target_width,
    target_height,
    ffmpeg_next::software::scaling::Flags::BILINEAR,
)?;

let mut converted = ffmpeg_next::frame::Video::empty();
sws.run(&frame, &mut converted)?;
```

### Frame Copy
```rust
fn copy_frame_rgba(frame: &ffmpeg_next::frame::Video) -> Result<image::RgbaImage, String> {
    let width = frame.width() as usize;
    let height = frame.height() as usize;
    let linesize = frame.stride(0) as usize;
    let src = frame.data(0);
    let mut data = vec![0u8; width * 4 * height];
    
    for y in 0..height {
        let src_start = y * linesize;
        let dst_start = y * width * 4;
        data[dst_start..dst_start + width * 4]
            .copy_from_slice(&src[src_start..src_start + width * 4]);
    }
    
    image::RgbaImage::from_raw(width as u32, height as u32, data)
        .ok_or_else(|| "Failed to create RGBA image".to_string())
}
```

## Error Handling

All commands use consistent error handling:

```rust
CommandResponse {
    success: bool,
    message: String,  // Descriptive error message
    data: Option<T>,
}
```

**Success Response:**
```rust
CommandResponse {
    success: true,
    message: "Operation completed successfully.".to_string(),
    data: Some(result_data),
}
```

**Error Response:**
```rust
CommandResponse {
    success: false,
    message: "Descriptive error message.".to_string(),
    data: None,
}
```

## Logging

Conditional logging based on debug mode:

```rust
if cfg!(debug_assertions) {
    app.handle()
        .plugin(tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build())?;
}
```

## Thread Safety

- All processing commands run in separate threads
- Atomic flags for shared state
- Channel-based communication for async operations
- Proper synchronization for concurrent access
