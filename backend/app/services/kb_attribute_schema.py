from __future__ import annotations

from typing import Any, Dict, List, Optional, Set

# Schema definition for allowed keys and their constraints
# This registry defines the whitelist of keys that can be used in structured_ops.

ALLOWED_KEYS: Dict[str, Dict[str, Any]] = {
    # Response Preferences
    "response.language": {
        "description": "Preferred language for responses (e.g., 'zh-CN', 'en-US')",
        "type": "string",
        "examples": ["zh-CN", "en-US"],
    },
    "response.style": {
        "description": "Style of the response",
        "type": "string",
        "enum": ["concise", "detailed", "formal", "casual"],
    },
    "response.format": {
        "description": "Format of the response",
        "type": "string",
        "enum": ["markdown", "plain", "code_first"],
    },
    
    # Tech Stack Preferences
    "tech_stack.language": {
        "description": "Preferred programming languages",
        "type": "string_or_list",
        "examples": ["python", "typescript", "go", "rust"],
    },
    "tech_stack.framework": {
        "description": "Preferred frameworks",
        "type": "string_or_list",
        "examples": ["fastapi", "nextjs", "django", "react"],
    },
    "tech_stack.tools": {
        "description": "Preferred tools",
        "type": "list",
        "examples": ["docker", "k8s", "git"],
    },
    
    # User Profile
    "user_profile.role": {
        "description": "User's role or job title",
        "type": "string",
        "examples": ["developer", "manager", "student", "architect"],
    },
    "user_profile.expertise_level": {
        "description": "User's expertise level",
        "type": "string",
        "enum": ["beginner", "intermediate", "expert"],
    },
}

def get_allowed_keys_description() -> str:
    """Generates a text description of allowed keys for the LLM system prompt."""
    lines = []
    
    # Group by prefix for better readability
    grouped: Dict[str, List[str]] = {}
    for key in ALLOWED_KEYS:
        prefix = key.split('.')[0]
        if prefix not in grouped:
            grouped[prefix] = []
        grouped[prefix].append(key)
        
    for prefix, keys in grouped.items():
        lines.append(f"- {prefix.upper()} related:")
        for key in keys:
            meta = ALLOWED_KEYS[key]
            desc = meta["description"]
            
            constraints = ""
            if "enum" in meta:
                options = "|".join(meta["enum"])
                constraints = f" [Must be one of: {options}]"
            elif "examples" in meta:
                examples = ", ".join(meta["examples"])
                constraints = f" [e.g., {examples}]"
            
            lines.append(f"  * {key}: {desc}{constraints}")
            
    return "\n".join(lines)


def validate_structured_op_value(key: str, value: Any) -> tuple[bool, str]:
    """
    Validates a value against the schema for a given key.
    Returns (is_valid, error_message).
    """
    if key not in ALLOWED_KEYS:
        return False, f"Key '{key}' is not in the whitelist."
        
    meta = ALLOWED_KEYS[key]
    expected_type = meta.get("type", "string")
    
    # Type check
    if expected_type == "string":
        if not isinstance(value, str):
            return False, f"Value for '{key}' must be a string."
    elif expected_type == "list":
        if not isinstance(value, list):
            return False, f"Value for '{key}' must be a list."
    elif expected_type == "string_or_list":
        if not isinstance(value, (str, list)):
            return False, f"Value for '{key}' must be a string or a list."
    
    # Enum check
    if "enum" in meta:
        val_to_check = value
        if isinstance(val_to_check, list):
            # If it's a list but schema implies enum is for single items, we might need stricter logic.
            # But for now, if the type is 'string' and we received a string, we check enum.
            # If type is list, we check each item.
            pass
        
        if isinstance(val_to_check, str):
            if val_to_check not in meta["enum"]:
                return False, f"Value '{val_to_check}' is not allowed for '{key}'. Allowed: {meta['enum']}"
                
    return True, ""

def filter_structured_ops(ops: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Filters a list of structured operations, removing those with invalid keys or values.
    Logs or returns warnings? For now, we just silently drop invalid ones to be safe.
    """
    valid_ops = []
    for op in ops:
        key = op.get("key")
        value = op.get("value")
        
        if not isinstance(key, str):
            continue
            
        is_valid, _ = validate_structured_op_value(key, value)
        if is_valid:
            valid_ops.append(op)
            
    return valid_ops
