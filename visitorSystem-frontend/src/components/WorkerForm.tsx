import { useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import { Form, Input, Select, Button, message, Row, Col, DatePicker } from 'antd';
import { PhoneOutlined, MailOutlined, WhatsAppOutlined, IdcardOutlined, CalendarOutlined } from '@ant-design/icons';
import { Worker, CreateWorkerRequest, UpdateWorkerRequest, Distributor, Site } from '../types/worker';
import { useLocale } from '../contexts/LocaleContext';
import { apiService } from '../services/api';
import dayjs, { Dayjs } from 'dayjs';

const { Option } = Select;

interface WorkerFormProps {
  worker?: Worker;
  distributors: Distributor[];
  sites?: Site[]; // 改为可选，因为现在从API获取
  onSubmit: (values: CreateWorkerRequest | UpdateWorkerRequest) => void;
  onCancel: () => void;
  loading?: boolean;
  showButtons?: boolean;
  selectedSiteId?: string;
  isDistributorForm?: boolean; // 新增属性，标识是否为分销商表单
}

export interface WorkerFormRef {
  submit: () => void;
}


const WorkerForm = forwardRef<WorkerFormRef, WorkerFormProps>(({
  worker,
  distributors,
  sites,
  onSubmit,
  onCancel,
  loading = false,
  showButtons = true,
  selectedSiteId,
  isDistributorForm = false
}, ref) => {
  const { t } = useLocale();
  const [form] = Form.useForm();
  const isEdit = !!worker;
  const [sitesData, setSitesData] = useState<Site[]>(sites || []);
  const [sitesLoading, setSitesLoading] = useState(false);

  useImperativeHandle(ref, () => ({
    submit: () => {
      form.submit();
    }
  }));

  // 加载工地数据
  useEffect(() => {
    const loadSites = async () => {
      if (isDistributorForm && (!sites || sites.length === 0)) {
        setSitesLoading(true);
        try {
          const sitesFromApi = await apiService.getDistributorSites();
          setSitesData(sitesFromApi);
        } catch (error) {
          console.error('加载工地数据失败:', error);
          message.error('加载工地数据失败');
        } finally {
          setSitesLoading(false);
        }
      } else if (sites) {
        setSitesData(sites);
      }
    };

    loadSites();
  }, [isDistributorForm, sites]);


  useEffect(() => {
    if (worker) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { workerId, ...workerData } = worker;
      form.setFieldsValue({
        ...workerData,
        birthDate: worker.birthDate ? dayjs(worker.birthDate) : undefined,
        region: worker.region // 直接使用数据库原始值
      });
    } else if (selectedSiteId) {
      // 新增工人时，默认选择当前全局筛选的工地
      form.setFieldsValue({
        siteId: selectedSiteId
      });
    }
  }, [worker, form, selectedSiteId, t]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    console.log('WorkerForm handleSubmit called with values:', values);
    try {
      const birthDateStr: string | undefined = values.birthDate ? (values.birthDate as Dayjs).format('YYYY-MM-DD') : undefined;

      const formData: CreateWorkerRequest | UpdateWorkerRequest = {
        ...values,
        birthDate: birthDateStr
      } as CreateWorkerRequest | UpdateWorkerRequest;
      
      // 移除workerId字段，因为现在由后端自动生成
      if ('workerId' in formData) {
        delete (formData as Record<string, unknown>).workerId;
      }
      
      console.log('Processed formData:', formData);
      console.log('isEdit:', isEdit);
      
      if (isEdit) {
        console.log('Calling onSubmit for edit with id:', worker!.id);
        await onSubmit({ ...formData, id: worker!.id } as UpdateWorkerRequest);
      } else {
        console.log('Calling onSubmit for create');
        await onSubmit(formData as CreateWorkerRequest);
      }
      
      // 只有在没有错误的情况下才显示成功消息和重置表单
      message.success(t(isEdit ? 'worker.updateSuccess' : 'worker.createSuccess'));
      form.resetFields();
    } catch (error: unknown) {
      console.error('WorkerForm handleSubmit error:', error);
      
      // 检查是否是身份证号重复错误
      if (error && typeof error === 'object' && 'message' in error && 
          typeof error.message === 'string' && error.message.includes('身份证号已存在')) {
        message.error('身份证号已存在');
      } else if (error && typeof error === 'object' && 'message' in error && 
                 typeof error.message === 'string' && error.message.includes('工人编号已存在')) {
        message.error('工人编号已存在');
      } else {
        message.error(t(isEdit ? 'worker.updateFailed' : 'worker.createFailed'));
      }
    }
  };


  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{ status: 'ACTIVE', gender: 'MALE' }}
      className="worker-form"
    >
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="name"
            label={t('worker.name')}
            rules={[{ required: true, message: t('form.required') }]}
          >
            <Input placeholder={t('form.inputPlaceholder') + t('worker.name')} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="gender"
            label={t('worker.gender')}
            rules={[{ required: true, message: t('form.required') }]}
          >
            <Select placeholder={t('form.selectPlaceholder') + t('worker.gender')}>
              <Option value="MALE">{t('worker.male')}</Option>
              <Option value="FEMALE">{t('worker.female')}</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="idCard"
            label={t('worker.idCard')}
            rules={[
              { required: true, message: t('form.required') }
            ]}
          >
            <Input placeholder={t('form.inputPlaceholder') + t('worker.idCard')} prefix={<IdcardOutlined />} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="birthDate"
            label={t('worker.birthDate')}
          >
            <DatePicker style={{ width: '100%' }} placeholder={t('form.selectPlaceholder') + t('worker.birthDate')} suffixIcon={<CalendarOutlined />} format="YYYY-MM-DD" />
          </Form.Item>
        </Col>
        {/* 隐藏实体卡编号字段 */}
        {/* <Col span={12}>
          <Form.Item
            name="physicalCardId"
            label={t('worker.physicalCardId')}
            tooltip={t('worker.physicalCardHint')}
          >
            <Input placeholder={t('form.inputPlaceholder') + t('worker.physicalCardId')} prefix={<CreditCardOutlined />} />
          </Form.Item>
        </Col> */}
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="region"
            label={t('worker.region')}
          >
            <Select placeholder={t('form.selectPlaceholder') + t('worker.region')}>
              <Option value={t('regions.mainland')}>{t('regions.mainland')}</Option>
              <Option value={t('regions.hongkong')}>{t('regions.hongkong')}</Option>
              <Option value={t('regions.macau')}>{t('regions.macau')}</Option>
              <Option value={t('regions.taiwan')}>{t('regions.taiwan')}</Option>
              <Option value={t('regions.other')}>{t('regions.other')}</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="distributorId"
            label={t('worker.distributor')}
            rules={[{ required: true, message: t('form.required') }]}
          >
            <Select placeholder={t('form.selectPlaceholder') + t('worker.distributor')}>
              {distributors.map(dist => (
                <Option key={dist.id} value={dist.id}>{dist.name}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="siteId"
            label={t('worker.site')}
            rules={[{ required: true, message: t('form.required') }]}
          >
            <Select 
              placeholder={t('form.selectPlaceholder') + t('worker.site')}
              loading={sitesLoading}
            >
              {sitesData.map(site => (
                <Option key={site.id} value={site.id}>{site.name}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="phone"
            label={t('worker.phone')}
            rules={[
              { required: true, message: t('form.required') }
            ]}
          >
            <Input placeholder={t('form.inputPlaceholder') + t('worker.phone')} prefix={<PhoneOutlined />} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="whatsapp"
            label={t('worker.whatsapp')}
          >
            <Input placeholder={t('form.inputPlaceholder') + t('worker.whatsapp')} prefix={<WhatsAppOutlined />} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="email"
            label={t('worker.email')}
            rules={[
              { type: 'email', message: t('form.invalidEmail') }
            ]}
          >
            <Input placeholder={t('form.inputPlaceholder') + t('worker.email')} prefix={<MailOutlined />} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="status"
            label={t('worker.status')}
            rules={[{ required: true, message: t('form.required') }]}
          >
            <Select placeholder={t('form.selectPlaceholder') + t('worker.status')}>
              <Option value="ACTIVE">{t('worker.active')}</Option>
              <Option value="INACTIVE">{t('worker.inactive')}</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>


      {showButtons && (
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} style={{ marginRight: 8 }}>
            {isEdit ? t('common.save') : t('common.add')}
          </Button>
          <Button onClick={onCancel}>{t('common.cancel')}</Button>
        </Form.Item>
      )}
    </Form>
  );
});

WorkerForm.displayName = 'WorkerForm';

export default WorkerForm;
