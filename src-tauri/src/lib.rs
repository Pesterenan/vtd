use tauri::menu::{Menu, MenuItem, Submenu};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      let handle = app.handle();

      // --- ARQUIVO SUBMENU ---
      let new_project = MenuItem::with_id(handle, "new-project", "Novo projeto", true, None::<&str>)?;
      let load_project = MenuItem::with_id(handle, "load-project", "Carregar projeto", true, None::<&str>)?;
      let save_project = MenuItem::with_id(handle, "save-project", "Salvar projeto", false, Some("CmdOrCtrl+S"))?;
      let save_project_as = MenuItem::with_id(handle, "save-project-as", "Salvar projeto como...", false, Some("CmdOrCtrl+Shift+S"))?;
      let properties = MenuItem::with_id(handle, "properties", "Propriedades", false, None::<&str>)?;
      let close_project = MenuItem::with_id(handle, "close-project", "Fechar projeto", false, None::<&str>)?;
      let quit = MenuItem::with_id(handle, "quit", "Sair", true, None::<&str>)?;

      let file_menu = Submenu::with_items(
        handle,
        "&Arquivo",
        true,
        &[
          &new_project,
          &load_project,
          &save_project,
          &save_project_as,
          &properties,
          &close_project,
          &quit,
        ],
      )?;

      // --- EDITAR SUBMENU ---
      let copy = MenuItem::with_id(handle, "copy", "Copiar", false, Some("CmdOrCtrl+C"))?;
      let paste = MenuItem::with_id(handle, "paste", "Colar", false, Some("CmdOrCtrl+V"))?;

      let edit_menu = Submenu::with_items(
        handle,
        "&Editar",
        true,
        &[&copy, &paste],
      )?;

      // --- IMAGEM SUBMENU ---
      let flip_horiz = MenuItem::with_id(handle, "flip-horiz", "Inverter Horizontalmente", true, None::<&str>)?;
      let flip_vert = MenuItem::with_id(handle, "flip-vert", "Inverter Verticalmente", true, None::<&str>)?;
      let rotate_90_cw = MenuItem::with_id(handle, "rotate-90-cw", "Virar 90 graus horário", true, None::<&str>)?;
      let rotate_90_ccw = MenuItem::with_id(handle, "rotate-90-ccw", "Virar 90 graus anti-horário", true, None::<&str>)?;

      let transform_submenu = Submenu::with_items(
        handle,
        "&Transformar",
        true,
        &[&flip_horiz, &flip_vert, &rotate_90_cw, &rotate_90_ccw],
      )?;

      let image_menu = Submenu::with_items(
        handle,
        "Ima&gem",
        true,
        &[&transform_submenu],
      )?;

      // --- AJUDA SUBMENU ---
      let about = MenuItem::with_id(handle, "about", "Sobre", true, None::<&str>)?;

      let help_menu = Submenu::with_items(
        handle,
        "&Ajuda",
        true,
        &[&about],
      )?;

      // --- CONSTRUIR MENU COMPLETO ---
      let menu = Menu::with_items(
        handle,
        &[&file_menu, &edit_menu, &image_menu, &help_menu],
      )?;

      app.set_menu(menu)?;

      // --- ESCUTAR CLIQUES DO MENU ---
      app.on_menu_event(|window, event| {
        use tauri::Emitter;
        let id_str = event.id.as_ref();
        match id_str {
          "quit" => {
            window.app_handle().exit(0);
          }
          "new-project" => {
            let _ = window.emit("request-new-project", ());
          }
          "load-project" => {
            let _ = window.emit("request-load-project", ());
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
          "about" => {
            let _ = window.emit("request-show-about-dialog", ());
          }
          _ => {}
        }
      });

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
