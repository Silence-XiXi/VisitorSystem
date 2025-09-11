import React, { useMemo } from 'react'

interface PieDatum {
  label: string
  value: number
  color: string
}

interface PieProps {
  data: PieDatum[]
  size?: number // svg 尺寸
  thickness?: number // 环形厚度
  showTotal?: boolean
}

const Pie: React.FC<PieProps> = ({ data, size = 160, thickness = 18, showTotal = false }) => {
  const radius = (size - thickness) / 2
  const center = size / 2
  const circumference = 2 * Math.PI * radius

  const { normalized, total } = useMemo(() => {
    const t = data.reduce((s, d) => s + (d.value > 0 ? d.value : 0), 0)
    const n = t === 0 ? data.map(d => ({ ...d, value: 0 })) : data
    return { normalized: n, total: t }
  }, [data])

  let accumulated = 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#f0f0f0"
          strokeWidth={thickness}
        />
        {normalized.map((d, idx) => {
          const pct = total === 0 ? 0 : d.value / total
          const dash = pct * circumference
          const dashArray = `${dash} ${circumference - dash}`
          const dashOffset = -(accumulated / total) * circumference
          accumulated += d.value
          return (
            <circle
              key={idx}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={d.color}
              strokeWidth={thickness}
              strokeDasharray={dashArray}
              strokeDashoffset={isFinite(dashOffset) ? dashOffset : 0}
              transform={`rotate(-90 ${center} ${center})`}
              strokeLinecap="butt"
            />
          )
        })}
        {showTotal && (
          <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="#595959" fontSize={14}>
            {total}
          </text>
        )}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {normalized.map((d, idx) => {
          const pct = total === 0 ? 0 : Math.round((d.value / total) * 100)
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, background: d.color, display: 'inline-block', borderRadius: 2 }} />
              <span style={{ color: '#595959' }}>{d.label}</span>
              <span style={{ color: '#8c8c8c' }}>{d.value}（{pct}%）</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Pie


