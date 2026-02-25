'use client'

import { useEffect, useRef } from 'react'
import { Chart, ChartConfiguration, registerables, TooltipItem } from 'chart.js'

Chart.register(...registerables)

interface MarketingChartProps {
  metrics: string
  type?: 'bar' | 'pie' | 'line'
}

export function MarketingChart({ metrics, type = 'bar' }: MarketingChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current || !metrics) return

    const parsedMetrics = parseMetrics(metrics)
    if (!parsedMetrics.labels.length) return

    if (chartRef.current) {
      chartRef.current.destroy()
    }

    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    const config: ChartConfiguration = {
      type,
      data: {
        labels: parsedMetrics.labels,
        datasets: [
          {
            label: 'Métricas',
            data: parsedMetrics.values,
            backgroundColor: [
              'rgba(59, 130, 246, 0.8)',
              'rgba(16, 185, 129, 0.8)',
              'rgba(245, 158, 11, 0.8)',
              'rgba(239, 68, 68, 0.8)',
              'rgba(139, 92, 246, 0.8)',
            ],
            borderColor: [
              'rgba(59, 130, 246, 1)',
              'rgba(16, 185, 129, 1)',
              'rgba(245, 158, 11, 1)',
              'rgba(239, 68, 68, 1)',
              'rgba(139, 92, 246, 1)',
            ],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: type === 'pie',
            position: 'bottom',
          },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const label = context.label || ''
                const value = context.parsed.y || context.parsed
                return `${label}: ${value}`
              },
            },
          },
        },
        scales: type !== 'pie' ? {
          y: {
            beginAtZero: true,
          },
        } : undefined,
      },
    }

    chartRef.current = new Chart(ctx, config)

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
      }
    }
  }, [metrics, type])

  return (
    <div className="w-full h-64">
      <canvas ref={canvasRef} />
    </div>
  )
}

function parseMetrics(metricsText: string): { labels: string[]; values: number[] } {
  const labels: string[] = []
  const values: number[] = []

  const lines = metricsText.split('\n').filter((line) => line.trim())

  for (const line of lines) {
    const match = line.match(/([^:]+):\s*([0-9.]+)/)
    if (match) {
      labels.push(match[1].trim())
      values.push(parseFloat(match[2]))
    }
  }

  return { labels, values }
}
