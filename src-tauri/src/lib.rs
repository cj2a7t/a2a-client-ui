use std::sync::atomic::AtomicBool;

use crate::{
    db::rusqlite::SqlState,
    handler::{chat_completion, chat_completion_stream, get_agent_card, ping, query_all, save_dynmcp_connection, send_a2a_message},
    webview::native::window_design,
};
use anyhow::Result;

pub mod db;
pub mod handler;
pub mod model;
pub mod webview;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() -> Result<()> {
    tauri::Builder::default()
        .manage(SqlState(AtomicBool::new(false)))
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            window_design(app)?;
            db::rusqlite::init_db_conn(&app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_dynmcp_connection,
            query_all,
            ping,
            chat_completion,
            chat_completion_stream,
            get_agent_card,
            send_a2a_message,
        ])
        .run(tauri::generate_context!())?;

    Ok(())
}
