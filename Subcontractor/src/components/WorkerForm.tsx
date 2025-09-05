import React, { useEffect } from 'react';
import { Form, Input, Select, Upload, Button, message, Row, Col, DatePicker, Tooltip } from 'antd';
import type { UploadProps } from 'antd';
import { UploadOutlined, UserOutlined, PhoneOutlined, MailOutlined, WhatsAppOutlined, IdcardOutlined, CalendarOutlined, CreditCardOutlined } from '@ant-design/icons';
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

const WorkerForm: React.FC<WorkerFormProps> = ({
  worker,
  distributors,
  sites,
  onSubmit,
  onCancel,
  loading = false,
  showButtons = true
}) => {
  const { t } = useLocale();
  const [form] = Form.useForm();
  const isEdit = !!worker;

  useEffect(() => {
    if (worker) {
      form.setFieldsValue({
        ...worker,
        birthDate: worker.birthDate ? dayjs(worker.birthDate) : undefined,
        photo: worker.photo ? [{ url: worker.photo, uid: '-1', name: 'photo.jpg' }] : []
      });
    }
  }, [worker, form]);

  const handleSubmit = async (values: any) => {
    try {
      const birthDateStr: string | undefined = values.birthDate ? (values.birthDate as Dayjs).format('YYYY-MM-DD') : undefined;
      const computedAge = birthDateStr ? calcAgeFromBirth(birthDateStr) : undefined;

      const formData = {
        ...values,
        birthDate: birthDateStr,
        age: computedAge,
        photo: values.photo?.[0]?.url || values.photo?.[0]?.response?.url || ''
      };
      
      if (isEdit) {
        await onSubmit({ ...formData, id: worker!.id });
      } else {
        await onSubmit(formData);
      }
      
      message.success(t(isEdit ? 'worker.updateSuccess' : 'worker.createSuccess'));
      form.resetFields();
    } catch (error) {
      message.error(t(isEdit ? 'worker.updateFailed' : 'worker.createFailed'));
    }
  };

  const uploadProps: UploadProps = {
    name: 'file',
    action: '/api/upload',
    listType: 'picture-card',
    maxCount: 1,
    beforeUpload: (file: File) => {
      const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
      if (!isJpgOrPng) {
        message.error(t('worker.photoFormatLimit'));
        return false;
      }
      const isLt2M = file.size / 1024 / 1024 < 2;
      if (!isLt2M) {
        message.error(t('worker.photoSizeLimit'));
        return false;
      }
      return true;
    },
    onChange: (info: any) => {
      if (info.file.status === 'done') {
        message.success(t('worker.photoUploadSuccess'));
      } else if (info.file.status === 'error') {
        message.error(t('worker.photoUploadFailed'));
      }
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{ status: 'active', gender: 'male' }}
      className="worker-form"
    >
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="workerId"
            label={t('worker.workerId')}
            rules={[{ required: true, message: t('form.required') }]}
          >
            <Input placeholder={t('form.inputPlaceholder') + t('worker.workerId')} prefix={<UserOutlined />} />
          </Form.Item>
        </Col>
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
              <Option value="male">{t('worker.male')}</Option>
              <Option value="female">{t('worker.female')}</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="idCard"
            label={t('worker.idCard')}
            rules={[
              { required: true, message: t('form.required') },
              { pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/, message: t('form.invalidIdCard') }
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
            rules={[{ required: true, message: t('form.required') }]}
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
              { required: true, message: t('form.required') },
              { pattern: /^1[3-9]\d{9}$/, message: t('form.invalidPhone') }
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
            rules={[{ required: true, message: t('form.required') }]}
          >
            <Input placeholder={t('form.inputPlaceholder') + t('worker.whatsapp')} prefix={<WhatsAppOutlined />} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="email"
            label={t('worker.email')}
            rules={[
              { required: true, message: t('form.required') },
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
              <Option value="active">{t('worker.active')}</Option>
              <Option value="suspended">{t('worker.suspended')}</Option>
              <Option value="inactive">{t('worker.inactive')}</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name="photo"
        label={t('worker.photo')}
      >
        <Upload {...uploadProps}>
          <div>
            <UploadOutlined />
            <div style={{ marginTop: 8 }}>{t('worker.uploadPhoto')}</div>
          </div>
        </Upload>
      </Form.Item>

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
};

export default WorkerForm;
