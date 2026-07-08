use std::sync::atomic::{AtomicBool, AtomicU16, Ordering};
use std::sync::mpsc;

use base64::Engine;
use image::ImageEncoder;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

use super::CommandResponse;

static VFE_CANCELLED: AtomicBool = AtomicBool::new(false);
static VFE_SPRITE_PROGRESS: AtomicU16 = AtomicU16::new(0);

#[tauri::command]
pub fn open_vfe() {
    VFE_CANCELLED.store(false, Ordering::SeqCst);
    println!("VFE session started");
}

#[tauri::command]
pub fn get_sprite_progress() -> f64 {
    VFE_SPRITE_PROGRESS.load(Ordering::Relaxed) as f64 / 100.0
}

#[tauri::command]
pub fn cancel_vfe() {
    VFE_CANCELLED.store(true, Ordering::SeqCst);
    VFE_SPRITE_PROGRESS.store(0, Ordering::SeqCst);
    println!("VFE session cancelled");
}

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
        .ok_or_else(|| "Falha ao criar imagem RGBA".to_string())
}

fn decode_frame_at(
    ictx: &mut ffmpeg_next::format::context::Input,
    decoder: &mut ffmpeg_next::codec::decoder::Video,
    stream_index: usize,
    time_base: ffmpeg_next::Rational,
    timestamp: f64,
    backward: bool,
) -> Result<ffmpeg_next::frame::Video, String> {
    if VFE_CANCELLED.load(Ordering::Relaxed) {
        return Err("Cancelado pelo usuário".to_string());
    }

    let seek_target = if time_base.numerator() > 0 && time_base.denominator() > 0 {
        (timestamp * time_base.denominator() as f64 / time_base.numerator() as f64) as i64
    } else {
        (timestamp * 1_000_000.0) as i64
    };
    println!("  decode_frame_at: timestamp={}s, stream_ts={}, stream={}, backward={}", timestamp, seek_target, stream_index, backward);

    let t0 = std::time::Instant::now();
    decoder.flush();

    unsafe {
        let ret = if backward {
            ffmpeg_next::sys::avformat_seek_file(
                ictx.as_mut_ptr(),
                stream_index as i32,
                i64::MIN,
                seek_target,
                seek_target,
                1,
            )
        } else {
            let ret = ffmpeg_next::sys::avformat_seek_file(
                ictx.as_mut_ptr(),
                stream_index as i32,
                seek_target,
                seek_target,
                i64::MAX,
                0,
            );
            if ret < 0 {
                return Err(format!("Forward seek falhou (código {}).", ret));
            }
            ret
        };
        if ret < 0 {
            return Err(format!("Erro ao buscar quadro (código {})", ret));
        }
    }
    let seek_time = t0.elapsed();
    let t1 = std::time::Instant::now();

    let mut frame = ffmpeg_next::frame::Video::empty();
    let mut packets_sent = 0u32;
    let mut frames_skipped = 0u32;

    for (s_idx, packet) in ictx.packets() {
        if VFE_CANCELLED.load(Ordering::Relaxed) {
            return Err("Cancelado pelo usuário".to_string());
        }
        if s_idx.index() != stream_index {
            continue;
        }

        if decoder.send_packet(&packet).is_err() {
            continue;
        }
        packets_sent += 1;

        while decoder.receive_frame(&mut frame).is_ok() {
            match frame.pts() {
                Some(pts) if pts >= seek_target => {
                    let total = t0.elapsed();
                    println!("  frame obtido após {} pacotes e {}/{} frames, pts={}, seek={:?}, decode={:?}, total={:?}",
                        packets_sent, packets_sent, frames_skipped, pts, seek_time, t1.elapsed(), total);
                    return Ok(frame);
                }
                _ => {
                    frames_skipped += 1;
                }
            }
        }
    }

    Err(format!("Nenhum quadro encontrado ({packets_sent} pacotes, {frames_skipped} frames ignorados)."))
}

fn convert_frame_to_rgba(
    frame: &ffmpeg_next::frame::Video,
    width: u32,
    height: u32,
) -> Result<ffmpeg_next::frame::Video, String> {
    let mut sws = ffmpeg_next::software::scaling::Context::get(
        frame.format(),
        frame.width(),
        frame.height(),
        ffmpeg_next::format::Pixel::RGBA,
        width,
        height,
        ffmpeg_next::software::scaling::Flags::BILINEAR,
    ).map_err(|e| format!("Erro ao criar conversor de cores: {}", e))?;

    let mut converted = ffmpeg_next::frame::Video::empty();
    sws.run(frame, &mut converted)
        .map_err(|e| format!("Erro ao converter frame: {}", e))?;

    Ok(converted)
}

#[tauri::command]
pub async fn load_video(app: AppHandle) -> CommandResponse<VideoMetadata> {
    ffmpeg_next::init().unwrap_or(());

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

    let metadata = std::thread::spawn(move || -> Result<VideoMetadata, String> {
        let ictx = ffmpeg_next::format::input(&std::path::Path::new(&path_str))
            .map_err(|e| format!("Erro ao abrir vídeo: {}", e))?;

        let duration = ictx.duration() as f64 / 1_000_000.0;

        let format_name = ictx.format().name().to_string();

        let stream = ictx.streams()
            .best(ffmpeg_next::media::Type::Video)
            .ok_or_else(|| "Nenhum stream de vídeo encontrado.".to_string())?;

        let params = stream.parameters();
        let width = unsafe { (*params.as_ptr()).width };
        let height = unsafe { (*params.as_ptr()).height };

        let frame_rate = {
            let r = stream.avg_frame_rate();
            if r.numerator() > 0 && r.denominator() > 0 {
                r.numerator() as f64 / r.denominator() as f64
            } else {
                let r = stream.rate();
                if r.numerator() > 0 && r.denominator() > 0 {
                    r.numerator() as f64 / r.denominator() as f64
                } else {
                    30.0
                }
            }
        };

        let total_frames = (duration * frame_rate) as i64;

        Ok(VideoMetadata {
            duration,
            file_path: path_str,
            format: Some(format_name),
            frame_rate,
            height: height as i64,
            total_frames,
            width: width as i64,
        })
    }).join().map_err(|_| "Erro interno ao processar metadados.".to_string());

    match metadata {
        Ok(Ok(meta)) => CommandResponse {
            success: true,
            message: format!("Vídeo {} carregado com sucesso.", meta.format.as_deref().unwrap_or("desconhecido")),
            data: Some(meta),
        },
        Ok(Err(e)) => CommandResponse {
            success: false,
            message: e,
            data: None,
        },
        Err(e) => CommandResponse {
            success: false,
            message: e,
            data: None,
        },
    }
}

#[tauri::command]
pub async fn process_video_frame(file_path: String, time_in_seconds: f64) -> CommandResponse<String> {
    println!("process_video_frame: {} @ {}s", file_path, time_in_seconds);
    ffmpeg_next::init().unwrap_or(());

    let result = std::thread::spawn(move || -> Result<String, String> {
        let mut ictx = ffmpeg_next::format::input(&std::path::Path::new(&file_path))
            .map_err(|e| format!("Erro ao abrir vídeo: {}", e))?;
        println!("  arquivo aberto");

        let stream = ictx.streams()
            .best(ffmpeg_next::media::Type::Video)
            .ok_or_else(|| "Nenhum stream de vídeo encontrado.".to_string())?;
        println!("  stream index: {}", stream.index());

        let stream_index = stream.index();
        let time_base = stream.time_base();
        let context = ffmpeg_next::codec::context::Context::from_parameters(stream.parameters())
            .map_err(|e| format!("Erro ao criar contexto de codec: {}", e))?;
        let mut decoder = context.decoder().video()
            .map_err(|e| format!("Erro ao criar decoder: {}", e))?;
        println!("  decoder criado");

        let raw = decode_frame_at(&mut ictx, &mut decoder, stream_index, time_base, time_in_seconds, true)?;
        println!("  frame decodificado: {}x{}, format={:?}", raw.width(), raw.height(), raw.format());
        let converted = convert_frame_to_rgba(&raw, raw.width(), raw.height())?;
        let img = copy_frame_rgba(&converted)?;

        let mut png_buf = std::io::BufWriter::new(std::io::Cursor::new(Vec::new()));
        let encoder = image::codecs::png::PngEncoder::new(&mut png_buf);
        encoder.write_image(
            &img,
            img.width(),
            img.height(),
            image::ExtendedColorType::Rgba8,
        ).map_err(|e| format!("Erro ao codificar PNG: {}", e))?;

        let bytes = png_buf.into_inner().unwrap().into_inner();
        let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
        Ok(format!("data:image/png;base64,{}", b64))
    }).join().map_err(|_| "Erro interno ao processar quadro.".to_string());

    match result {
        Ok(Ok(data_url)) => CommandResponse {
            success: true,
            message: format!("Quadro em {:.2}s extraído com sucesso.", time_in_seconds),
            data: Some(data_url),
        },
        Ok(Err(e)) => CommandResponse {
            success: false,
            message: e,
            data: None,
        },
        Err(e) => CommandResponse {
            success: false,
            message: e,
            data: None,
        },
    }
}

#[tauri::command]
pub async fn generate_thumbnail_sprite(file_path: String, duration: f64) -> CommandResponse<String> {
    ffmpeg_next::init().unwrap_or(());

    VFE_SPRITE_PROGRESS.store(0, Ordering::SeqCst);

    let result = std::thread::spawn(move || -> Result<String, String> {
        let t_start = std::time::Instant::now();

        let mut ictx = ffmpeg_next::format::input(&std::path::Path::new(&file_path))
            .map_err(|e| format!("Erro ao abrir vídeo: {}", e))?;

        let stream = ictx.streams()
            .best(ffmpeg_next::media::Type::Video)
            .ok_or_else(|| "Nenhum stream de vídeo encontrado.".to_string())?;

        let stream_index = stream.index();
        let time_base = stream.time_base();

        let context = ffmpeg_next::codec::context::Context::from_parameters(stream.parameters())
            .map_err(|e| format!("Erro ao criar contexto de codec: {}", e))?;
        let mut decoder = context.decoder().video()
            .map_err(|e| format!("Erro ao criar decoder: {}", e))?;

        let cols = 10usize;
        let rows = 10usize;
        let count = cols * rows;
        let interval = duration / count as f64;
        let thumb_width = 192u32;

        println!("generate_thumbnail_sprite: {} frames, interval={}s, video={}s", count, interval, duration);

        let targets: Vec<(i64, usize)> = (0..count)
            .map(|i| {
                let ts = i as f64 * interval;
                let stream_ts = if time_base.numerator() > 0 && time_base.denominator() > 0 {
                    (ts * time_base.denominator() as f64 / time_base.numerator() as f64) as i64
                } else {
                    (ts * 1_000_000.0) as i64
                };
                (stream_ts, i)
            })
            .collect();

        // --- Phase 1: try fast forward seeks ---
        let mut thumbnails: Vec<Option<image::RgbaImage>> = (0..count).map(|_| None).collect();
        let mut fallback_size: Option<(u32, u32)> = None;
        let mut use_sequential = false;

        for i in 0..count {
            let timestamp = i as f64 * interval;
            if i % 10 == 0 {
                println!("  thumbnail {}/{} forward... (elapsed={:?})", i, count, t_start.elapsed());
                VFE_SPRITE_PROGRESS.store(((i * 100) / count) as u16, Ordering::Relaxed);
            }

            match decode_frame_at(&mut ictx, &mut decoder, stream_index, time_base, timestamp, false) {
                Ok(raw) => {
                    let aspect = raw.height() as f64 / raw.width() as f64;
                    let thumb_height = (thumb_width as f64 * aspect).round() as u32;
                    if i == 0 {
                        fallback_size = Some((thumb_width, thumb_height));
                    }
                    let converted = convert_frame_to_rgba(&raw, thumb_width, thumb_height)?;
                    let img = copy_frame_rgba(&converted)?;
                    thumbnails[i] = Some(img);
                }
                Err(_) => {
                    println!("  forward seek falhou no thumbnail {}, trocando para sequential", i);
                    use_sequential = true;
                    break;
                }
            }
        }

        // --- Phase 2: if forward failed, do sequential pass ---
        if use_sequential {
            println!("  iniciando passagem sequencial...");
            thumbnails = (0..count).map(|_| None).collect();
            fallback_size = None;
            decoder.flush();

            unsafe {
                let _ = ffmpeg_next::sys::avformat_seek_file(
                    ictx.as_mut_ptr(),
                    stream_index as i32,
                    i64::MIN,
                    0,
                    0,
                    1,
                );
            }

            let mut target_idx = 0usize;
            let mut frame = ffmpeg_next::frame::Video::empty();
            let mut packets_total = 0u32;

            for (s_idx, packet) in ictx.packets() {
                if VFE_CANCELLED.load(Ordering::Relaxed) {
                    return Err("Cancelado pelo usuário".to_string());
                }
                if target_idx >= count {
                    break;
                }
                if s_idx.index() != stream_index {
                    continue;
                }
                packets_total += 1;

                if decoder.send_packet(&packet).is_err() {
                    continue;
                }

                while decoder.receive_frame(&mut frame).is_ok() {
                    let Some(pts) = frame.pts() else { continue; };

                    while target_idx < count && pts >= targets[target_idx].0 {
                        let i = targets[target_idx].1;
                        target_idx += 1;
                        if thumbnails[i].is_some() {
                            continue;
                        }

                        if i % 10 == 0 || target_idx % 10 == 0 {
                            println!("  capturando thumbnail {} (pts={}, pacotes={}, elapsed={:?})",
                                i, pts, packets_total, t_start.elapsed());
                            VFE_SPRITE_PROGRESS.store(((target_idx * 100) / count) as u16, Ordering::Relaxed);
                        }

                        let aspect = frame.height() as f64 / frame.width() as f64;
                        let thumb_height = (thumb_width as f64 * aspect).round() as u32;
                        if fallback_size.is_none() {
                            fallback_size = Some((thumb_width, thumb_height));
                        }

                        match convert_frame_to_rgba(&frame, thumb_width, thumb_height) {
                            Ok(converted) => {
                                if let Ok(img) = copy_frame_rgba(&converted) {
                                    thumbnails[i] = Some(img);
                                }
                            }
                            Err(_) => {}
                        }
                    }
                }
            }
            println!("  passagem sequencial concluída: {} pacotes em {:?}", packets_total, t_start.elapsed());
        }

        // --- Build grid ---
        let (cell_w, cell_h) = fallback_size.unwrap_or((thumb_width, (thumb_width as f64 * 0.5625).round() as u32));
        let grid_w = cell_w * cols as u32;
        let grid_h = cell_h * rows as u32;
        let mut grid = image::RgbaImage::new(grid_w, grid_h);
        let blank = image::RgbaImage::new(cell_w, cell_h);

        for (i, thumb_opt) in thumbnails.iter().enumerate() {
            let img = thumb_opt.as_ref().unwrap_or(&blank);
            let x = (i % cols) as i64 * cell_w as i64;
            let y = (i / cols) as i64 * cell_h as i64;
            image::imageops::overlay(&mut grid, img, x, y);
        }

        let t_jpeg = std::time::Instant::now();
        let mut jpeg_buf = std::io::BufWriter::new(std::io::Cursor::new(Vec::new()));
        let rgb = image::DynamicImage::from(grid).into_rgb8();
        let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut jpeg_buf, 85);
        encoder.write_image(
            &rgb,
            rgb.width(),
            rgb.height(),
            image::ExtendedColorType::Rgb8,
        ).map_err(|e| format!("Erro ao codificar JPEG: {}", e))?;
        println!("  jpeg encode={:?}", t_jpeg.elapsed());

        let bytes = jpeg_buf.into_inner().unwrap().into_inner();
        let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);

        println!("generate_thumbnail_sprite total={:?}", t_start.elapsed());
        VFE_SPRITE_PROGRESS.store(100, Ordering::Relaxed);

        Ok(format!("data:image/jpeg;base64,{}", b64))
    }).join().map_err(|_| "Erro interno ao gerar sprite.".to_string());

    match result {
        Ok(Ok(data_url)) => CommandResponse {
            success: true,
            message: "Sprite de miniaturas gerado com sucesso.".to_string(),
            data: Some(data_url),
        },
        Ok(Err(e)) => CommandResponse {
            success: false,
            message: e,
            data: None,
        },
        Err(e) => CommandResponse {
            success: false,
            message: e,
            data: None,
        },
    }
}
