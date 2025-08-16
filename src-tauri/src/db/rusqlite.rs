use std::{
    fs,
    sync::{atomic::AtomicBool, Arc, Mutex},
};

use anyhow::{Context, Result};
use lazy_static::lazy_static;
use log::{error, info};
use rusqlite::{Connection, Row};
use tauri::{AppHandle, Manager};

use crate::model::DyncmcpConnection;

#[derive(Debug)]
pub struct DbManager {
    pub name: String,
    pub connection: Connection,
}

#[derive(Default)]
pub struct SqlState(pub AtomicBool);

unsafe impl Sync for DbManager {}

lazy_static! {
    pub static ref DB: Arc<Mutex<DbManager>> = Arc::new(Mutex::new(DbManager::default()));
}

impl Default for DbManager {
    fn default() -> Self {
        let connect = Connection::open_in_memory().expect("in-memory db open failure");

        Self {
            name: Default::default(),
            connection: connect,
        }
    }
}

pub fn init_db_conn(handle: &AppHandle) -> Result<()> {
    let mut db_manager = DB
        .lock()
        .map_err(|e| anyhow::anyhow!("failed to acquire DB lock: {e}"))?;

    let mut app_data_dir = handle
        .path()
        .app_data_dir()
        .context("get app_data_dir failed")?;
    if !app_data_dir.exists() {
        fs::create_dir(&app_data_dir).context("create app_data_dir failed")?;
    }

    info!("App data directory: {:?}", app_data_dir);

    app_data_dir.push("db");
    if !app_data_dir.exists() {
        info!("try create db dir");
        fs::create_dir(&app_data_dir).context("create db dir failed")?;
    }

    info!("create db dir success");

    let db_path = app_data_dir.join("index.db");
    if !db_path.exists() {
        fs::File::create_new(&db_path).context("create index.db failed")?;
    }

    info!("create index file success");

    db_manager.connection = Connection::open(&db_path).context("open db connection failed")?;

    Ok(())
}

impl DbManager {
    fn init(&self, handler: &AppHandle) -> Result<()> {
        let state = handler.state::<SqlState>();
        if !state.0.load(std::sync::atomic::Ordering::Relaxed) {
            for sql in [
                "CREATE TABLE IF NOT EXISTS tb_dynmcp_connection (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    url TEXT NOT NULL UNIQUE,
                    api_key TEXT NOT NULL,
                    starred INTEGER NOT NULL DEFAULT 0
                );",
                "CREATE INDEX IF NOT EXISTS idx_connection_url ON tb_dynmcp_connection (url);",
            ] {
                self.connection
                    .execute(sql, [])
                    .context("failed to execute init SQL")?;
            }
            state
                .0
                .fetch_and(true, std::sync::atomic::Ordering::Relaxed);
        }
        Ok(())
    }

    pub fn upsert(&self, ac: &DyncmcpConnection, handler: &AppHandle) -> Result<i64> {
        self.init(handler)?;

        // 1. insert or update connection
        if let Err(e) = self.connection.execute(
            "INSERT INTO tb_dynmcp_connection (name, url, api_key, starred)
        VALUES (?1, ?2, ?3, ?4)
        ON CONFLICT(url) DO UPDATE SET
        name = excluded.name,
        api_key = excluded.api_key,
        starred = excluded.starred",
            (&ac.name, &ac.url, &ac.api_key, ac.starred as i32),
        ) {
            error!(
                "Failed to insert or update connection (url: {}): {}",
                &ac.url, e
            );
            return Err(e).context("failed to insert or update connection");
        }

        // 2. query the id of the inserted/updated connection
        match self.connection.query_row(
            "SELECT id FROM tb_dynmcp_connection WHERE url = ?1",
            [&ac.url],
            |row| row.get(0),
        ) {
            Ok(id) => Ok(id),
            Err(e) => {
                error!("Failed to retrieve id for url {}: {}", &ac.url, e);
                Err(e).context("failed to retrieve id after insert/update")
            }
        }
    }

    pub fn query_all(&self, handle: &AppHandle) -> Result<Vec<DyncmcpConnection>> {
        self.init(handle)?;

        let mut stmt = self
            .connection
            .prepare("SELECT * FROM tb_dynmcp_connection ORDER BY id DESC")
            .context("failed to prepare query")?;

        let rows = stmt
            .query_map([], Self::extrace_conns_row)
            .context("failed to map query")?;

        let conns = rows
            .collect::<rusqlite::Result<Vec<_>>>()
            .context("failed to collect connections")?;

        Ok(conns)
    }

    pub fn extrace_conns_row(row: &Row) -> rusqlite::Result<DyncmcpConnection> {
        Ok(DyncmcpConnection {
            id: row.get(0)?,
            name: row.get(1)?,
            url: row.get(2)?,
            api_key: row.get(3)?,
            starred: row.get::<_, i32>(4)? != 0,
        })
    }
}
