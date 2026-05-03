"""Pydantic models for request bodies."""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, HttpUrl


class ApiKeyIn(BaseModel):
    provider: str
    label: str = ""
    api_key: str
    model: str = ""


class SettingIn(BaseModel):
    key: str
    value: str


class PromptIn(BaseModel):
    text: str
    description: str = ""
    funnel_stage: str = "top_of_funnel"


class CompetitorIn(BaseModel):
    brand_name: str
    domain: str = ""
    competitor_type: str = "direct"


class ProfileIn(BaseModel):
    name: str
    brand: str = ""
    website: str = ""
    industry: str = ""
    language: str = "en"
    notes: str = ""
    key_ids: list[int] = Field(default_factory=list)
    custom_json: dict[str, Any] = Field(default_factory=dict)


class VisibilityRunIn(BaseModel):
    prompt_text: str
    brand: str
    provider_ids: list[int]
    competitors: list[str] = Field(default_factory=list)
    language: str = "en"
    funnel_stage: str = "top_of_funnel"


class ContentGenIn(BaseModel):
    topic: str
    brand: str = ""
    content_type: str = "blog"
    tone: str = "professional"
    audience: str = "general"
    key_id: int
    language: str = "en"


class FaqGenIn(BaseModel):
    topic: str
    brand: str = ""
    num_faqs: int = 5
    key_id: int
    language: str = "en"


class WebsiteAnalyzeIn(BaseModel):
    url: HttpUrl
    brand: str = ""


class MartechScanIn(BaseModel):
    url: HttpUrl
