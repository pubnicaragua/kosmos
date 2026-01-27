import { Card } from '@/components/ui-kit/Card'

interface KPICardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
}

export function KPICard({ title, value, change, changeLabel, icon, trend = 'neutral' }: KPICardProps) {
  const trendColor = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-error' : 'text-gray-500'
  const trendBg = trend === 'up' ? 'bg-success/10' : trend === 'down' ? 'bg-error/10' : 'bg-gray-100'

  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 uppercase mb-2">{title}</p>
          <p className="text-3xl font-semibold text-gray-900 mb-3">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1 ${trendColor}`}>
                {trend === 'up' && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {trend === 'down' && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                <span className="text-sm font-medium">{Math.abs(change)}%</span>
              </div>
              {changeLabel && (
                <span className="text-xs text-gray-500">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${trendBg}`}>
          {icon}
        </div>
      </div>
    </Card>
  )
}
