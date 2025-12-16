# CLI 配置功能前端集成指南

## 概述

本文档说明如何在前端页面中集成 CLI 一键配置功能。

## 在 API Key 管理页面集成

### 1. 导入组件

```tsx
import { CliConfigDialog } from "@/components/dashboard/cli-config-dialog"
import { Terminal } from "lucide-react"
```

### 2. 添加状态管理

```tsx
const [showCliConfig, setShowCliConfig] = useState(false)
const [selectedApiKey, setSelectedApiKey] = useState<string>("")
```

### 3. 在 API Key 列表中添加配置按钮

```tsx
<Table>
  <TableBody>
    {apiKeys.map((key) => (
      <TableRow key={key.id}>
        <TableCell>{key.name}</TableCell>
        <TableCell>
          <code className="text-xs">{key.key}</code>
        </TableCell>
        <TableCell>
          <div className="flex gap-2">
            {/* 其他操作按钮 */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedApiKey(key.key)
                setShowCliConfig(true)
              }}
            >
              <Terminal className="h-4 w-4 mr-1" />
              配置 CLI
            </Button>
          </div>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### 4. 添加对话框组件

```tsx
<CliConfigDialog
  open={showCliConfig}
  onOpenChange={setShowCliConfig}
  apiKey={selectedApiKey}
  apiUrl={process.env.NEXT_PUBLIC_API_URL}
/>
```

## 完整示例

```tsx
"use client"

import { useState } from "react"
import { Terminal, Copy, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CliConfigDialog } from "@/components/dashboard/cli-config-dialog"
import { useApiKeys } from "@/lib/swr/use-api-keys"
import { useI18n } from "@/lib/i18n"

export function ApiKeyManagement() {
  const t = useI18n()
  const { data: apiKeys, isLoading } = useApiKeys()
  const [showCliConfig, setShowCliConfig] = useState(false)
  const [selectedApiKey, setSelectedApiKey] = useState<string>("")

  const handleConfigureCli = (apiKey: string) => {
    setSelectedApiKey(apiKey)
    setShowCliConfig(true)
  }

  if (isLoading) {
    return <div>加载中...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">API Keys</h2>
        <Button onClick={() => {/* 创建新 Key */}}>
          创建 API Key
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名称</TableHead>
            <TableHead>Key</TableHead>
            <TableHead>创建时间</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {apiKeys?.map((key) => (
            <TableRow key={key.id}>
              <TableCell>{key.name}</TableCell>
              <TableCell>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {key.key}
                </code>
              </TableCell>
              <TableCell>
                {new Date(key.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleConfigureCli(key.key)}
                  >
                    <Terminal className="h-4 w-4 mr-1" />
                    配置 CLI
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigator.clipboard.writeText(key.key)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {/* 删除 Key */}}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <CliConfigDialog
        open={showCliConfig}
        onOpenChange={setShowCliConfig}
        apiKey={selectedApiKey}
      />
    </div>
  )
}
```

## 在其他页面集成

### 用户设置页面

```tsx
import { CliConfigDialog } from "@/components/dashboard/cli-config-dialog"

export function UserSettings() {
  const [showCliConfig, setShowCliConfig] = useState(false)
  const { data: user } = useCurrentUser()

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-lg font-medium mb-4">开发者工具</h3>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            快速配置 CLI 工具以使用我们的 API
          </p>
          <Button onClick={() => setShowCliConfig(true)}>
            <Terminal className="h-4 w-4 mr-2" />
            配置 CLI 工具
          </Button>
        </div>
      </section>

      <CliConfigDialog
        open={showCliConfig}
        onOpenChange={setShowCliConfig}
        apiKey={user?.default_api_key || ""}
      />
    </div>
  )
}
```

### 快速开始页面

```tsx
export function QuickStart() {
  const [showCliConfig, setShowCliConfig] = useState(false)

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold mb-4">快速开始</h2>
        
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>使用 Web 界面</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                直接在浏览器中使用我们的服务
              </p>
              <Button>开始使用</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>使用 CLI 工具</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                在终端中使用 Claude CLI 或 Codex CLI
              </p>
              <Button onClick={() => setShowCliConfig(true)}>
                <Terminal className="h-4 w-4 mr-2" />
                配置 CLI
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <CliConfigDialog
        open={showCliConfig}
        onOpenChange={setShowCliConfig}
        apiKey={/* 获取用户的 API Key */}
      />
    </div>
  )
}
```

## 环境变量配置

在 `frontend/.env.local` 中配置 API URL：

```bash
NEXT_PUBLIC_API_URL=https://your-domain.com
```

如果不配置，组件会自动使用当前页面的 origin。

## 样式定制

如果需要自定义样式，可以通过 Tailwind 类覆盖：

```tsx
<CliConfigDialog
  open={showCliConfig}
  onOpenChange={setShowCliConfig}
  apiKey={apiKey}
  // 组件内部已使用 shadcn/ui 组件，样式统一
/>
```

## 国际化

确保在 `frontend/lib/i18n/index.ts` 中导出 CLI 配置的翻译：

```typescript
import { cliConfigTranslations } from "./cli-config"

export const translations = {
  zh: {
    ...cliConfigTranslations.zh,
    // 其他翻译
  },
  en: {
    ...cliConfigTranslations.en,
    // 其他翻译
  },
}
```

## 注意事项

1. **API Key 安全**: 
   - 不要在客户端日志中打印完整的 API Key
   - 使用 HTTPS 确保传输安全

2. **用户体验**:
   - 提供清晰的使用说明
   - 针对不同平台显示相应的提示
   - 复制成功后给予视觉反馈

3. **错误处理**:
   - 处理 API Key 不存在的情况
   - 处理网络请求失败的情况

4. **响应式设计**:
   - 对话框在移动设备上也应正常显示
   - 命令文本应支持横向滚动

## 测试

```tsx
import { render, screen, fireEvent } from "@testing-library/react"
import { CliConfigDialog } from "@/components/dashboard/cli-config-dialog"

describe("CliConfigDialog", () => {
  it("should render with correct title", () => {
    render(
      <CliConfigDialog
        open={true}
        onOpenChange={() => {}}
        apiKey="test-key"
      />
    )
    expect(screen.getByText("CLI 一键配置")).toBeInTheDocument()
  })

  it("should generate correct command", () => {
    render(
      <CliConfigDialog
        open={true}
        onOpenChange={() => {}}
        apiKey="test-key"
        apiUrl="https://example.com"
      />
    )
    const command = screen.getByText(/curl -fsSL/)
    expect(command).toHaveTextContent("test-key")
    expect(command).toHaveTextContent("example.com")
  })
})
```
