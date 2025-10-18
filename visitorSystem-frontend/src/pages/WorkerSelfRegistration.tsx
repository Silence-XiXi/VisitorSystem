import React from 'react';
import { Card, Form, Input, Button, Select, DatePicker, message, Typography, Result, Spin, Alert, Radio } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import QRCode from 'qrcode';
import type { RadioChangeEvent } from 'antd';
import { useLocale } from '../contexts/LocaleContext';
import { useSearchParams } from 'react-router-dom';
import type { Site, WorkerFormData } from '../types/worker';
import { useEffect, useState, useRef, useCallback } from 'react';


const { Title, Text } = Typography;
const { Option } = Select;

const WorkerSelfRegistration: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { t, locale, setLocale } = useLocale();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idNumberChecking, setIdNumberChecking] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [, setWorkerId] = useState<string>('');
  const [workerName, setWorkerName] = useState<string>('');
  const [qrLoading, setQrLoading] = useState(false);
  
  // 同步状态跟踪
  const [phoneSynced, setPhoneSynced] = useState(false);
  const [areaSynced, setAreaSynced] = useState(false);
  
  // 防抖定时器引用
  const phoneDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const areaDebounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // 根据语言确定默认区号
  const getDefaultAreaCode = () => {
    if (locale === 'zh-CN') {
      return t('distributor.areaCodeChina'); // 简体中文默认中国大陆
    } else {
      return t('distributor.areaCodeHongKong'); // 繁体中文和英文默认香港
    }
  };

  // 区号选项
  const areaCodeOptions = [
    { value: t('distributor.areaCodeChina'), areaCode: '+86', label: `+86 (${t('distributor.areaCodeChina')})` },
    { value: t('distributor.areaCodeHongKong'), areaCode: '+852', label: `+852 (${t('distributor.areaCodeHongKong')})` },
    { value: t('distributor.areaCodeMacau'), areaCode: '+853', label: `+853 (${t('distributor.areaCodeMacau')})` },
    { value: t('distributor.areaCodeTaiwan'), areaCode: '+886', label: `+886 (${t('distributor.areaCodeTaiwan')})` },
    { value: t('distributor.areaCodeSingapore'), areaCode: '+65', label: `+65 (${t('distributor.areaCodeSingapore')})` },
    { value: t('distributor.areaCodeMalaysia'), areaCode: '+60', label: `+60 (${t('distributor.areaCodeMalaysia')})` },
    { value: t('distributor.areaCodeThailand'), areaCode: '+66', label: `+66 (${t('distributor.areaCodeThailand')})` },
    { value: t('distributor.areaCodePhilippines'), areaCode: '+63', label: `+63 (${t('distributor.areaCodePhilippines')})` },
    { value: t('distributor.areaCodeIndonesia'), areaCode: '+62', label: `+62 (${t('distributor.areaCodeIndonesia')})` },
    { value: t('distributor.areaCodeVietnam'), areaCode: '+84', label: `+84 (${t('distributor.areaCodeVietnam')})` },
    { value: t('distributor.areaCodeUSCanada'), areaCode: '+1', label: `+1 (${t('distributor.areaCodeUSCanada')})` },
    { value: t('distributor.areaCodeUK'), areaCode: '+44', label: `+44 (${t('distributor.areaCodeUK')})` },
    { value: t('distributor.areaCodeGermany'), areaCode: '+49', label: `+49 (${t('distributor.areaCodeGermany')})` },
    { value: t('distributor.areaCodeFrance'), areaCode: '+33', label: `+33 (${t('distributor.areaCodeFrance')})` },
    { value: t('distributor.areaCodeJapan'), areaCode: '+81', label: `+81 (${t('distributor.areaCodeJapan')})` },
    { value: t('distributor.areaCodeKorea'), areaCode: '+82', label: `+82 (${t('distributor.areaCodeKorea')})` },
    { value: t('distributor.areaCodeIndia'), areaCode: '+91', label: `+91 (${t('distributor.areaCodeIndia')})` },
    { value: t('distributor.areaCodeAustralia'), areaCode: '+61', label: `+61 (${t('distributor.areaCodeAustralia')})` },
  ];
  
  // 动态获取API基础地址
  const getApiBaseUrl = (): string => {
    // 优先使用环境变量
    const metaEnv = (import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }).env;
    if (metaEnv?.VITE_API_BASE_URL) {
      return metaEnv.VITE_API_BASE_URL;
    }
    
    // 自动使用当前窗口的主机名和端口
    const currentHost = window.location.hostname;
    const currentPort = window.location.port;
    const currentProtocol = window.location.protocol;
    
    // 如果是本地开发环境，使用localhost:3001
    if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
      return 'http://localhost:3001';
    }
    
    // 检测是否通过nginx代理访问（支持多种端口）
    const proxyPorts = ['80', '443', '8080', '8081', '8082', '3000', '3001'];
    if (proxyPorts.includes(currentPort) || !currentPort) {
      // 如果是默认端口（80/443）或没有端口，直接使用当前地址
      const baseUrl = currentPort ? `${currentProtocol}//${currentHost}:${currentPort}` : `${currentProtocol}//${currentHost}`;
      return `${baseUrl}/api`;
    }
    
    // 否则使用当前访问的主机名+后端端口
    return `${currentProtocol}//${currentHost}:3001`;
  };
  
  const apiBaseUrl = getApiBaseUrl();
  
  // 语言切换处理
  const handleLanguageChange = (e: RadioChangeEvent) => {
    const newLocale = e.target.value as 'zh-CN' | 'zh-TW' | 'en-US';
    setLocale(newLocale);
    message.success(t('login.languageChanged') || '语言已切换');
  };

  // 联系电话变化时自动填入WhatsApp（带防抖）
  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const phoneValue = e.target.value;
    
    // 清除之前的定时器
    if (phoneDebounceRef.current) {
      clearTimeout(phoneDebounceRef.current);
    }
    
    // 设置新的防抖定时器（1秒）
    phoneDebounceRef.current = setTimeout(() => {
      const currentWhatsappNumber = form.getFieldValue('whatsappNumber');
      
      // 只在第一次输入且WhatsApp号码字段为空时同步
      if (!phoneSynced && !currentWhatsappNumber && phoneValue) {
        form.setFieldsValue({ whatsappNumber: phoneValue });
        setPhoneSynced(true);
      }
    }, 1000);
  }, [phoneSynced, form]);
  
  // 清理定时器
  useEffect(() => {
    return () => {
      if (phoneDebounceRef.current) {
        clearTimeout(phoneDebounceRef.current);
      }
      if (areaDebounceRef.current) {
        clearTimeout(areaDebounceRef.current);
      }
    };
  }, []);
  
  // 检查身份证号码是否已存在
  const checkIdNumberExists = async (idNumber: string) => {
    if (!idNumber) return false;
    
    setIdNumberChecking(true);
    try {
      const response = await fetch(`${apiBaseUrl}/public/worker-registration/check-id?idNumber=${encodeURIComponent(idNumber)}`);
      
      if (!response.ok) {
        throw new Error('检查身份证号码失败');
      }
      
      const data = await response.json();
      return data.exists;
    } catch (error) {
      console.error('检查身份证号码失败:', error);
      return false;
    } finally {
      setIdNumberChecking(false);
    }
  };

  // 从URL获取分判商和工地信息
  const distributorId = searchParams.get('distributorId');
  const siteId = searchParams.get('siteId');

  // 分判商和工地信息
  const [distributorInfo, setDistributorInfo] = useState<{id: string; name: string}|null>(null);
  const [siteInfo, setSiteInfo] = useState<Site | null>(null);

  // 加载分判商和工地信息
  useEffect(() => {
    const loadInformation = async () => {
      if (!distributorId || !siteId) {
        setError('链接无效，缺少必要的分判商或工地信息');
        return;
      }

      setLoading(true);
      try {
        // 获取分判商和工地信息
        const response = await fetch(`${apiBaseUrl}/public/worker-registration/info?distributorId=${distributorId}&siteId=${siteId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || '获取信息失败');
        }
        
        const data = await response.json();
        setDistributorInfo(data.distributor);
        setSiteInfo(data.site);
      } catch (err) {
        console.error('加载信息失败:', err);
        setError('无法加载分判商或工地信息，请联系管理员');
      } finally {
        setLoading(false);
      }
    };

    loadInformation();
  }, [distributorId, siteId, apiBaseUrl]);

  // 表单提交处理
  const handleSubmit = async (values: WorkerFormData & { whatsappAreaCode?: string; whatsappNumber?: string }) => {
    if (!distributorId || !siteId) {
      message.error(t('worker.registrationIncomplete') || '注册信息不完整，无法提交');
      return;
    }

    // 再次检查身份证号码是否已存在
    const idNumberExists = await checkIdNumberExists(values.idNumber);
    if (idNumberExists) {
      form.setFields([
        {
          name: 'idNumber',
          errors: [t('worker.idNumberExists') || '证件号码已存在，请检查您的输入']
        }
      ]);
      return;
    }

    setSubmitting(true);
    try {
      // 处理WhatsApp字段，合并区号和号码
      let whatsappNumber = null;
      if (values.whatsappAreaCode && values.whatsappNumber) {
        whatsappNumber = `${values.whatsappAreaCode} ${values.whatsappNumber}`;
      } else if (values.whatsappAreaCode) {
        whatsappNumber = values.whatsappAreaCode;
      } else if (values.whatsappNumber) {
        whatsappNumber = values.whatsappNumber;
      }

      // 根据选中的地区名称找到对应的区号
      const selectedArea = areaCodeOptions.find(option => option.value === values.areaCode);
      const regionCode = selectedArea?.areaCode || values.areaCode;

      // 准备提交数据
      const submitData = {
        name: values.name,
        phone: values.phone,
        idType: values.idType,
        idNumber: values.idNumber,
        gender: values.gender.toUpperCase(),
        region: regionCode, // 保存区号（如+86）
        siteId: siteId,
        distributorId: distributorId,
        birthDate: values.birthDate ? values.birthDate.format('YYYY-MM-DD') : null,
        email: values.email || null,
        whatsapp: whatsappNumber
      };

      // 使用专门的工人自助注册API
      const response = await fetch(`${apiBaseUrl}/public/worker-registration/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        // 检查是否是手机号已存在的错误
        if (response.status === 409 && responseData.message && responseData.message.includes('手机号已存在')) {
          form.setFields([
            {
              name: 'phone',
              errors: [t('worker.phoneNumberExists') || '手机号已存在，请检查您的输入']
            }
          ]);
          return;
        } else {
          throw new Error(responseData.message || '注册失败');
        }
      }
      
      message.success(t('worker.registrationSuccessTitle'));
      setSubmitted(true);
      
      // 获取返回的工人ID并生成二维码
      if (responseData.workerId) {
        setWorkerId(responseData.workerId);
        setWorkerName(values.name);
        generateQRCode(responseData.workerId);
      }
    } catch (err) {
      console.error('提交信息失败:', err);
      message.error(t('messages.operationFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  // 如果出现错误
  if (error) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <Result
          status="error"
          title={t('common.error') || '加载失败'}
          subTitle={error}
          extra={[
            <Button type="primary" key="back" onClick={() => window.history.back()}>
              {t('common.back') || '返回'}
            </Button>
          ]}
        />
      </div>
    );
  }

  // 如果正在加载
  if (loading) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: '20px' }}>{t('common.loading') || '加载信息中...'}</div>
      </div>
    );
  }

  // 生成二维码
  const generateQRCode = async (id: string) => {
    if (!id) return;
    
    setQrLoading(true);
    try {
      // 生成只包含工人编号的二维码数据
      const qrText = id;
      
      // 生成二维码图片
      const dataUrl = await QRCode.toDataURL(qrText, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrCodeDataUrl(dataUrl);
    } catch (err) {
      console.error('QR Code generation error:', err);
    } finally {
      setQrLoading(false);
    }
  };
  
  // 下载二维码
  const handleDownloadQRCode = () => {
    if (!qrCodeDataUrl) return;
    
    const link = document.createElement('a');
    link.download = `${workerName || 'worker'}_qrcode.png`;
    link.href = qrCodeDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success(t('qrcode.downloadSuccess') || '二维码下载成功！');
  };

  // 如果提交成功
  if (submitted) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <Result
          status="success"
          title={t('worker.registrationSuccessTitle') || '信息提交成功！'}
          subTitle={t('worker.registrationSuccessDesc') || '您的信息已成功提交，请等待管理员审核。'}
          extra={[
            <div key="qrcode" style={{ textAlign: 'center', marginBottom: '20px' }}>
              {qrLoading ? (
                <Spin size="large" tip={t('qrcode.generateQR') || '正在生成二维码...'} />
              ) : qrCodeDataUrl ? (
                <div>
                  <div style={{ marginBottom: '20px' }}>
                    <img
                      src={qrCodeDataUrl}
                      alt={t('qrcode.qrCodeAlt') || '工人二维码'}
                      style={{
                        width: '200px',
                        height: 'auto',
                        border: '1px solid #d9d9d9',
                        borderRadius: '8px'
                      }}
                    />
                  </div>
                  <Button 
                    type="primary" 
                    icon={<DownloadOutlined />}
                    onClick={handleDownloadQRCode}
                    style={{ marginBottom: '20px' }}
                  >
                    {t('qrcode.downloadQR') || '下载二维码'}
                  </Button>
                  <div style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                    {t('qrcode.qrDescription1') || '• 此二维码包含您的基本工作信息'}<br/>
                    {t('qrcode.qrDescription2') || '• 保安可扫描此二维码进行入场登记'}<br/>
                    {t('qrcode.qrDescription3') || '• 二维码数据已加密以保证安全'}
                  </div>
                </div>
              ) : null}
            </div>,
            <Button type="primary" key="close" onClick={() => window.close()}>
              {t('common.close') || '关闭页面'}
            </Button>
          ]}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <Title level={3} style={{ margin: 0 }}>
            {t('worker.selfRegistration') || '工人信息自助登记'}
          </Title>
          
          <div className="language-switch">
            <Radio.Group 
              value={locale} 
              onChange={handleLanguageChange}
              buttonStyle="solid"
              size="small"
            >
              <Radio.Button value="zh-CN">简体中文</Radio.Button>
              <Radio.Button value="zh-TW">繁體中文</Radio.Button>
              <Radio.Button value="en-US">English</Radio.Button>
            </Radio.Group>
          </div>
        </div>

        {distributorInfo && siteInfo && (
          <Alert
            message={
              <div>
                <div>{t('worker.distributor') || '分判商'}: <Text strong>{distributorInfo.name}</Text></div>
                <div>{t('worker.site') || '工地'}: <Text strong>{siteInfo.name}</Text></div>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: '24px' }}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark={true}
          initialValues={{
            areaCode: getDefaultAreaCode(),
            whatsappAreaCode: areaCodeOptions.find(option => option.value === getDefaultAreaCode())?.areaCode || '+86'
          }}
        >
          <Form.Item
            name="name"
            label={t('worker.name') || '姓名'}
            rules={[{ required: true, message: t('form.required') || '请输入姓名' }]}
          >
            <Input placeholder={t('form.inputPlaceholder') + (t('worker.name') || '姓名')} />
          </Form.Item>

          <Form.Item
            name="gender"
            label={t('worker.gender') || '性别'}
            rules={[{ required: true, message: t('form.required') || '请选择性别' }]}
          >
            <Select placeholder={t('form.selectPlaceholder') + (t('worker.gender') || '性别')}>
              <Option value="male">{t('worker.male') || '男'}</Option>
              <Option value="female">{t('worker.female') || '女'}</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="areaCode"
            label={t('distributor.areaCode') || '地区'}
            rules={[{ required: true, message: t('form.required') || '请选择地区' }]}
          >
            <Select 
              placeholder={t('form.selectPlaceholder') + (t('distributor.areaCode') || '地区')}
              showSearch
              onChange={(value) => {
                // 清除之前的定时器
                if (areaDebounceRef.current) {
                  clearTimeout(areaDebounceRef.current);
                }
                
                // 设置新的防抖定时器（500ms）
                areaDebounceRef.current = setTimeout(() => {
                  // 根据选中的地区名称找到对应的区号
                  const selectedArea = areaCodeOptions.find(option => option.value === value);
                  const areaCode = selectedArea?.areaCode;
                  
                  // 只在第一次选择时同步到WhatsApp区号
                  if (!areaSynced && areaCode) {
                    form.setFieldsValue({
                      whatsappAreaCode: areaCode
                    });
                    setAreaSynced(true);
                  }
                }, 500);
              }}
              filterOption={(input, option) =>
                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
              }
            >
              {areaCodeOptions.map(option => (
                <Option key={option.value} value={option.value} label={option.label}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="idType"
            label={t('worker.idType') || '证件类型'}
            rules={[{ required: true, message: t('form.required') || '请选择证件类型' }]}
            initialValue="ID_CARD"
          >
            <Select placeholder={t('form.selectPlaceholder') + (t('worker.idType') || '证件类型')}>
              <Option value="ID_CARD">{t('worker.idCard') || '身份证'}</Option>
              <Option value="PASSPORT">{t('worker.passport') || '护照'}</Option>
              <Option value="DRIVER_LICENSE">{t('worker.driverLicense') || '驾驶证'}</Option>
              <Option value="OTHER">{t('worker.other') || '其他'}</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="idNumber"
            label={t('worker.idNumber') || '证件号码'}
            rules={[
              { required: true, message: t('form.required') || '请输入证件号码' },
              {
                validator: async (_, value) => {
                  if (!value) return Promise.resolve();
                  
                  // 检查身份证号是否已存在
                  const exists = await checkIdNumberExists(value);
                  if (exists) {
                    return Promise.reject(t('worker.idNumberExists') || '证件号码已存在，请检查您的输入');
                  }
                  return Promise.resolve();
                }
              }
            ]}
            validateTrigger={['onBlur']}
            hasFeedback
          >
            <Input 
              placeholder={t('form.inputPlaceholder') + (t('worker.idNumber') || '证件号码')}
              disabled={idNumberChecking}
            />
          </Form.Item>

          <Form.Item
            name="birthDate"
            label={t('worker.birthDate') || '出生日期'}
          >
            <DatePicker 
              style={{ width: '100%' }} 
              placeholder={(t('form.selectPlaceholder') || '请选择') + (t('worker.birthDate') || '出生日期') + '（' + (t('form.optional') || '可选') + '）'} 
            />
          </Form.Item>
          
          <Form.Item
            name="phone"
            label={t('worker.phone') || '手机号码'}
            rules={[{ required: true, message: t('form.required') || '请输入手机号码' }]}
          >
            <Input 
              placeholder={t('form.inputPlaceholder') + (t('worker.phone') || '手机号码')} 
              onChange={handlePhoneChange}
            />
          </Form.Item>

          <Form.Item
            name="whatsapp"
            label={t('worker.whatsapp') || 'WhatsApp'}
            // help={t('distributor.whatsappPlaceholder') || '例如: +86 13800138000'}
          >
            <Input.Group compact>
              <Form.Item
                name="whatsappAreaCode"
                noStyle
                rules={[{ required: false }]}
              >
                <Select
                  style={{ width: '40%' }}
                  placeholder={t('worker.whatsappAreaCode') || '区号'}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {areaCodeOptions.map(option => (
                    <Option key={option.areaCode} value={option.areaCode} label={option.label}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item
                name="whatsappNumber"
                noStyle
                rules={[{ required: false }]}
              >
                <Input
                  style={{ width: '60%' }}
                  placeholder={t('worker.whatsappNumberPlaceholder') || '请输入WhatsApp号码'}
                />
              </Form.Item>
            </Input.Group>
          </Form.Item>

          <Form.Item
            name="email"
            label={t('worker.email') || '邮箱'}
            rules={[
              { 
                type: 'email',
                message: t('form.invalidEmail') || '邮箱格式不正确'
              }
            ]}
          >
            <Input placeholder={(t('form.inputPlaceholder') || '请输入') + (t('worker.email') || '邮箱') + '（' + (t('form.optional') || '可选') + '）'} />
          </Form.Item>


          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={submitting}
              block
            >
              {t('common.submit') || '提交信息'}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default WorkerSelfRegistration;
