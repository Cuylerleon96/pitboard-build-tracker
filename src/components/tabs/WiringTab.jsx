import { useApp } from '../../context/AppContext'
import { pinTypes } from '../../constants'
import AppSelect from '../AppSelect'
import WiringDiagram from '../WiringDiagram'

export default function WiringTab() {
  const {
    activeBuild, isShop, filteredPins, pinQuery, setPinQuery,
    newPin, setNewPin, addPin, deletePin, togglePin,
    newConnector, setNewConnector, addConnector, deleteConnector,
    collapsedConnectors, setCollapsedConnectors,
  } = useApp()

  return (
<section className="page-section">
            {isShop ? (
              <>
                {/* ── Add connector ── */}
                <article className="card">
                  <div className="card-title">Connectors</div>
                  <form className="form-grid three" onSubmit={addConnector} style={{ marginBottom: (activeBuild.connectors || []).length ? '14px' : '0' }}>
                    <input onChange={(e) => setNewConnector({ ...newConnector, name: e.target.value })} placeholder="Connector name (e.g. ECU C1, Injector Rail)" value={newConnector.name} />
                    <input onChange={(e) => setNewConnector({ ...newConnector, description: e.target.value })} placeholder="Description / location (optional)" value={newConnector.description} />
                    <button className="button primary" type="submit">Add connector</button>
                  </form>
                  {(activeBuild.connectors || []).length > 0 && (
                    <div className="connector-chip-list">
                      {(activeBuild.connectors || []).map((c) => (
                        <div key={c.id} className="connector-chip">
                          <span className="connector-chip-name">{c.name}</span>
                          {c.description && <span className="connector-chip-desc">{c.description}</span>}
                          <span className="connector-chip-count">
                            {activeBuild.pins.filter((p) => p.fromConnectorId === c.id || p.toConnectorId === c.id).length} wires
                          </span>
                          <button className="button small subtle delete-button" onClick={() => deleteConnector(c.id)}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </article>

                {/* ── Add wire ── */}
                <article className="card">
                  <div className="card-title">Add wire / connection</div>
                  <form onSubmit={addPin}>
                    {/* Endpoint row */}
                    <div className="wire-endpoint-row">
                      <div className="wire-endpoint">
                        <label className="wire-endpoint-label">From</label>
                        <AppSelect onChange={(e) => setNewPin({ ...newPin, fromConnectorId: e.target.value })} value={newPin.fromConnectorId}>
                          <option value="">— connector —</option>
                          {(activeBuild.connectors || []).map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </AppSelect>
                        <input onChange={(e) => setNewPin({ ...newPin, fromPin: e.target.value })} placeholder="Pin / terminal" value={newPin.fromPin} />
                      </div>
                      <div className="wire-arrow">→</div>
                      <div className="wire-endpoint">
                        <label className="wire-endpoint-label">To</label>
                        <AppSelect onChange={(e) => setNewPin({ ...newPin, toConnectorId: e.target.value })} value={newPin.toConnectorId}>
                          <option value="">— connector —</option>
                          {(activeBuild.connectors || []).map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </AppSelect>
                        <input onChange={(e) => setNewPin({ ...newPin, toPin: e.target.value })} placeholder="Pin / terminal" value={newPin.toPin} />
                      </div>
                    </div>
                    {/* Wire info row */}
                    <div className="form-grid four" style={{ marginTop: '10px' }}>
                      <input onChange={(e) => setNewPin({ ...newPin, function: e.target.value })} placeholder="Signal / function" value={newPin.function} />
                      <AppSelect onChange={(e) => setNewPin({ ...newPin, type: e.target.value })} value={newPin.type}>
                        {pinTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                      </AppSelect>
                      <input onChange={(e) => setNewPin({ ...newPin, wireGauge: e.target.value })} placeholder="Wire gauge (18AWG)" value={newPin.wireGauge} />
                      <input onChange={(e) => setNewPin({ ...newPin, wireColor: e.target.value })} placeholder="Wire color" value={newPin.wireColor} />
                      <button className="button primary" type="submit">Add wire</button>
                    </div>
                  </form>
                </article>
              </>
            ) : null}

            {/* ── Pin map ── */}
            <article className="card">
              <div className="card-toolbar">
                <div className="card-title">Wiring / pin map</div>
                <div className="toolbar-controls single">
                  <input onChange={(event) => setPinQuery(event.target.value)} placeholder="Search pins" value={pinQuery} />
                </div>
              </div>

              {/* Flat search results */}
              {pinQuery.trim() ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>From</th><th>Pin</th><th>→</th><th>To</th><th>Pin</th>
                        <th>Function</th><th>Type</th><th>Gauge</th><th>Color</th><th>Verified</th><th />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPins.length === 0
                        ? <tr><td className="empty-cell" colSpan="11">No wires match your search.</td></tr>
                        : filteredPins.map((pin) => {
                            const fromConn = (activeBuild.connectors || []).find((c) => c.id === pin.fromConnectorId)
                            const toConn = (activeBuild.connectors || []).find((c) => c.id === pin.toConnectorId)
                            return (
                              <tr key={pin.id}>
                                <td>{fromConn ? <span className="connector-tag">{fromConn.name}</span> : <span style={{ color: 'var(--text-soft)' }}>—</span>}</td>
                                <td>{pin.fromPin || '—'}</td>
                                <td style={{ color: 'var(--accent)', fontWeight: 600 }}>→</td>
                                <td>{toConn ? <span className="connector-tag">{toConn.name}</span> : <span style={{ color: 'var(--text-soft)' }}>—</span>}</td>
                                <td>{pin.toPin || '—'}</td>
                                <td>{pin.function || '-'}</td>
                                <td>{pin.type || '-'}</td>
                                <td>{pin.wireGauge || '-'}</td>
                                <td>{pin.wireColor || '-'}</td>
                                <td><button className={`pill buttonless ${pin.verified ? 'good' : 'neutral'}`} disabled={!isShop} onClick={() => togglePin(pin.id)}>{pin.verified ? 'Verified' : 'Needs check'}</button></td>
                                <td>{isShop ? <button className="button small subtle delete-button" onClick={() => deletePin(pin.id)}>Delete</button> : '-'}</td>
                              </tr>
                            )
                          })
                      }
                    </tbody>
                  </table>
                </div>
              ) : (activeBuild.pins.length === 0 ? (
                <p className="empty-note">No wires yet. Add connectors first, then add wires between them.</p>
              ) : (
                <div className="connector-sections">
                  {/* One section per connector — shows all wires touching it */}
                  {(activeBuild.connectors || []).map((connector) => {
                    const connWires = activeBuild.pins.filter((p) => p.fromConnectorId === connector.id || p.toConnectorId === connector.id)
                    const verifiedCount = connWires.filter((p) => p.verified).length
                    const isCollapsed = collapsedConnectors[connector.id]
                    return (
                      <div key={connector.id} className="connector-section">
                        <div className="connector-section-header" onClick={() => setCollapsedConnectors((prev) => ({ ...prev, [connector.id]: !prev[connector.id] }))}>
                          <div className="connector-section-title">
                            <strong>{connector.name}</strong>
                            {connector.description && <span className="connector-section-desc">{connector.description}</span>}
                          </div>
                          <div className="connector-section-meta">
                            <span className="pill neutral">{connWires.length} wire{connWires.length !== 1 ? 's' : ''}</span>
                            {connWires.length > 0 && <span className={`pill ${verifiedCount === connWires.length ? 'good' : 'neutral'}`}>{verifiedCount}/{connWires.length} verified</span>}
                          </div>
                          <span className="task-expand-icon">{isCollapsed ? '▼' : '▲'}</span>
                        </div>
                        {!isCollapsed && (
                          <div className="table-wrap connector-table">
                            <table>
                              <thead>
                                <tr><th>From</th><th>Pin</th><th>→</th><th>To</th><th>Pin</th><th>Function</th><th>Type</th><th>Gauge</th><th>Color</th><th>Verified</th><th /></tr>
                              </thead>
                              <tbody>
                                {connWires.length === 0
                                  ? <tr><td className="empty-cell" colSpan="11">No wires on this connector yet.</td></tr>
                                  : connWires.map((pin) => {
                                      const fromConn = (activeBuild.connectors || []).find((c) => c.id === pin.fromConnectorId)
                                      const toConn = (activeBuild.connectors || []).find((c) => c.id === pin.toConnectorId)
                                      return (
                                        <tr key={pin.id}>
                                          <td>{fromConn ? <span className={`connector-tag${pin.fromConnectorId === connector.id ? ' good' : ''}`}>{fromConn.name}</span> : <span style={{ color: 'var(--text-soft)' }}>—</span>}</td>
                                          <td>{pin.fromPin || '—'}</td>
                                          <td style={{ color: 'var(--accent)', fontWeight: 600 }}>→</td>
                                          <td>{toConn ? <span className={`connector-tag${pin.toConnectorId === connector.id ? ' good' : ''}`}>{toConn.name}</span> : <span style={{ color: 'var(--text-soft)' }}>—</span>}</td>
                                          <td>{pin.toPin || '—'}</td>
                                          <td>{pin.function || '-'}</td>
                                          <td>{pin.type || '-'}</td>
                                          <td>{pin.wireGauge || '-'}</td>
                                          <td>{pin.wireColor || '-'}</td>
                                          <td><button className={`pill buttonless ${pin.verified ? 'good' : 'neutral'}`} disabled={!isShop} onClick={() => togglePin(pin.id)}>{pin.verified ? 'Verified' : 'Needs check'}</button></td>
                                          <td>{isShop ? <button className="button small subtle delete-button" onClick={() => deletePin(pin.id)}>Delete</button> : '-'}</td>
                                        </tr>
                                      )
                                    })
                                }
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Unrouted wires — both endpoints unassigned */}
                  {(() => {
                    const unrouted = activeBuild.pins.filter((p) => !p.fromConnectorId && !p.toConnectorId)
                    if (unrouted.length === 0) return null
                    const isCollapsed = collapsedConnectors['__unrouted__']
                    return (
                      <div className="connector-section">
                        <div className="connector-section-header" onClick={() => setCollapsedConnectors((prev) => ({ ...prev, __unrouted__: !prev.__unrouted__ }))}>
                          <div className="connector-section-title">
                            <strong>Unrouted</strong>
                            <span className="connector-section-desc">Wires not assigned to any connector</span>
                          </div>
                          <div className="connector-section-meta">
                            <span className="pill neutral">{unrouted.length} wire{unrouted.length !== 1 ? 's' : ''}</span>
                          </div>
                          <span className="task-expand-icon">{isCollapsed ? '▼' : '▲'}</span>
                        </div>
                        {!isCollapsed && (
                          <div className="table-wrap connector-table">
                            <table>
                              <thead>
                                <tr><th>From pin</th><th>→</th><th>To pin</th><th>Function</th><th>Type</th><th>Gauge</th><th>Color</th><th>Verified</th><th /></tr>
                              </thead>
                              <tbody>
                                {unrouted.map((pin) => (
                                  <tr key={pin.id}>
                                    <td>{pin.fromPin || '—'}</td>
                                    <td style={{ color: 'var(--accent)', fontWeight: 600 }}>→</td>
                                    <td>{pin.toPin || '—'}</td>
                                    <td>{pin.function || '-'}</td>
                                    <td>{pin.type || '-'}</td>
                                    <td>{pin.wireGauge || '-'}</td>
                                    <td>{pin.wireColor || '-'}</td>
                                    <td><button className={`pill buttonless ${pin.verified ? 'good' : 'neutral'}`} disabled={!isShop} onClick={() => togglePin(pin.id)}>{pin.verified ? 'Verified' : 'Needs check'}</button></td>
                                    <td>{isShop ? <button className="button small subtle delete-button" onClick={() => deletePin(pin.id)}>Delete</button> : '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              ))}
            </article>

            {/* ── Wiring diagram ── */}
            <WiringDiagram connectors={activeBuild.connectors || []} pins={activeBuild.pins} />

            {isShop ? (
              <TechnicianNotes
                draft={techDrafts.wiring}
                entries={activeBuild.technicianNotes?.wiring || []}
                onChange={(value) => setTechDrafts((current) => ({ ...current, wiring: value }))}
                onDelete={(noteId) => deleteTechnicianNote('wiring', noteId)}
                onSubmit={(event) => { event.preventDefault(); addTechnicianNote('wiring') }}
                title="Wiring technician notes"
              />
            ) : null}
          </section>
      )
}