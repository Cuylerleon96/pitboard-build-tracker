import { useApp } from '../../context/AppContext'
import { tuneStatuses, ecuPlatforms, tuneTypes, money, formatDateTime } from '../../constants'
import AppSelect from '../AppSelect'
import DataLogChart from '../DataLogChart'
import TechnicianNotes from '../TechnicianNotes'

export default function TunesTab() {
  const {
    activeBuild, isShop,
    newTune, setNewTune, addTune, deleteTune, downloadTuneSource, importTuneFile,
    selectedTuneId, setSelectedTuneId, selectedTune, selectedTuneLog,
    selectedLogChannels, setSelectedLogChannels, updateSelectedLogChannel,
    availableLogChannels, pendingLogImport, setPendingLogImport, savePendingLogImport, importDataLog,
    techDrafts, setTechDrafts, addTechnicianNote, deleteTechnicianNote,
  } = useApp()

  return (
<section className="page-section">
            {isShop ? (
              <>
                <article className="card">
                  <div className="card-title">Import Speeduino / TunerStudio map</div>
                  <div className="stack-form">
                    <input accept=".msq,.txt,.json,.tun" onChange={importTuneFile} type="file" />
                    <div className="info-line">
                      Imports the tune file into the archive so you can keep each revision with its original source.
                    </div>
                  </div>
                </article>

                <article className="card">
                  <div className="card-title">Add tune entry</div>
                  <form className="form-grid six" onSubmit={addTune}>
                    <input onChange={(event) => setNewTune({ ...newTune, version: event.target.value })} placeholder="Version" value={newTune.version} />
                    <input onChange={(event) => setNewTune({ ...newTune, name: event.target.value })} placeholder="Tune name" value={newTune.name} />
                    <AppSelect onChange={(event) => setNewTune({ ...newTune, ecuPlatform: event.target.value })} value={newTune.ecuPlatform}>
                      {ecuPlatforms.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
                    </AppSelect>
                    <AppSelect onChange={(event) => setNewTune({ ...newTune, tuneType: event.target.value })} value={newTune.tuneType}>
                      {tuneTypes.map((tuneType) => <option key={tuneType} value={tuneType}>{tuneType}</option>)}
                    </AppSelect>
                    <AppSelect onChange={(event) => setNewTune({ ...newTune, status: event.target.value })} value={newTune.status}>
                      {tuneStatuses.map((status) => <option key={status}>{status}</option>)}
                    </AppSelect>
                    <input onChange={(event) => setNewTune({ ...newTune, power: event.target.value })} placeholder="WHP" type="number" value={newTune.power} />
                    <input onChange={(event) => setNewTune({ ...newTune, torque: event.target.value })} placeholder="WTQ" type="number" value={newTune.torque} />
                    <input onChange={(event) => setNewTune({ ...newTune, boost: event.target.value })} placeholder="Boost PSI" step="0.5" type="number" value={newTune.boost} />
                    <button className="button primary" type="submit">Add tune</button>
                  </form>
                </article>
              </>
            ) : null}

            <article className="card">
                  <div className="card-title">Tune log</div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Version</th><th>Name</th><th>ECU</th><th>Status / Type</th><th>Source</th><th>Log</th><th>WHP</th><th>WTQ</th><th>Boost</th><th>Date</th><th /></tr>
                  </thead>
                  <tbody>
                    {activeBuild.tunes.length === 0 ? (
                      <tr><td className="empty-cell" colSpan="11">No tune entries yet.</td></tr>
                    ) : activeBuild.tunes.map((tune) => (
                      <tr className={selectedTuneId === tune.id ? 'selected-row' : ''} key={tune.id} onClick={() => setSelectedTuneId(tune.id)}>
                        <td>{tune.version}</td>
                        <td>
                          <strong>{tune.name}</strong>
                          <span>{tune.notes || '-'}</span>
                        </td>
                        <td>{tune.ecuPlatform || 'Other'}</td>
                        <td><div className="stack-pill"><span className={`pill ${statusClass(tune.status)}`}>{tune.status}</span><span className="pill neutral">{tune.tuneType || 'Other'}</span></div></td>
                        <td>{tune.sourceFile || 'Manual entry'}</td>
                        <td>{tune.dataLog ? <span className="pill good">Log attached</span> : <span className="pill neutral">No log</span>}</td>
                        <td>{tune.power ?? '-'}</td>
                        <td>{tune.torque ?? '-'}</td>
                        <td>{tune.boost ?? '-'}</td>
                        <td>{formatDate(tune.date)}</td>
                        <td>{isShop ? <div className="row-actions">{tune.rawText ? <button className="button small subtle" onClick={(event) => { event.stopPropagation(); downloadTuneSource(tune) }}>Download</button> : null}<label className="button small subtle"><input accept=".csv,.txt" hidden onChange={(event) => importDataLog(event, tune.id)} type="file" />Attach log</label><button className="button small subtle delete-button" onClick={(event) => { event.stopPropagation(); deleteTune(tune.id) }}>Delete</button></div> : (tune.rawText ? <button className="button small subtle" onClick={() => downloadTuneSource(tune)}>Download</button> : '-')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            {selectedTune ? (
              <article className="card">
                <div className="card-toolbar">
                  <div className="card-title">ECU data log graphing</div>
                  <div className="info-line">{selectedTune.name} | {selectedTune.ecuPlatform || 'Other'}</div>
                </div>
                {pendingLogImport?.tuneId === selectedTune.id ? (
                  <div className="stack-form">
                    <div className="info-line">Review channels from {pendingLogImport.fileName}</div>
                    <label>
                      <span className="field-label">Delimiter</span>
                      <AppSelect onChange={(event) => setPendingLogImport((current) => ({ ...current, delimiter: event.target.value, ...parseDataLogText(current.text, event.target.value) }))} value={pendingLogImport.delimiter}>
                        <option value=",">Comma</option>
                        <option value=";">Semicolon</option>
                      </AppSelect>
                    </label>
                    <label>
                      <span className="field-label">Time column</span>
                      <AppSelect onChange={(event) => setPendingLogImport((current) => ({ ...current, timeColumn: event.target.value }))} value={pendingLogImport.timeColumn}>
                        <option value="">Select time column</option>
                        {pendingLogImport.headers.map((header) => <option key={header} value={header}>{header}</option>)}
                      </AppSelect>
                    </label>
                    <div className="channel-chip-list">
                      {pendingLogImport.headers.map((header) => <span className="pill neutral" key={header}>{header}</span>)}
                    </div>
                    <div className="row-actions">
                      <button className="button primary" onClick={savePendingLogImport} type="button">Save data log</button>
                      <button className="button ghost" onClick={() => setPendingLogImport(null)} type="button">Cancel</button>
                    </div>
                  </div>
                ) : selectedTuneLog ? (
                  <div className="stack-form">
                    <div className="info-line">{selectedTuneLog.fileName} | {selectedTuneLog.rows.length} rows | {availableLogChannels.length} channels</div>
                    <div className="form-grid four">
                      {[0, 1, 2, 3].map((index) => (
                        <label key={index}>
                          <span className="field-label">Channel {index + 1}</span>
                          <AppSelect onChange={(event) => updateSelectedLogChannel(index, event.target.value)} value={selectedLogChannels[index] || ''}>
                            <option value="">None</option>
                            {availableLogChannels.map((channel) => <option key={channel} value={channel}>{channel}</option>)}
                          </AppSelect>
                        </label>
                      ))}
                    </div>
                    <div className="channel-chip-list">
                      {getSuggestedChannels(selectedTuneLog.headers).map((header) => <button className="button small subtle" key={header} onClick={() => setSelectedLogChannels((current) => [...new Set([...current, header])].slice(0, 4))} type="button">{header}</button>)}
                    </div>
                    {selectedLogChannels.length ? <DataLogChart log={selectedTuneLog} selectedChannels={selectedLogChannels} /> : <div className="empty-note">Select up to four channels to graph the log.</div>}
                  </div>
                ) : (
                  <div className="stack-form">
                    <div className="info-line">No data log attached yet. Import a CSV log for this tune to visualize ECU channels over time.</div>
                    {isShop ? <label className="button subtle inline-file-button"><input accept=".csv,.txt" hidden onChange={(event) => importDataLog(event, selectedTune.id)} type="file" />Import data log</label> : null}
                  </div>
                )}
              </article>
            ) : null}

            {isShop ? (
              <TechnicianNotes
                draft={techDrafts.tunes}
                entries={activeBuild.technicianNotes?.tunes || []}
                onChange={(value) => setTechDrafts((current) => ({ ...current, tunes: value }))}
                onDelete={(noteId) => deleteTechnicianNote('tunes', noteId)}
                onSubmit={(event) => { event.preventDefault(); addTechnicianNote('tunes') }}
                title="Tune technician notes"
              />
            ) : null}
          </section>
      )
}