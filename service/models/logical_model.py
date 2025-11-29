from typing import List, Optional

from pydantic import BaseModel, Field

from .model import ModelCapability


class PhysicalModel(BaseModel):
    """
    Reference to a concrete upstream model for routing.
    """

    provider_id: str = Field(..., description="Provider id")
    model_id: str = Field(..., description="Upstream model id")
    endpoint: str = Field(..., description="Full upstream endpoint path")
    base_weight: float = Field(
        ..., description="Base routing weight for this upstream", gt=0
    )
    region: Optional[str] = Field(None, description="Optional region tag")
    max_qps: Optional[int] = Field(None, description="Maximum QPS for this model")
    meta_hash: Optional[str] = Field(
        None, description="Metadata hash to track upstream version"
    )
    updated_at: float = Field(..., description="Last update timestamp (epoch seconds)")


class LogicalModel(BaseModel):
    """
    Logical model definition that groups multiple physical models.
    """

    logical_id: str = Field(..., description="Logical model id (e.g. gpt-4)")
    display_name: str = Field(..., description="Human readable name")
    description: str = Field(..., description="Logical model description")
    capabilities: List[ModelCapability] = Field(
        ..., description="Capabilities exposed by this logical model"
    )
    upstreams: List[PhysicalModel] = Field(
        ..., description="List of mapped physical upstream models"
    )
    enabled: bool = Field(
        default=True,
        description="Whether this logical model is enabled for routing",
    )
    updated_at: float = Field(..., description="Last update timestamp (epoch seconds)")


__all__ = ["PhysicalModel", "LogicalModel"]

