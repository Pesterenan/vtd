# .agents/clipboard.md - Clipboard Handling

## Overview

The application supports two clipboard handling strategies with a fallback mechanism:

1. **arboard** - For bitmap image data (cross-platform)
2. **clipboard-win** - For file paths (Windows-specific)

## Clipboard Types Supported

### Image Formats
- JPEG/JPG
- PNG
- GIF
- BMP
- WEBP

### File Types
- Image files (same as above)
- Video files (for frame extraction)

## Detection Strategy

### `misc:check_clipboard`
Determines if clipboard contains usable content.

**Detection Order:**
1. **Try arboard first** (fastest for bitmap images)
2. **If arboard fails, try clipboard-win** (for Windows file paths)

**Return Value:**
```typescript
{
  has_image: boolean
}
```

### Implementation

```rust
fn check_clipboard() -> ClipboardStatus {
    // Try arboard first (for bitmap data from image editors)
    let has_arboard = arboard::Clipboard::new()
        .and_then(|mut cb| cb.get_image())
        .is_ok();
    
    if has_arboard {
        return ClipboardStatus { has_image: true };
    }
    
    // Fallback: try to read file references from clipboard
    let file_paths = get_clipboard_file_paths();
    let has_file = file_paths.iter().any(|p| {
        let ext = Path::new(p).extension()
            .and_then(|e| e.to_str())
            .unwrap_or("");
        matches!(ext.to_lowercase(), "jpg" | "jpeg" | "png" | "gif" | "bmp" | "webp")
    });
    
    ClipboardStatus { has_image: has_file }
}
```

## arboard Integration

### Primary Clipboard Reader
Handles bitmap image data from:
- Image editors (Photoshop, GIMP, etc.)
- Graphics applications
- Screenshots

### Implementation
```rust
fn read_arboard_image(cb: &mut arboard::Clipboard) -> Option<String> {
    let img_data = cb.get_image().ok()?;
    
    // Convert to RGBA
    let rgba_image = image::RgbaImage::from_raw(
        img_data.width as u32, 
        img_data.height as u32, 
        img_data.bytes.to_vec()
    ).ok()?;
    
    // Convert to PNG
    let mut png_bytes = std::io::BufWriter::new(std::io::Cursor::new(Vec::new()));
    let encoder = image::codecs::png::PngEncoder::new(&mut png_bytes);
    encoder.write_image(
        &rgba_image,
        rgba_image.width(),
        rgba_image.height(),
        image::ExtendedColorType::Rgba8,
    ).ok()?;
    
    let bytes = png_bytes.into_inner().unwrap().into_inner();
    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    
    Some(format!("data:image/png;base64,{}", b64))
}
```

### Error Handling
- Returns `None` if clipboard is empty or contains unsupported data
- Converts various formats to PNG for consistency

## clipboard-win Integration (Windows)

### File Path Reader
Handles file references from:
- Windows Explorer clipboard
- File copy operations
- Drag-and-drop file operations

### Implementation
```rust
#[cfg(windows)]
fn get_clipboard_file_paths() -> Vec<String> {
    use clipboard_win::{formats::FileList, Getter, Clipboard};
    
    let mut files: Vec<std::path::PathBuf> = vec![];
    
    match Clipboard::new() {
        Ok(c) => {
            if FileList.read_clipboard(&mut files).is_ok() {
                files.into_iter()
                    .map(|p| p.to_string_lossy().to_string())
                    .collect()
            } else {
                vec![]
            }
        }
        Err(_) => vec![],
    }
}
```

### Platform-Specific
- Only available on Windows
- Returns empty vector on other platforms

## Image MIME Mapping

```rust
fn image_mime_for_ext(ext: &str) -> &str {
    match ext.to_lowercase().as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "bmp" => "image/bmp",
        "webp" => "image/webp",
        _ => "image/png",  // Default fallback
    }
}
```

## File Encoding

### encode_image_file
Converts file to base64 data URL.

```rust
fn encode_image_file(path: &Path) -> Option<String> {
    let ext = path.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");
    
    if !matches!(ext.to_lowercase(), "jpg" | "jpeg" | "png" | "gif" | "bmp" | "webp") {
        return None;
    }
    
    let bytes = std::fs::read(path).ok()?;
    let mime = image_mime_for_ext(ext);
    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    
    Some(format!("data:{};base64,{}", mime, b64))
}
```

## read_clipboard_image
Complete clipboard image reader with fallback.

**Process:**
1. Try arboard (fast, cross-platform)
2. If arboard fails, try clipboard-win (Windows only)
3. Return first successful result or error

```rust
#[tauri::command]
pub fn read_clipboard_image() -> CommandResponse<String> {
    // Try arboard first (for bitmap data from image editors)
    if let Ok(mut cb) = arboard::Clipboard::new() {
        if let Some(data_url) = read_arboard_image(&mut cb) {
            return CommandResponse {
                success: true,
                message: "Imagem lida do clipboard.".to_string(),
                data: Some(data_url),
            };
        }
    }
    
    // Fallback: try to read file references from clipboard
    let file_paths = get_clipboard_file_paths();
    for path_str in &file_paths {
        let path = Path::new(path_str);
        if let Some(data_url) = encode_image_file(path) {
            return CommandResponse {
                success: true,
                message: format!(
                    "Imagem carregada do arquivo: {}", 
                    path.file_name().unwrap_or_default().to_string_lossy()
                ),
                data: Some(data_url),
            };
        }
    }
    
    CommandResponse {
        success: false,
        message: "Nenhuma imagem encontrada no clipboard.".to_string(),
        data: None,
    }
}
```

## enable_copy / enable_paste
Clipboard permission toggles.

### enable_copy
```rust
#[tauri::command]
pub fn enable_copy(app: AppHandle, is_enabled: bool) {
    if let Some(handles) = app.try_state::<MenuHandles>() {
        let _ = handles.copy.set_enabled(is_enabled);
    }
}
```

### enable_paste
```rust
#[tauri::command]
pub fn enable_paste(app: AppHandle, is_enabled: bool) {
    if let Some(handles) = app.try_state::<MenuHandles>() {
        let _ = handles.paste.set_enabled(is_enabled);
    }
}
```

**Usage:**
- Enable copy/paste when project is loaded
- Disable copy/paste when no project loaded
- Toggle based on clipboard content

## Menu Integration

Copy/Paste menu items are conditionally enabled:

```rust
// In menu setup
let copy = MenuItem::with_id(handle, "copy", "Copiar", false, Some("CmdOrCtrl+C"))?;
let paste = MenuItem::with_id(handle, "paste", "Colar", false, Some("CmdOrCtrl+V"))?;

// In project load
if status.current_file_path.is_some() {
    handles.copy.set_enabled(true).unwrap();
    handles.paste.set_enabled(true).unwrap();
}

// In project close
if status.current_file_path.is_none() {
    handles.copy.set_enabled(false).unwrap();
    handles.paste.set_enabled(false).unwrap();
}
```

## Event Flow

```rust
// Menu item click
"copy" => {
    let _ = app_handle.emit("copy-to-clipboard", ());
}

"paste" => {
    let _ = app_handle.emit("paste-from-clipboard", ());
}
```

## Frontend Handling

### Copy
```typescript
// Listen to copy event
eventBus.on("copy-to-clipboard", () => {
    enable_copy(app, true);
});
```

### Paste
```typescript
// Listen to paste event
eventBus.on("paste-from-clipboard", () => {
    check_clipboard()
        .then(status => {
            if (status.has_image) {
                read_clipboard_image()
                    .then(result => {
                        if (result.success) {
                            send_frame_to_work_area(app, result.data!);
                        }
                    });
            }
        });
    enable_paste(app, true);
});
```
