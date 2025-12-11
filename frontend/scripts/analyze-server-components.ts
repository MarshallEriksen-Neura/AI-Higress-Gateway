#!/usr/bin/env bun

/**
 * 静态分析脚本：扫描所有 page.tsx 文件，检测不必要的 "use client" 声明
 * 
 * 功能：
 * 1. 扫描所有 page.tsx 文件
 * 2. 检测是否包含 "use client" 声明
 * 3. 分析组件是否真的需要客户端渲染
 * 4. 生成优化建议报告
 * 
 * 使用方法：
 * bun run scripts/analyze-server-components.ts
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join, relative } from 'path';

interface PageAnalysis {
  path: string;
  relativePath: string;
  hasUseClient: boolean;
  needsClientComponent: boolean;
  reasons: string[];
  suggestions: string[];
  lineCount: number;
}

// 需要客户端组件的特征
const CLIENT_INDICATORS = {
  hooks: [
    'useState',
    'useEffect',
    'useReducer',
    'useCallback',
    'useMemo',
    'useRef',
    'useContext',
    'useLayoutEffect',
    'useImperativeHandle',
    'useDebugValue',
    'useTransition',
    'useDeferredValue',
    'useId',
  ],
  events: [
    'onClick',
    'onChange',
    'onSubmit',
    'onFocus',
    'onBlur',
    'onKeyDown',
    'onKeyUp',
    'onMouseEnter',
    'onMouseLeave',
    'onScroll',
  ],
  browserAPIs: [
    'window.',
    'document.',
    'localStorage',
    'sessionStorage',
    'navigator.',
    'location.',
  ],
};

/**
 * 递归扫描目录，查找所有 page.tsx 文件
 */
async function findPageFiles(dir: string, baseDir: string): Promise<string[]> {
  const files: string[] = [];
  
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // 跳过 node_modules 和 .next 目录
        if (entry.name !== 'node_modules' && entry.name !== '.next') {
          files.push(...await findPageFiles(fullPath, baseDir));
        }
      } else if (entry.name === 'page.tsx' || entry.name === 'page.ts') {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  
  return files;
}

/**
 * 分析单个 page.tsx 文件
 */
async function analyzePage(filePath: string, baseDir: string): Promise<PageAnalysis> {
  const content = await readFile(filePath, 'utf-8');
  const relativePath = relative(baseDir, filePath);
  const lines = content.split('\n');
  const lineCount = lines.filter(line => line.trim() && !line.trim().startsWith('//')).length;
  
  // 检查是否包含 "use client"
  const hasUseClient = content.includes('"use client"') || content.includes("'use client'");
  
  // 分析是否需要客户端组件
  const reasons: string[] = [];
  
  // 检查 React Hooks
  for (const hook of CLIENT_INDICATORS.hooks) {
    if (content.includes(hook)) {
      reasons.push(`使用了 React Hook: ${hook}`);
    }
  }
  
  // 检查事件处理器
  for (const event of CLIENT_INDICATORS.events) {
    if (content.includes(event)) {
      reasons.push(`使用了事件处理器: ${event}`);
    }
  }
  
  // 检查浏览器 API
  for (const api of CLIENT_INDICATORS.browserAPIs) {
    if (content.includes(api)) {
      reasons.push(`使用了浏览器 API: ${api}`);
    }
  }
  
  const needsClientComponent = reasons.length > 0;
  
  // 生成优化建议
  const suggestions: string[] = [];
  
  if (hasUseClient && !needsClientComponent) {
    suggestions.push('✅ 可以移除 "use client" 声明，改为服务端组件');
    suggestions.push('💡 服务端组件可以提升首屏加载速度和 SEO 性能');
  } else if (hasUseClient && needsClientComponent) {
    suggestions.push('🔄 建议将交互逻辑拆分到独立的客户端组件中');
    suggestions.push('📁 在 components/ 目录下创建 *-client.tsx 组件');
    suggestions.push('🎯 page.tsx 保持为服务端组件，负责数据预取和布局');
  } else if (!hasUseClient && needsClientComponent) {
    suggestions.push('⚠️  检测到客户端特征，但未声明 "use client"');
    suggestions.push('🔍 请确认是否需要将部分逻辑拆分到客户端组件');
  } else {
    suggestions.push('✅ 已正确使用服务端组件');
  }
  
  // 如果文件过大，添加拆分建议
  if (lineCount > 200) {
    suggestions.push(`📏 文件较大 (${lineCount} 行)，建议拆分为更小的子组件`);
  }
  
  return {
    path: filePath,
    relativePath,
    hasUseClient,
    needsClientComponent,
    reasons,
    suggestions,
    lineCount,
  };
}

/**
 * 生成分析报告
 */
function generateReport(analyses: PageAnalysis[]): string {
  const report: string[] = [];
  
  report.push('# 前端页面组件分析报告');
  report.push('');
  report.push(`生成时间: ${new Date().toLocaleString('zh-CN')}`);
  report.push('');
  
  // 统计信息
  const totalPages = analyses.length;
  const pagesWithUseClient = analyses.filter(a => a.hasUseClient).length;
  const unnecessaryUseClient = analyses.filter(a => a.hasUseClient && !a.needsClientComponent).length;
  const needsRefactoring = analyses.filter(a => a.hasUseClient && a.needsClientComponent).length;
  const correctServerComponents = analyses.filter(a => !a.hasUseClient && !a.needsClientComponent).length;
  
  report.push('## 📊 统计摘要');
  report.push('');
  report.push(`- 总页面数: ${totalPages}`);
  report.push(`- 使用 "use client" 的页面: ${pagesWithUseClient} (${(pagesWithUseClient / totalPages * 100).toFixed(1)}%)`);
  report.push(`- 不必要的 "use client": ${unnecessaryUseClient} (可直接优化)`);
  report.push(`- 需要重构的页面: ${needsRefactoring} (需拆分客户端组件)`);
  report.push(`- 正确的服务端组件: ${correctServerComponents}`);
  report.push('');
  
  // 优先级分类
  const highPriority = analyses.filter(a => a.hasUseClient && !a.needsClientComponent);
  const mediumPriority = analyses.filter(a => a.hasUseClient && a.needsClientComponent);
  const lowPriority = analyses.filter(a => !a.hasUseClient && a.needsClientComponent);
  
  // 高优先级：可直接移除 "use client"
  if (highPriority.length > 0) {
    report.push('## 🔴 高优先级优化 (可直接移除 "use client")');
    report.push('');
    for (const analysis of highPriority) {
      report.push(`### ${analysis.relativePath}`);
      report.push('');
      report.push(`- 行数: ${analysis.lineCount}`);
      report.push(`- 状态: 包含 "use client" 但无客户端特征`);
      report.push('');
      report.push('**优化建议:**');
      for (const suggestion of analysis.suggestions) {
        report.push(`- ${suggestion}`);
      }
      report.push('');
    }
  }
  
  // 中优先级：需要拆分客户端组件
  if (mediumPriority.length > 0) {
    report.push('## 🟡 中优先级优化 (需拆分客户端组件)');
    report.push('');
    for (const analysis of mediumPriority) {
      report.push(`### ${analysis.relativePath}`);
      report.push('');
      report.push(`- 行数: ${analysis.lineCount}`);
      report.push(`- 状态: 包含 "use client" 且有客户端特征`);
      report.push('');
      report.push('**检测到的客户端特征:**');
      for (const reason of analysis.reasons) {
        report.push(`- ${reason}`);
      }
      report.push('');
      report.push('**优化建议:**');
      for (const suggestion of analysis.suggestions) {
        report.push(`- ${suggestion}`);
      }
      report.push('');
    }
  }
  
  // 低优先级：可能需要检查
  if (lowPriority.length > 0) {
    report.push('## 🟢 低优先级检查 (可能需要调整)');
    report.push('');
    for (const analysis of lowPriority) {
      report.push(`### ${analysis.relativePath}`);
      report.push('');
      report.push(`- 行数: ${analysis.lineCount}`);
      report.push(`- 状态: 未声明 "use client" 但检测到客户端特征`);
      report.push('');
      report.push('**检测到的客户端特征:**');
      for (const reason of analysis.reasons) {
        report.push(`- ${reason}`);
      }
      report.push('');
      report.push('**优化建议:**');
      for (const suggestion of analysis.suggestions) {
        report.push(`- ${suggestion}`);
      }
      report.push('');
    }
  }
  
  // 正确的服务端组件
  if (correctServerComponents > 0) {
    report.push('## ✅ 正确的服务端组件');
    report.push('');
    report.push(`以下 ${correctServerComponents} 个页面已正确使用服务端组件：`);
    report.push('');
    const correctPages = analyses.filter(a => !a.hasUseClient && !a.needsClientComponent);
    for (const analysis of correctPages) {
      report.push(`- ${analysis.relativePath} (${analysis.lineCount} 行)`);
    }
    report.push('');
  }
  
  // 优化建议总结
  report.push('## 💡 优化建议总结');
  report.push('');
  report.push('### 服务端组件优先原则');
  report.push('');
  report.push('1. **默认使用服务端组件**: page.tsx 文件应该默认为服务端组件');
  report.push('2. **拆分客户端逻辑**: 将交互逻辑拆分到独立的 *-client.tsx 组件');
  report.push('3. **数据预取**: 在服务端组件中完成数据预取，通过 props 传递给客户端组件');
  report.push('4. **组件大小**: 单个组件不超过 200 行，保持代码可维护性');
  report.push('');
  report.push('### 重构步骤');
  report.push('');
  report.push('1. 创建 `components/*-client.tsx` 文件');
  report.push('2. 将交互逻辑（hooks、事件处理器）移到客户端组件');
  report.push('3. 在 page.tsx 中导入并使用客户端组件');
  report.push('4. 移除 page.tsx 中的 "use client" 声明');
  report.push('5. 测试功能是否正常');
  report.push('');
  
  return report.join('\n');
}

/**
 * 主函数
 */
async function main() {
  console.log('🔍 开始扫描前端页面组件...\n');
  
  const baseDir = process.cwd();
  const appDir = join(baseDir, 'app');
  
  // 查找所有 page.tsx 文件
  console.log('📁 查找 page.tsx 文件...');
  const pageFiles = await findPageFiles(appDir, baseDir);
  console.log(`✅ 找到 ${pageFiles.length} 个页面文件\n`);
  
  // 分析每个文件
  console.log('🔬 分析页面组件...');
  const analyses: PageAnalysis[] = [];
  for (const file of pageFiles) {
    const analysis = await analyzePage(file, baseDir);
    analyses.push(analysis);
    
    // 显示进度
    const status = analysis.hasUseClient ? '🔴' : '✅';
    console.log(`${status} ${analysis.relativePath}`);
  }
  console.log('');
  
  // 生成报告
  console.log('📝 生成分析报告...');
  const report = generateReport(analyses);
  
  // 保存报告到文件
  const reportPath = join(baseDir, 'server-components-analysis-report.md');
  await writeFile(reportPath, report, 'utf-8');
  console.log(`✅ 报告已保存到: ${reportPath}\n`);
  
  // 在控制台输出报告
  console.log(report);
  
  // 返回退出码
  const hasIssues = analyses.some(a => a.hasUseClient);
  process.exit(hasIssues ? 1 : 0);
}

// 运行主函数
main().catch(error => {
  console.error('❌ 分析失败:', error);
  process.exit(1);
});
