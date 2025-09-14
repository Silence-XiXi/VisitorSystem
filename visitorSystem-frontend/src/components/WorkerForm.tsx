import React, { useEffect, forwardRef, useImperativeHandle } from 'react';
import { Form, Input, Select, Button, message, Row, Col, DatePicker, Tooltip } from 'antd';
import { UserOutlined, PhoneOutlined, MailOutlined, WhatsAppOutlined, IdcardOutlined, CalendarOutlined, CreditCardOutlined } from '@ant-design/icons';
import { Worker, CreateWorkerRequest, UpdateWorkerRequest, Distributor, Site } from '../types/worker';
import { useLocale } from '../contexts/LocaleContext';
import dayjs, { Dayjs } from 'dayjs';

const { Option } = Select;

interface WorkerFormProps {
  worker?: Worker;
  distributors: Distributor[];
  sites: Site[];
  onSubmit: (values: CreateWorkerRequest | UpdateWorkerRequest) => void;
  onCancel: () => void;
  loading?: boolean;
  showButtons?: boolean;
  selectedSiteId?: string;
}

export interface WorkerFormRef {
  submit: () => void;
}

const calcAgeFromBirth = (birthDate: string): number => {
  if (!birthDate) return 0;
  const b = dayjs(birthDate);
  const now = dayjs();
  let age = now.year() - b.year();
  if (now.month() < b.month() || (now.month() === b.month() && now.date() < b.date())) {
    age -= 1;
  }
  return Math.max(age, 0);
};

const WorkerForm = forwardRef<WorkerFormRef, WorkerFormProps>(({
  worker,
  distributors,
  sites,
  onSubmit,
  onCancel,
  loading = false,
  showButtons = true,
  selectedSiteId
}, ref) => {
  const { t } = useLocale();
  const [form] = Form.useForm();
  const isEdit = !!worker;

  useImperativeHandle(ref, () => ({
    submit: () => {
      form.submit();
    }
  }));

  useEffect(() => {
    if (worker) {
      const { workerId, ...workerData } = worker;
      form.setFieldsValue({
        ...workerData,
        birthDate: worker.birthDate ? dayjs(worker.birthDate) : undefined
      });
    } else if (selectedSiteId) {
      // 新增工人时，默认选择当前全局筛选的工地
      form.setFieldsValue({
        siteId: selectedSiteId
      });
    }
  }, [worker, form, selectedSiteId]);

  const handleSubmit = async (values: any) => {
    console.log('WorkerForm handleSubmit called with values:', values);
    try {
      const birthDateStr: string | undefined = values.birthDate ? (values.birthDate as Dayjs).format('YYYY-MM-DD') : undefined;

      const formData = {
        ...values,
        birthDate: birthDateStr
      };
      
      // 移除workerId字段，因为现在由后端自动生成
      delete formData.workerId;
      
      console.log('Processed formData:', formData);
      console.log('isEdit:', isEdit);
      
      if (isEdit) {
        console.log('Calling onSubmit for edit with id:', worker!.id);
        await onSubmit({ ...formData, id: worker!.id });
      } else {
        console.log('Calling onSubmit for create');
        await onSubmit(formData);
      }
      
      // 只有在没有错误的情况下才显示成功消息和重置表单
      message.success(t(isEdit ? 'worker.updateSuccess' : 'worker.createSuccess'));
      form.resetFields();
    } catch (error: any) {
      console.error('WorkerForm handleSubmit error:', error);
      
      // 检查是否是身份证号重复错误
      if (error?.message?.includes('身份证号已存在')) {
        message.error('身份证号已存在');
      } else if (error?.message?.includes('工人编号已存在')) {
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
              <Option value="中国大陆">{t('regions.mainland')}</Option>
              <Option value="中国香港">{t('regions.hongkong')}</Option>
              <Option value="中国澳门">{t('regions.macau')}</Option>
              <Option value="中国台湾">{t('regions.taiwan')}</Option>
              <Option value="其他">{t('regions.other')}</Option>
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
            <Select placeholder={t('form.selectPlaceholder') + t('worker.site')}>
              {sites.map(site => (
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
              <Option value="SUSPENDED">{t('worker.suspended')}</Option>
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
