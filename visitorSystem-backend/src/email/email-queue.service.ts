import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from './email.service';
import { SystemConfigService } from '../system-config/system-config.service';

export interface EmailJob {
  id: string;
  type: 'worker-qr' | 'distributor-account' | 'guard-account';
  data: any;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  total: number;
  success: number;
  failed: number;
  errors: Array<{ email: string; error: string }>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  isCancelled?: boolean;
}

export interface EmailJobProgress {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  total: number;
  success: number;
  failed: number;
  currentBatch?: number;
  totalBatches?: number;
  errors: Array<{ email: string; error: string }>;
  estimatedTimeRemaining?: number;
  isCancelled?: boolean;
}

@Injectable()
export class EmailQueueService {
  private readonly logger = new Logger(EmailQueueService.name);
  private jobs = new Map<string, EmailJob>();
  private isProcessing = false;
  private readonly MAX_CONCURRENT_JOBS = 1; // 进一步减少并发任务数，避免SMTP服务器限制
  private readonly BATCH_SIZE = 2; // 减少批次大小，避免并发连接过多
  private readonly RETRY_DELAY = 5000; // 增加重试延迟到5秒
  private readonly MAX_RETRIES = 2; // 减少重试次数，避免长时间卡住
  private readonly BATCH_DELAY = 1000; // 减少批次间延迟，因为连接已复用
  private readonly EMAIL_DELAY = 500; // 减少单个邮件间延迟，因为连接已复用

  constructor(
    private readonly emailService: EmailService,
    private readonly systemConfigService: SystemConfigService,
  ) {}

  // 创建邮件发送任务
  async createEmailJob(
    type: EmailJob['type'],
    data: any,
    total: number,
  ): Promise<string> {
    const jobId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: EmailJob = {
      id: jobId,
      type,
      data,
      status: 'pending',
      progress: 0,
      total,
      success: 0,
      failed: 0,
      errors: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.jobs.set(jobId, job);
    this.logger.log(`创建邮件任务: ${jobId}, 总数: ${total}`);

    // 异步处理任务
    this.processJob(jobId).catch(error => {
      this.logger.error(`处理邮件任务失败: ${jobId}`, error);
    });

    return jobId;
  }

  // 获取任务进度
  getJobProgress(jobId: string): EmailJobProgress | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    const estimatedTimeRemaining = this.calculateEstimatedTime(job);

    return {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      total: job.total,
      success: job.success,
      failed: job.failed,
      errors: job.errors,
      estimatedTimeRemaining,
    };
  }

  // 获取所有任务状态
  getAllJobs(): EmailJobProgress[] {
    return Array.from(this.jobs.values()).map(job => ({
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      total: job.total,
      success: job.success,
      failed: job.failed,
      errors: job.errors,
      estimatedTimeRemaining: this.calculateEstimatedTime(job),
      isCancelled: job.isCancelled,
    }));
  }

  // 取消邮件任务
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    if (job.status === 'completed' || job.status === 'failed') {
      return false; // 已完成的任务无法取消
    }

    job.isCancelled = true;
    job.status = 'cancelled';
    job.cancelledAt = new Date();
    job.updatedAt = new Date();

    this.logger.log(`邮件任务已取消: ${jobId}`);
    return true;
  }

  // 处理邮件任务
  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      job.status = 'processing';
      job.updatedAt = new Date();
      this.logger.log(`开始处理邮件任务: ${jobId}`);

      // 检查是否已被取消
      if (job.isCancelled) {
        job.status = 'cancelled';
        job.updatedAt = new Date();
        this.logger.log(`邮件任务已取消: ${jobId}`);
        return;
      }

      switch (job.type) {
        case 'worker-qr':
          await this.processWorkerQRJob(job);
          break;
        case 'distributor-account':
          await this.processDistributorAccountJob(job);
          break;
        case 'guard-account':
          await this.processGuardAccountJob(job);
          break;
        default:
          throw new Error(`未知的邮件任务类型: ${job.type}`);
      }

      // 再次检查是否已被取消
      if (job.isCancelled) {
        job.status = 'cancelled';
        job.updatedAt = new Date();
        this.logger.log(`邮件任务已取消: ${jobId}`);
        return;
      }

      job.status = 'completed';
      job.completedAt = new Date();
      job.updatedAt = new Date();
      this.logger.log(`邮件任务完成: ${jobId}, 成功: ${job.success}, 失败: ${job.failed}`);

    } catch (error) {
      job.status = 'failed';
      job.updatedAt = new Date();
      this.logger.error(`邮件任务失败: ${jobId}`, error);
    }
  }

  // 处理工人二维码邮件任务
  private async processWorkerQRJob(job: EmailJob): Promise<void> {
    const { workers, language } = job.data;
    
    // 分批处理
    const batches = this.createBatches(workers, this.BATCH_SIZE);
    job.data.totalBatches = batches.length;

    for (let i = 0; i < batches.length; i++) {
      // 检查是否已被取消
      if (job.isCancelled) {
        this.logger.log(`邮件任务已取消，停止处理批次 ${i + 1}/${batches.length}`);
        break;
      }

      const batch = batches[i];
      job.data.currentBatch = i + 1;

      // 串行发送当前批次的邮件，避免SMTP服务器并发限制
      for (const worker of batch) {
        // 检查是否已被取消
        if (job.isCancelled) {
          this.logger.log(`邮件任务已取消，停止发送邮件: ${(worker as any).workerEmail}`);
          break;
        }
        
        const retryCount = 0;
        await this.sendWorkerQRWithRetry(worker, language, retryCount, job);
        
        // 邮件间延迟，避免触发SMTP服务器限制
        if (batch.indexOf(worker) < batch.length - 1) {
          await this.delay(this.EMAIL_DELAY);
        }
      }

      // 更新进度
      job.progress = Math.round(((i + 1) / batches.length) * 100);
      job.updatedAt = new Date();

      // 批次间延迟，避免过载
      if (i < batches.length - 1) {
        await this.delay(this.BATCH_DELAY);
      }
    }
  }

  // 处理分判商账号邮件任务
  private async processDistributorAccountJob(job: EmailJob): Promise<void> {
    const { distributors, loginUrl, language } = job.data;
    
    const batches = this.createBatches(distributors, this.BATCH_SIZE);
    job.data.totalBatches = batches.length;

    for (let i = 0; i < batches.length; i++) {
      // 检查是否已被取消
      if (job.isCancelled) {
        this.logger.log(`邮件任务已取消，停止处理批次 ${i + 1}/${batches.length}`);
        break;
      }

      const batch = batches[i];
      job.data.currentBatch = i + 1;

      // 串行发送当前批次的邮件，避免SMTP服务器并发限制
      for (const distributor of batch) {
        // 检查是否已被取消
        if (job.isCancelled) {
          this.logger.log(`邮件任务已取消，停止发送邮件: ${(distributor as any).email}`);
          break;
        }
        
        const retryCount = 0;
        await this.sendDistributorAccountWithRetry(distributor, loginUrl, language, retryCount, job);
        
        // 邮件间延迟，避免触发SMTP服务器限制
        if (batch.indexOf(distributor) < batch.length - 1) {
          await this.delay(this.EMAIL_DELAY);
        }
      }

      job.progress = Math.round(((i + 1) / batches.length) * 100);
      job.updatedAt = new Date();

      if (i < batches.length - 1) {
        await this.delay(this.BATCH_DELAY);
      }
    }
  }

  // 处理门卫账号邮件任务
  private async processGuardAccountJob(job: EmailJob): Promise<void> {
    const { guards, loginUrl, language } = job.data;
    
    const batches = this.createBatches(guards, this.BATCH_SIZE);
    job.data.totalBatches = batches.length;

    for (let i = 0; i < batches.length; i++) {
      // 检查是否已被取消
      if (job.isCancelled) {
        this.logger.log(`邮件任务已取消，停止处理批次 ${i + 1}/${batches.length}`);
        break;
      }

      const batch = batches[i];
      job.data.currentBatch = i + 1;

      // 串行发送当前批次的邮件，避免SMTP服务器并发限制
      for (const guard of batch) {
        // 检查是否已被取消
        if (job.isCancelled) {
          this.logger.log(`邮件任务已取消，停止发送邮件: ${(guard as any).guardEmail}`);
          break;
        }
        
        const retryCount = 0;
        await this.sendGuardAccountWithRetry(guard, loginUrl, language, retryCount, job);
        
        // 邮件间延迟，避免触发SMTP服务器限制
        if (batch.indexOf(guard) < batch.length - 1) {
          await this.delay(this.EMAIL_DELAY);
        }
      }

      job.progress = Math.round(((i + 1) / batches.length) * 100);
      job.updatedAt = new Date();

      if (i < batches.length - 1) {
        await this.delay(this.BATCH_DELAY);
      }
    }
  }

  // 带重试的工人二维码邮件发送
  private async sendWorkerQRWithRetry(
    worker: any,
    language: string,
    retryCount: number,
    job: EmailJob,
  ): Promise<void> {
    try {
      // 添加超时控制
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('邮件发送超时')), 30000); // 30秒超时
      });

      const sendPromise = this.emailService.sendWorkerQRCodeEmail(
        worker.workerEmail,
        worker.workerName,
        worker.workerId,
        worker.qrCodeDataUrl,
        language,
        1, // 减少重试次数，由队列服务控制
      );

      const success = await Promise.race([sendPromise, timeoutPromise]) as boolean;

      if (success) {
        job.success++;
        // this.logger.log(`工人二维码邮件发送成功: ${worker.workerEmail}`);
      } else {
        job.failed++;
        job.errors.push({
          email: worker.workerEmail,
          error: '邮件发送失败',
        });
        this.logger.warn(`工人二维码邮件发送失败: ${worker.workerEmail}`);
      }
    } catch (error) {
      const errorMessage = error.message || '邮件发送失败';
      
      if (retryCount < this.MAX_RETRIES && !errorMessage.includes('超时')) {
        this.logger.warn(`工人二维码邮件发送失败，重试 ${retryCount + 1}/${this.MAX_RETRIES}: ${worker.workerEmail}, 原因: ${errorMessage}`);
        await this.delay(this.RETRY_DELAY * (retryCount + 1));
        return this.sendWorkerQRWithRetry(worker, language, retryCount + 1, job);
      } else {
        // 确保失败计数和错误记录
        job.failed++;
        job.errors.push({
          email: worker.workerEmail,
          error: errorMessage,
        });
        this.logger.error(`工人二维码邮件发送最终失败: ${worker.workerEmail}, 原因: ${errorMessage}`);
        // 确保任务继续处理，不卡住
        return;
      }
    }
  }

  // 带重试的分判商账号邮件发送
  private async sendDistributorAccountWithRetry(
    distributor: any,
    loginUrl: string,
    language: string,
    retryCount: number,
    job: EmailJob,
  ): Promise<void> {
    try {
      // 添加超时控制
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('邮件发送超时')), 30000); // 30秒超时
      });

      const sendPromise = this.emailService.sendDistributorAccountEmail(
        distributor.email,
        distributor.name,
        distributor.contactName,
        distributor.username,
        distributor.password,
        loginUrl,
        language,
        1,
      );

      const success = await Promise.race([sendPromise, timeoutPromise]) as boolean;

      if (success) {
        job.success++;
        // this.logger.log(`分判商账号邮件发送成功: ${distributor.email}`);
      } else {
        job.failed++;
        job.errors.push({
          email: distributor.email,
          error: '邮件发送失败',
        });
        this.logger.warn(`分判商账号邮件发送失败: ${distributor.email}`);
      }
    } catch (error) {
      const errorMessage = error.message || '邮件发送失败';
      
      if (retryCount < this.MAX_RETRIES && !errorMessage.includes('超时')) {
        this.logger.warn(`分判商账号邮件发送失败，重试 ${retryCount + 1}/${this.MAX_RETRIES}: ${distributor.email}, 原因: ${errorMessage}`);
        await this.delay(this.RETRY_DELAY * (retryCount + 1));
        return this.sendDistributorAccountWithRetry(distributor, loginUrl, language, retryCount + 1, job);
      } else {
        job.failed++;
        job.errors.push({
          email: distributor.email,
          error: errorMessage,
        });
        this.logger.error(`分判商账号邮件发送最终失败: ${distributor.email}, 原因: ${errorMessage}`);
        return;
      }
    }
  }

  // 带重试的门卫账号邮件发送
  private async sendGuardAccountWithRetry(
    guard: any,
    loginUrl: string,
    language: string,
    retryCount: number,
    job: EmailJob,
  ): Promise<void> {
    try {
      // 添加超时控制
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('邮件发送超时')), 30000); // 30秒超时
      });

      const sendPromise = this.emailService.sendGuardAccountEmail(
        guard.guardEmail,
        guard.guardName,
        guard.contactName,
        guard.username,
        guard.password,
        loginUrl,
        language,
        1,
      );

      const success = await Promise.race([sendPromise, timeoutPromise]) as boolean;

      if (success) {
        job.success++;
        // this.logger.log(`门卫账号邮件发送成功: ${guard.guardEmail}`);
      } else {
        job.failed++;
        job.errors.push({
          email: guard.guardEmail,
          error: '邮件发送失败',
        });
        this.logger.warn(`门卫账号邮件发送失败: ${guard.guardEmail}`);
      }
    } catch (error) {
      const errorMessage = error.message || '邮件发送失败';
      
      if (retryCount < this.MAX_RETRIES && !errorMessage.includes('超时')) {
        this.logger.warn(`门卫账号邮件发送失败，重试 ${retryCount + 1}/${this.MAX_RETRIES}: ${guard.guardEmail}, 原因: ${errorMessage}`);
        await this.delay(this.RETRY_DELAY * (retryCount + 1));
        return this.sendGuardAccountWithRetry(guard, loginUrl, language, retryCount + 1, job);
      } else {
        job.failed++;
        job.errors.push({
          email: guard.guardEmail,
          error: errorMessage,
        });
        this.logger.error(`门卫账号邮件发送最终失败: ${guard.guardEmail}, 原因: ${errorMessage}`);
        return;
      }
    }
  }

  // 创建批次
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  // 延迟函数
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 计算预估剩余时间
  private calculateEstimatedTime(job: EmailJob): number | undefined {
    if (job.status === 'completed' || job.status === 'failed') {
      return 0;
    }

    if (job.progress === 0) {
      return undefined;
    }

    const elapsed = Date.now() - job.createdAt.getTime();
    const estimatedTotal = (elapsed / job.progress) * 100;
    const remaining = estimatedTotal - elapsed;

    return Math.max(0, Math.round(remaining / 1000)); // 返回秒数
  }

  // 清理已完成的任务（保留最近24小时）
  cleanupCompletedJobs(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    for (const [jobId, job] of this.jobs.entries()) {
      if ((job.status === 'completed' || job.status === 'failed') && 
          job.updatedAt < cutoffTime) {
        this.jobs.delete(jobId);
        this.logger.log(`清理过期任务: ${jobId}`);
      }
    }
  }
}
