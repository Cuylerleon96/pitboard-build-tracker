import { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'
import { chartColors } from '../constants'

function DataLogChart({ log, selectedChannels }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || !log || !selectedChannels.length) return undefined

    const timeHeader = log.timeColumn
    const labels = log.rows.map((row) => Number(row[timeHeader]))
    const yAxes = {}
    const datasets = selectedChannels.map((channel, index) => {
      const axisId = `y${index}`
      yAxes[axisId] = {
        type: 'linear',
        position: index % 2 === 0 ? 'left' : 'right',
        grid: { drawOnChartArea: index === 0 },
        ticks: { color: chartColors[index] || chartColors[0] },
      }

      return {
        label: channel,
        data: log.rows.map((row) => Number(row[channel])),
        borderColor: chartColors[index] || chartColors[0],
        backgroundColor: chartColors[index] || chartColors[0],
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.22,
        yAxisID: axisId,
      }
    })

    chartRef.current?.destroy()
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets,
      },
      options: {
        responsive: true,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            labels: { color: '#f4f1ea' },
          },
          tooltip: {
            callbacks: {
              title(items) {
                return `Time ${items[0]?.label ?? '-'}s`
              },
            },
          },
        },
        scales: {
          x: {
            title: { display: true, text: 'Time (seconds)', color: '#a9b0bd' },
            ticks: { color: '#a9b0bd' },
            grid: { color: 'rgba(255,255,255,0.06)' },
          },
          ...yAxes,
        },
      },
    })

    return () => {
      chartRef.current?.destroy()
      chartRef.current = null
    }
  }, [log, selectedChannels])

  return <canvas className="log-chart" ref={canvasRef} />
}

export default DataLogChart
