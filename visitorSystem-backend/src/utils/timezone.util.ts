/**
 * 时区工具类
 * 统一处理时间格式和时区转换
 */
export class TimezoneUtil {
  /**
   * 获取当前中国时区时间
   */
  static getChinaTime(): Date {
    return new Date();
  }

  /**
   * 将 UTC 时间转换为中国时区时间
   */
  static utcToChinaTime(utcDate: Date): Date {
    const chinaTime = new Date(utcDate.getTime() + (8 * 60 * 60 * 1000));
    return chinaTime;
  }

  /**
   * 将中国时区时间转换为 UTC 时间
   */
  static chinaTimeToUtc(chinaDate: Date): Date {
    const utcTime = new Date(chinaDate.getTime() - (8 * 60 * 60 * 1000));
    return utcTime;
  }

  /**
   * 格式化时间为中国时区字符串
   */
  static formatChinaTime(date: Date): string {
    return date.toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

  /**
   * 获取当前时间的 ISO 字符串（中国时区）
   */
  static getChinaTimeISO(): string {
    const now = new Date();
    const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    return chinaTime.toISOString();
  }
}
