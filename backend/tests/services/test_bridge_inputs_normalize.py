from app.services import chat_app_service


def test_normalize_bridge_inputs_merges_and_filters():
    ids, filters = chat_app_service._normalize_bridge_inputs(
        bridge_agent_id="legacy-agent",
        bridge_agent_ids=["agent-a", "agent-b", "agent-a"],
        bridge_tool_selections=[
            {"agent_id": "agent-c", "tool_names": ["tool-1", "tool-2"]},
            {"agent_id": "agent-b", "tool_names": ["tool-x", ""]},
        ],
        max_agents=5,
    )

    assert ids == ["agent-a", "agent-b", "legacy-agent", "agent-c"]
    assert filters["agent-c"] == {"tool-1", "tool-2"}
    assert filters["agent-b"] == {"tool-x"}
    assert "legacy-agent" not in filters


def test_normalize_bridge_inputs_caps_agents_and_drops_extra_filters():
    ids, filters = chat_app_service._normalize_bridge_inputs(
        bridge_agent_id=None,
        bridge_agent_ids=["a", "b", "c", "d", "e", "f"],
        bridge_tool_selections=[{"agent_id": "g", "tool_names": ["t"]}],
        max_agents=5,
    )

    assert ids == ["a", "b", "c", "d", "e"]
    assert filters == {}
