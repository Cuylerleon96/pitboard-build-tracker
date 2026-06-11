import { useApp } from '../../context/AppContext'
import { partsStatuses, partSources, money, statusClass } from '../../constants'
import AppSelect from '../AppSelect'
import PhotoStrip from '../PhotoStrip'
import UpgradeHint from '../UpgradeHint'
import TechnicianNotes from '../TechnicianNotes'

export default function PartsTab() {
  const {
    activeBuild, isShop, hasGarageTier,
    filteredParts, partsQuery, setPartsQuery, partsFilter, setPartsFilter,
    newPart, setNewPart, addPart, deletePart, cyclePartStatus,
    editingPartId, setEditingPartId, editDraft, setEditDraft,
    startEditPart, cancelEditPart, saveEditPart,
    handlePartPhotos, partCategoryOptions,
    techDrafts, setTechDrafts, addTechnicianNote, deleteTechnicianNote,
  } = useApp()

  return (
<section className="page-section">
            {isShop ? (
              <article className="card">
                <div className="card-title">Add part</div>
                <form className="form-grid six" onSubmit={addPart}>
                  <input onChange={(event) => setNewPart({ ...newPart, name: event.target.value })} placeholder="Part name" value={newPart.name} />
                  <AppSelect onChange={(event) => setNewPart({ ...newPart, category: event.target.value })} value={newPart.category}>
                    {partCategoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
                  </AppSelect>
                  <AppSelect onChange={(event) => setNewPart({ ...newPart, source: event.target.value })} value={newPart.source}>
                    {partSources.map((source) => <option key={source} value={source}>{source}</option>)}
                  </AppSelect>
                  <input onChange={(event) => setNewPart({ ...newPart, vendor: event.target.value })} placeholder="Vendor / brand" value={newPart.vendor} />
                  <input onChange={(event) => setNewPart({ ...newPart, supplier: event.target.value })} placeholder="Supplier" value={newPart.supplier} />
                  <input min="1" onChange={(event) => setNewPart({ ...newPart, qty: event.target.value })} type="number" value={newPart.qty} />
                  <input min="0" onChange={(event) => setNewPart({ ...newPart, unitCost: event.target.value })} placeholder="Unit cost" step="0.01" type="number" value={newPart.unitCost} />
                  <AppSelect onChange={(event) => setNewPart({ ...newPart, status: event.target.value })} value={newPart.status}>
                    {partsStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </AppSelect>
                  <textarea onChange={(event) => setNewPart({ ...newPart, notes: event.target.value })} placeholder="Notes" rows="2" value={newPart.notes} />
                  {hasGarageTier ? (
                    <label className="photo-upload-field">
                      <span className="field-label">Part photos</span>
                      <input accept="image/*" multiple onChange={handlePartPhotos} type="file" />
                    </label>
                  ) : (
                    <UpgradeHint label="Camera locked" />
                  )}
                  <button className="button primary" type="submit">Add part</button>
                </form>
                <PhotoStrip photos={newPart.photos} />
              </article>
            ) : null}

            <article className="card">
              <div className="card-toolbar">
                <div className="card-title">Parts list</div>
                <div className="toolbar-controls">
                  <input onChange={(event) => setPartsQuery(event.target.value)} placeholder="Search parts" value={partsQuery} />
                  <AppSelect onChange={(event) => setPartsFilter(event.target.value)} value={partsFilter}>
                    <option value="all">All statuses</option>
                    {partsStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </AppSelect>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Part</th><th>Category</th><th>Source</th><th>Vendor / Supplier</th><th>Qty</th><th>Unit</th><th>Total</th><th>Status</th><th /></tr>
                  </thead>
                  <tbody>
                    {filteredParts.length === 0 ? (
                      <tr><td className="empty-cell" colSpan="9">No parts added yet.</td></tr>
                    ) : filteredParts.map((part) => {
                      const isEditing = isShop && editingPartId === part.id
                      if (isEditing && editDraft) {
                        return (
                          <tr key={part.id} className="editing-row">
                            <td>
                              <input value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} placeholder="Part name" />
                              <textarea value={editDraft.notes} onChange={(e) => setEditDraft({ ...editDraft, notes: e.target.value })} placeholder="Notes" rows="2" style={{ marginTop: '6px' }} />
                            </td>
                            <td>
                              <AppSelect value={editDraft.category} onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })}>
                                {partCategoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                              </AppSelect>
                            </td>
                            <td>
                              <AppSelect value={editDraft.source} onChange={(e) => setEditDraft({ ...editDraft, source: e.target.value })}>
                                {partSources.map((s) => <option key={s} value={s}>{s}</option>)}
                              </AppSelect>
                            </td>
                            <td>
                              <input value={editDraft.vendor} onChange={(e) => setEditDraft({ ...editDraft, vendor: e.target.value })} placeholder="Vendor" />
                              <input value={editDraft.supplier} onChange={(e) => setEditDraft({ ...editDraft, supplier: e.target.value })} placeholder="Supplier" style={{ marginTop: '6px' }} />
                            </td>
                            <td><input type="number" min="1" value={editDraft.qty} onChange={(e) => setEditDraft({ ...editDraft, qty: e.target.value })} style={{ minWidth: '60px' }} /></td>
                            <td><input type="number" min="0" step="0.01" value={editDraft.unitCost} onChange={(e) => setEditDraft({ ...editDraft, unitCost: e.target.value })} style={{ minWidth: '80px' }} /></td>
                            <td>{money.format(Number(editDraft.qty || 0) * Number(editDraft.unitCost || 0))}</td>
                            <td>
                              <AppSelect value={editDraft.status} onChange={(e) => setEditDraft({ ...editDraft, status: e.target.value })}>
                                {partsStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                              </AppSelect>
                            </td>
                            <td>
                              <div className="row-actions">
                                <button className="button small primary" onClick={saveEditPart}>Save</button>
                                <button className="button small ghost" onClick={cancelEditPart}>Cancel</button>
                              </div>
                            </td>
                          </tr>
                        )
                      }
                      return (
                        <tr key={part.id}>
                          <td><strong>{part.name}</strong><span>{part.notes || 'No part notes'}</span><PhotoStrip photos={part.photos} /></td>
                          <td>{part.category}</td>
                          <td>{part.source || '-'}</td>
                          <td>{[part.vendor, part.supplier].filter(Boolean).join(' / ') || '-'}</td>
                          <td>{part.qty}</td>
                          <td>{money.format(part.unitCost)}</td>
                          <td>{money.format(part.qty * part.unitCost)}</td>
                          <td><span className={`pill ${statusClass(part.status)}`}>{part.status}</span></td>
                          <td>{isShop ? <div className="row-actions"><button className="button small subtle" onClick={() => startEditPart(part)}>Edit</button><button className="button small subtle" onClick={() => cyclePartStatus(part.id)}>Next</button><button className="button small subtle delete-button" onClick={() => deletePart(part.id)}>Delete</button></div> : '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </article>

            {isShop ? (
              <TechnicianNotes
                draft={techDrafts.parts}
                entries={activeBuild.technicianNotes?.parts || []}
                onChange={(value) => setTechDrafts((current) => ({ ...current, parts: value }))}
                onDelete={(noteId) => deleteTechnicianNote('parts', noteId)}
                onSubmit={(event) => { event.preventDefault(); addTechnicianNote('parts') }}
                title="Parts technician notes"
              />
            ) : null}
          </section>
      )
}