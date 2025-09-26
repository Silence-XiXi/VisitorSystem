import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 生成工人编号
 * 格式: 'WK' + 6位数字
 */
export async function generateWorkerId(): Promise<string> {
  // 生成6位随机数字
  const generateRandomDigits = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };
  
  let workerId: string;
  let isUnique = false;
  
  // 最多尝试10次生成唯一ID
  for (let i = 0; i < 10; i++) {
    workerId = `WK${generateRandomDigits()}`;
    
    // 检查ID是否已存在
    const existing = await prisma.worker.findFirst({
      where: { workerId },
    });
    
    if (!existing) {
      isUnique = true;
      break;
    }
  }
  
  if (!isUnique) {
    throw new Error('无法生成唯一工人编号，请稍后再试');
  }
  
  return workerId;
}
