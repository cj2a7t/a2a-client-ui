use anyhow::{Context, Result};
use log::{debug, error, info, warn};
use rusqlite::Row;
use tauri::AppHandle;

use crate::model::{SettingA2AServer, SettingA2AServerParams, UpdateSettingA2AServerParams};

pub struct SettingA2AServerDbManager;

impl SettingA2AServerDbManager {
    pub fn new() -> Self {
        Self
    }

    /// Initialize the A2A server table
    pub fn init(&self, _handler: &AppHandle) -> Result<()> {
        let db = crate::db::rusqlite::DB
            .lock()
            .map_err(|e| anyhow::anyhow!("failed to acquire DB lock: {e}"))?;

        // Create table if not exists
        let create_sql = "
            CREATE TABLE IF NOT EXISTS tb_setting_a2a_server (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                agent_card_url TEXT NOT NULL UNIQUE,
                agent_card_json TEXT,
                custom_header_json TEXT,
                protocol_data_object_settings TEXT,
                enabled INTEGER NOT NULL DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            );
            
            CREATE INDEX IF NOT EXISTS idx_setting_a2a_server_name ON tb_setting_a2a_server (name);
            CREATE INDEX IF NOT EXISTS idx_setting_a2a_server_enabled ON tb_setting_a2a_server (enabled);
        ";

        db.connection
            .execute(create_sql, [])
            .context("failed to create setting A2A server table")?;

        // Migrate existing table if needed
        self.migrate_table_if_needed(&db.connection)?;

        info!("Setting A2A server table initialized successfully");
        Ok(())
    }

    /// Migrate existing table to add new columns if needed
    fn migrate_table_if_needed(&self, connection: &rusqlite::Connection) -> Result<()> {
        // Check if custom_header_json column exists
        let custom_header_column_exists = connection
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('tb_setting_a2a_server') WHERE name = 'custom_header_json'",
                [],
                |row| row.get::<_, i32>(0)
            )
            .unwrap_or(0);

        if custom_header_column_exists == 0 {
            info!("Migrating table: adding custom_header_json column");
            match connection.execute(
                "ALTER TABLE tb_setting_a2a_server ADD COLUMN custom_header_json TEXT",
                [],
            ) {
                Ok(_) => info!("Successfully added custom_header_json column"),
                Err(e) => {
                    warn!(
                        "Failed to add custom_header_json column: {}. This might be expected for new tables.",
                        e
                    );
                }
            }
        } else {
            info!("Table migration not needed: custom_header_json column already exists");
        }

        // Check if protocol_data_object_settings column exists
        let protocol_column_exists = connection
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('tb_setting_a2a_server') WHERE name = 'protocol_data_object_settings'",
                [],
                |row| row.get::<_, i32>(0)
            )
            .unwrap_or(0);

        if protocol_column_exists == 0 {
            info!("Migrating table: adding protocol_data_object_settings column");
            match connection.execute(
                "ALTER TABLE tb_setting_a2a_server ADD COLUMN protocol_data_object_settings TEXT",
                [],
            ) {
                Ok(_) => info!("Successfully added protocol_data_object_settings column"),
                Err(e) => {
                    warn!(
                        "Failed to add protocol_data_object_settings column: {}. This might be expected for new tables.",
                        e
                    );
                }
            }
        } else {
            info!("Table migration not needed: protocol_data_object_settings column already exists");
        }

        Ok(())
    }

    /// Check if agent_card_url already exists (excluding the current record if updating)
    fn url_exists(
        &self,
        connection: &rusqlite::Connection,
        url: &str,
        exclude_id: Option<i32>,
    ) -> Result<bool> {
        let sql = match exclude_id {
            Some(id) => {
                "SELECT COUNT(*) FROM tb_setting_a2a_server WHERE agent_card_url = ? AND id != ?"
            }
            None => "SELECT COUNT(*) FROM tb_setting_a2a_server WHERE agent_card_url = ?",
        };

        let count: i32 = match exclude_id {
            Some(id) => {
                connection.query_row(sql, [&url as &dyn rusqlite::ToSql, &id], |row| row.get(0))?
            }
            None => connection.query_row(sql, [&url as &dyn rusqlite::ToSql], |row| row.get(0))?,
        };
        Ok(count > 0)
    }

    /// Insert a new A2A server
    pub fn insert(&self, params: &SettingA2AServerParams) -> Result<i64> {
        // Print incoming params for debugging
        info!(
            "Insert A2A server params: name={}, url={}, json={:?}, custom_headers={:?}, enabled={}",
            params.name,
            params.agent_card_url,
            params.agent_card_json,
            params.custom_header_json,
            params.enabled
        );

        let db = crate::db::rusqlite::DB
            .lock()
            .map_err(|e| anyhow::anyhow!("failed to acquire DB lock: {e}"))?;

        // Check if URL already exists
        if self.url_exists(&db.connection, &params.agent_card_url, None)? {
            return Err(anyhow::anyhow!(
                "A2A server with URL '{}' already exists",
                params.agent_card_url
            ));
        }

        let result = db.connection.execute(
            "INSERT INTO tb_setting_a2a_server (name, agent_card_url, agent_card_json, custom_header_json, protocol_data_object_settings, enabled) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            (
                &params.name,
                &params.agent_card_url,
                &params.agent_card_json,
                &params.custom_header_json,
                &params.protocol_data_object_settings,
                params.enabled as i32,
            ),
        );

        match result {
            Ok(_) => {
                let id = db.connection.last_insert_rowid();
                info!("Inserted A2A server with id: {id}");
                Ok(id)
            }
            Err(e) => {
                error!("Failed to insert A2A server: {}", e);
                Err(e).context("failed to insert A2A server")
            }
        }
    }

    /// Update an existing A2A server
    pub fn update(&self, params: &UpdateSettingA2AServerParams) -> Result<usize> {
        // Print incoming params for debugging
        info!(
            "Update A2A server params: id={}, name={:?}, url={:?}, json={:?}, custom_headers={:?}, enabled={:?}",
            params.id,
            params.name,
            params.agent_card_url,
            params.agent_card_json,
            params.custom_header_json,
            params.enabled
        );

        let db = crate::db::rusqlite::DB
            .lock()
            .map_err(|e| anyhow::anyhow!("failed to acquire DB lock: {e}"))?;

        let mut update_fields = Vec::new();
        let mut values: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(name) = &params.name {
            update_fields.push("name = ?");
            values.push(Box::new(name.clone()));
        }

        if let Some(agent_card_url) = &params.agent_card_url {
            // Check if URL already exists (excluding current record)
            if self.url_exists(&db.connection, agent_card_url, Some(params.id))? {
                return Err(anyhow::anyhow!(
                    "A2A server with URL '{}' already exists",
                    agent_card_url
                ));
            }
            update_fields.push("agent_card_url = ?");
            values.push(Box::new(agent_card_url.clone()));
        }

        if let Some(agent_card_json) = &params.agent_card_json {
            update_fields.push("agent_card_json = ?");
            values.push(Box::new(agent_card_json.clone()));
        }

        if let Some(custom_header_json) = &params.custom_header_json {
            update_fields.push("custom_header_json = ?");
            values.push(Box::new(custom_header_json.clone()));
        }

        if let Some(protocol_data_object_settings) = &params.protocol_data_object_settings {
            update_fields.push("protocol_data_object_settings = ?");
            values.push(Box::new(protocol_data_object_settings.clone()));
        }

        if let Some(enabled) = params.enabled {
            update_fields.push("enabled = ?");
            values.push(Box::new(enabled as i32));
        }

        if update_fields.is_empty() {
            return Ok(0);
        }

        update_fields.push("updated_at = datetime('now')");
        values.push(Box::new(params.id));

        let sql = format!(
            "UPDATE tb_setting_a2a_server SET {} WHERE id = ?",
            update_fields.join(", ")
        );

        let result = db
            .connection
            .execute(&sql, rusqlite::params_from_iter(values.iter()));

        match result {
            Ok(rows_affected) => {
                info!(
                    "Updated A2A server with id: {}, rows affected: {}",
                    params.id, rows_affected
                );
                Ok(rows_affected)
            }
            Err(e) => {
                error!("Failed to update A2A server: {}", e);
                Err(e).context("failed to update A2A server")
            }
        }
    }

    /// Get all A2A servers
    pub fn get_all(&self) -> Result<Vec<SettingA2AServer>> {
        info!("Fetching all A2A servers from database");

        let db = crate::db::rusqlite::DB
            .lock()
            .map_err(|e| anyhow::anyhow!("failed to acquire DB lock: {e}"))?;

        let mut stmt = db
            .connection
            .prepare("SELECT * FROM tb_setting_a2a_server ORDER BY id ASC")
            .context("failed to prepare query")?;

        let rows = stmt
            .query_map([], Self::extract_a2a_server_row)
            .context("failed to map query")?;

        let servers = rows
            .collect::<rusqlite::Result<Vec<_>>>()
            .context("failed to collect A2A servers")?;

        info!("Successfully retrieved {} A2A servers", servers.len());

        // Print each server for debugging
        for (i, server) in servers.iter().enumerate() {
            debug!(
                "Server {}: id={:?}, name={}, custom_headers={:?}",
                i, server.id, server.name, server.custom_header_json
            );
        }

        Ok(servers)
    }

    /// Get an A2A server by ID
    pub fn get_by_id(&self, id: i32) -> Result<Option<SettingA2AServer>> {
        let db = crate::db::rusqlite::DB
            .lock()
            .map_err(|e| anyhow::anyhow!("failed to acquire DB lock: {e}"))?;

        let mut stmt = db
            .connection
            .prepare("SELECT * FROM tb_setting_a2a_server WHERE id = ?")
            .context("failed to prepare query")?;

        let mut rows = stmt
            .query_map([id], Self::extract_a2a_server_row)
            .context("failed to map query")?;

        match rows.next() {
            Some(Ok(server)) => Ok(Some(server)),
            Some(Err(e)) => Err(e).context("failed to get A2A server"),
            None => Ok(None),
        }
    }

    /// Get an A2A server by name
    pub fn get_by_name(&self, name: &str) -> Result<Option<SettingA2AServer>> {
        let db = crate::db::rusqlite::DB
            .lock()
            .map_err(|e| anyhow::anyhow!("failed to acquire DB lock: {e}"))?;

        let mut stmt = db
            .connection
            .prepare("SELECT * FROM tb_setting_a2a_server WHERE name = ?")
            .context("failed to prepare query")?;

        let mut rows = stmt
            .query_map([name], Self::extract_a2a_server_row)
            .context("failed to map query")?;

        match rows.next() {
            Some(Ok(server)) => Ok(Some(server)),
            Some(Err(e)) => Err(e).context("failed to map query"),
            None => Ok(None),
        }
    }

    /// Get an A2A server by URL
    pub fn get_by_url(&self, url: &str) -> Result<Option<SettingA2AServer>> {
        let db = crate::db::rusqlite::DB
            .lock()
            .map_err(|e| anyhow::anyhow!("failed to acquire DB lock: {e}"))?;

        let mut stmt = db
            .connection
            .prepare("SELECT * FROM tb_setting_a2a_server WHERE agent_card_url = ?")
            .context("failed to prepare query")?;

        let mut rows = stmt
            .query_map([url], Self::extract_a2a_server_row)
            .context("failed to map query")?;

        match rows.next() {
            Some(Ok(server)) => Ok(Some(server)),
            Some(Err(e)) => Err(e).context("failed to map query"),
            None => Ok(None),
        }
    }

    /// Get enabled A2A servers
    pub fn get_enabled(&self) -> Result<Vec<SettingA2AServer>> {
        let db = crate::db::rusqlite::DB
            .lock()
            .map_err(|e| anyhow::anyhow!("failed to acquire DB lock: {e}"))?;

        let mut stmt = db
            .connection
            .prepare("SELECT * FROM tb_setting_a2a_server WHERE enabled = 1 ORDER BY id ASC")
            .context("failed to prepare query")?;

        let rows = stmt
            .query_map([], Self::extract_a2a_server_row)
            .context("failed to map query")?;

        let servers = rows
            .collect::<rusqlite::Result<Vec<_>>>()
            .context("failed to collect enabled A2A servers")?;

        Ok(servers)
    }

    /// Delete an A2A server by ID
    pub fn delete_by_id(&self, id: i32) -> Result<usize> {
        let db = crate::db::rusqlite::DB
            .lock()
            .map_err(|e| anyhow::anyhow!("failed to acquire DB lock: {e}"))?;

        let result = db
            .connection
            .execute("DELETE FROM tb_setting_a2a_server WHERE id = ?", [id]);

        match result {
            Ok(rows_affected) => {
                info!(
                    "Deleted A2A server with id: {}, rows affected: {}",
                    id, rows_affected
                );
                Ok(rows_affected)
            }
            Err(e) => {
                error!("Failed to delete A2A server: {}", e);
                Err(e).context("failed to delete A2A server")
            }
        }
    }

    /// Delete an A2A server by name
    pub fn delete_by_name(&self, name: &str) -> Result<usize> {
        let db = crate::db::rusqlite::DB
            .lock()
            .map_err(|e| anyhow::anyhow!("failed to acquire DB lock: {e}"))?;

        let result = db
            .connection
            .execute("DELETE FROM tb_setting_a2a_server WHERE name = ?", [name]);

        match result {
            Ok(rows_affected) => {
                info!(
                    "Deleted A2A server with name: {}, rows affected: {}",
                    name, rows_affected
                );
                Ok(rows_affected)
            }
            Err(e) => {
                error!("Failed to delete A2A server: {}", e);
                Err(e).context("failed to delete A2A server")
            }
        }
    }

    /// Toggle the enabled status of an A2A server
    pub fn toggle_enabled(&self, id: i32) -> Result<usize> {
        let db = crate::db::rusqlite::DB
            .lock()
            .map_err(|e| anyhow::anyhow!("failed to acquire DB lock: {e}"))?;

        let result = db.connection.execute(
            "UPDATE tb_setting_a2a_server SET enabled = CASE WHEN enabled = 1 THEN 0 ELSE 1 END, updated_at = datetime('now') WHERE id = ?",
            [id],
        );

        match result {
            Ok(rows_affected) => {
                info!(
                    "Toggled enabled status for A2A server with id: {}, rows affected: {}",
                    id, rows_affected
                );
                Ok(rows_affected)
            }
            Err(e) => {
                error!("Failed to toggle enabled status: {}", e);
                Err(e).context("failed to toggle enabled status")
            }
        }
    }

    /// Ensure only one A2A server is enabled at a time (disable others when one is enabled)
    pub fn ensure_single_enabled(&self, enabled_id: i32) -> Result<usize> {
        let db = crate::db::rusqlite::DB
            .lock()
            .map_err(|e| anyhow::anyhow!("failed to acquire DB lock: {e}"))?;

        let result = db.connection.execute(
            "UPDATE tb_setting_a2a_server SET enabled = 0, updated_at = datetime('now') WHERE id != ?",
            [enabled_id],
        );

        match result {
            Ok(rows_affected) => {
                info!(
                    "Disabled other A2A servers, rows affected: {}",
                    rows_affected
                );
                Ok(rows_affected)
            }
            Err(e) => {
                error!("Failed to disable other A2A servers: {}", e);
                Err(e).context("failed to disable other A2A servers")
            }
        }
    }

    /// Extract A2A server from database row
    fn extract_a2a_server_row(row: &Row) -> rusqlite::Result<SettingA2AServer> {
        // Extract fields by column name for safety and clarity
        let id: Option<i32> = row.get("id").ok();
        let name: String = row.get("name")?;
        let agent_card_url: String = row.get("agent_card_url")?;
        let agent_card_json: Option<String> = row.get("agent_card_json").ok();
        let custom_header_json: Option<String> = row.get("custom_header_json").ok();
        let protocol_data_object_settings: Option<String> = row.get("protocol_data_object_settings").ok();
        let enabled: bool = row.get::<_, i32>("enabled").unwrap_or(0) != 0;
        let created_at: Option<String> = row.get("created_at").ok();
        let updated_at: Option<String> = row.get("updated_at").ok();

        let server = SettingA2AServer {
            id,
            name,
            agent_card_url,
            agent_card_json,
            custom_header_json,
            protocol_data_object_settings,
            enabled,
            created_at,
            updated_at,
        };

        Ok(server)
    }
}
