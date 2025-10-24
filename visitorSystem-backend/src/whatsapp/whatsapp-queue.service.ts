import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';

// WhatsApp任务类型
export interface WhatsAppJob {
  id: string;
  type: 'worker-qr';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  total: number;
  success: number;
  failed: number;
  errors: Array<{ whatsapp: string; error: string }>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  isCancelled: boolean;
  data: {
    workers: Array<{
      workerWhatsApp: string;
      workerName: string;
      workerId: string;
      qrCodeDataUrl: string;
    }>;
    language: string;
    totalBatches?: number;
    currentBatch?: number;
  };
}

@Injectable()
export class WhatsAppQueueService {
  private readonly logger = new Logger(WhatsAppQueueService.name);
  private jobs: Map<string, WhatsAppJob> = new Map();
  private readonly BATCH_SIZE = 10; // 每批处理10个WhatsApp
  private readonly WHATSAPP_DELAY = 1000; // WhatsApp发送间延迟1秒
  private readonly BATCH_DELAY = 2000; // 批次间延迟2秒

  constructor(private readonly whatsappService: WhatsAppService) {}

  /**
   * 创建异步WhatsApp发送任务
   * @param workers 工人数据
   * @param language 语言
   * @returns 任务ID
   */
  async createJob(
    workers: Array<{
      workerWhatsApp: string;
      workerName: string;
      workerId: string;
      qrCodeDataUrl: string;
    }>,
    language: string = 'zh-CN'
  ): Promise<string> {
    const jobId = `whatsapp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: WhatsAppJob = {
      id: jobId,
      type: 'worker-qr',
      status: 'pending',
      progress: 0,
      total: workers.length,
      success: 0,
      failed: 0,
      errors: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isCancelled: false,
      data: {
        workers,
        language
      }
    };

    this.jobs.set(jobId, job);
    
    // 异步处理任务
    this.processJob(jobId).catch(error => {
      this.logger.error(`WhatsApp任务处理失败: ${jobId}`, error);
    });

    this.logger.log(`创建WhatsApp任务: ${jobId}，工人数量: ${workers.length}`);
    return jobId;
  }

  /**
   * 获取任务进度
   * @param jobId 任务ID
   * @returns 任务进度信息
   */
  async getJobProgress(jobId: string): Promise<{
    success: boolean;
    progress?: WhatsAppJob;
    message?: string;
  }> {
    const job = this.jobs.get(jobId);
    
    if (!job) {
      return {
        success: false,
        message: '任务不存在'
      };
    }

    return {
      success: true,
      progress: job
    };
  }

  /**
   * 取消任务
   * @param jobId 任务ID
   * @returns 取消结果
   */
  async cancelJob(jobId: string): Promise<{ success: boolean; message: string }> {
    const job = this.jobs.get(jobId);
    
    if (!job) {
      return {
        success: false,
        message: '任务不存在'
      };
    }

    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      return {
        success: false,
        message: '任务已完成，无法取消'
      };
    }

    job.isCancelled = true;
    job.status = 'cancelled';
    job.updatedAt = new Date();
    job.completedAt = new Date();

    this.logger.log(`WhatsApp任务已取消: ${jobId}`);
    
    return {
      success: true,
      message: '任务已取消'
    };
  }

  /**
   * 处理WhatsApp任务
   * @param jobId 任务ID
   */
  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      this.logger.error(`WhatsApp任务不存在: ${jobId}`);
      return;
    }

    try {
      job.status = 'processing';
      job.updatedAt = new Date();
      
      await this.processWorkerQRJob(job);
      
      if (!job.isCancelled) {
        job.status = 'completed';
        job.progress = 100;
        job.completedAt = new Date();
        this.logger.log(`WhatsApp任务完成: ${jobId}，成功: ${job.success}，失败: ${job.failed}`);
      }
    } catch (error) {
      this.logger.error(`WhatsApp任务失败: ${jobId}`, error);
      job.status = 'failed';
      job.completedAt = new Date();
    } finally {
      job.updatedAt = new Date();
    }
  }

  /**
   * 处理工人二维码WhatsApp任务
   * @param job WhatsApp任务
   */
  private async processWorkerQRJob(job: WhatsAppJob): Promise<void> {
    const { workers, language } = job.data;
    
    // 分批处理
    const batches = this.createBatches(workers, this.BATCH_SIZE);
    job.data.totalBatches = batches.length;

    for (let i = 0; i < batches.length; i++) {
      // 检查是否已被取消
      if (job.isCancelled) {
        this.logger.log(`WhatsApp任务已取消，停止处理批次 ${i + 1}/${batches.length}`);
        break;
      }

      const batch = batches[i];
      job.data.currentBatch = i + 1;

      // 串行发送当前批次的WhatsApp，避免并发限制
      for (const worker of batch) {
        // 检查是否已被取消
        if (job.isCancelled) {
          this.logger.log(`WhatsApp任务已取消，停止发送WhatsApp: ${worker.workerWhatsApp}`);
          break;
        }
        
        const retryCount = 0;
        await this.sendWorkerQRWithRetry(worker, language, retryCount, job);
        
        // WhatsApp间延迟，避免触发限制
        if (batch.indexOf(worker) < batch.length - 1) {
          await this.delay(this.WHATSAPP_DELAY);
        }
      }

      // 更新进度 - 基于实际发送数量而不是批次数量
      const totalProcessed = job.success + job.failed;
      job.progress = Math.round((totalProcessed / job.total) * 100);
      job.updatedAt = new Date();

      // 批次间延迟，避免过载
      if (i < batches.length - 1) {
        await this.delay(this.BATCH_DELAY);
      }
    }
  }

  /**
   * 发送工人二维码WhatsApp（带重试）
   * @param worker 工人数据
   * @param language 语言
   * @param retryCount 重试次数
   * @param job 任务对象
   */
  private async sendWorkerQRWithRetry(
    worker: {
      workerWhatsApp: string;
      workerName: string;
      workerId: string;
      qrCodeDataUrl: string;
    },
    language: string,
    retryCount: number,
    job: WhatsAppJob
  ): Promise<void> {
    const maxRetries = 2;
    
    try {
      const result = await this.whatsappService.sendQRCode(
        worker.workerWhatsApp,
        worker.workerName,
        worker.qrCodeDataUrl,
        language
      );

      if (result.success) {
        job.success++;
        this.logger.log(`WhatsApp发送成功: ${worker.workerName}(${worker.workerWhatsApp})`);
        
        // 更新进度 - 基于实际发送数量
        const totalProcessed = job.success + job.failed;
        job.progress = Math.round((totalProcessed / job.total) * 100);
        job.updatedAt = new Date();
      } else {
        throw new Error(result.message || 'WhatsApp发送失败');
      }
    } catch (error) {
      this.logger.error(`WhatsApp发送失败: ${worker.workerName}(${worker.workerWhatsApp})`, error);
      
      if (retryCount < maxRetries && !job.isCancelled) {
        this.logger.log(`重试WhatsApp发送: ${worker.workerName}(${worker.workerWhatsApp})，重试次数: ${retryCount + 1}`);
        await this.delay(2000); // 重试前延迟2秒
        await this.sendWorkerQRWithRetry(worker, language, retryCount + 1, job);
      } else {
        job.failed++;
        job.errors.push({
          whatsapp: worker.workerWhatsApp,
          error: error instanceof Error ? error.message : '未知错误'
        });
        
        // 更新进度 - 基于实际发送数量
        const totalProcessed = job.success + job.failed;
        job.progress = Math.round((totalProcessed / job.total) * 100);
        job.updatedAt = new Date();
      }
    }
  }

  /**
   * 创建批次
   * @param items 项目数组
   * @param batchSize 批次大小
   * @returns 批次数组
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * 延迟函数
   * @param ms 延迟毫秒数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 清理已完成的任务（保留最近24小时的任务）
   */
  cleanupCompletedJobs(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24小时前
    const jobsToDelete: string[] = [];

    for (const [jobId, job] of this.jobs.entries()) {
      if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
        if (job.completedAt && job.completedAt < cutoffTime) {
          jobsToDelete.push(jobId);
        }
      }
    }

    jobsToDelete.forEach(jobId => {
      this.jobs.delete(jobId);
      this.logger.log(`清理已完成WhatsApp任务: ${jobId}`);
    });

    if (jobsToDelete.length > 0) {
      this.logger.log(`清理了 ${jobsToDelete.length} 个已完成WhatsApp任务`);
    }
  }

  /**
   * 获取所有任务统计信息
   */
  getJobStats(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
  } {
    const stats = {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0
    };

    for (const job of this.jobs.values()) {
      stats.total++;
      stats[job.status]++;
    }

    return stats;
  }
}
