from app.services.bridge_tool_runner import bridge_tools_by_agent_to_openai_tools


def test_bridge_tools_by_agent_aliasing_for_multi_agents():
    tools, mapping = bridge_tools_by_agent_to_openai_tools(
        bridge_tools_by_agent={
            "aws-dev-server": [{"name": "filesystem__readFile", "description": "a", "input_schema": {"type": "object"}}],
            "home-nas": [{"name": "filesystem__readFile", "description": "b", "input_schema": {"type": "object"}}],
        }
    )

    assert len(tools) == 2
    names = [t["function"]["name"] for t in tools]
    assert names[0] != names[1]
    assert len(mapping) == 2
    for name in names:
        assert name in mapping
        agent_id, tool_name = mapping[name]
        assert tool_name == "filesystem__readFile"
        assert agent_id in {"aws-dev-server", "home-nas"}


def test_bridge_tools_by_agent_keeps_plain_name_for_single_agent():
    tools, mapping = bridge_tools_by_agent_to_openai_tools(
        bridge_tools_by_agent={
            "aws-dev-server": [{"name": "filesystem__readFile", "description": "a", "input_schema": {"type": "object"}}],
        }
    )
    assert len(tools) == 1
    assert tools[0]["function"]["name"] == "filesystem__readFile"
    assert mapping == {}

