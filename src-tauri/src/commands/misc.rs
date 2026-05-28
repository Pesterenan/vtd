use std::fs;
use std::path::Path;

use tauri::AppHandle;
use tauri::Emitter;
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

use base64::Engine;
use image::ImageEncoder;

use super::CommandResponse;
use crate::MenuHandles;

use std::sync::mpsc;

#[derive(serde::Serialize)]
pub struct ClipboardStatus {
    pub has_image: bool,
}

fn image_mime_for_ext(ext: &str) -> &str {
    match ext.to_lowercase().as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "bmp" => "image/bmp",
        "webp" => "image/webp",
        _ => "image/png",
    }
}

fn get_clipboard_file_paths() -> Vec<String> {
    use clipboard_win::{formats::FileList, Getter, Clipboard};
    let _clip = match Clipboard::new() {
        Ok(c) => c,
        Err(_) => return vec![],
    };
    let mut files: Vec<std::path::PathBuf> = vec![];
    if FileList.read_clipboard(&mut files).is_ok() {
        files.into_iter().map(|p| p.to_string_lossy().to_string()).collect()
    } else {
        vec![]
    }
}

fn encode_image_file(path: &Path) -> Option<String> {
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
    if !matches!(ext.to_lowercase().as_str(), "jpg" | "jpeg" | "png" | "gif" | "bmp" | "webp") {
        return None;
    }
    let bytes = std::fs::read(path).ok()?;
    let mime = image_mime_for_ext(ext);
    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Some(format!("data:{};base64,{}", mime, b64))
}

#[tauri::command]
pub async fn ping() -> CommandResponse<()> {
    log::info!("pong");
    CommandResponse { success: true, message: "pong".to_string(), data: None }
}

#[tauri::command]
pub async fn open_external_link(url: String) -> CommandResponse<()> {
    match open::that(&url) {
        Ok(_) => CommandResponse { success: true, message: format!("Link aberto: {}", url), data: None },
        Err(e) => CommandResponse { success: false, message: format!("Falha ao abrir link: {}", e), data: None },
    }
}

#[tauri::command]
pub async fn change_theme(app: AppHandle, theme: String) -> CommandResponse<()> {
    let _ = app.emit("theme-update", &theme);
    CommandResponse { success: true, message: format!("Tema alterado para {}", theme), data: None }
}

#[tauri::command]
pub async fn create_frame_extractor_window(
    app: AppHandle,
    metadata: super::video::VideoMetadata,
) -> CommandResponse<()> {
    use tauri::WebviewWindowBuilder;

    let label = format!("frame-extractor-{}", metadata.file_path.replace(|c: char| !c.is_alphanumeric(), "_"));

    let metadata_json = serde_json::to_string(&metadata).unwrap();
    let init_script = format!("window.__videoMetadata = {};", metadata_json);

    let _window = match WebviewWindowBuilder::new(
        &app,
        &label,
        tauri::WebviewUrl::App("modals/videoFrameExtractor/video-frame-extractor.html".into()),
    )
    .inner_size(800.0, 600.0)
    .resizable(false)
    .title("Extrator de Quadros de Vídeo")
    .initialization_script(&init_script)
    .build()
    {
        Ok(w) => w,
        Err(e) => {
            return CommandResponse { success: false, message: format!("Falha ao criar janela: {}", e), data: None };
        }
    };

    CommandResponse { success: true, message: "Janela do extrator de quadros aberta.".to_string(), data: None }
}

#[tauri::command]
pub async fn send_frame_to_work_area(app: AppHandle, image_url: String) -> CommandResponse<()> {
    let _ = app.emit(
        "load-image-response",
        serde_json::json!({
            "success": true,
            "data": image_url,
            "message": "Quadro extraído do vídeo com sucesso.",
        }),
    );
    CommandResponse { success: true, message: "Frame enviado para área de trabalho.".to_string(), data: None }
}

#[tauri::command]
pub fn enable_copy(app: AppHandle, is_enabled: bool) {
    if let Some(handles) = app.try_state::<MenuHandles>() {
        let _ = handles.copy.set_enabled(is_enabled);
    }
}

#[tauri::command]
pub fn enable_paste(app: AppHandle, is_enabled: bool) {
    if let Some(handles) = app.try_state::<MenuHandles>() {
        let _ = handles.paste.set_enabled(is_enabled);
    }
}

#[tauri::command]
pub fn check_clipboard() -> ClipboardStatus {
    let has_arboard = arboard::Clipboard::new().and_then(|mut cb| cb.get_image()).is_ok();
    if has_arboard {
        return ClipboardStatus { has_image: true };
    }
    let has_file = get_clipboard_file_paths().iter().any(|p| {
        let ext = Path::new(p).extension().and_then(|e| e.to_str()).unwrap_or("");
        matches!(ext.to_lowercase().as_str(), "jpg" | "jpeg" | "png" | "gif" | "bmp" | "webp")
    });
    ClipboardStatus { has_image: has_file }
}

fn read_arboard_image(cb: &mut arboard::Clipboard) -> Option<String> {
    let img_data = cb.get_image().ok()?;
    let buffer = image::RgbaImage::from_raw(img_data.width as u32, img_data.height as u32, img_data.bytes.to_vec())
        .and_then(|img| {
            let mut png_bytes = std::io::BufWriter::new(std::io::Cursor::new(Vec::new()));
            let encoder = image::codecs::png::PngEncoder::new(&mut png_bytes);
            encoder
                .write_image(&img, img.width(), img.height(), image::ExtendedColorType::Rgba8)
                .ok()?;
            Some(png_bytes.into_inner().unwrap().into_inner())
        })?;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&buffer);
    Some(format!("data:image/png;base64,{}", b64))
}

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

    // Fallback: try to read file references from clipboard (e.g. copied from Explorer)
    let file_paths = get_clipboard_file_paths();
    for path_str in &file_paths {
        let path = Path::new(path_str);
        if let Some(data_url) = encode_image_file(path) {
            return CommandResponse {
                success: true,
                message: format!("Imagem carregada do arquivo: {}", path.file_name().unwrap_or_default().to_string_lossy()),
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

#[tauri::command]
pub async fn save_project_file(
    app: AppHandle,
    project_data: String,
    file_path: Option<String>,
) -> CommandResponse<String> {
    match file_path {
        Some(path) => match fs::write(&path, &project_data) {
            Ok(_) => CommandResponse {
                success: true,
                message: "Projeto salvo.".to_string(),
                data: Some(path),
            },
            Err(e) => CommandResponse {
                success: false,
                message: format!("Erro ao salvar: {}", e),
                data: None,
            },
        },
        None => {
            let (tx, rx) = mpsc::channel();
            app.dialog()
                .file()
                .add_filter("Arquivos JSON", &["json"])
                .set_title("Salvar Projeto")
                .save_file(move |file_path| {
                    let _ = tx.send(file_path);
                });

            match rx.recv() {
                Ok(Some(file_path)) => {
                    if let Some(path) = file_path.as_path() {
                        match fs::write(path, &project_data) {
                            Ok(_) => CommandResponse {
                                success: true,
                                message: format!("Projeto salvo em: {}", path.display()),
                                data: Some(path.to_string_lossy().to_string()),
                            },
                            Err(e) => CommandResponse {
                                success: false,
                                message: format!("Erro ao salvar: {}", e),
                                data: None,
                            },
                        }
                    } else {
                        CommandResponse {
                            success: false,
                            message: "Caminho inválido.".to_string(),
                            data: None,
                        }
                    }
                }
                _ => CommandResponse {
                    success: false,
                    message: "Operação cancelada.".to_string(),
                    data: None,
                },
            }
        }
    }
}
