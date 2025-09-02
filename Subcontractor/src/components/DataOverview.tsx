import React, { useState, useEffect, useMemo } from 'react'
import { Card, Row, Col, Statistic, Progress, Table, Tag, Space, Typography } from 'antd'
import {
  TeamOutlined,
  UserOutlined,
  ShoppingOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import { mockWorkers } from '../data/mockData'
import dayjs from 'dayjs'
import Pie from './Pie'

const { Title } = Typography

interface RecentActivity {
  key: string
  time: string
  worker: string
  action: string
  status: 'success' | 'warning' | 'error'
}

const DataOverview: React.FC = () => {
  const [stats, setStats] = useState({
    totalWorkers: 156,
    currentWorkers: 89,
    borrowedItems: 23,
    returnRate: 85
  })

  const formatNow = () => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    const ss = String(d.getSeconds()).padStart(2, '0')
    return `${y}-${m}-${day} ${hh}:${mm}:${ss}`
  }

  const [currentTime, setCurrentTime] = useState<string>(formatNow())

  const [recentActivities] = useState<RecentActivity[]>([
    {
      key: '1',
      time: '09:15',
      worker: '张三',
      action: '进入工地',
      status: 'success'
    },
    {
      key: '2',
      time: '09:12',
      worker: '李四',
      action: '借出安全帽',
      status: 'warning'
    },
    {
      key: '3',
      time: '09:08',
      worker: '王五',
      action: '离开工地',
      status: 'success'
    },
    {
      key: '4',
      time: '09:05',
      worker: '赵六',
      action: '归还工具',
      status: 'success'
    },
    {
      key: '5',
      time: '09:02',
      worker: '钱七',
      action: '进入工地',
      status: 'success'
    }
  ])

  const activityColumns = [
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
      width: 80
    },
    {
      title: '工人',
      dataIndex: 'worker',
      key: 'worker',
      width: 100
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => {
        const statusConfig = {
          success: { color: 'green', text: '正常' },
          warning: { color: 'orange', text: '待归还' },
          error: { color: 'red', text: '异常' }
        }
        const config = statusConfig[status as keyof typeof statusConfig]
        return <Tag color={config.color}>{config.text}</Tag>
      }
    }
  ]

  // 模拟实时数据更新
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        currentWorkers: prev.currentWorkers + Math.floor(Math.random() * 3) - 1,
        borrowedItems: Math.max(0, prev.borrowedItems + Math.floor(Math.random() * 3) - 1)
      }))
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  // 实时时间更新
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(formatNow())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // 统计：男女比例与年龄阶段
  const genderAndAge = useMemo(() => {
    let male = 0
    let female = 0

    const buckets = {
      '18-25': 0,
      '26-35': 0,
      '36-45': 0,
      '46-60': 0,
      '60+': 0
    } as Record<string, number>

    const calcAge = (birth?: string, age?: number) => {
      if (typeof age === 'number') return age
      if (!birth) return undefined
      const b = dayjs(birth)
      if (!b.isValid()) return undefined
      const now = dayjs()
      let v = now.year() - b.year()
      if (now.month() < b.month() || (now.month() === b.month() && now.date() < b.date())) v -= 1
      return v
    }

    mockWorkers.forEach(w => {
      if (w.gender === 'male') male += 1
      else if (w.gender === 'female') female += 1

      const age = calcAge(w.birthDate, w.age)
      if (typeof age === 'number') {
        if (age >= 60) buckets['60+'] += 1
        else if (age >= 46) buckets['46-60'] += 1
        else if (age >= 36) buckets['36-45'] += 1
        else if (age >= 26) buckets['26-35'] += 1
        else if (age >= 18) buckets['18-25'] += 1
      }
    })

    const total = male + female || 1
    const malePct = Math.round((male / total) * 100)
    const femalePct = 100 - malePct

    return { male, female, malePct, femalePct, buckets }
  }, [])

  return (
    <div className="fade-in" style={{ width: '100%' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Title level={3}>数据概览</Title>
        <p style={{ color: '#666' }}>实时监控工地人员和物品状态</p>
        <div style={{ color: '#999', display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
          <ClockCircleOutlined style={{ marginRight: 6 }} />
          <span>当前时间：{currentTime}</span>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} lg={6}>
          <Card 
            hoverable
            style={{ 
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%)',
              border: '1px solid #91d5ff'
            }}
          >
            <Statistic
              title="工人总数"
              value={stats.totalWorkers}
              prefix={<TeamOutlined style={{ color: '#1890ff', fontSize: '20px' }} />}
              valueStyle={{ color: '#1890ff', fontSize: '28px', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card 
            hoverable
            style={{ 
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #f6ffed 0%, #f0fff0 100%)',
              border: '1px solid #b7eb8f'
            }}
          >
            <Statistic
              title="当前在场人数"
              value={stats.currentWorkers}
              prefix={<UserOutlined style={{ color: '#52c41a', fontSize: '20px' }} />}
              valueStyle={{ color: '#52c41a', fontSize: '28px', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card 
            hoverable
            style={{ 
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #fffbe6 0%, #fffff0 100%)',
              border: '1px solid #ffe58f'
            }}
          >
            <Statistic
              title="借出未归还物品"
              value={stats.borrowedItems}
              prefix={<ShoppingOutlined style={{ color: '#faad14', fontSize: '20px' }} />}
              valueStyle={{ color: '#faad14', fontSize: '28px', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card 
            hoverable
            style={{ 
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #f9f0ff 0%, #faf5ff 100%)',
              border: '1px solid #d3adf7'
            }}
          >
            <Statistic
              title="物品归还率"
              value={stats.returnRate}
              suffix="%"
              prefix={<ClockCircleOutlined style={{ color: '#722ed1', fontSize: '20px' }} />}
              valueStyle={{ color: '#722ed1', fontSize: '28px', fontWeight: 'bold' }}
            />
            <Progress
              percent={stats.returnRate}
              size="small"
              showInfo={false}
              strokeColor={{
                '0%': '#722ed1',
                '100%': '#eb2f96',
              }}
              style={{ marginTop: 12 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card title="在场分布" style={{ minHeight: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Pie
                data={[
                  { label: '在场', value: stats.currentWorkers, color: '#108ee9' },
                  { label: '不在场', value: Math.max(0, stats.totalWorkers - stats.currentWorkers), color: '#d9d9d9' },
                ]}
                showTotal
                size={200}
              />
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card title="最近活动" style={{ minHeight: 460 }}>
            <Table
              columns={activityColumns}
              dataSource={recentActivities}
              pagination={false}
              size="small"
              scroll={{ y: 360 }}
            />
          </Card>
        </Col>
      </Row>
      </Space>
    </div>
  )
}

export default DataOverview
