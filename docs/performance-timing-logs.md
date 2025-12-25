# 聊天服务性能计时日志

## 概述

为了更好地监控和优化聊天服务的性能，我们在 `chat_app_service.py` 中的核心函数添加了详细的性能计时日志。

## 日志格式

所有性能日志都使用统一的格式：

```
[CHAT_TIMING] {request_id} | {stage_name} | {elapsed_ms}ms | {extra_info}
```

- `request_id`: 唯一请求标识符（非流式：`msg_{uuid}`，流式：`stream_{uuid}`）
- `stage_name`: 阶段名称
- `elapsed_ms`: 该阶段耗时（毫秒）
- `extra_info`: 额外信息（可选）

## 非流式聊天 (`send_message_and_run_baseline`)

### 阶段说明

1. **START** - 请求开始
2. **1_get_conversation_context** - 获取会话和项目上下文
3. **2_ensure_account_usable** - 检查账户可用性和积分
4. **3_get_assistant_model** - 获取助手和模型配置
5. **4_get_provider_ids** - 获取可用的提供商列表
6. **5_auto_model_selection** - 自动模型选择（仅当 model=auto 时）
7. **6_create_user_message** - 创建用户消息
8. **7_build_payload** - 构建 OpenAI 请求负载
9. **8_load_bridge_tools** - 加载 Bridge 工具（如果启用）
10. **9_create_run_record** - 创建运行记录
11. **10_execute_run_upstream** - 执行上游请求
12. **11_save_assistant_message** - 保存助手消息
13. **12_auto_title** - 自动生成会话标题（仅首条消息）
14. **TOTAL** - 总耗时

### 示例日志

```
[CHAT_TIMING] msg_a1b2c3d4 | START | conversation_id=...
[CHAT_TIMING] msg_a1b2c3d4 | 1_get_conversation_context | 5.23ms
[CHAT_TIMING] msg_a1b2c3d4 | 2_ensure_account_usable | 12.45ms
[CHAT_TIMING] msg_a1b2c3d4 | 3_get_assistant_model | 3.67ms | model=gpt-4
[CHAT_TIMING] msg_a1b2c3d4 | 4_get_provider_ids | 8.91ms | count=3
[CHAT_TIMING] msg_a1b2c3d4 | 6_create_user_message | 15.34ms
[CHAT_TIMING] msg_a1b2c3d4 | 7_build_payload | 22.56ms | messages_count=5
[CHAT_TIMING] msg_a1b2c3d4 | 9_create_run_record | 10.78ms
[CHAT_TIMING] msg_a1b2c3d4 | 10_execute_run_upstream | 1234.56ms | status=succeeded provider=openai-gpt4
[CHAT_TIMING] msg_a1b2c3d4 | 11_save_assistant_message | 18.90ms
[CHAT_TIMING] msg_a1b2c3d4 | TOTAL | 1331.40ms | model=gpt-4 provider=openai-gpt4 status=succeeded
```

## 流式聊天 (`stream_message_and_run_baseline`)

### 阶段说明

1. **START** - 请求开始
2. **1_get_conversation_context** - 获取会话和项目上下文
3. **2_ensure_account_usable** - 检查账户可用性和积分
4. **3_get_assistant_model** - 获取助手和模型配置
5. **4_get_provider_ids** - 获取可用的提供商列表
6. **5_auto_model_selection** - 自动模型选择（仅当 model=auto 时）
7. **6_create_messages** - 创建用户消息和助手占位消息
8. **7_build_payload** - 构建 OpenAI 请求负载
9. **8_load_bridge_tools** - 加载 Bridge 工具（如果启用）
10. **9_create_run_record** - 创建运行记录
11. **PREP_COMPLETE** - 准备阶段完成，准备开始流式传输
12. **10_first_chunk_received** - 收到第一个数据块（TTFB - Time To First Byte）
13. **11_stream_complete** - 流式传输完成
14. **12_auto_title** - 自动生成会话标题（仅首条消息）
15. **TOTAL** - 总耗时

### 示例日志

```
[CHAT_TIMING] stream_e5f6g7h8 | START | stream conversation_id=...
[CHAT_TIMING] stream_e5f6g7h8 | 1_get_conversation_context | 4.12ms
[CHAT_TIMING] stream_e5f6g7h8 | 2_ensure_account_usable | 11.23ms
[CHAT_TIMING] stream_e5f6g7h8 | 3_get_assistant_model | 2.89ms | model=gpt-4
[CHAT_TIMING] stream_e5f6g7h8 | 4_get_provider_ids | 7.45ms | count=3
[CHAT_TIMING] stream_e5f6g7h8 | 6_create_messages | 16.78ms
[CHAT_TIMING] stream_e5f6g7h8 | 7_build_payload | 20.34ms | messages_count=5
[CHAT_TIMING] stream_e5f6g7h8 | 9_create_run_record | 9.56ms
[CHAT_TIMING] stream_e5f6g7h8 | PREP_COMPLETE | 72.37ms | ready_to_stream
[CHAT_TIMING] stream_e5f6g7h8 | 10_first_chunk_received | 234.56ms
[CHAT_TIMING] stream_e5f6g7h8 | 11_stream_complete | 1456.78ms | chunks=45 errored=False
[CHAT_TIMING] stream_e5f6g7h8 | TOTAL | 1529.15ms | model=gpt-4 provider=openai-gpt4 status=succeeded chunks=45
```

## 性能分析建议

### 关键指标

1. **TTFB (Time To First Byte)** - 流式模式下的 `10_first_chunk_received`
   - 理想值：< 500ms
   - 如果过高，检查上游提供商响应速度

2. **准备阶段耗时** - 流式模式下的 `PREP_COMPLETE`
   - 理想值：< 100ms
   - 如果过高，检查数据库查询和 Bridge 工具加载

3. **上游执行耗时** - 非流式模式下的 `10_execute_run_upstream`
   - 取决于模型和请求复杂度
   - 对比不同提供商的性能

4. **总耗时** - `TOTAL`
   - 监控趋势，识别性能退化

### 日志查询示例

```bash
# 查看所有聊天性能日志
grep "CHAT_TIMING" app.log

# 查看特定请求的完整时间线
grep "CHAT_TIMING.*msg_a1b2c3d4" app.log

# 查看所有 TTFB 日志
grep "CHAT_TIMING.*first_chunk_received" app.log

# 查看总耗时超过 2 秒的请求
grep "CHAT_TIMING.*TOTAL" app.log | awk -F'|' '$3 > 2000'

# 统计各阶段平均耗时
grep "CHAT_TIMING" app.log | awk -F'|' '{stage=$2; gsub(/^ +| +$/, "", stage); time=$3; gsub(/ms.*/, "", time); sum[stage]+=time; count[stage]++} END {for (s in sum) printf "%s: %.2fms (n=%d)\n", s, sum[s]/count[s], count[s]}'
```

## 注意事项

1. 所有计时使用 `time.perf_counter()` 以获得高精度
2. 计时日志不会影响业务逻辑，即使日志失败也不会中断请求
3. 在生产环境中，建议将这些日志输出到专门的性能监控系统
4. 可以根据需要调整日志级别（当前为 INFO）

