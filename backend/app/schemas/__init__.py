"""
Pydantic data models for the multi-provider routing layer.

These models mirror the structures defined in
specs/001-model-routing/data-model.md and can be shared across
provider discovery, logical-model mapping and routing components.
"""

from .api_key import (
    APIKeyAllowedProvidersRequest,
    APIKeyAllowedProvidersResponse,
    APIKeyCreateRequest,
    APIKeyCreateResponse,
    APIKeyExpiry,
    APIKeyResponse,
    APIKeyUpdateRequest,
)
from .logical_model import LogicalModel, PhysicalModel
from .model import Model, ModelCapability
from .provider import (
    Provider,
    ProviderAPIKey,
    ProviderAPIKeyCreateRequest,
    ProviderAPIKeyResponse,
    ProviderAPIKeyUpdateRequest,
    ProviderConfig,
    ProviderStatus,
)
from .provider_control import (
     AdminProviderResponse,
     AdminProvidersResponse,
     ProviderReviewRequest,
     ProviderSubmissionRequest,
     ProviderSubmissionResponse,
     ProviderValidationResult,
     ProviderVisibilityUpdateRequest,
     UserPermissionGrantRequest,
     UserPermissionResponse,
     UserProviderCreateRequest,
     UserProviderResponse,
     UserProviderUpdateRequest,
)
from .routing_metrics import MetricsHistory, RoutingMetrics
from .scheduling import SchedulingStrategy
from .session import Session
from .user import (
    UserCreateRequest,
    UserResponse,
    UserStatusUpdateRequest,
    UserUpdateRequest,
)

__all__ = [
    "APIKeyAllowedProvidersRequest",
    "APIKeyAllowedProvidersResponse",
    "APIKeyCreateRequest",
    "APIKeyCreateResponse",
    "APIKeyExpiry",
    "APIKeyResponse",
    "APIKeyUpdateRequest",
    "LogicalModel",
    "MetricsHistory",
    "Model",
    "ModelCapability",
    "PhysicalModel",
    "Provider",
    "ProviderAPIKey",
    "ProviderConfig",
    "ProviderStatus",
    "AdminProviderResponse",
    "AdminProvidersResponse",
    "ProviderReviewRequest",
    "ProviderSubmissionRequest",
    "ProviderSubmissionResponse",
    "ProviderValidationResult",
    "ProviderVisibilityUpdateRequest",
    "ProviderAPIKeyCreateRequest",
    "ProviderAPIKeyUpdateRequest",
    "ProviderAPIKeyResponse",
    "RoutingMetrics",
    "SchedulingStrategy",
    "Session",
    "UserPermissionGrantRequest",
    "UserPermissionResponse",
    "UserProviderCreateRequest",
    "UserProviderResponse",
    "UserProviderUpdateRequest",
    "UserCreateRequest",
    "UserResponse",
    "UserStatusUpdateRequest",
    "UserUpdateRequest",
]
