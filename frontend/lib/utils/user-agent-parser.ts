import type { ParsedDeviceInfo } from '@/lib/api-types';

/**
 * 解析 User-Agent 字符串，提取设备和浏览器信息
 * @param userAgent User-Agent 字符串
 * @returns 解析后的设备信息
 */
export function parseUserAgent(userAgent: string | null): ParsedDeviceInfo {
  if (!userAgent) {
    return {
      browser: 'Unknown',
      os: 'Unknown',
      deviceType: 'unknown',
      icon: 'HelpCircle',
    };
  }

  const ua = userAgent.toLowerCase();
  
  // 检测操作系统
  let os = 'Unknown';
  if (ua.includes('windows')) {
    os = 'Windows';
  } else if (ua.includes('mac os')) {
    os = 'macOS';
  } else if (ua.includes('linux')) {
    os = 'Linux';
  } else if (ua.includes('android')) {
    os = 'Android';
  } else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) {
    os = 'iOS';
  }

  // 检测浏览器
  let browser = 'Unknown';
  if (ua.includes('edg')) {
    browser = 'Edge';
  } else if (ua.includes('chrome') && !ua.includes('edg')) {
    browser = 'Chrome';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser = 'Safari';
  } else if (ua.includes('firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('opera') || ua.includes('opr')) {
    browser = 'Opera';
  }

  // 检测设备类型
  let deviceType: ParsedDeviceInfo['deviceType'] = 'unknown';
  let icon: ParsedDeviceInfo['icon'] = 'HelpCircle';
  
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    deviceType = 'mobile';
    icon = 'Smartphone';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    deviceType = 'tablet';
    icon = 'Tablet';
  } else if (os !== 'Unknown') {
    deviceType = 'desktop';
    icon = 'Monitor';
  }

  return { browser, os, deviceType, icon };
}

/**
 * 格式化设备信息为友好的字符串
 * @param parsed 解析后的设备信息
 * @returns 格式化的字符串，如 "Chrome on Windows"
 */
export function formatDeviceInfo(parsed: ParsedDeviceInfo): string {
  if (parsed.browser === 'Unknown' && parsed.os === 'Unknown') {
    return 'Unknown Device';
  }
  return `${parsed.browser} on ${parsed.os}`;
}