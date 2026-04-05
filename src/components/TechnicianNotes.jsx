import { formatDateTime } from '../constants'

function TechnicianNotes({ entries, draft, onChange, onSubmit, onDelete, title }) {
  return (
    <article className="card">
      <div className="card-title">{title}</div>
      <form className="stack-form" onSubmit={onSubmit}>
        <textarea onChange={(event) => onChange(event.target.value)} placeholder="Internal note for technicians only" rows="3" value={draft} />
        <button className="button primary" type="submit">Add technician note</button>
      </form>
      <div className="journal-list">
        {entries.length === 0 ? (
          <div className="empty-note">No internal technician notes yet.</div>
        ) : (
          entries.map((entry) => (
            <div className="journal-entry" key={entry.id}>
              <div className="journal-entry-main">
                <div className="journal-date">{formatDateTime(entry.at)}</div>
                <div>{entry.text}</div>
              </div>
              <button className="button small subtle delete-button" onClick={() => onDelete(entry.id)}>Delete</button>
            </div>
          ))
        )}
      </div>
    </article>
  )
}

export default TechnicianNotes
