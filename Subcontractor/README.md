# 工地访客管理系统 - 分判商端

## 项目简介

这是一个专为工地访客管理设计的现代化Web应用系统，主要面向分判商用户，提供工人信息管理、二维码生成、签到签退等功能。

## 主要功能

### 🏗️ 工人信息管理
- **完整的工人档案管理**：包括工人ID、姓名、身份证号、地区、照片、分判商ID、所属工地ID、联系电话、邮箱、WhatsApp、状态等
- **增删改查操作**：支持新增、编辑、删除、查看工人信息
- **批量操作**：支持批量导入、导出工人数据
- **状态管理**：在职、暂停、离职等状态管理

### 📱 二维码功能
- **个人二维码生成**：为每个工人生成唯一的二维码
- **二维码下载**：支持下载二维码图片
- **数据复制**：支持复制二维码数据到剪贴板
- **安全加密**：二维码数据包含时间戳和加密信息

### 🔍 搜索与筛选
- **多维度搜索**：支持按姓名、编号、电话、身份证号搜索
- **状态筛选**：按工人状态筛选
- **分判商筛选**：按分判商筛选
- **工地筛选**：按所属工地筛选

### 📊 数据统计
- **实时统计**：显示总工人数、在职工人数、暂停工人数、离职工人数
- **可视化图表**：直观展示工人分布情况
- **数据导出**：支持数据报表导出

## 技术架构

### 前端技术栈
- **React 18** - 现代化的React框架
- **TypeScript** - 类型安全的JavaScript
- **Ant Design 5** - 企业级UI组件库
- **Vite** - 快速的构建工具
- **React Router 6** - 路由管理
- **Day.js** - 轻量级日期处理库
- **QRCode** - 二维码生成库

### 项目结构
```
src/
├── components/          # 可复用组件
│   ├── WorkerForm.tsx      # 工人信息表单
│   ├── WorkerTable.tsx     # 工人信息表格
│   ├── QRCodeModal.tsx     # 二维码显示模态框
│   └── DataOverview.tsx    # 数据概览组件
├── pages/              # 页面组件
│   ├── Login.tsx           # 登录页面
│   ├── Dashboard.tsx       # 主控制台
│   └── WorkerManagement.tsx # 工人管理页面
├── hooks/              # 自定义Hooks
│   └── useAuth.ts          # 认证状态管理
├── types/              # 类型定义
│   └── worker.ts           # 工人相关类型
├── App.tsx             # 主应用组件
└── main.tsx            # 应用入口
```

## 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

### 预览生产版本
```bash
npm run preview
```

## 使用说明

### 1. 登录系统
- 访问系统首页，输入用户名和密码
- 系统支持分判商角色登录

### 2. 工人管理
- **新增工人**：点击"新增工人"按钮，填写工人信息
- **编辑工人**：在工人列表中点击"编辑"按钮
- **删除工人**：在工人列表中点击"删除"按钮（需确认）
- **查看详情**：在工人列表中点击"查看"按钮

### 3. 二维码管理
- **生成二维码**：在工人列表中点击"二维码"按钮
- **下载二维码**：在二维码模态框中点击"下载二维码"按钮
- **复制数据**：支持复制二维码数据到剪贴板

### 4. 搜索与筛选
- **文本搜索**：在搜索框中输入关键词
- **状态筛选**：使用状态下拉菜单筛选
- **分判商筛选**：使用分判商下拉菜单筛选
- **工地筛选**：使用工地下拉菜单筛选

## 数据模型

### 工人信息 (Worker)
```typescript
interface Worker {
  id: string;                    // 唯一标识
  workerId: string;              // 工人唯一编号
  name: string;                  // 姓名
  idCard: string;                // 身份证号
  region: string;                // 地区
  photo: string;                 // 照片URL
  distributorId: string;         // 分判商ID
  siteId: string;                // 所属工地ID
  phone: string;                 // 联系电话
  email: string;                 // 邮箱
  whatsapp: string;              // WhatsApp
  status: 'active' | 'inactive' | 'suspended'; // 状态
  createdAt: string;             // 创建时间
  updatedAt: string;             // 更新时间
}
```

### 分判商信息 (Distributor)
```typescript
interface Distributor {
  id: string;                    // 唯一标识
  name: string;                  // 分判商名称
  code: string;                  // 分判商代码
}
```

### 工地信息 (Site)
```typescript
interface Site {
  id: string;                    // 唯一标识
  name: string;                  // 工地名称
  address: string;               // 工地地址
  code: string;                  // 工地代码
}
```

## 功能特性

### 🔐 安全特性
- **身份验证**：基于JWT的身份验证
- **权限控制**：基于角色的访问控制
- **数据加密**：敏感信息加密存储
- **操作审计**：记录所有操作日志

### 📱 响应式设计
- **移动端适配**：支持各种屏幕尺寸
- **触摸友好**：优化触摸操作体验
- **离线支持**：PWA特性支持离线使用

### 🚀 性能优化
- **懒加载**：组件按需加载
- **虚拟滚动**：大数据量表格优化
- **缓存策略**：智能数据缓存
- **代码分割**：按路由分割代码

## 开发指南

### 添加新功能
1. 在`src/types/`中定义相关类型
2. 在`src/components/`中创建组件
3. 在`src/pages/`中创建页面
4. 在`src/App.tsx`中添加路由

### 样式规范
- 使用Ant Design组件库
- 遵循设计系统规范
- 支持主题定制
- 响应式布局设计

### 代码规范
- 使用TypeScript严格模式
- 遵循ESLint规则
- 组件使用函数式组件
- 使用React Hooks管理状态

## 部署说明

### 开发环境
```bash
npm run dev
```

### 生产环境
```bash
npm run build
npm run preview
```

### Docker部署
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## 常见问题

### Q: 如何添加新的工人状态？
A: 在`src/types/worker.ts`中扩展状态类型，并在相关组件中更新状态映射。

### Q: 如何自定义二维码内容？
A: 在`src/components/QRCodeModal.tsx`中修改`generateQRCode`函数中的`qrData`对象。

### Q: 如何添加新的筛选条件？
A: 在`src/pages/WorkerManagement.tsx`中添加新的筛选状态和逻辑。

## 更新日志

### v1.0.0 (2024-01-01)
- ✨ 初始版本发布
- 🏗️ 工人信息管理功能
- 📱 二维码生成功能
- 🔍 搜索与筛选功能
- 📊 数据统计功能

## 贡献指南

欢迎提交Issue和Pull Request来改进这个项目！

## 许可证

MIT License

## 联系方式

如有问题或建议，请联系开发团队。
