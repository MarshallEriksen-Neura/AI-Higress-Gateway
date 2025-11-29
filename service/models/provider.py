from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, HttpUrl


class ProviderStatus(str, Enum):
    """
    Runtime health state for a provider.
    Mirrors the enum defined in specs/001-model-routing/data-model.md.
    """

    HEALTHY = "healthy"
    DEGRADED = "degraded"
    DOWN = "down"


class ProviderConfig(BaseModel):
    """
    Static configuration for a model provider, usually loaded from env.
    """

    id: str = Field(..., description="Provider unique identifier (short slug)")
    name: str = Field(..., description="Human readable provider name")
    base_url: HttpUrl = Field(..., description="API base URL")
    api_key: str = Field(..., description="API authentication key or token")
    models_path: str = Field(
        default="/v1/models", description="Path for listing models"
    )
    weight: float = Field(
        default=1.0,
        description="Base routing weight used by the scheduler",
        gt=0,
    )
    region: Optional[str] = Field(None, description="Optional region / label")
    cost_input: Optional[float] = Field(
        None, description="Per-token input price", gt=0
    )
    cost_output: Optional[float] = Field(
        None, description="Per-token output price", gt=0
    )
    max_qps: Optional[int] = Field(
        None, description="Provider-level QPS limit", gt=0
    )
    custom_headers: Optional[Dict[str, str]] = Field(
        None, description="Extra headers to send to this provider"
    )
    retryable_status_codes: Optional[List[int]] = Field(
        default=None,
        description=(
            "HTTP status codes that should be treated as retryable for this "
            "provider (e.g. [429, 500, 502, 503, 504] for OpenAI/Gemini/Claude)."
        ),
    )


class Provider(ProviderConfig):
    """
    Full provider information including runtime status metadata.
    """

    status: ProviderStatus = Field(
        default=ProviderStatus.HEALTHY, description="Current provider health state"
    )
    last_check: Optional[float] = Field(
        None, description="Last health-check timestamp (epoch seconds)"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        None, description="Additional runtime metadata from health checks, etc."
    )


__all__ = ["ProviderStatus", "ProviderConfig", "Provider"]
