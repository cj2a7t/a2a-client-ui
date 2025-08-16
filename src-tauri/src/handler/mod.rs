use futures_util::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::AppHandle;
use tauri::Emitter;

use crate::{
    db::dynmcp_connection,
    model::{
        to_invoke_response, A2AMessage, A2AMessageParams, A2AMessagePart, A2ARequest, AgentCard,
        AgentCardParams, ChatCompletionParams, ChatCompletionStreamParams, DyncmcpConnection,
        InvokeResponse, JSONRPCRequest, PingConParams,
    },
};

// Define data structure for streaming chat events
#[derive(Serialize, Deserialize, Clone)]
struct StreamChunk {
    content: String,
    is_complete: bool,
    error: Option<String>,
    status: Option<String>,
    message: Option<String>,
}

#[tauri::command]
pub async fn save_dynmcp_connection(
    conn: DyncmcpConnection,
    handle: AppHandle,
) -> InvokeResponse<i64> {
    // ping first to test the connection
    let ping_params: PingConParams = (&conn).into();
    let ping_result = ping(ping_params).await;
    if ping_result.code != 0 {
        return InvokeResponse::fail(format!("Connection test failed: {}", ping_result.message));
    }
    // save the connection
    dynmcp_connection::upsert(&conn, &handle)
        .map(|res| InvokeResponse::success(res))
        .unwrap_or_else(|e| to_invoke_response(e))
}

#[tauri::command]
pub async fn query_all(handle: AppHandle) -> InvokeResponse<Vec<DyncmcpConnection>> {
    dynmcp_connection::query_all(&handle)
        .map(InvokeResponse::success)
        .unwrap_or_else(|e| to_invoke_response(e))
}

#[tauri::command]
pub async fn ping(params: PingConParams) -> InvokeResponse<String> {
    let client = Client::new();
    let mut req = client.get(format!("{}/healthz", &params.url));

    if let Some(api_key) = params.api_key {
        req = req.header("api_key", api_key);
    }

    let response = req.send().await;
    let result = match response {
        Ok(resp) => {
            let status = resp.status();
            log::info!("HTTP status: {}", status);
            log::info!("Headers: {:#?}", resp.headers());

            let body = resp.text().await;
            match body {
                Ok(text) => {
                    log::info!("Response body: {}", text);
                    if status.is_success() {
                        Ok(text)
                    } else {
                        Err(format!("Request failed with status {}: {}", status, text))
                    }
                }
                Err(e) => {
                    log::error!("Failed to read response body: {}", e);
                    Err(format!("Failed to read response body: {}", e))
                }
            }
        }
        Err(e) => {
            log::error!("Failed to send request: {}", e);
            Err(format!("Failed to connect: {}", e))
        }
    };

    result
        .map(InvokeResponse::success)
        .unwrap_or_else(InvokeResponse::fail)
}

#[tauri::command]
pub async fn chat_completion(params: ChatCompletionParams) -> InvokeResponse<String> {
    log::info!("Starting chat completion with DeepSeek API");

    // Validate parameters
    if params.api_key.trim().is_empty() {
        log::error!("API key is empty");
        return InvokeResponse::fail("API key cannot be empty".to_string());
    }

    if params.system_prompt.trim().is_empty() && params.user_prompt.trim().is_empty() {
        log::error!("Both system_prompt and user_prompt are empty");
        return InvokeResponse::fail(
            "At least one of system_prompt or user_prompt must be provided".to_string(),
        );
    }

    // Use reqwest with a simpler approach
    let client = reqwest::Client::new();

    // Build messages
    let mut messages = Vec::new();

    if !params.system_prompt.trim().is_empty() {
        messages.push(json!({
            "role": "system",
            "content": params.system_prompt
        }));
    }

    messages.push(json!({
        "role": "user",
        "content": params.user_prompt
    }));

    // Create request body
    let request_body = json!({
        "model": "deepseek-chat",
        "messages": messages,
        "max_tokens": 4000,
        "temperature": 0.7
    });

    log::info!("Sending request to DeepSeek API with model: deepseek-chat");

    // Send request
    let response = client
        .post("https://api.deepseek.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", params.api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await;

    match response {
        Ok(resp) => {
            let status = resp.status();
            log::info!("Response status: {}", status);

            if !status.is_success() {
                let error_text = resp.text().await.unwrap_or_default();
                log::error!("API error: {}", error_text);
                return InvokeResponse::fail(format!("API error: {}", error_text));
            }

            match resp.json::<serde_json::Value>().await {
                Ok(json_response) => {
                    log::info!("Successfully received response from DeepSeek API");

                    if let Some(choices) = json_response.get("choices").and_then(|c| c.as_array()) {
                        if let Some(first_choice) = choices.first() {
                            if let Some(message) = first_choice.get("message") {
                                if let Some(content) =
                                    message.get("content").and_then(|c| c.as_str())
                                {
                                    return InvokeResponse::success(content.to_string());
                                }
                            }
                        }
                    }

                    log::warn!("Unexpected response format: {:?}", json_response);
                    InvokeResponse::fail("Unexpected response format".to_string())
                }
                Err(e) => {
                    log::error!("Failed to parse response: {}", e);
                    InvokeResponse::fail(format!("Failed to parse response: {}", e))
                }
            }
        }
        Err(e) => {
            log::error!("Request failed: {}", e);
            InvokeResponse::fail(format!("Request failed: {}", e))
        }
    }
}

#[tauri::command]
pub async fn chat_completion_stream(
    params: ChatCompletionStreamParams,
    handle: AppHandle,
) -> InvokeResponse<String> {
    log::info!("Starting streaming chat completion with DeepSeek API");

    // Validate parameters
    if params.api_key.trim().is_empty() {
        log::error!("API key is empty");
        return InvokeResponse::fail("API key cannot be empty".to_string());
    }

    if params.system_prompt.trim().is_empty() && params.user_prompt.trim().is_empty() {
        log::error!("Both system_prompt and user_prompt are empty");
        return InvokeResponse::fail(
            "At least one of system_prompt or user_prompt must be provided".to_string(),
        );
    }

    // Use reqwest with streaming support
    let client = reqwest::Client::new();

    // Build messages
    let mut messages = Vec::new();

    if !params.system_prompt.trim().is_empty() {
        messages.push(json!({
            "role": "system",
            "content": params.system_prompt
        }));
    }

    messages.push(json!({
        "role": "user",
        "content": params.user_prompt
    }));

    // Create request body with stream=true
    let request_body = json!({
        "model": "deepseek-chat",
        "messages": messages,
        "max_tokens": params.max_tokens.unwrap_or(4000),
        "temperature": params.temperature.unwrap_or(0.7),
        "stream": true
    });

    log::info!("Sending streaming request to DeepSeek API with model: deepseek-chat");

    // Send request
    let response = client
        .post("https://api.deepseek.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", params.api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await;

    match response {
        Ok(resp) => {
            let status = resp.status();
            log::info!("Response status: {}", status);

            if !status.is_success() {
                let error_text = resp.text().await.unwrap_or_default();
                log::error!("API error: {}", error_text);

                // Send error event to frontend to notify streaming process error
                let _ = handle.emit(
                    "chat_stream_chunk",
                    StreamChunk {
                        content: "".to_string(),
                        is_complete: true,
                        error: Some(error_text.clone()),
                        status: None,
                        message: None,
                    },
                );

                return InvokeResponse::fail(format!("API error: {}", error_text));
            }

            // Handle streaming response
            let mut stream = resp.bytes_stream();
            let mut full_content = String::new();
            let mut chunk_count = 0;
            let mut completion_sent = false; // New: Track whether completion event has been sent
            let start_time = std::time::Instant::now();

            // Send streaming start event
            let _ = handle.emit(
                "chat_stream_chunk",
                StreamChunk {
                    content: "".to_string(),
                    is_complete: false,
                    error: None,
                    status: Some("streaming_started".to_string()),
                    message: Some("Streaming started, waiting for response...".to_string()),
                },
            );

            while let Some(chunk_result) = stream.next().await {
                // Check timeout
                if start_time.elapsed().as_secs() > 60 {
                    log::warn!("Streaming timeout after 60 seconds");
                    if !completion_sent {
                        let _ = handle.emit(
                            "chat_stream_chunk",
                            StreamChunk {
                                content: "".to_string(),
                                is_complete: true,
                                error: Some("Streaming timeout after 60 seconds".to_string()),
                                status: None,
                                message: None,
                            },
                        );
                        completion_sent = true;
                    }
                    return InvokeResponse::fail("Streaming timeout after 60 seconds".to_string());
                }

                match chunk_result {
                    Ok(chunk) => {
                        chunk_count += 1;
                        let chunk_str = String::from_utf8_lossy(&chunk);
                        let lines: Vec<&str> = chunk_str.lines().collect();

                        // Send progress indicator
                        if chunk_count % 5 == 0 {
                            let _ = handle.emit(
                                "chat_stream_chunk",
                                StreamChunk {
                                    content: "".to_string(),
                                    is_complete: false,
                                    error: None,
                                    status: Some("progress".to_string()),
                                    message: Some(format!(
                                        "Received {} chunks, elapsed: {}s",
                                        chunk_count,
                                        start_time.elapsed().as_secs()
                                    )),
                                },
                            );
                        }

                        for line in lines {
                            if line.starts_with("data: ") {
                                let data = &line[6..]; // Remove "data: " prefix

                                if data == "[DONE]" {
                                    log::info!("Stream completed after {} chunks", chunk_count);

                                    // Send streaming completion event
                                    if !completion_sent {
                                        let _ = handle.emit(
                                            "chat_stream_chunk",
                                            StreamChunk {
                                                content: "".to_string(),
                                                is_complete: true,
                                                error: None,
                                                status: Some("completed".to_string()),
                                                message: Some(
                                                    "Streaming completed successfully".to_string(),
                                                ),
                                            },
                                        );
                                        completion_sent = true;
                                    }

                                    break;
                                }

                                match serde_json::from_str::<serde_json::Value>(data) {
                                    Ok(json_data) => {
                                        if let Some(choices) =
                                            json_data.get("choices").and_then(|c| c.as_array())
                                        {
                                            if let Some(first_choice) = choices.first() {
                                                if let Some(delta) = first_choice.get("delta") {
                                                    if let Some(content) = delta
                                                        .get("content")
                                                        .and_then(|c| c.as_str())
                                                    {
                                                        full_content.push_str(content);
                                                        log::info!(
                                                            "Chunk content raw: {:?}",
                                                            content
                                                        );
                                                        // Emit streaming event to frontend
                                                        let _ = handle.emit(
                                                            "chat_stream_chunk",
                                                            StreamChunk {
                                                                content: content.to_string(),
                                                                is_complete: false,
                                                                error: None,
                                                                status: None,
                                                                message: None,
                                                            },
                                                        );
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    Err(e) => {
                                        log::warn!("Failed to parse streaming chunk: {}", e);
                                    }
                                }
                            }
                        }
                    }
                    Err(e) => {
                        log::error!("Error reading stream chunk: {}", e);

                        // Send error event to frontend
                        if !completion_sent {
                            let _ = handle.emit(
                                "chat_stream_chunk",
                                StreamChunk {
                                    content: "".to_string(),
                                    is_complete: true,
                                    error: Some(format!("Stream error: {}", e)),
                                    status: None,
                                    message: None,
                                },
                            );
                            completion_sent = true;
                        }

                        return InvokeResponse::fail(format!("Stream error: {}", e));
                    }
                }
            }

            // Only send if completion event hasn't been sent yet
            if !completion_sent {
                // Emit completion event
                let _ = handle.emit(
                    "chat_stream_chunk",
                    StreamChunk {
                        content: "".to_string(),
                        is_complete: true,
                        error: None,
                        status: Some("completed".to_string()),
                        message: Some(format!(
                            "Streaming completed successfully in {}s with {} chunks",
                            start_time.elapsed().as_secs(),
                            chunk_count
                        )),
                    },
                );
            }

            log::info!(
                "Streaming chat completion completed successfully in {}s with {} chunks",
                start_time.elapsed().as_secs(),
                chunk_count
            );
            InvokeResponse::success(full_content)
        }
        Err(e) => {
            log::error!("Request failed: {}", e);

            // Send network error event to frontend
            let _ = handle.emit(
                "chat_stream_chunk",
                StreamChunk {
                    content: "".to_string(),
                    is_complete: true,
                    error: Some(format!("Request failed: {}", e)),
                    status: None,
                    message: None,
                },
            );

            return InvokeResponse::fail(format!("Request failed: {}", e));
        }
    }
}

#[tauri::command]
pub async fn get_agent_card(params: AgentCardParams) -> InvokeResponse<AgentCard> {
    let client = Client::new();

    let full_url = if !params.url.starts_with("http://") && !params.url.starts_with("https://") {
        format!("http://{}", params.url)
    } else {
        params.url.clone()
    };

    let response = client
        .get(&full_url)
        .header("Accept", "application/json")
        .send()
        .await;

    match response {
        Ok(resp) => {
            let status = resp.status();

            // Read body, but preserve error information
            let body_text = match resp.text().await {
                Ok(text) => text,
                Err(e) => {
                    log::error!("Failed to read body: {}", e);
                    return InvokeResponse::fail(format!("Failed to read response body: {}", e));
                }
            };

            if !status.is_success() {
                log::error!("Request failed with status {}. Body: {}", status, body_text);
                return InvokeResponse::fail(format!(
                    "Request failed with status {}: {}",
                    status, body_text
                ));
            }

            match serde_json::from_str::<AgentCard>(&body_text) {
                Ok(agent_card) => InvokeResponse::success(agent_card),
                Err(e) => {
                    log::error!(
                        "Failed to parse agent card response: {}. Body: {}",
                        e,
                        body_text
                    );
                    InvokeResponse::fail(format!("Failed to parse response: {}", e))
                }
            }
        }
        Err(e) => {
            log::error!("Failed to send request: {}", e);
            InvokeResponse::fail(format!("Request failed: {}", e))
        }
    }
}

#[tauri::command]
pub async fn send_a2a_message(params: A2AMessageParams) -> InvokeResponse<String> {
    let client = Client::new();

    let full_url =
        if !params.a2a_url.starts_with("http://") && !params.a2a_url.starts_with("https://") {
            format!("http://{}", params.a2a_url)
        } else {
            params.a2a_url.clone()
        };

    let message_id = params.message_id.clone();
    let request_body = A2ARequest {
        id: params.task_id,
        message: A2AMessage {
            message_id: params.message_id,
            kind: "message".to_string(),
            role: "user".to_string(),
            parts: vec![A2AMessagePart {
                kind: "text".to_string(),
                text: params.text,
            }],
        },
        metadata: serde_json::Value::Object(serde_json::Map::new()),
    };

    let jsonrpc_request = JSONRPCRequest {
        jsonrpc: "2.0".to_string(),
        id: message_id,
        method: "message/send".to_string(),
        params: request_body,
    };

    let response = client
        .post(&full_url)
        .header("Content-Type", "application/json")
        .json(&jsonrpc_request)
        .send()
        .await;

    match response {
        Ok(resp) => {
            let status = resp.status();
            if !status.is_success() {
                let error_text = resp.text().await.unwrap_or_default();
                return InvokeResponse::fail(format!(
                    "A2A request failed with status {}: {}",
                    status, error_text
                ));
            }

            match resp.text().await {
                Ok(response_text) => InvokeResponse::success(response_text),
                Err(e) => {
                    log::error!("Failed to read A2A response body: {}", e);
                    InvokeResponse::fail(format!("Failed to read response body: {}", e))
                }
            }
        }
        Err(e) => {
            log::error!("Failed to send A2A request: {}", e);
            InvokeResponse::fail(format!("Request failed: {}", e))
        }
    }
}
