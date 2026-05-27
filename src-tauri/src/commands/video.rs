use std::fs;
use std::process::Command;
use std::sync::mpsc;
use std::time::{SystemTime, UNIX_EPOCH};

use base64::Engine;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

use super::CommandResponse;

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoMetadata {
    pub duration: f64,
    pub file_path: String,
    pub format: Option<String>,
    pub frame_rate: f64,
    pub height: i64,
    pub total_frames: i64,
    pub width: i64,
}

#[tauri::command]
pub async fn load_video(app: AppHandle) -> CommandResponse<VideoMetadata> {
    let (tx, rx) = mpsc::channel();
    app.dialog()
        .file()
        .add_filter("Arquivos de Video", &["mkv", "mpg", "mpeg", "avi", "mov", "mp4"])
        .add_filter("Todos os Arquivos", &["*"])
        .set_title("Carregar Vídeo")
        .pick_file(move |file_path| {
            let _ = tx.send(file_path);
        });

    let file_path = match rx.recv() {
        Ok(Some(path)) => path,
        _ => {
            return CommandResponse {
                success: false,
                message: "Nenhum arquivo selecionado.".to_string(),
                data: None,
            };
        }
    };

    let path_buf = match file_path.as_path() {
        Some(p) => p.to_path_buf(),
        None => {
            return CommandResponse {
                success: false,
                message: "Caminho inválido.".to_string(),
                data: None,
            };
        }
    };

    if !path_buf.exists() {
        return CommandResponse {
            success: false,
            message: "Arquivo de vídeo não encontrado.".to_string(),
            data: None,
        };
    }

    let path_str = path_buf.to_string_lossy().to_string();

    let ffprobe_output = Command::new("ffprobe")
        .args(["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", &path_str])
        .output();

    match ffprobe_output {
        Ok(output) => match serde_json::from_slice::<serde_json::Value>(&output.stdout) {
            Ok(json) => {
                let fmt_name = json["format"]["format_name"]
                    .as_str()
                    .unwrap_or("unknown")
                    .to_string();
                let duration: f64 = json["format"]["duration"]
                    .as_str()
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(0.0);

                let streams = json["streams"].as_array().cloned().unwrap_or_default();
                let video_stream = streams.iter().find(|s| s["codec_type"] == "video").cloned();

                match video_stream {
                    Some(stream) => {
                        let width = stream["width"].as_i64().unwrap_or(0);
                        let height = stream["height"].as_i64().unwrap_or(0);
                        let frame_rate_str = stream["r_frame_rate"].as_str().unwrap_or("1/1");

                        let frame_rate = {
                            let parts: Vec<&str> = frame_rate_str.split('/').collect();
                            let num: f64 =
                                parts.first().and_then(|s| s.parse().ok()).unwrap_or(1.0);
                            let den: f64 =
                                parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(1.0);
                            if den == 0.0 {
                                1.0
                            } else {
                                num / den
                            }
                        };

                        let total_frames = (duration * frame_rate) as i64;

                        let metadata = VideoMetadata {
                            duration,
                            file_path: path_str,
                            format: Some(fmt_name.clone()),
                            frame_rate,
                            height,
                            total_frames,
                            width,
                        };

                        CommandResponse {
                            success: true,
                            message: format!("Vídeo {} carregado com sucesso.", fmt_name),
                            data: Some(metadata),
                        }
                    }
                    None => CommandResponse {
                        success: false,
                        message: "Nenhum stream de vídeo encontrado.".to_string(),
                        data: None,
                    },
                }
            }
            Err(e) => CommandResponse {
                success: false,
                message: format!("Falha ao interpretar metadados: {}", e),
                data: None,
            },
        },
        Err(e) => CommandResponse {
            success: false,
            message: format!("Erro ao executar ffprobe: {}", e),
            data: None,
        },
    }
}

#[tauri::command]
pub async fn generate_thumbnail_sprite(file_path: String, duration: f64) -> CommandResponse<String> {
    let cols = 10;
    let rows = 10;
    let count = cols * rows;
    let interval = duration / count as f64;

    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let tmp_dir = std::env::temp_dir().join(format!("vtd_sprite_{}", nanos));
    let _ = fs::create_dir_all(&tmp_dir);
    let out_file = tmp_dir.join("thumbnail_sprite.jpg");

    let output = Command::new("ffmpeg")
        .args([
            "-i",
            &file_path,
            "-vf",
            &format!("fps=1/{},scale=192:-1,tile={}x{}", interval, cols, rows),
            "-frames:v",
            "1",
            "-y",
            out_file.to_str().unwrap_or(""),
        ])
        .output();

    match output {
        Ok(status) if status.status.success() => match fs::read(&out_file) {
            Ok(data) => {
                let b64 = base64::engine::general_purpose::STANDARD.encode(&data);
                let _ = fs::remove_dir_all(&tmp_dir);
                CommandResponse {
                    success: true,
                    message: "Sprite de miniaturas gerado com sucesso.".to_string(),
                    data: Some(format!("data:image/jpeg;base64,{}", b64)),
                }
            }
            Err(e) => {
                let _ = fs::remove_dir_all(&tmp_dir);
                CommandResponse {
                    success: false,
                    message: format!("Falha ao ler sprite: {}", e),
                    data: None,
                }
            }
        },
        Ok(status) => {
            let _ = fs::remove_dir_all(&tmp_dir);
            let stderr = String::from_utf8_lossy(&status.stderr);
            CommandResponse {
                success: false,
                message: format!("ffmpeg falhou: {}", stderr),
                data: None,
            }
        }
        Err(e) => {
            let _ = fs::remove_dir_all(&tmp_dir);
            CommandResponse {
                success: false,
                message: format!("Erro ao executar ffmpeg: {}", e),
                data: None,
            }
        }
    }
}

#[tauri::command]
pub async fn process_video_frame(file_path: String, time_in_seconds: f64) -> CommandResponse<String> {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let tmp_file = std::env::temp_dir().join(format!("vtd_frame_{}.png", nanos));

    let output = Command::new("ffmpeg")
        .args([
            "-y",
            "-ss",
            &time_in_seconds.to_string(),
            "-i",
            &file_path,
            "-frames:v",
            "1",
            tmp_file.to_str().unwrap_or(""),
        ])
        .output();

    match output {
        Ok(status) if status.status.success() => match fs::read(&tmp_file) {
            Ok(data) => {
                let b64 = base64::engine::general_purpose::STANDARD.encode(&data);
                let _ = fs::remove_file(&tmp_file);
                CommandResponse {
                    success: true,
                    message: format!("Quadro em {:.2}s extraído com sucesso.", time_in_seconds),
                    data: Some(format!("data:image/png;base64,{}", b64)),
                }
            }
            Err(e) => {
                let _ = fs::remove_file(&tmp_file);
                CommandResponse {
                    success: false,
                    message: format!("Falha ao ler frame: {}", e),
                    data: None,
                }
            }
        },
        Ok(status) => {
            let _ = fs::remove_file(&tmp_file);
            let stderr = String::from_utf8_lossy(&status.stderr);
            CommandResponse {
                success: false,
                message: format!("ffmpeg falhou: {}", stderr),
                data: None,
            }
        }
        Err(e) => {
            let _ = fs::remove_file(&tmp_file);
            CommandResponse {
                success: false,
                message: format!("Erro ao executar ffmpeg: {}", e),
                data: None,
            }
        }
    }
}
