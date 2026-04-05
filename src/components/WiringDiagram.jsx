function wireColorToHex(name) {
  if (!name) return 'rgba(249,115,22,0.65)'
  const n = name.toLowerCase().trim()
  const map = {
    red: '#e05252', black: '#9e9e9e', white: '#e0e0e0', yellow: '#f2c078',
    green: '#52d08d', blue: '#6aa7ff', orange: '#f97316', purple: '#b48fdd',
    pink: '#f48fb1', gray: '#9e9e9e', grey: '#9e9e9e', brown: '#a1887f',
    blk: '#9e9e9e', wht: '#e0e0e0', grn: '#52d08d', blu: '#6aa7ff',
    ylw: '#f2c078', org: '#f97316', vio: '#b48fdd',
  }
  for (const [k, v] of Object.entries(map)) {
    if (n.includes(k)) return v
  }
  return 'rgba(249,115,22,0.65)'
}

function WiringDiagram({ connectors, pins }) {
  const hasWires = pins.some((p) => p.fromConnectorId || p.toConnectorId)
  if (!connectors.length || !hasWires) return null

  const MARGIN = 36
  const CONN_W = 140
  const CONN_H = 40
  const ROW_H = 72
  const MID_GAP = 180

  // Split connectors into left / right columns
  const half = Math.ceil(connectors.length / 2)
  const leftConns = connectors.slice(0, half)
  const rightConns = connectors.slice(half)

  const rows = Math.max(leftConns.length, rightConns.length)
  const SVG_W = MARGIN * 2 + CONN_W * 2 + MID_GAP
  const SVG_H = MARGIN * 2 + rows * ROW_H + CONN_H / 2

  const positions = {}
  leftConns.forEach((c, i) => {
    positions[c.id] = { cx: MARGIN + CONN_W / 2, cy: MARGIN + i * ROW_H + CONN_H / 2, side: 'left' }
  })
  rightConns.forEach((c, i) => {
    positions[c.id] = { cx: MARGIN + CONN_W + MID_GAP + CONN_W / 2, cy: MARGIN + i * ROW_H + CONN_H / 2, side: 'right' }
  })

  // Count wires per pair for offset spacing
  const pairCounts = {}
  const pairIdxs = {}
  pins.forEach((p) => {
    if (!p.fromConnectorId && !p.toConnectorId) return
    const key = [p.fromConnectorId || '_', p.toConnectorId || '_'].sort().join('|')
    pairCounts[key] = (pairCounts[key] || 0) + 1
  })
  pins.forEach((p) => {
    if (!p.fromConnectorId && !p.toConnectorId) return
    const key = [p.fromConnectorId || '_', p.toConnectorId || '_'].sort().join('|')
    pairIdxs[p.id] = (pairIdxs[p.id] !== undefined ? pairIdxs[p.id] : (pairIdxs['__next__' + key] || 0))
    pairIdxs['__next__' + key] = pairIdxs[p.id] + 1
  })

  function buildPath(pin, wireIdx) {
    const fp = positions[pin.fromConnectorId]
    const tp = positions[pin.toConnectorId]
    if (!fp && !tp) return null
    // If only one end is connected, skip
    if (!fp || !tp) return null

    const total = pairCounts[[pin.fromConnectorId || '_', pin.toConnectorId || '_'].sort().join('|')] || 1
    const yOff = (wireIdx - (total - 1) / 2) * 8

    let sx, sy, tx, ty, c1x, c1y, c2x, c2y

    const sameSide = fp.side === tp.side
    if (!sameSide) {
      sx = fp.side === 'left' ? fp.cx + CONN_W / 2 : fp.cx - CONN_W / 2
      tx = tp.side === 'right' ? tp.cx - CONN_W / 2 : tp.cx + CONN_W / 2
      sy = fp.cy + yOff
      ty = tp.cy + yOff
      const midX = (sx + tx) / 2
      c1x = midX; c1y = sy
      c2x = midX; c2y = ty
    } else if (fp.side === 'left') {
      sx = fp.cx - CONN_W / 2; sy = fp.cy + yOff
      tx = tp.cx - CONN_W / 2; ty = tp.cy + yOff
      const loopX = Math.min(sx, tx) - 50
      c1x = loopX; c1y = sy
      c2x = loopX; c2y = ty
    } else {
      sx = fp.cx + CONN_W / 2; sy = fp.cy + yOff
      tx = tp.cx + CONN_W / 2; ty = tp.cy + yOff
      const loopX = Math.max(sx, tx) + 50
      c1x = loopX; c1y = sy
      c2x = loopX; c2y = ty
    }

    return { sx, sy, tx, ty, c1x, c1y, c2x, c2y }
  }

  return (
    <article className="card" style={{ overflow: 'hidden' }}>
      <div className="card-title">Wiring diagram</div>
      <div style={{ overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          width={SVG_W}
          height={SVG_H}
          style={{ display: 'block', minWidth: SVG_W, fontFamily: 'var(--mono)' }}
        >
          {/* Wire paths — draw under connectors */}
          {pins.map((pin) => {
            const path = buildPath(pin, pairIdxs[pin.id] || 0)
            if (!path) return null
            const { sx, sy, tx, ty, c1x, c1y, c2x, c2y } = path
            const midX = (sx + tx) / 2 + (c1x - (sx + tx) / 2) * 0.4
            const midY = (sy + ty) / 2
            const stroke = wireColorToHex(pin.wireColor)
            return (
              <g key={pin.id}>
                <path
                  d={`M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tx} ${ty}`}
                  stroke={stroke}
                  strokeWidth={1.8}
                  fill="none"
                  opacity={0.75}
                  strokeLinecap="round"
                />
                {/* Arrow at destination */}
                <circle cx={tx} cy={ty} r={2.5} fill={stroke} opacity={0.9} />
                {/* Signal label */}
                {pin.function && (
                  <text
                    x={midX}
                    y={midY - 5}
                    textAnchor="middle"
                    fontSize={9}
                    fill="rgba(244,241,234,0.45)"
                  >
                    {pin.function.length > 14 ? pin.function.slice(0, 14) + '…' : pin.function}
                  </text>
                )}
                {/* Gauge label */}
                {pin.wireGauge && (
                  <text
                    x={midX}
                    y={midY + 5}
                    textAnchor="middle"
                    fontSize={8}
                    fill="rgba(244,241,234,0.3)"
                  >
                    {pin.wireGauge}
                  </text>
                )}
              </g>
            )
          })}

          {/* Connector boxes — draw on top */}
          {connectors.map((c) => {
            const pos = positions[c.id]
            if (!pos) return null
            const wireCount = pins.filter((p) => p.fromConnectorId === c.id || p.toConnectorId === c.id).length
            const label = c.name.length > 16 ? c.name.slice(0, 15) + '…' : c.name
            return (
              <g key={c.id}>
                <rect
                  x={pos.cx - CONN_W / 2}
                  y={pos.cy - CONN_H / 2}
                  width={CONN_W}
                  height={CONN_H}
                  rx={8}
                  fill="#0f1117"
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth={1.2}
                />
                {wireCount > 0 && (
                  <rect
                    x={pos.cx - CONN_W / 2}
                    y={pos.cy - CONN_H / 2}
                    width={CONN_W}
                    height={4}
                    rx={3}
                    fill="rgba(249,115,22,0.5)"
                  />
                )}
                <text
                  x={pos.cx}
                  y={pos.cy + 5}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={600}
                  fill="#f4f1ea"
                >
                  {label}
                </text>
                <text
                  x={pos.cx}
                  y={pos.cy + CONN_H / 2 + 14}
                  textAnchor="middle"
                  fontSize={9}
                  fill="rgba(249,115,22,0.7)"
                >
                  {wireCount} wire{wireCount !== 1 ? 's' : ''}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </article>
  )
}

export default WiringDiagram
