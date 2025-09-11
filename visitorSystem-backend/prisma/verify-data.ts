import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('验证数据库中的数据...\n');

  try {
    // 统计各表的数据量
    const userCount = await prisma.user.count();
    const distributorCount = await prisma.distributor.count();
    const siteCount = await prisma.site.count();
    const guardCount = await prisma.guard.count();
    const workerCount = await prisma.worker.count();
    const itemCategoryCount = await prisma.itemCategory.count();
    const siteDistributorCount = await prisma.siteDistributor.count();

    console.log('📊 数据统计:');
    console.log(`- 用户总数: ${userCount}`);
    console.log(`- 分销商: ${distributorCount}`);
    console.log(`- 工地: ${siteCount}`);
    console.log(`- 门卫: ${guardCount}`);
    console.log(`- 工人: ${workerCount}`);
    console.log(`- 物品分类: ${itemCategoryCount}`);
    console.log(`- 工地-分销商关联: ${siteDistributorCount}\n`);

    // 按角色统计用户
    const adminUsers = await prisma.user.count({ where: { role: 'ADMIN' } });
    const distributorUsers = await prisma.user.count({ where: { role: 'DISTRIBUTOR' } });
    const guardUsers = await prisma.user.count({ where: { role: 'GUARD' } });

    console.log('👥 用户角色分布:');
    console.log(`- 管理员: ${adminUsers}`);
    console.log(`- 分销商: ${distributorUsers}`);
    console.log(`- 门卫: ${guardUsers}\n`);

    // 按状态统计工人
    const activeWorkers = await prisma.worker.count({ where: { status: 'ACTIVE' } });
    const inactiveWorkers = await prisma.worker.count({ where: { status: 'INACTIVE' } });
    const suspendedWorkers = await prisma.worker.count({ where: { status: 'SUSPENDED' } });

    console.log('👷 工人状态分布:');
    console.log(`- 活跃: ${activeWorkers}`);
    console.log(`- 不活跃: ${inactiveWorkers}`);
    console.log(`- 暂停: ${suspendedWorkers}\n`);

    // 按分销商统计工人
    const workersByDistributor = await prisma.worker.groupBy({
      by: ['distributorId'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 5
    });

    console.log('🏢 各分销商工人数量 (前5名):');
    for (const item of workersByDistributor) {
      const distributor = await prisma.distributor.findUnique({
        where: { id: item.distributorId },
        select: { name: true }
      });
      console.log(`- ${distributor?.name || '未知'}: ${item._count.id} 人`);
    }
    console.log();

    // 按工地统计工人
    const workersBySite = await prisma.worker.groupBy({
      by: ['siteId'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 5
    });

    console.log('🏗️ 各工地工人数量 (前5名):');
    for (const item of workersBySite) {
      const site = await prisma.site.findUnique({
        where: { id: item.siteId },
        select: { name: true }
      });
      console.log(`- ${site?.name || '未知'}: ${item._count.id} 人`);
    }
    console.log();

    // 显示一些示例数据
    console.log('📋 示例数据:');
    
    // 显示前3个分销商
    const sampleDistributors = await prisma.distributor.findMany({
      take: 3,
      include: {
        user: {
          select: {
            username: true,
            status: true
          }
        }
      }
    });

    console.log('分销商示例:');
    for (const distributor of sampleDistributors) {
      console.log(`- ${distributor.name} (${distributor.user.username}) - ${distributor.user.status}`);
    }
    console.log();

    // 显示前3个工人
    const sampleWorkers = await prisma.worker.findMany({
      take: 3,
      include: {
        distributor: {
          select: { name: true }
        },
        site: {
          select: { name: true }
        }
      }
    });

    console.log('工人示例:');
    for (const worker of sampleWorkers) {
      console.log(`- ${worker.name} (${worker.workerId}) - ${worker.distributor?.name} - ${worker.site?.name} - ${worker.status}`);
    }
    console.log();

    // 显示物品分类
    const itemCategories = await prisma.itemCategory.findMany({
      take: 5
    });

    console.log('物品分类:');
    for (const category of itemCategories) {
      console.log(`- ${category.name}: ${category.description}`);
    }

    console.log('\n✅ 数据验证完成！');

  } catch (error) {
    console.error('验证数据时出错:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
