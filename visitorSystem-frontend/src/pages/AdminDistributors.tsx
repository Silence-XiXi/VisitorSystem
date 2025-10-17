import React, { useState } from 'react'
import { Card, Table, Button, Space, Modal, Form, Input, Select, Tag, message, Row, Col } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { Distributor, Site } from '../types/worker'
import { mockDistributors, mockSites } from '../data/mockData'
import { useLocale } from '../contexts/LocaleContext'

const AdminDistributors: React.FC = () => {
  const { t } = useLocale()
  const [dists, setDists] = useState<Distributor[]>(mockDistributors)
  const [sites] = useState<Site[]>(mockSites)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Distributor | null>(null)
  const [form] = Form.useForm()
  // 多选筛选与关键词
  const [statusFilters, setStatusFilters] = useState<string[]>([])
  const [siteFilters, setSiteFilters] = useState<string[]>([])
  const [keyword, setKeyword] = useState<string>('')

  const handleResetPassword = (record: Distributor) => {
    Modal.confirm({
      title: t('admin.resetPasswordTitle'),
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>{t('admin.resetPasswordConfirm').replace('{name}', record.name)}</p>
          <p style={{ color: '#999' }}>{t('admin.resetPasswordTip')}</p>
        </div>
      ),
      okText: t('admin.confirm'),
      cancelText: t('admin.cancel'),
      onOk: () => {
        // TODO: 调用后端API执行重置
        message.success(t('admin.resetPasswordSuccess').replace('{name}', record.name))
      }
    })
  }

  const columns = [
    { title: t('admin.distributorId'), dataIndex: 'id', key: 'id', width: 100 },
    { title: t('admin.distributorName'), dataIndex: 'name', key: 'name', width: 160 },
    { title: t('admin.distributorContact'), dataIndex: 'contactName', key: 'contactName', width: 120 },
    { title: t('admin.distributorPhone'), dataIndex: 'phone', key: 'phone', width: 140 },
    { title: t('admin.distributorEmail'), dataIndex: 'email', key: 'email', width: 200 },
    { title: t('admin.distributorSite'), dataIndex: 'siteIds', key: 'siteIds', width: 160, render: (v?: string[]) => (v && v.length > 0 ? sites.filter(s => v.includes(s.id)).map(s => s.name).join(', ') : '-') },
    { title: t('admin.distributorAccount'), dataIndex: 'accountUsername', key: 'accountUsername', width: 140 },
    { title: t('admin.distributorAccountStatus'), dataIndex: 'accountStatus', key: 'accountStatus', width: 100, render: (s?: string) => {
      const map: any = { 
        active: { color: 'green', text: t('admin.distributorActive') }, 
        disabled: { color: 'red', text: t('admin.distributorDisabled') } 
      }
      const cfg = map[s || 'active']
      return <Tag color={cfg.color}>{cfg.text}</Tag>
    } },
    { title: t('common.actions'), key: 'actions', width: 240, render: (_: any, record: Distributor) => (
      <Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => { setEditing(record); form.setFieldsValue(record); setOpen(true) }}>{t('common.edit')}</Button>
        <Button size="small" icon={<KeyOutlined />} onClick={() => handleResetPassword(record)}>{t('admin.resetPassword')}</Button>
        <Button danger size="small" icon={<DeleteOutlined />} onClick={() => setDists(prev => prev.filter(d => d.id !== record.id))}>{t('admin.deleteDistributor')}</Button>
      </Space>
    )}
  ]

  // 过滤列表
  const filteredDists = React.useMemo(() => {
    return dists.filter(d => {
      if (statusFilters.length > 0 && !statusFilters.includes(d.accountStatus || 'active')) return false
      if (siteFilters.length > 0 && (!d.siteIds || !d.siteIds.some(siteId => siteFilters.includes(siteId)))) return false
      if (keyword.trim()) {
        const k = keyword.trim().toLowerCase()
        const text = `${d.name || ''} ${d.contactName || ''}`.toLowerCase()
        if (!text.includes(k)) return false
      }
      return true
    })
  }, [dists, statusFilters, siteFilters, keyword])

  const onSubmit = async () => {
    const v = await form.validateFields()
    if (editing) {
      setDists(prev => prev.map(d => d.id === editing.id ? { ...editing, ...v } : d))
      message.success(t('admin.distributorUpdated'))
    } else {
      const defaultPwd = v.defaultPassword && String(v.defaultPassword).trim() ? String(v.defaultPassword).trim() : 'Pass@123'
      const newItem: Distributor = { id: (Date.now()).toString(), name: v.name, siteIds: v.siteId ? [v.siteId] : [], contactName: v.contactName, phone: v.phone, email: v.email, accountUsername: v.accountUsername, accountStatus: v.accountStatus }
      setDists(prev => [newItem, ...prev])
      // message.success(t('admin.distributorAdded').replace('{username}', newItem.accountUsername || '-').replace('{password}', defaultPwd))
      message.success(t('admin.distributorAdded'))
    }
    setOpen(false)
    setEditing(null)
    form.resetFields()
  }

  return (
    <div style={{ padding: 24 }}>
      <Card title={t('admin.distributorManagement')} extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setOpen(true) }}>{t('admin.addDistributor')}</Button>}>
        <Row gutter={12} style={{ marginBottom: 12 }}>
          <Col span={8}>
            <Input placeholder={t('admin.keywordPlaceholder')} value={keyword} onChange={e => setKeyword(e.target.value)} allowClear />
          </Col>
          <Col span={8}>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder={t('admin.statusFilterPlaceholder')}
              value={statusFilters}
              onChange={setStatusFilters}
              options={[
                { value: 'active', label: t('admin.distributorActive') }, 
                { value: 'disabled', label: t('admin.distributorDisabled') }
              ]}
              allowClear
            />
          </Col>
          <Col span={8}>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder={t('admin.siteFilterPlaceholder')}
              value={siteFilters}
              onChange={setSiteFilters}
              options={sites.map(s => ({ value: s.id, label: s.name }))}
              allowClear
            />
          </Col>
        </Row>
        <Table rowKey="id" columns={columns} dataSource={filteredDists} pagination={{ pageSize: 10, showSizeChanger: true }} />
      </Card>

      <Modal title={editing ? t('admin.editDistributor') : t('admin.addDistributor')} open={open} onCancel={() => { setOpen(false); setEditing(null) }} onOk={onSubmit} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('admin.nameLabel')} rules={[{ required: true, message: t('admin.nameRequired') }]}>
            <Input placeholder={t('admin.distributorNamePlaceholder')} />
          </Form.Item>
          <Form.Item name="code" label={t('admin.codeLabel')}>
            <Input placeholder={t('admin.distributorCodePlaceholder')} />
          </Form.Item>
          <Form.Item name="contactName" label={t('admin.contactLabel')}>
            <Input placeholder={t('admin.contactPlaceholder')} />
          </Form.Item>
          <Form.Item name="siteId" label={t('admin.distributorSite')}>
            <Select placeholder={t('admin.selectSite')} options={sites.map(s => ({ value: s.id, label: s.name }))} />
          </Form.Item>
          <Form.Item name="phone" label={t('admin.phoneLabel')}>
            <Input placeholder={t('admin.phonePlaceholder')} />
          </Form.Item>
          <Form.Item name="email" label={t('admin.emailLabel')}>
            <Input placeholder={t('admin.emailPlaceholder')} />
          </Form.Item>
          <Form.Item name="accountUsername" label={t('admin.accountLabel')}>
            <Input placeholder={t('admin.accountPlaceholder')} />
          </Form.Item>
          {!editing && (
            <Form.Item name="defaultPassword" label={t('admin.defaultPasswordLabel')} tooltip={t('admin.defaultPasswordTooltip')}>
              <Input.Password placeholder={t('admin.defaultPasswordPlaceholder')} />
            </Form.Item>
          )}
          <Form.Item name="accountStatus" label={t('admin.accountStatusLabel')} initialValue={'active'}>
            <Select options={[
              { value: 'active', label: t('admin.distributorActive') }, 
              { value: 'disabled', label: t('admin.distributorDisabled') }
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default AdminDistributors


