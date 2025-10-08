# Docker容器数据库结构报告

## 📊 数据库概览
- **数据库名**: visitor_system
- **表数量**: 12个表
- **枚举类型**: 12个枚举类型

## 📋 表列表
1. _prisma_migrations (迁移记录表)
2. distributors (分销商表)
3. guards (门卫表)
4. item_borrow_records (借物记录表)
5. item_categories (物品分类表)
6. items (物品表)
7. site_distributors (工地分销商关联表)
8. sites (工地表)
9. system_configs (系统配置表)
10. users (用户表)
11. visitor_records (访客记录表)
12. workers (工人表)

## 🔍 关键表结构详情

### Workers表 (已更新)
**字段**:
- id (text, NOT NULL, PK)
- workerId (text, NOT NULL, UNIQUE)
- name (text, NOT NULL)
- gender (Gender枚举, NOT NULL)
- region (text, NULL)
- phone (text, NOT NULL)
- email (text, NULL)
- whatsapp (text, NULL)
- birthDate (timestamp(3), NULL)
- status (WorkerStatus枚举, NOT NULL, DEFAULT 'ACTIVE')
- createdAt (timestamp(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- updatedAt (timestamp(3), NOT NULL)
- distributorId (text, NOT NULL, FK)
- siteId (text, NOT NULL, FK)
- **idNumber (text, NOT NULL, UNIQUE)** ✅ 新增
- **idType (IdType枚举, DEFAULT 'ID_CARD')** ✅ 新增

**已移除字段**:
- ❌ idCard (已删除)
- ❌ age (已删除)
- ❌ photo (已删除)
- ❌ physicalCardId (已删除)

### VisitorRecords表 (已更新)
**字段**:
- id (text, NOT NULL, PK)
- workerId (text, NOT NULL, FK)
- siteId (text, NOT NULL, FK)
- checkInTime (timestamp(3), NULL)
- checkOutTime (timestamp(3), NULL)
- status (VisitorStatus枚举, NOT NULL, DEFAULT 'ON_SITE')
- idNumber (text, NOT NULL)
- physicalCardId (text, NULL)
- registrarId (text, NULL, FK)
- notes (text, NULL)
- createdAt (timestamp(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- updatedAt (timestamp(3), NOT NULL)
- **phone (text, NULL)** ✅ 新增
- **idType (IdType枚举, NOT NULL)** ✅ 更新类型

### ItemBorrowRecords表 (已更新)
**字段**:
- id (text, NOT NULL, PK)
- borrowDate (timestamp(3), NOT NULL)
- borrowTime (text, NOT NULL)
- returnDate (timestamp(3), NULL)
- returnTime (text, NULL)
- status (BorrowStatus枚举, NOT NULL, DEFAULT 'BORROWED')
- borrowDuration (integer, NULL)
- createdAt (timestamp(3), NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- updatedAt (timestamp(3), NOT NULL)
- workerId (text, NOT NULL, FK)
- siteId (text, NOT NULL, FK)
- itemId (text, NOT NULL, FK)
- borrowHandlerId (text, NULL, FK)
- returnHandlerId (text, NULL, FK)
- **notes (text, NULL)** ✅ 新增
- **visitorRecordId (text, NULL, FK)** ✅ 新增

## 🔢 枚举类型
1. **BorrowStatus**: BORROWED, RETURNED, OVERDUE
2. **DistributorStatus**: ACTIVE, INACTIVE
3. **Gender**: MALE, FEMALE
4. **GuardStatus**: ACTIVE, DISABLED
5. **IdType**: ID_CARD, PASSPORT, DRIVER_LICENSE, OTHER ✅ 新增
6. **ItemCategoryStatus**: ACTIVE, INACTIVE
7. **ItemStatus**: AVAILABLE, BORROWED, MAINTENANCE, LOST
8. **SiteStatus**: ACTIVE, INACTIVE
9. **UserRole**: ADMIN, DISTRIBUTOR, GUARD
10. **UserStatus**: ACTIVE, DISABLED
11. **VisitorStatus**: ON_SITE, LEFT, PENDING
12. **WorkerStatus**: ACTIVE, INACTIVE

## 🔗 外键关系
- workers.distributorId → distributors.id
- workers.siteId → sites.id
- visitor_records.workerId → workers.id
- visitor_records.siteId → sites.id
- visitor_records.registrarId → guards.id
- item_borrow_records.workerId → workers.id
- item_borrow_records.siteId → sites.id
- item_borrow_records.itemId → items.id
- item_borrow_records.borrowHandlerId → guards.id
- item_borrow_records.returnHandlerId → guards.id
- item_borrow_records.visitorRecordId → visitor_records.id ✅ 新增

## 📝 迁移记录
- 最新迁移: 20251007171053_update_workers_id_fields
- 迁移状态: 已应用
- 数据库版本: 最新
