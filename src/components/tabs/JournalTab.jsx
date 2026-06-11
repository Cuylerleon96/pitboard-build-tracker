import { useApp } from '../../context/AppContext'
import { formatDateTime } from '../../constants'
import PhotoStrip from '../PhotoStrip'
import UpgradeHint from '../UpgradeHint'
import TechnicianNotes from '../TechnicianNotes'

export default function JournalTab() {
  const {
    activeBuild, isShop, hasGarageTier,
    newLog, setNewLog, journalDraftPhotos,
    handleJournalPhotos, addLogEntry, deleteJournalEntry,
    techDrafts, setTechDrafts, addTechnicianNote, deleteTechnicianNote,
  } = useApp()

  return (
<section className="page-section">
            {isShop ? (
              <article className="card">
                <div className="card-title">Add journal entry</div>
                <form className="stack-form" onSubmit={addLogEntry}>
                  <textarea onChange={(event) => setNewLog(event.target.value)} placeholder="What changed, what did you learn, what needs to happen next?" rows="4" value={newLog} />
                  {hasGarageTier ? (
                    <label className="photo-upload-field">
                      <span className="field-label">Journal photos</span>
                      <input accept="image/*" multiple onChange={handleJournalPhotos} type="file" />
                    </label>
                  ) : (
                    <UpgradeHint label="Camera locked" />
                  )}
                  <PhotoStrip photos={journalDraftPhotos} />
                  <button className="button primary" type="submit">Save entry</button>
                </form>
              </article>
            ) : null}

            <article className="card">
              <div className="card-title">Build journal</div>
              <div className="journal-list">
                {activeBuild.journal.map((entry) => (
                  <div className="journal-entry" key={entry.id}>
                    <div className="journal-entry-main">
                      <div className="journal-date">{formatDateTime(entry.at)}</div>
                      <div>{entry.text}</div>
                      <PhotoStrip photos={entry.photos} />
                    </div>
                    {isShop ? <button className="button small subtle delete-button" onClick={() => deleteJournalEntry(entry.id)}>Delete</button> : null}
                  </div>
                ))}
              </div>
            </article>

            {isShop ? (
              <TechnicianNotes
                draft={techDrafts.journal}
                entries={activeBuild.technicianNotes?.journal || []}
                onChange={(value) => setTechDrafts((current) => ({ ...current, journal: value }))}
                onDelete={(noteId) => deleteTechnicianNote('journal', noteId)}
                onSubmit={(event) => { event.preventDefault(); addTechnicianNote('journal') }}
                title="Journal technician notes"
              />
            ) : null}
          </section>
      )
}