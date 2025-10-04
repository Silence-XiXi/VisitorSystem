# WhatsApp QR码发送功能实现文档

## 功能概述
此功能允许系统通过YCloud API将工人的QR码图片发送到工人的WhatsApp账号中。实现了：
1. 前端QRCodeModal组件增加"发送到WhatsApp"按钮
2. 后端实现WhatsApp模块和API接口
3. 支持从系统配置中读取YCloud API密钥和发送方号码

## 前端实现

### 1. API服务扩展
在`apiService`中添加了`sendQRCodeWhatsApp`方法，用于调用后端API发送二维码：

```typescript
// 发送二维码到工人的WhatsApp
async sendQRCodeWhatsApp(data: {
  workerWhatsApp: string;
  workerName: string;
  workerId: string;
  qrCodeDataUrl: string;
}): Promise<{ success: boolean; message: string }> {
  return this.requestWithRetry('/whatsapp/send-qrcode', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}
```

### 2. QRCodeModal组件修改
在`QRCodeModal.tsx`组件中：
- 添加`sendingWhatsApp`状态来跟踪发送进度
- 实现`handleSendWhatsApp`方法调用后端API
- 添加加载状态和错误处理

```typescript
const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

const handleSendWhatsApp = async () => {
  if (!worker?.whatsapp) {
    message.warning(t('qrcode.noWhatsappWarning'));
    return;
  }

  if (!qrCodeDataUrl) {
    message.error(t('qrcode.generateFailed'));
    return;
  }

  setSendingWhatsApp(true);
  try {
    const result = await apiService.sendQRCodeWhatsApp({
      workerWhatsApp: worker.whatsapp,
      workerName: worker.name,
      workerId: worker.workerId,
      qrCodeDataUrl: qrCodeDataUrl,
    });

    if (result.success) {
      message.success(t('qrcode.qrCodeSentToWhatsapp', { whatsapp: worker.whatsapp }));
    } else {
      message.error(result.message || t('qrcode.whatsappSendFailed'));
    }
  } catch (error) {
    console.error('发送WhatsApp失败:', error);
    const errorMessage = error instanceof Error ? error.message : t('qrcode.whatsappSendFailed');
    message.error(`${t('qrcode.whatsappSendFailed')}: ${errorMessage}`);
  } finally {
    setSendingWhatsApp(false);
  }
};
```

### 3. 按钮更新
为WhatsApp发送按钮添加loading状态：

```typescript
<Button
  icon={<MessageOutlined />}
  onClick={handleSendWhatsApp}
  disabled={!worker?.whatsapp || sendingWhatsApp}
  loading={sendingWhatsApp}
>
  {sendingWhatsApp ? t('qrcode.sendingWhatsApp') : t('qrcode.sendWhatsApp')}
</Button>
```

## 后端实现

### 1. 创建WhatsApp模块
创建了三个主要文件：
- `whatsapp.module.ts`: 定义WhatsApp模块
- `whatsapp.controller.ts`: 定义API端点
- `whatsapp.service.ts`: 实现业务逻辑

### 2. 数据传输对象
创建`send-qrcode.dto.ts`定义API参数：

```typescript
export class SendQRCodeDto {
  @IsNotEmpty()
  @IsString()
  workerWhatsApp: string;

  @IsNotEmpty()
  @IsString()
  workerName: string;

  @IsNotEmpty()
  @IsString()
  workerId: string;

  @IsNotEmpty()
  @IsString()
  qrCodeDataUrl: string;
}
```

### 3. WhatsApp服务实现

`WhatsAppService` 实现了以下功能：
- 从数据库系统配置中读取YCloud API密钥和发送方号码
- 将base64图片保存为临时文件
- 上传图片到YCloud服务器获取media ID
- 使用YCloud API发送带有QR码的模板消息到工人的WhatsApp

关键实现步骤：
1. 保存base64图片到临时文件
2. 上传图片到YCloud获取media ID
3. 使用media ID发送WhatsApp模板消息
4. 清理临时文件
5. 处理错误并返回结果

### 4. 环境变量配置

系统支持两种配置YCloud API密钥和WhatsApp发送方号码的方式：
1. 通过系统配置表（首选）
   - `WHATSAPP_API_TOKEN`: YCloud API密钥
   - `WHATSAPP_SENDER_NUMBER`: WhatsApp发送方号码
2. 通过环境变量（备选）
   - `YCLOUD_API_KEY`: YCloud API密钥
   - `WHATSAPP_FROM_PHONE`: WhatsApp发送方号码

## 依赖包

该功能需要以下额外依赖包：
- `@nestjs/axios`: 用于HTTP请求
- `form-data`: 用于构建multipart/form-data请求

## 测试方法

1. 前端测试
   - 在工人详情页面生成QR码
   - 点击"发送到WhatsApp"按钮
   - 检查发送状态和结果消息

2. 后端测试
   - 使用提供的`test-whatsapp.js`脚本测试API
   - 检查API响应和WhatsApp接收情况

## 部署注意事项

1. 确保系统配置中设置了正确的YCloud API密钥和WhatsApp发送方号码
2. WhatsApp模板名称`worker_qrcode_tw`必须在YCloud平台中已经配置
3. 确认发送方WhatsApp号码在YCloud平台中已经注册和验证
4. 注意YCloud API的使用限制和计费规则
