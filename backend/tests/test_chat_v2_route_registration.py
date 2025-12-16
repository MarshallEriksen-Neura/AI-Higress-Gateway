from fastapi.routing import APIRoute


def test_chat_completions_v2_route_is_registered(client) -> None:
    matched = [
        route
        for route in client.app.routes
        if isinstance(route, APIRoute)
        and route.path == "/v2/chat/completions"
        and "POST" in route.methods
    ]
    assert matched, "预期注册 POST /v2/chat/completions（chat_completions_v2），但在 app.routes 中未找到"

