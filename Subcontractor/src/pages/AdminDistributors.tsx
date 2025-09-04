import React, { useState } from 'react'
import { Card, Table, Button, Space, Modal, Form, Input, Select, Tag, message, Row, Col } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { Distributor, Site } from '../types/worker'
import { mockDistributors, mockSites } from '../data/mockData'

const AdminDistributors: React.FC = () => {
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
      title: '重置默认密码',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>确定要为分判商「{record.name}」重置密码吗？</p>
          <p style={{ color: '#999' }}>重置后默认密码将设置为 Pass@123，请尽快通知对方修改。</p>
        </div>
      ),
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        // TODO: 调用后端API执行重置
        message.success(`已为 ${record.name} 重置密码，默认密码：Pass@123`)
      }
    })
  }

  const columns = [
            { title: '分判商ID', dataIndex: 'id', key: 'id', width: 100 },
    { title: '名称', dataIndex: 'name', key: 'name', width: 160 },
    { title: '联系人', dataIndex: 'contactName', key: 'contactName', width: 120 },
    { title: '电话', dataIndex: 'phone', key: 'phone', width: 140 },
    { title: '邮箱', dataIndex: 'email', key: 'email', width: 200 },
    { title: '归属工地', dataIndex: 'siteId', key: 'siteId', width: 160, render: (v?: string) => (sites.find(s => s.id === v)?.name || '-') },
    { title: '账号', dataIndex: 'accountUsername', key: 'accountUsername', width: 140 },
    { title: '账号状态', dataIndex: 'accountStatus', key: 'accountStatus', width: 100, render: (s?: string) => {
      const map: any = { active: { color: 'green', text: '启用' }, disabled: { color: 'red', text: '禁用' } }
      const cfg = map[s || 'active']
      return <Tag color={cfg.color}>{cfg.text}</Tag>
    } },
    { title: '操作', key: 'actions', width: 240, render: (_: any, record: Distributor) => (
      <Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => { setEditing(record); form.setFieldsValue(record); setOpen(true) }}>编辑</Button>
        <Button size="small" icon={<KeyOutlined />} onClick={() => handleResetPassword(record)}>重置密码</Button>
        <Button danger size="small" icon={<DeleteOutlined />} onClick={() => setDists(prev => prev.filter(d => d.id !== record.id))}>删除</Button>
      </Space>
    )}
  ]

  // 过滤列表
  const filteredDists = React.useMemo(() => {
    return dists.filter(d => {
      if (statusFilters.length > 0 && !statusFilters.includes(d.accountStatus || 'active')) return false
      if (siteFilters.length > 0 && (!d.siteId || !siteFilters.includes(d.siteId))) return false
      if (keyword.trim()) {
        const k = keyword.trim().toLowerCase()
        const text = `${d.name || ''} ${d.code || ''} ${d.contactName || ''}`.toLowerCase()
        if (!text.includes(k)) return false
      }
      return true
    })
  }, [dists, statusFilters, siteFilters, keyword])

  const onSubmit = async () => {
    const v = await form.validateFields()
    if (editing) {
      setDists(prev => prev.map(d => d.id === editing.id ? { ...editing, ...v } : d))
              message.success('分判商已更新')
    } else {
      const defaultPwd = v.defaultPassword && String(v.defaultPassword).trim() ? String(v.defaultPassword).trim() : 'Pass@123'
      const newItem: Distributor = { id: (Date.now()).toString(), code: v.code || '', name: v.name, siteId: v.siteId, contactName: v.contactName, phone: v.phone, email: v.email, accountUsername: v.accountUsername, accountStatus: v.accountStatus }
      setDists(prev => [newItem, ...prev])
              message.success(`分判商已新增，账号：${newItem.accountUsername || '-'}，默认密码：${defaultPwd}`)
    }
    setOpen(false)
    setEditing(null)
    form.resetFields()
  }

  return (
    <div style={{ padding: 24 }}>
      <Card title="分判商管理" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setOpen(true) }}>新增分判商</Button>}>
        <Row gutter={12} style={{ marginBottom: 12 }}>
          <Col span={8}>
            <Input placeholder="关键词（名称/编码/联系人）" value={keyword} onChange={e => setKeyword(e.target.value)} allowClear />
          </Col>
          <Col span={8}>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="账号状态（可多选）"
              value={statusFilters}
              onChange={setStatusFilters}
              options={[{ value: 'active', label: '启用' }, { value: 'disabled', label: '禁用' }]}
              allowClear
            />
          </Col>
          <Col span={8}>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="归属工地（可多选）"
              value={siteFilters}
              onChange={setSiteFilters}
              options={sites.map(s => ({ value: s.id, label: s.name }))}
              allowClear
            />
          </Col>
        </Row>
        <Table rowKey="id" columns={columns} dataSource={filteredDists} pagination={{ pageSize: 10, showSizeChanger: true }} />
      </Card>

      <Modal title={editing ? '编辑分判商' : '新增分判商'} open={open} onCancel={() => { setOpen(false); setEditing(null) }} onOk={onSubmit} destroyOnClose>
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
          <Form.Item name="siteId" label="归属工地">
            <Select placeholder="请选择工地" options={sites.map(s => ({ value: s.id, label: s.name }))} />
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
          {!editing && (
            <Form.Item name="defaultPassword" label="默认密码" tooltip="若不填写将使用默认密码 Pass@123">
              <Input.Password placeholder="默认密码（留空则使用 Pass@123）" />
            </Form.Item>
          )}
          <Form.Item name="accountStatus" label="账号状态" initialValue={'active'}>
            <Select options={[{ value: 'active', label: '启用' }, { value: 'disabled', label: '禁用' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default AdminDistributors


