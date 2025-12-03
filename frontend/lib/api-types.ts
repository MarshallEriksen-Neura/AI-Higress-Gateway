export interface User {
    id: string;
    username: string;
    email: string;
    display_name: string | null;
    avatar: string | null;
    is_active: boolean;
    is_superuser: boolean;
    created_at: string;
    updated_at: string;
}

export interface Provider {
    id: string;
    name: string;
    base_url: string;
    api_key: string | null;
    api_keys: ProviderKey[];
    models_path: string;
    messages_path: string;
    weight: number;
    region: string | null;
    cost_input: number;
    cost_output: number;
    max_qps: number;
    custom_headers: Record<string, string>;
    retryable_status_codes: number[];
    static_models: string[];
    transport: "http" | "sdk";
    provider_type: "native" | "aggregator";
}

export interface ProviderKey {
    key: string;
    weight: number;
    max_qps: number;
    label: string;
}

export interface ProviderMetrics {
    logical_model: string;
    provider_id: string;
    success_rate: number;
    avg_latency_ms: number;
    p95_latency_ms: number;
    p99_latency_ms: number;
    last_success: number;
    last_failure: number;
    consecutive_failures: number;
    total_requests: number;
    total_failures: number;
    window_start: number;
    window_duration: number;
}
