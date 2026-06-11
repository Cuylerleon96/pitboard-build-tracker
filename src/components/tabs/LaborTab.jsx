import { useApp } from '../../context/AppContext'
import { money } from '../../constants'

export default function LaborTab() {
  const {
    activeBuild, isShop,
    newLabor, setNewLabor, addLaborEntry, deleteLaborEntry,
  } = useApp()

  return (
<section className="page-section">
            {isShop ? (
              <article className="card">
                <div className="card-title">Add labor entry</div>
                <form className="form-grid four" onSubmit={addLaborEntry}>
                  <input onChange={(event) => setNewLabor({ ...newLabor, date: event.target.value })} type="date" value={newLabor.date} />
                  <input onChange={(event) => setNewLabor({ ...newLabor, task: event.target.value })} placeholder="Task description" value={newLabor.task} />
                  <input onChange={(event) => setNewLabor({ ...newLabor, hours: event.target.value })} placeholder="Hours" step="0.25" type="number" value={newLabor.hours} />
                  <input onChange={(event) => setNewLabor({ ...newLabor, rate: event.target.value })} placeholder="Hourly rate" step="0.01" type="number" value={newLabor.rate} />
                  <button className="button primary" type="submit">Add labor</button>
                </form>
              </article>
            ) : null}

            <article className="card">
              <div className="card-toolbar">
                <div className="card-title">Labor log</div>
                <div className="info-line">Total labor cost {money.format(laborSpend)}</div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Date</th><th>Task</th><th>Hours</th><th>Rate</th><th>Total</th><th /></tr>
                  </thead>
                  <tbody>
                    {(activeBuild.labor || []).length === 0 ? (
                      <tr><td className="empty-cell" colSpan="6">No labor entries yet.</td></tr>
                    ) : (activeBuild.labor || []).map((entry) => (
                      <tr key={entry.id}>
                        <td>{formatDate(entry.date)}</td>
                        <td>{entry.task}</td>
                        <td>{entry.hours}</td>
                        <td>{money.format(entry.rate)}</td>
                        <td>{money.format(Number(entry.hours) * Number(entry.rate))}</td>
                        <td>{isShop ? <button className="button small subtle delete-button" onClick={() => deleteLaborEntry(entry.id)}>Delete</button> : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
      )
}