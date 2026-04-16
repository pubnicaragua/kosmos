import { Card } from '@/components/ui-kit/Card'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface KPICardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  sparklineData?: { value: number }[]
}

export function KPICard({ title, value, change, changeLabel, icon, trend = 'neutral', sparklineData }: KPICardProps) {
  const trendColor = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-error' : 'text-gray-500'
  const trendBg = trend === 'up' ? 'bg-success/5' : trend === 'down' ? 'bg-error/5' : 'bg-gray-50'
  const strokeColor = trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#64748b'

  return (
    <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-500 border-slate-100">
      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
          <p className="text-2xl font-black text-slate-900 mb-2">{value}</p>
          
          {change !== undefined && (
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${trendBg} ${trendColor}`}>
                {trend === 'up' && (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                )}
                {trend === 'down' && (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                )}
                {Math.abs(change).toFixed(1)}%
              </div>
              {changeLabel && (
                <span className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[120px]">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        <div className={`p-2.5 rounded-xl ${trendBg} ${trendColor} transition-transform group-hover:scale-110 duration-500`}>
          {icon}
        </div>
      </div>

      {sparklineData && (
        <div className="absolute bottom-0 left-0 right-0 h-12 opacity-30 group-hover:opacity-60 transition-opacity duration-700">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData}>
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={strokeColor} 
                strokeWidth={2} 
                dot={false} 
                animationDuration={2000}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
