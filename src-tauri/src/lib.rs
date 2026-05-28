mod commands;

const APP_NAME: &str = "Video Thumbnail Designer";

use std::path::PathBuf;
use std::sync::Mutex;

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::Manager;

use commands::image;
use commands::misc;
use commands::video;

pub struct MenuHandles {
    save_project: MenuItem<tauri::Wry>,
    save_project_as: MenuItem<tauri::Wry>,
    properties: MenuItem<tauri::Wry>,
    close_project: MenuItem<tauri::Wry>,
    copy: MenuItem<tauri::Wry>,
    paste: MenuItem<tauri::Wry>,
    flip_horiz: MenuItem<tauri::Wry>,
    flip_vert: MenuItem<tauri::Wry>,
    rotate_90_cw: MenuItem<tauri::Wry>,
    rotate_90_ccw: MenuItem<tauri::Wry>,
}

#[derive(Default)]
struct AppStatus {
    current_file_path: Option<PathBuf>,
    display_title: Option<String>,
    is_modified: bool,
}

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

fn update_window_title(app_handle: &tauri::AppHandle) {
    if let Some(window) = app_handle.get_webview_window("main") {
        if let Ok(status) = app_handle.state::<Mutex<AppStatus>>().lock() {
            let title = build_window_title(&status);
            let _ = window.set_title(&title);
        }
    }
}

#[tauri::command]
fn initialize_project_state(app: tauri::AppHandle, title: String) {
    if let Ok(mut status) = app.state::<Mutex<AppStatus>>().lock() {
        if status.current_file_path.is_none() {
            status.display_title = Some(title);
        }
    }
    update_window_title(&app);
    if let Some(handles) = app.try_state::<MenuHandles>() {
        handles.save_project.set_enabled(true).unwrap_or(());
        handles.save_project_as.set_enabled(true).unwrap_or(());
        handles.properties.set_enabled(true).unwrap_or(());
        handles.close_project.set_enabled(true).unwrap_or(());
        handles.copy.set_enabled(true).unwrap_or(());
        handles.paste.set_enabled(true).unwrap_or(());
        handles.flip_horiz.set_enabled(true).unwrap_or(());
        handles.flip_vert.set_enabled(true).unwrap_or(());
        handles.rotate_90_cw.set_enabled(true).unwrap_or(());
        handles.rotate_90_ccw.set_enabled(true).unwrap_or(());
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(Mutex::new(AppStatus::default()))
        .invoke_handler(tauri::generate_handler![
            image::load_image,
            image::export_canvas,
            video::load_video,
            video::generate_thumbnail_sprite,
            video::process_video_frame,
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
        ])
        .setup(|app| {
            let handle = app.handle();

            // Separador de itens
            let separator = PredefinedMenuItem::separator(handle)?;

            // --- ARQUIVO SUBMENU ---
            let new_project = MenuItem::with_id(handle, "new-project", "Novo projeto", true, None::<&str>)?;
            let load_project = MenuItem::with_id(handle, "load-project", "Carregar projeto", true, None::<&str>)?;
            let save_project = MenuItem::with_id(handle, "save-project", "Salvar projeto", false, Some("CmdOrCtrl+S"))?;
            let save_project_as = MenuItem::with_id(
                handle,
                "save-project-as",
                "Salvar projeto como...",
                false,
                Some("CmdOrCtrl+Shift+S"),
            )?;
            let properties = MenuItem::with_id(handle, "properties", "Propriedades", false, None::<&str>)?;
            let close_project = MenuItem::with_id(handle, "close-project", "Fechar projeto", false, None::<&str>)?;
            let import_image = MenuItem::with_id(handle, "import-image", "Importar Imagem", true, None::<&str>)?;
            let extract_video = MenuItem::with_id(handle, "extract-video", "Extrair de Vídeo", true, None::<&str>)?;
            let export_image = MenuItem::with_id(handle, "export-image", "Exportar Imagem", true, None::<&str>)?;
            let quit = MenuItem::with_id(handle, "quit", "Sair", true, None::<&str>)?;

            let file_menu = Submenu::with_items(
                handle,
                "&Arquivo",
                true,
                &[
                    &new_project,
                    &load_project,
                    &separator,
                    &save_project.clone(),
                    &save_project_as.clone(),
                    &separator,
                    &import_image,
                    &extract_video,
                    &export_image,
                    &separator,
                    &properties.clone(),
                    &close_project.clone(),
                    &separator,
                    &quit,
                ],
            )?;

            // --- EDITAR SUBMENU ---
            let copy = MenuItem::with_id(handle, "copy", "Copiar", false, Some("CmdOrCtrl+C"))?;
            let paste = MenuItem::with_id(handle, "paste", "Colar", false, Some("CmdOrCtrl+V"))?;

            let edit_menu = Submenu::with_items(handle, "&Editar", true, &[&copy.clone(), &paste.clone()])?;

            // --- IMAGEM SUBMENU ---
            let flip_horiz = MenuItem::with_id(handle, "flip-horiz", "Inverter Horizontalmente", false, None::<&str>)?;
            let flip_vert = MenuItem::with_id(handle, "flip-vert", "Inverter Verticalmente", false, None::<&str>)?;
            let rotate_90_cw =
                MenuItem::with_id(handle, "rotate-90-cw", "Virar 90 graus horário", false, None::<&str>)?;
            let rotate_90_ccw =
                MenuItem::with_id(handle, "rotate-90-ccw", "Virar 90 graus anti-horário", false, None::<&str>)?;

            let transform_submenu = Submenu::with_items(
                handle,
                "&Transformar",
                true,
                &[&flip_horiz.clone(), &flip_vert.clone(), &separator, &rotate_90_cw.clone(), &rotate_90_ccw.clone()],
            )?;

            let image_menu = Submenu::with_items(handle, "Ima&gem", true, &[&transform_submenu])?;

            // --- AJUDA SUBMENU ---
            let about = MenuItem::with_id(handle, "about", "Sobre", true, None::<&str>)?;

            let help_menu = Submenu::with_items(handle, "&Ajuda", true, &[&about])?;

            // --- CONSTRUIR MENU COMPLETO ---
            let menu = Menu::with_items(handle, &[&file_menu, &edit_menu, &image_menu, &help_menu])?;

            app.set_menu(menu.clone())?;

            let menu_handles = MenuHandles {
                save_project,
                save_project_as,
                properties,
                close_project,
                copy,
                paste,
                flip_horiz,
                flip_vert,
                rotate_90_cw,
                rotate_90_ccw,
            };
            app.manage(menu_handles);

            // --- ESCUTAR CLIQUES DO MENU ---
            app.on_menu_event(move |window, event| {
                use tauri::Emitter;
                use tauri_plugin_dialog::DialogExt;

                let app_handle = window.app_handle().clone();

                match event.id.as_ref() {
                    "quit" => {
                        app_handle.exit(0);
                    }
                    "new-project" => {
                        let _ = window.emit("request-new-project", ());
                    }
                    "load-project" => {
                        let _ = window.emit("menu:loading-show", "Carregando projeto...");
                        let window_clone = window.clone();
                        let dialog = window_clone.dialog().clone();

                        tauri_plugin_dialog::FileDialogBuilder::new(dialog)
                            .set_title("Carregar Projeto")
                            .add_filter("Arquivos JSON", &["json"])
                            .pick_file(move |file_path| {
                                if let Some(path) = file_path {
                                    if let Some(path_buf) = path.as_path().map(|p| p.to_path_buf()) {
                                        match std::fs::read_to_string(&path_buf) {
                                            Ok(data) => match serde_json::from_str::<serde_json::Value>(&data) {
                                                Ok(project_data) => {
                                                    let file_path_str = path_buf.to_string_lossy().to_string();
                                                    let _ = window_clone.emit(
                                                        "load-project-response",
                                                        serde_json::json!({
                                                            "success": true,
                                                            "message": "Projeto carregado com sucesso.",
                                                            "data": project_data,
                                                            "filePath": file_path_str,
                                                        }),
                                                    );
                                                    if let Ok(mut status) =
                                                        app_handle.state::<Mutex<AppStatus>>().lock()
                                                    {
                                                        status.current_file_path = Some(path_buf);
                                                    }
                                                    update_window_title(&app_handle);
                                                    if let Some(handles) = app_handle.try_state::<MenuHandles>() {
                                                        handles.save_project.set_enabled(true).unwrap();
                                                        handles.save_project_as.set_enabled(true).unwrap();
                                                        handles.properties.set_enabled(true).unwrap();
                                                        handles.close_project.set_enabled(true).unwrap();
                                                        handles.copy.set_enabled(true).unwrap();
                                                        handles.paste.set_enabled(true).unwrap();
                                                        handles.flip_horiz.set_enabled(true).unwrap();
                                                        handles.flip_vert.set_enabled(true).unwrap();
                                                        handles.rotate_90_cw.set_enabled(true).unwrap();
                                                        handles.rotate_90_ccw.set_enabled(true).unwrap();
                                                    }
                                                }
                                                Err(e) => {
                                                    let _ = window_clone.emit(
                                                        "load-project-response",
                                                        serde_json::json!({
                                                            "success": false,
                                                            "message": format!("Falha ao interpretar JSON: {}", e),
                                                        }),
                                                    );
                                                }
                                            },
                                            Err(e) => {
                                                let _ = window_clone.emit(
                                                    "load-project-response",
                                                    serde_json::json!({
                                                        "success": false,
                                                        "message": format!("Falha ao ler arquivo: {}", e),
                                                    }),
                                                );
                                            }
                                        }
                                    }
                                } else {
                                    let _ = window_clone.emit(
                                        "load-project-response",
                                        serde_json::json!({
                                            "success": false,
                                            "message": "Nenhum projeto selecionado.",
                                        }),
                                    );
                                }
                            });
                    }
                    "save-project" => {
                        let _ = window.emit("request-save-project", ());
                    }
                    "save-project-as" => {
                        let _ = window.emit("request-save-project-as", ());
                    }
                    "properties" => {
                        let _ = window.emit("request-project-properties", ());
                    }
                    "close-project" => {
                        let _ = window.emit("request-close-project", ());
                        if let Ok(mut status) = app_handle.state::<Mutex<AppStatus>>().lock() {
                            status.current_file_path = None;
                            status.display_title = None;
                            status.is_modified = false;
                        }
                        update_window_title(&app_handle);
                        if let Some(handles) = app_handle.try_state::<MenuHandles>() {
                            handles.save_project.set_enabled(false).unwrap();
                            handles.save_project_as.set_enabled(false).unwrap();
                            handles.properties.set_enabled(false).unwrap();
                            handles.close_project.set_enabled(false).unwrap();
                            handles.copy.set_enabled(false).unwrap();
                            handles.paste.set_enabled(false).unwrap();
                            handles.flip_horiz.set_enabled(false).unwrap();
                            handles.flip_vert.set_enabled(false).unwrap();
                            handles.rotate_90_cw.set_enabled(false).unwrap();
                            handles.rotate_90_ccw.set_enabled(false).unwrap();
                        }
                    }
                    "copy" => {
                        let _ = window.emit("copy-to-clipboard", ());
                    }
                    "paste" => {
                        let _ = window.emit("paste-from-clipboard", ());
                    }
                    "flip-horiz" => {
                        let _ = window.emit("workarea:flip-horizontal", ());
                    }
                    "flip-vert" => {
                        let _ = window.emit("workarea:flip-vertical", ());
                    }
                    "rotate-90-cw" => {
                        let _ = window.emit("workarea:rotate-clockwise", ());
                    }
                    "rotate-90-ccw" => {
                        let _ = window.emit("workarea:rotate-anti-clockwise", ());
                    }
                    "import-image" => {
                        let _ = window.emit("menu:loading-show", "Importando imagem...");
                        let _ = window.emit("menu:import-image", ());
                    }
                    "extract-video" => {
                        let _ = window.emit("menu:loading-show", "Extraindo vídeo...");
                        let _ = window.emit("menu:extract-video", ());
                    }
                    "export-image" => {
                        let _ = window.emit("menu:export-image", ());
                    }
                    "about" => {
                        let _ = window.emit("request-show-about-dialog", ());
                    }
                    _ => {}
                }
            });

            if cfg!(debug_assertions) {
                app.handle()
                    .plugin(tauri_plugin_log::Builder::default().level(log::LevelFilter::Info).build())?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
