import React, { useMemo, useState } from 'react'
import { Card, DatePicker, Table, Tag, Space, Button, Row, Col, Statistic, message } from 'antd'
import { PhoneOutlined, WhatsAppOutlined, ExclamationCircleOutlined, TeamOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { useLocale } from '../contexts/LocaleContext'
import { Worker } from '../types/worker'
import { mockWorkers } from '../data/mockData'

interface AttendanceRecord {
  key: string
  workerId: string
  name: string
  distributorName: string
  siteName: string
  phone: string
  whatsapp: string
  checkIn?: string
  checkOut?: string
}

const mockAttendance: AttendanceRecord[] = mockWorkers.slice(0, 12).map((w, idx) => ({
  key: w.id,
  workerId: w.workerId,
  name: w.name,
  distributorName: `分判商${((idx % 3) + 1)}`,
  siteName: `工地${((idx % 4) + 1)}`,
  phone: w.phone,
  whatsapp: w.whatsapp,
  checkIn: dayjs().hour(8).minute(30 + (idx % 10)).format('HH:mm'),
  checkOut: idx % 4 === 0 ? undefined : dayjs().hour(17 + (idx % 2)).minute(10).format('HH:mm')
}))

const Reports: React.FC = () => {
  const { t } = useLocale()
  const [date, setDate] = useState<Dayjs>(dayjs())

  const isAfterSix = useMemo(() => dayjs().hour() >= 18, [])

  const data = useMemo(() => {
    // 按日期筛选 mock（实际中应调用接口）
    return mockAttendance
  }, [date])

  const pending = data.filter(r => !r.checkOut)

  const columns = [
    { title: t('worker.workerId'), dataIndex: 'workerId', key: 'workerId', width: 120 },
    { title: t('worker.name'), dataIndex: 'name', key: 'name', width: 120 },
    { title: t('reports.distributor'), dataIndex: 'distributorName', key: 'distributorName', width: 140 },
    { title: t('reports.site'), dataIndex: 'siteName', key: 'siteName', width: 120 },
    { title: t('worker.phone'), dataIndex: 'phone', key: 'phone', width: 140 },
    { title: 'WhatsApp', dataIndex: 'whatsapp', key: 'whatsapp', width: 160 },
    { title: t('reports.checkIn'), dataIndex: 'checkIn', key: 'checkIn', width: 100 },
    { 
      title: t('reports.checkOut'), 
      dataIndex: 'checkOut', 
      key: 'checkOut', 
      width: 110,
      render: (v?: string) => v ? v : <Tag color="red">{t('reports.notCheckedOut')}</Tag>
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 200,
      render: (_: any, record: AttendanceRecord) => (
        <Space>
          <Button icon={<PhoneOutlined />} onClick={() => message.success(`已拨打 ${record.phone}`)}>
            {t('reports.phone')}
          </Button>
          <Button icon={<WhatsAppOutlined />} onClick={() => message.success(`已发送WhatsApp到 ${record.whatsapp}`)}>
            {t('reports.whatsapp')}
          </Button>
        </Space>
      )
    }
  ]

  const contactAll = () => {
    if (pending.length === 0) {
      message.info('无未下班人员')
      return
    }
    pending.forEach((r, idx) => setTimeout(() => {
      // 实际中调用批量通知接口
      message.success(`已联系：${r.name}`)
    }, idx * 200))
  }

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <Space>
              <ExclamationCircleOutlined style={{ color: '#fa8c16' }} />
              <span>{t('reports.afterSixNotice')}</span>
            </Space>
            <div style={{ marginTop: 12 }}>
              <DatePicker value={date} onChange={(d) => d && setDate(d)} style={{ width: '100%' }} />
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title={t('reports.pendingCount').replace('{count}', String(pending.length))}
              value={pending.length}
              prefix={<TeamOutlined />}
              valueStyle={{ color: pending.length > 0 ? '#fa541c' : '#52c41a', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Space>
              <Button type="primary" danger disabled={pending.length === 0} onClick={contactAll}>
                {t('reports.contactAll')}
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="key"
          pagination={{ pageSize: 20, showSizeChanger: true }}
        />
      </Card>
    </div>
  )
}

export default Reports
