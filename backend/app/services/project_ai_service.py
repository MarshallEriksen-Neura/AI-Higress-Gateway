from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.api.v1.chat.request_handler import RequestHandler
from app.auth import AuthenticatedAPIKey
from app.logging_config import logger
from app.services.prompt_loader import load_prompt
from app.services.chat_routing_service import _strip_model_group_prefix
from dataclasses import dataclass

from app.services.bandit_policy_service import BanditRecommendation


@dataclass(frozen=True)
class ExplanationPayload:
    summary: str
    evidence: dict | None = None

    def to_dict(self) -> dict:
        payload: dict = {"summary": self.summary}
        if self.evidence is not None:
            payload["evidence"] = self.evidence
        return payload


def build_rule_explanation(
    *,
    recommendation: BanditRecommendation,
    rubric: str | None,
) -> ExplanationPayload | None:
    """
    规则解释（MVP）：回答“为什么挑这两个 challenger 来对比 baseline”，避免断言“谁更好”。
    """
    if not recommendation.candidates:
        return ExplanationPayload(
            summary="当前缺少可用的候选模型用于对比评测。",
            evidence={"exploration": True},
        )

    parts: list[str] = []
    if rubric:
        parts.append("本项目评测口径已启用。")
    if recommendation.exploration:
        parts.append("当前仍处于探索期，会优先覆盖更多候选以收集反馈。")
    else:
        parts.append("基于历史同类评测胜率与稳定性进行选择。")

    summary = " ".join(parts) if parts else "已为你选择两个候选模型进行对比评测。"
    evidence = {
        "policy_version": recommendation.policy_version,
        "exploration": recommendation.exploration,
        "context_features": recommendation.features,
        "candidates": [
            {"logical_model": item.logical_model, "samples": item.samples}
            for item in recommendation.candidates
        ],
    }
    return ExplanationPayload(summary=summary, evidence=evidence)


def _prompt_path() -> Path:
    return Path(__file__).resolve().parents[1] / "prompts" / "project_ai_explanation_prompt.md"


def _build_llm_messages(
    *,
    base_prompt: str,
    rubric: str | None,
    recommendation: BanditRecommendation,
    baseline_logical_model: str,
) -> list[dict[str, Any]]:
    system = base_prompt.strip()
    if rubric:
        system = system + "\n\n项目评测口径（rubric）：\n" + rubric.strip()

    user = {
        "baseline_logical_model": baseline_logical_model,
        "policy_version": recommendation.policy_version,
        "exploration": recommendation.exploration,
        "context_features": recommendation.features,
        "candidates": [
            {"logical_model": item.logical_model, "samples": item.samples}
            for item in recommendation.candidates
        ],
    }
    return [
        {"role": "system", "content": system},
        {
            "role": "user",
            "content": (
                "请基于以下信息生成解释（严格 JSON 输出，结构见 system 指令）：\n"
                + json.dumps(user, ensure_ascii=False)
            ),
        },
    ]


def _parse_explanation_json(text: str) -> ExplanationPayload | None:
    if not text:
        return None
    try:
        payload = json.loads(text)
    except Exception:
        return None
    if not isinstance(payload, dict):
        return None
    summary = payload.get("summary")
    if not isinstance(summary, str) or not summary.strip():
        return None
    evidence = payload.get("evidence")
    if evidence is not None and not isinstance(evidence, dict):
        evidence = None
    return ExplanationPayload(summary=summary.strip(), evidence=evidence)


def _extract_assistant_text_from_chat_completion(payload: dict[str, Any] | None) -> str | None:
    if not isinstance(payload, dict):
        return None
    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices:
        return None
    first = choices[0]
    if not isinstance(first, dict):
        return None
    message = first.get("message")
    if isinstance(message, dict):
        content = message.get("content")
        if isinstance(content, str) and content.strip():
            return content
    content = first.get("text")
    if isinstance(content, str) and content.strip():
        return content
    return None


async def build_project_ai_explanation(
    db: Session,
    *,
    redis: Any,
    client: Any,
    api_key: AuthenticatedAPIKey,
    project_ai_provider_model: str,
    allowed_provider_ids: set[str],
    rubric: str | None,
    recommendation: BanditRecommendation,
    baseline_logical_model: str,
    idempotency_key: str | None,
) -> ExplanationPayload | None:
    """
    可拔插的 Project AI（LLM）解释：
    - 由配置指定 provider/model（project_ai_provider_model）
    - 失败必须降级为 None（上层改用规则解释）
    """
    raw = (project_ai_provider_model or "").strip()
    if "/" not in raw:
        return None
    provider_id, _ = raw.split("/", 1)
    provider_id = provider_id.strip()
    if not provider_id or provider_id not in allowed_provider_ids:
        return None

    base_prompt = load_prompt(_prompt_path())
    messages = _build_llm_messages(
        base_prompt=base_prompt,
        rubric=rubric,
        recommendation=recommendation,
        baseline_logical_model=baseline_logical_model,
    )

    requested_model = raw
    lookup_model_id = _strip_model_group_prefix(requested_model) or requested_model
    payload: dict[str, Any] = {
        "model": requested_model,
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": 256,
        "stream": False,
    }

    handler = RequestHandler(api_key=api_key, db=db, redis=redis, client=client)
    try:
        response = await handler.handle(
            payload=payload,
            requested_model=requested_model,
            lookup_model_id=lookup_model_id,
            api_style="openai",
            effective_provider_ids={provider_id},
            session_id=None,
            idempotency_key=idempotency_key,
            billing_reason="project_ai_explanation",
        )
    except Exception:
        logger.info("project_ai_service: llm explanation call failed", exc_info=True)
        return None

    response_payload: dict[str, Any] | None = None
    try:
        body = response.body
        if isinstance(body, (bytes, bytearray)):
            parsed = json.loads(body.decode("utf-8", errors="ignore"))
        else:
            parsed = None
        if isinstance(parsed, dict):
            response_payload = parsed
    except Exception:
        response_payload = None

    content = _extract_assistant_text_from_chat_completion(response_payload)
    if not content:
        return None
    parsed = _parse_explanation_json(content)
    if parsed is None:
        return None
    return parsed


__all__ = ["ExplanationPayload", "build_project_ai_explanation", "build_rule_explanation"]
