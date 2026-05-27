use std::fs;
use std::sync::mpsc;

use base64::Engine;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

use super::CommandResponse;

#[tauri::command]
pub async fn load_image(app: AppHandle) -> CommandResponse<String> {
    let (tx, rx) = mpsc::channel();
    app.dialog()
        .file()
        .add_filter("Arquivos de Imagem", &["jpg", "jpeg", "png", "svg", "bmp"])
        .add_filter("Arquivos Bitmap", &["bmp"])
        .add_filter("Arquivos JPG", &["jpg", "jpeg"])
        .add_filter("Arquivos PNG", &["png"])
        .add_filter("Arquivos SVG", &["svg"])
        .set_title("Importar Imagem")
        .pick_file(move |file_path| {
            let _ = tx.send(file_path);
        });

    match rx.recv() {
        Ok(Some(file_path)) => {
            if let Some(path) = file_path.as_path() {
                match fs::read(path) {
                    Ok(data) => {
                        let b64 =
                            base64::engine::general_purpose::STANDARD.encode(&data);
                        let ext = path
                            .extension()
                            .and_then(|e| e.to_str())
                            .unwrap_or("")
                            .to_lowercase();
                        let mime = match ext.as_str() {
                            "svg" => "image/svg+xml",
                            "jpg" | "jpeg" => "image/jpeg",
                            "png" => "image/png",
                            "bmp" => "image/bmp",
                            _ => "image/png",
                        };
                        CommandResponse {
                            success: true,
                            message: format!("Imagem {} importada.", ext.to_uppercase()),
                            data: Some(format!("data:{};base64,{}", mime, b64)),
                        }
                    }
                    Err(e) => CommandResponse {
                        success: false,
                        message: format!("Falha ao carregar arquivo de imagem: {}", e),
                        data: None,
                    },
                }
            } else {
                CommandResponse {
                    success: false,
                    message: "Nenhum arquivo selecionado.".to_string(),
                    data: None,
                }
            }
        }
        _ => CommandResponse {
            success: false,
            message: "Nenhum arquivo selecionado.".to_string(),
            data: None,
        },
    }
}

#[tauri::command]
pub async fn export_canvas(
    app: AppHandle,
    format: String,
    data_string: String,
) -> CommandResponse<()> {
    let filter_exts: Vec<&str> = if format == "jpeg" {
        vec!["jpeg", "jpg"]
    } else {
        vec![format.as_str()]
    };

    let (tx, rx) = mpsc::channel();
    app.dialog()
        .file()
        .add_filter("Arquivos de Imagem", &filter_exts)
        .set_title("Exportar Canvas")
        .save_file(move |file_path| {
            let _ = tx.send(file_path);
        });

    match rx.recv() {
        Ok(Some(file_path)) => {
            if let Some(path) = file_path.as_path() {
                let base64_data = data_string.split(',').nth(1).unwrap_or(&data_string);
                match base64::engine::general_purpose::STANDARD.decode(base64_data) {
                    Ok(buffer) => match fs::write(path, &buffer) {
                        Ok(_) => CommandResponse {
                            success: true,
                            message: format!("Canvas exportado com sucesso em: {}", path.display()),
                            data: None,
                        },
                        Err(e) => CommandResponse {
                            success: false,
                            message: format!("Falha ao salvar arquivo: {}", e),
                            data: None,
                        },
                    },
                    Err(e) => CommandResponse {
                        success: false,
                        message: format!("Erro ao decodificar base64: {}", e),
                        data: None,
                    },
                }
            } else {
                CommandResponse {
                    success: false,
                    message: "Nenhum arquivo selecionado.".to_string(),
                    data: None,
                }
            }
        }
        _ => CommandResponse {
            success: false,
            message: "Exportação cancelada.".to_string(),
            data: None,
        },
    }
}
