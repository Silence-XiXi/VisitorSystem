import React, { useMemo, useState } from 'react'
import { Card, Tabs, Table, Button, Space, Modal, Form, Input, Select, Tag, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { Distributor, Site } from '../types/worker'
import { mockDistributors, mockSites } from '../data/mockData'
import { useLocale } from '../contexts/LocaleContext'

const { TabPane } = Tabs as any

const Admin: React.FC = () => {
  const { t } = useLocale()
  const [sites, setSites] = useState<Site[]>(mockSites)
  const [dists, setDists] = useState<Distributor[]>(mockDistributors)

  const [siteModalOpen, setSiteModalOpen] = useState(false)
  const [distModalOpen, setDistModalOpen] = useState(false)
  const [editingSite, setEditingSite] = useState<Site | null>(null)
  const [editingDist, setEditingDist] = useState<Distributor | null>(null)
  const [form] = Form.useForm()

  const resetAndClose = () => {
    form.resetFields()
    setEditingSite(null)
    setEditingDist(null)
    setSiteModalOpen(false)
    setDistModalOpen(false)
  }

  const siteColumns = [
    { title: t('admin.siteId'), dataIndex: 'id', key: 'id', width: 100 },
    { title: t('admin.siteName'), dataIndex: 'name', key: 'name', width: 160 },
    { title: t('admin.siteAddress'), dataIndex: 'address', key: 'address' },
    { title: t('admin.siteManager'), dataIndex: 'manager', key: 'manager', width: 120 },
    { title: t('admin.sitePhone'), dataIndex: 'phone', key: 'phone', width: 140 },
    { title: t('admin.siteStatus'), dataIndex: 'status', key: 'status', width: 100, render: (s?: string) => {
      const map: any = { 
        active: { color: 'green', text: t('admin.siteActive') }, 
        inactive: { color: 'red', text: t('admin.siteInactive') }, 
        suspended: { color: 'orange', text: t('admin.siteSuspended') } 
      }
      const cfg = map[s || 'active']
      return <Tag color={cfg.color}>{cfg.text}</Tag>
    } },
    { title: t('common.actions'), key: 'actions', width: 160, render: (_: any, record: Site) => (
      <Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingSite(record); form.setFieldsValue(record); setSiteModalOpen(true) }}>{t('common.edit')}</Button>
        <Button danger size="small" icon={<DeleteOutlined />} onClick={() => setSites(prev => prev.filter(s => s.id !== record.id))}>{t('admin.deleteSite')}</Button>
      </Space>
    )}
  ]

  const distColumns = [
    { title: t('admin.distributorId'), dataIndex: 'id', key: 'id', width: 100 },
    { title: t('admin.distributorName'), dataIndex: 'name', key: 'name', width: 160 },
    { title: t('admin.distributorContact'), dataIndex: 'contactName', key: 'contactName', width: 120 },
    { title: t('admin.distributorPhone'), dataIndex: 'phone', key: 'phone', width: 140 },
    { title: t('admin.distributorEmail'), dataIndex: 'email', key: 'email', width: 180 },
    { title: t('admin.distributorAccount'), dataIndex: 'accountUsername', key: 'accountUsername', width: 140 },
    { title: t('admin.distributorAccountStatus'), dataIndex: 'accountStatus', key: 'accountStatus', width: 100, render: (s?: string) => {
      const map: any = { 
        active: { color: 'green', text: t('admin.distributorActive') }, 
        disabled: { color: 'red', text: t('admin.distributorDisabled') } 
      }
      const cfg = map[s || 'active']
      return <Tag color={cfg.color}>{cfg.text}</Tag>
    } },
    { title: t('common.actions'), key: 'actions', width: 160, render: (_: any, record: Distributor) => (
      <Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingDist(record); form.setFieldsValue(record); setDistModalOpen(true) }}>{t('common.edit')}</Button>
        <Button danger size="small" icon={<DeleteOutlined />} onClick={() => setDists(prev => prev.filter(d => d.id !== record.id))}>{t('admin.deleteDistributor')}</Button>
      </Space>
    )}
  ]

  const onSubmitSite = async () => {
    const v = await form.validateFields()
    if (editingSite) {
      setSites(prev => prev.map(s => s.id === editingSite.id ? { ...editingSite, ...v } : s))
      message.success(t('admin.siteUpdated'))
    } else {
      const newItem: Site = { id: (Date.now()).toString(), code: v.code || '', name: v.name, address: v.address, manager: v.manager, phone: v.phone, status: v.status }
      setSites(prev => [newItem, ...prev])
      message.success(t('admin.siteAdded'))
    }
    resetAndClose()
  }

  const onSubmitDist = async () => {
    const v = await form.validateFields()
    if (editingDist) {
      setDists(prev => prev.map(d => d.id === editingDist.id ? { ...editingDist, ...v } : d))
      message.success(t('admin.distributorUpdated'))
    } else {
      const newItem: Distributor = { id: (Date.now()).toString(), code: v.code || '', name: v.name, contactName: v.contactName, phone: v.phone, email: v.email, accountUsername: v.accountUsername, accountStatus: v.accountStatus }
      setDists(prev => [newItem, ...prev])
      message.success(t('admin.distributorAdded').replace('{username}', newItem.accountUsername || '-').replace('{password}', 'Pass@123'))
    }
    resetAndClose()
  }

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Tabs defaultActiveKey="sites">
          <TabPane tab={t('admin.siteManagement')} key="sites">
            <Space style={{ marginBottom: 12 }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingSite(null); form.resetFields(); setSiteModalOpen(true) }}>{t('admin.addSite')}</Button>
            </Space>
            <Table rowKey="id" columns={siteColumns} dataSource={sites} pagination={{ pageSize: 10, showSizeChanger: true }} />
          </TabPane>
          <TabPane tab={t('admin.distributorManagement')} key="dists">
            <Space style={{ marginBottom: 12 }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingDist(null); form.resetFields(); setDistModalOpen(true) }}>{t('admin.addDistributor')}</Button>
            </Space>
            <Table rowKey="id" columns={distColumns} dataSource={dists} pagination={{ pageSize: 10, showSizeChanger: true }} />
          </TabPane>
        </Tabs>
      </Card>

      <Modal title={editingSite ? t('admin.editSite') : t('admin.addSite')} open={siteModalOpen} onCancel={resetAndClose} onOk={onSubmitSite} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('admin.nameLabel')} rules={[{ required: true, message: t('admin.nameRequired') }]}>
            <Input placeholder={t('admin.siteNamePlaceholder')} />
          </Form.Item>
          <Form.Item name="code" label={t('admin.codeLabel')}>
            <Input placeholder={t('admin.codePlaceholder')} />
          </Form.Item>
          <Form.Item name="address" label={t('admin.addressLabel')} rules={[{ required: true, message: t('admin.addressRequired') }]}>
            <Input placeholder={t('admin.addressPlaceholder')} />
          </Form.Item>
          <Form.Item name="manager" label={t('admin.managerLabel')}>
            <Input placeholder={t('admin.managerPlaceholder')} />
          </Form.Item>
          <Form.Item name="phone" label={t('admin.phoneLabel')}>
            <Input placeholder={t('admin.phonePlaceholder')} />
          </Form.Item>
          <Form.Item name="status" label={t('admin.statusLabel')} initialValue={'active'}>
            <Select options={[
              { value: 'active', label: t('admin.siteActive') }, 
              { value: 'suspended', label: t('admin.siteSuspended') }, 
              { value: 'inactive', label: t('admin.siteInactive') }
            ]} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={editingDist ? t('admin.editDistributor') : t('admin.addDistributor')} open={distModalOpen} onCancel={resetAndClose} onOk={onSubmitDist} destroyOnClose>
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
          <Form.Item name="phone" label={t('admin.phoneLabel')}>
            <Input placeholder={t('admin.phonePlaceholder')} />
          </Form.Item>
          <Form.Item name="email" label={t('admin.emailLabel')}>
            <Input placeholder={t('admin.emailPlaceholder')} />
          </Form.Item>
          <Form.Item name="accountUsername" label={t('admin.accountLabel')}>
            <Input placeholder={t('admin.accountPlaceholder')} />
          </Form.Item>
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

export default Admin


