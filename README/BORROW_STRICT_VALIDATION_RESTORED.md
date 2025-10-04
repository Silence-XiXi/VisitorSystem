# 借物严格验证逻辑恢复

## 需求变更

用户要求：**工人没有入场记录，要禁止借用物品**

根据这个需求，我将之前允许没有入场记录的工人借物的修改进行了回滚，恢复了严格的验证逻辑。

## 回滚内容

### 1. 前端回滚 (visitorSystem-frontend/src/pages/Guard.tsx)

#### 回滚前的逻辑（允许无入场记录借物）
```typescript
// 首先查询工人基本信息
const worker = await apiService.getWorkerByWorkerId(scannedWorkerId.trim())

// 尝试检查工人是否有有效的入场记录
try {
  await apiService.checkWorkerEntryRecord(worker.workerId)
  // 有入场记录的处理
} catch (entryError: any) {
  // 无入场记录，但允许借物（后端会自动创建入场记录）
  message.warning(t('guard.workerNotOnSiteButCanBorrow'))
}
```

#### 回滚后的逻辑（严格验证）
```typescript
// 检查工人是否有有效的入场记录
const result = await apiService.checkWorkerEntryRecord(scannedWorkerId.trim())

// 转换API返回的Worker类型为前端使用的Worker类型
const frontendWorker: Worker = {
  ...result.worker,
  idCard: result.worker.idNumber,
  status: 'in' as const, // 有入场记录说明工人在场
  borrowedItems: []
}

setSelectedWorker(frontendWorker)
```

### 2. 后端回滚 (visitorSystem-backend/src/guards/guards.service.ts)

#### 回滚前的逻辑（自动创建访客记录）
```typescript
// 检查工人是否已经有有效的入场记录
let visitorRecord = await this.prisma.visitorRecord.findFirst({
  where: {
    workerId: worker.id,
    status: 'ON_SITE'
  }
});

// 如果工人没有入场记录，自动创建一个
if (!visitorRecord) {
  visitorRecord = await this.prisma.visitorRecord.create({
    data: {
      workerId: worker.id,
      siteId: guard.siteId,
      checkInTime: new Date(),
      status: 'ON_SITE',
      idType: 'ID_CARD',
      idNumber: worker.idNumber,
      registrarId: guard.id,
      notes: `通过借物操作自动创建入场记录 - ${new Date().toISOString()}`
    }
  });
}
```

#### 回滚后的逻辑（严格验证）
```typescript
// 检查工人是否已经有有效的入场记录
const visitorRecord = await this.prisma.visitorRecord.findFirst({
  where: {
    workerId: worker.id,
    status: 'ON_SITE'
  }
});

if (!visitorRecord) {
  throw new ForbiddenException('该工人未入场，无法借用物品');
}
```

## 恢复后的业务逻辑

### 借物流程
1. **输入工人编号**：门卫输入工人编号
2. **检查入场记录**：调用 `checkWorkerEntryRecord` API 检查工人是否有有效的入场记录
3. **验证结果**：
   - **有入场记录**：允许借物，加载现有借用物品列表
   - **无入场记录**：禁止借物，显示错误信息
4. **借物操作**：只有有入场记录的工人才能进行借物操作

### 错误处理
- **工人不存在**：显示"工人不存在或不属于当前工地"
- **工人未入场**：显示"该工人未入场，无法借用物品"
- **网络错误**：显示相应的网络错误信息

## 业务规则

### 严格的验证规则
1. **必须先入场**：工人必须先进行入场登记
2. **状态验证**：只有状态为 `ON_SITE` 的工人才能借物
3. **双重验证**：前端和后端都进行验证，确保数据一致性

### 数据完整性
- 借物记录必须关联到有效的访客记录
- 确保工人确实在场才能借用物品
- 防止数据孤岛和不一致问题

## 用户体验

### 操作流程
1. **入场登记** → 工人必须先进行入场登记
2. **借物操作** → 只有已入场的工人才能借物
3. **归还操作** → 正常归还流程

### 错误提示
- 清晰的错误信息告知用户操作失败的原因
- 指导用户正确的操作流程
- 保持操作的一致性和可预测性

## 技术实现

### 前端验证
```typescript
try {
  const result = await apiService.checkWorkerEntryRecord(scannedWorkerId.trim())
  // 有入场记录，允许借物
} catch (error: any) {
  // 无入场记录，禁止借物
  message.error(errorMessage)
  setSelectedWorker(null)
}
```

### 后端验证
```typescript
const visitorRecord = await this.prisma.visitorRecord.findFirst({
  where: {
    workerId: worker.id,
    status: 'ON_SITE'
  }
});

if (!visitorRecord) {
  throw new ForbiddenException('该工人未入场，无法借用物品');
}
```

## 测试场景

### 1. 有入场记录的工人借物
```
1. 输入已有入场记录的工人编号
2. 系统验证通过，显示工人信息
3. 加载现有借用物品列表
4. 允许添加新的借物记录
```

### 2. 无入场记录的工人借物
```
1. 输入没有入场记录的工人编号
2. 系统验证失败，显示错误信息
3. 禁止借物操作
4. 提示用户先进行入场登记
```

### 3. 错误处理测试
```
1. 输入不存在的工人编号
2. 验证错误信息显示正确
3. 输入不属于当前工地的工人编号
4. 验证权限控制正确
```

## 优势

### 1. 数据一致性
- 确保借物记录和访客记录的强关联
- 防止数据不一致问题
- 维护业务逻辑的完整性

### 2. 业务规则清晰
- 明确的入场-借物流程
- 符合实际业务场景
- 便于管理和审计

### 3. 安全性
- 严格的权限控制
- 防止未授权操作
- 确保数据安全

## 注意事项

### 1. 操作顺序
- 工人必须先进行入场登记
- 然后才能进行借物操作
- 保持操作流程的一致性

### 2. 错误处理
- 提供清晰的错误信息
- 指导用户正确的操作步骤
- 避免用户困惑

### 3. 数据完整性
- 确保所有借物记录都有对应的访客记录
- 维护数据关联的完整性
- 便于后续的数据分析和审计

## 总结

通过回滚操作，系统现在恢复了严格的验证逻辑：

1. **严格验证**：工人必须先有入场记录才能借物
2. **数据一致性**：确保借物记录和访客记录的强关联
3. **业务规则清晰**：明确的入场-借物操作流程
4. **安全性**：防止未授权和不合规的操作

这符合用户的需求，确保了业务逻辑的严格性和数据的一致性。
