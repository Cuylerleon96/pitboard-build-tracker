import { startTransition } from 'react'
import { useApp } from '../../context/AppContext'
import { formatDate, formatDateTime, money, statusClass } from '../../constants'
import TechnicianNotes from '../TechnicianNotes'

export default function DashboardTab() {
  const {
    activeBuild, isShop, metrics, money: moneyFmt,
    updatePhase, setActiveTab, setExpandedTaskId,
    techDrafts, setTechDrafts, addTechnicianNote, deleteTechnicianNote,
  } = useApp()

  return (
<section className="page-section">

            {/* ── Task board ── primary hero section */}
            <article className="card">
              <div className="card-toolbar">
                <div className="card-title">Task board</div>
                {isShop && (
                  <button className="button small subtle" onClick={() => startTransition(() => setActiveTab('tasks'))}>
                    + Add task
                  </button>
                )}
              </div>
              {(activeBuild.tasks || []).filter((t) => t.status !== 'done').length === 0 ? (
                <p className="empty-note">No open tasks. {isShop ? 'Go to the Tasks tab to add one.' : ''}</p>
              ) : (
                <div className="dashboard-task-board">
                  {/* In progress column */}
                  <div className="dashboard-task-col">
                    <div className="dashboard-task-col-label">In progress</div>
                    {(activeBuild.tasks || []).filter((t) => t.status === 'in_progress').length === 0
                      ? <p className="empty-note" style={{ fontSize: '0.82rem' }}>None</p>
                      : (activeBuild.tasks || []).filter((t) => t.status === 'in_progress').map((task) => {
                          const linkedPart = activeBuild.parts.find((p) => p.id === task.partId)
                          return (
                            <div key={task.id} className="dashboard-task-chip task-status-in_progress" onClick={() => { startTransition(() => setActiveTab('tasks')); setExpandedTaskId(task.id) }}>
                              <strong>{task.title}</strong>
                              {linkedPart && <span>🔗 {linkedPart.name}</span>}
                              {task.deadline && <span>📅 {formatDate(task.deadline)}</span>}
                              {task.notes && <span className="dashboard-task-note">{task.notes}</span>}
                            </div>
                          )
                        })
                    }
                  </div>
                  {/* Open column */}
                  <div className="dashboard-task-col">
                    <div className="dashboard-task-col-label">Open</div>
                    {(activeBuild.tasks || []).filter((t) => t.status === 'open').length === 0
                      ? <p className="empty-note" style={{ fontSize: '0.82rem' }}>None</p>
                      : (activeBuild.tasks || []).filter((t) => t.status === 'open').map((task) => {
                          const linkedPart = activeBuild.parts.find((p) => p.id === task.partId)
                          return (
                            <div key={task.id} className="dashboard-task-chip task-status-open" onClick={() => { startTransition(() => setActiveTab('tasks')); setExpandedTaskId(task.id) }}>
                              <strong>{task.title}</strong>
                              {linkedPart && <span>🔗 {linkedPart.name}</span>}
                              {task.deadline && <span>📅 {formatDate(task.deadline)}</span>}
                            </div>
                          )
                        })
                    }
                  </div>
                </div>
              )}
            </article>

            <div className="section-grid two">
              <article className="card">
                <div className="card-title">Current build summary</div>
                <div className="summary-list">
                  <div><span>Brief</span><strong>{activeBuild.brief || 'No build brief yet.'}</strong></div>
                  <div><span>Next milestone</span><strong>{activeBuild.nextMilestone || 'No next milestone yet.'}</strong></div>
                  <div><span>Customer-facing summary</span><strong>{activeBuild.portalSummary || 'No portal summary yet.'}</strong></div>
                </div>
              </article>

              <article className="card">
                <div className="card-title">Customer and budget</div>
                <div className="summary-list">
                  <div><span>Client name</span><strong>{activeBuild.client.name || 'Not set'}</strong></div>
                  <div><span>Client email</span><strong>{activeBuild.client.email || 'Not set'}</strong></div>
                  <div><span>Budget target</span><strong>{money.format(activeBuild.budget.target)}</strong></div>
                  {hasShopTier && isShop ? <div><span>Labor cost</span><strong>{money.format(laborSpend)}</strong></div> : null}
                  <div><span>Portal status</span><strong>{activeBuild.client.portalStatus}</strong></div>
                </div>
              </article>
            </div>

            <article className="card">
              <div className="card-title">Phase checklist</div>
              <div className="phase-table">
                {activeBuild.phases.map((phase) => (
                  <div className="phase-row-item" key={phase.id}>
                    <input checked={phase.done} disabled={!isShop} onChange={(event) => updatePhase(phase.id, 'done', event.target.checked)} type="checkbox" />
                    <input disabled={!isShop} onChange={(event) => updatePhase(phase.id, 'name', event.target.value)} placeholder="Phase name" value={phase.name} />
                    <div className="phase-detail-stack">
                      <input disabled={!isShop} onChange={(event) => updatePhase(phase.id, 'owner', event.target.value)} placeholder="Owner" value={phase.owner} />
                      <input disabled={!isShop} onChange={(event) => updatePhase(phase.id, 'blockedOn', event.target.value)} placeholder="Blocked on (optional)" value={phase.blockedOn || ''} />
                      {phase.blockedOn ? <span className="pill warn">Blocked on {phase.blockedOn}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            </article>

            {isShop ? (
              <TechnicianNotes
                draft={techDrafts.dashboard}
                entries={activeBuild.technicianNotes?.dashboard || []}
                onChange={(value) => setTechDrafts((current) => ({ ...current, dashboard: value }))}
                onDelete={(noteId) => deleteTechnicianNote('dashboard', noteId)}
                onSubmit={(event) => { event.preventDefault(); addTechnicianNote('dashboard') }}
                title="Dashboard technician notes"
              />
            ) : null}
          </section>
      )
}