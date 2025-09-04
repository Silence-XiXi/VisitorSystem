import React, { useMemo, useState } from 'react'
import { Card, Tabs, Table, Button, Space, Modal, Form, Input, Select, Tag, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { Distributor, Site } from '../types/worker'
import { mockDistributors, mockSites } from '../data/mockData'

const { TabPane } = Tabs as any

const Admin: React.FC = () => {
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
    { title: '工地ID', dataIndex: 'id', key: 'id', width: 100 },
    { title: '名称', dataIndex: 'name', key: 'name', width: 160 },
    { title: '地址', dataIndex: 'address', key: 'address' },
    { title: '负责人', dataIndex: 'manager', key: 'manager', width: 120 },
    { title: '联系电话', dataIndex: 'phone', key: 'phone', width: 140 },
    { title: '状态', dataIndex: 'status', key: 'status', width: 100, render: (s?: string) => {
      const map: any = { active: { color: 'green', text: '启用' }, inactive: { color: 'red', text: '停用' }, suspended: { color: 'orange', text: '暂停' } }
      const cfg = map[s || 'active']
      return <Tag color={cfg.color}>{cfg.text}</Tag>
    } },
    { title: '操作', key: 'actions', width: 160, render: (_: any, record: Site) => (
      <Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingSite(record); form.setFieldsValue(record); setSiteModalOpen(true) }}>编辑</Button>
        <Button danger size="small" icon={<DeleteOutlined />} onClick={() => setSites(prev => prev.filter(s => s.id !== record.id))}>删除</Button>
      </Space>
    )}
  ]

  const distColumns = [
            { title: '分判商ID', dataIndex: 'id', key: 'id', width: 100 },
    { title: '名称', dataIndex: 'name', key: 'name', width: 160 },
    { title: '联系人', dataIndex: 'contactName', key: 'contactName', width: 120 },
    { title: '电话', dataIndex: 'phone', key: 'phone', width: 140 },
    { title: '邮箱', dataIndex: 'email', key: 'email', width: 180 },
    { title: '账号', dataIndex: 'accountUsername', key: 'accountUsername', width: 140 },
    { title: '账号状态', dataIndex: 'accountStatus', key: 'accountStatus', width: 100, render: (s?: string) => {
      const map: any = { active: { color: 'green', text: '启用' }, disabled: { color: 'red', text: '禁用' } }
      const cfg = map[s || 'active']
      return <Tag color={cfg.color}>{cfg.text}</Tag>
    } },
    { title: '操作', key: 'actions', width: 160, render: (_: any, record: Distributor) => (
      <Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingDist(record); form.setFieldsValue(record); setDistModalOpen(true) }}>编辑</Button>
        <Button danger size="small" icon={<DeleteOutlined />} onClick={() => setDists(prev => prev.filter(d => d.id !== record.id))}>删除</Button>
      </Space>
    )}
  ]

  const onSubmitSite = async () => {
    const v = await form.validateFields()
    if (editingSite) {
      setSites(prev => prev.map(s => s.id === editingSite.id ? { ...editingSite, ...v } : s))
      message.success('工地已更新')
    } else {
      const newItem: Site = { id: (Date.now()).toString(), code: v.code || '', name: v.name, address: v.address, manager: v.manager, phone: v.phone, status: v.status }
      setSites(prev => [newItem, ...prev])
      message.success('工地已新增')
    }
    resetAndClose()
  }

  const onSubmitDist = async () => {
    const v = await form.validateFields()
    if (editingDist) {
      setDists(prev => prev.map(d => d.id === editingDist.id ? { ...editingDist, ...v } : d))
              message.success('分判商已更新')
    } else {
      const newItem: Distributor = { id: (Date.now()).toString(), code: v.code || '', name: v.name, contactName: v.contactName, phone: v.phone, email: v.email, accountUsername: v.accountUsername, accountStatus: v.accountStatus }
      setDists(prev => [newItem, ...prev])
              message.success('分判商已新增')
    }
    resetAndClose()
  }

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Tabs defaultActiveKey="sites">
          <TabPane tab="工地管理" key="sites">
            <Space style={{ marginBottom: 12 }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingSite(null); form.resetFields(); setSiteModalOpen(true) }}>新增工地</Button>
            </Space>
            <Table rowKey="id" columns={siteColumns} dataSource={sites} pagination={{ pageSize: 10, showSizeChanger: true }} />
          </TabPane>
          <TabPane tab="分判商管理" key="dists">
            <Space style={{ marginBottom: 12 }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingDist(null); form.resetFields(); setDistModalOpen(true) }}>新增分判商</Button>
            </Space>
            <Table rowKey="id" columns={distColumns} dataSource={dists} pagination={{ pageSize: 10, showSizeChanger: true }} />
          </TabPane>
        </Tabs>
      </Card>

      <Modal title={editingSite ? '编辑工地' : '新增工地'} open={siteModalOpen} onCancel={resetAndClose} onOk={onSubmitSite} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="请输入工地名称" />
          </Form.Item>
          <Form.Item name="code" label="编码">
            <Input placeholder="例如：BJ-CBD-001" />
          </Form.Item>
          <Form.Item name="address" label="地址" rules={[{ required: true, message: '请输入地址' }]}>
            <Input placeholder="请输入工地地址" />
          </Form.Item>
          <Form.Item name="manager" label="负责人">
            <Input placeholder="责任人姓名" />
          </Form.Item>
          <Form.Item name="phone" label="联系电话">
            <Input placeholder="电话" />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue={'active'}>
            <Select options={[{ value: 'active', label: '启用' }, { value: 'suspended', label: '暂停' }, { value: 'inactive', label: '停用' }]} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={editingDist ? '编辑分判商' : '新增分判商'} open={distModalOpen} onCancel={resetAndClose} onOk={onSubmitDist} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="请输入分判商名称" />
          </Form.Item>
          <Form.Item name="code" label="编码">
            <Input placeholder="例如：BJ001" />
          </Form.Item>
          <Form.Item name="contactName" label="联系人">
            <Input placeholder="联系人姓名" />
          </Form.Item>
          <Form.Item name="phone" label="电话">
            <Input placeholder="联系电话" />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input placeholder="邮箱" />
          </Form.Item>
          <Form.Item name="accountUsername" label="账号">
            <Input placeholder="登录账号" />
          </Form.Item>
          <Form.Item name="accountStatus" label="账号状态" initialValue={'active'}>
            <Select options={[{ value: 'active', label: '启用' }, { value: 'disabled', label: '禁用' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Admin


