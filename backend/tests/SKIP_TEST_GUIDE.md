# 如何跳过 test_chat_greeting.py 测试

## 问题说明

`test_chat_greeting.py` 测试文件需要真实的模型数据和 API 配置才能运行，当前环境还没有填充这些数据。

## 解决方案

由于当前处于 Architect 模式，无法直接修改 Python 代码文件。以下是几种跳过该测试的方法：

### 方法 1：使用命令行参数（最简单，推荐）

运行测试时直接忽略该文件：

```bash
# 在项目根目录
pytest --ignore=backend/tests/test_chat_greeting.py

# 或在 backend 目录下
cd backend
pytest --ignore=tests/test_chat_greeting.py
```

### 方法 2：手动添加 pytest 标记（需要切换到 Code 模式）

在 `backend/tests/test_chat_greeting.py` 文件顶部添加以下代码：

```python
import base64
import json
import sys
import time
from pathlib import Path
from typing import Any

import httpx
import pytest  # 添加这一行
from fastapi.testclient import TestClient

# 添加以下两行：标记整个测试文件需要跳过
# 当真实数据准备好后，可以移除此标记
pytestmark = pytest.mark.skip(reason="需要真实的模型数据和 API 配置，暂时跳过")

# ... 其余代码保持不变
```

添加后，正常运行 `pytest` 即可自动跳过该文件。

### 方法 3：创建 pytest.ini 配置文件（推荐用于项目规范）

在 `backend/` 目录下创建 `pytest.ini` 文件：

```ini
[pytest]
# 测试发现配置
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*

# 默认忽略的测试文件
addopts = --ignore=tests/test_chat_greeting.py

# 自定义标记定义（可选）
markers =
    requires_real_data: 需要真实数据的测试
    integration: 集成测试
    unit: 单元测试
```

创建后，直接运行 `pytest` 即可自动忽略该文件。

### 方法 4：使用环境变量（灵活控制）

```bash
# 设置环境变量
export PYTEST_IGNORE="tests/test_chat_greeting.py"

# 运行测试
cd backend
pytest --ignore=$PYTEST_IGNORE
```

## 推荐的实施步骤

1. **立即使用**：方法 1（命令行参数）- 最快速
2. **短期方案**：方法 2（添加 pytest 标记）- 代码中明确标识
3. **长期规范**：方法 3（pytest.ini 配置）- 项目级配置

## 如何恢复运行该测试

当真实数据准备好后：

1. 如果使用方法 1：去掉 `--ignore` 参数
2. 如果使用方法 2：删除 `pytestmark = pytest.mark.skip(...)` 这一行
3. 如果使用方法 3：从 `pytest.ini` 中删除 `--ignore` 配置

## 验证测试是否被跳过

运行测试时会看到类似输出：

```
backend/tests/test_chat_greeting.py s                                    [100%]
========================= 1 skipped in 0.01s ==========================
```

其中 `s` 表示 skipped（已跳过）。

## 需要帮助？

如果需要修改代码文件（方法 2 或 3），请：

1. 使用 `switch_mode` 切换到 Code 模式
2. 或者手动编辑文件
3. 或者让 AI 在 Code 模式下帮你修改