import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

// 扩展dayjs插件
dayjs.extend(utc);
dayjs.extend(timezone);

// 设置默认时区为亚洲/上海
dayjs.tz.setDefault('Asia/Shanghai');

export default dayjs;
