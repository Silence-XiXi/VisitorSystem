import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 生成工人编号
 * 格式: 8位数字
 */
export async function generateWorkerId(): Promise<string> {
  // 生成8位随机数字
  const generateRandomDigits = () => {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
  };
  
  let workerId: string;
  let isUnique = false;
  
  // 最多尝试10次生成唯一ID
  for (let i = 0; i < 10; i++) {
    workerId = generateRandomDigits();
    
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
