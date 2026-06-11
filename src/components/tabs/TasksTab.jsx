import { useApp } from '../../context/AppContext'
import { formatDate, statusClass, money } from '../../constants'
import AppSelect from '../AppSelect'
import PhotoStrip from '../PhotoStrip'

export default function TasksTab() {
  const {
    activeBuild, isShop,
    newTask, setNewTask, addTask, deleteTask, cycleTaskStatus,
    expandedTaskId, setExpandedTaskId, taskNoteDrafts, setTaskNoteDrafts, commitTaskNotes,
    handleTaskPhotos, addTaskPhoto,
  } = useApp()

  return (
<section className="page-section">
            {isShop ? (
              <article className="card">
                <div className="card-title">Add task</div>
                <form className="form-grid three" onSubmit={addTask}>
                  <input
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Task title"
                    value={newTask.title}
                  />
                  <AppSelect
                    onChange={(e) => setNewTask({ ...newTask, partId: e.target.value })}
                    value={newTask.partId}
                  >
                    <option value="">Not linked to a part</option>
                    {activeBuild.parts.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </AppSelect>
                  <input
                    type="date"
                    onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                    value={newTask.deadline}
                  />
                  <textarea
                    className="span-two"
                    onChange={(e) => setNewTask({ ...newTask, details: e.target.value })}
                    placeholder="Task details"
                    rows="3"
                    value={newTask.details}
                  />
                  <div className="photo-upload-field">
                    <span className="field-label">Photos (optional)</span>
                    <input accept="image/*" multiple onChange={handleTaskPhotos} type="file" />
                  </div>
                  <button className="button primary" type="submit">Add task</button>
                </form>
                {newTask.photos.length > 0 && <PhotoStrip photos={newTask.photos} />}
              </article>
            ) : null}

            <article className="card">
              <div className="card-title">Tasks</div>
              {(activeBuild.tasks || []).length === 0 ? (
                <p className="empty-note">No tasks yet. Add one above to get started.</p>
              ) : (
                <div className="task-list">
                  {[...( activeBuild.tasks || [])].sort((a, b) => {
                    const order = { in_progress: 0, open: 1, done: 2 }
                    return (order[a.status] ?? 1) - (order[b.status] ?? 1)
                  }).map((task) => {
                    const linkedPart = activeBuild.parts.find((p) => p.id === task.partId)
                    const isExpanded = expandedTaskId === task.id
                    const noteDraft = taskNoteDrafts[task.id] ?? task.notes ?? ''
                    return (
                      <div key={task.id} className={`task-card task-status-${task.status}`}>
                        <div
                          className="task-card-header"
                          onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                        >
                          <div className="task-card-title">
                            <strong>{task.title}</strong>
                            <div className="task-card-meta">
                              {linkedPart && <span>🔗 {linkedPart.name}</span>}
                              {task.deadline && <span>📅 {formatDate(task.deadline)}</span>}
                            </div>
                          </div>
                          <span className={`pill ${statusClass(task.status)}`}>
                            {task.status.replace('_', ' ')}
                          </span>
                          <span className="task-expand-icon">{isExpanded ? '▲' : '▼'}</span>
                        </div>
                        {isExpanded && (
                          <div className="task-card-body">
                            {task.details && (
                              <div className="task-details-block">
                                <span className="field-label">Details</span>
                                <p>{task.details}</p>
                              </div>
                            )}
                            <div>
                              <span className="field-label">In-progress notes</span>
                              <textarea
                                rows="3"
                                placeholder="Add notes as you work…"
                                value={noteDraft}
                                onChange={(e) => setTaskNoteDrafts((d) => ({ ...d, [task.id]: e.target.value }))}
                                onBlur={() => commitTaskNotes(task.id)}
                              />
                            </div>
                            {(task.photos || []).length > 0 && <PhotoStrip photos={task.photos} />}
                            {isShop && (
                              <div className="photo-upload-field inline-file-button">
                                <label className="button small subtle">
                                  Add photos
                                  <input accept="image/*" multiple onChange={(e) => addTaskPhoto(task.id, e)} type="file" style={{ display: 'none' }} />
                                </label>
                              </div>
                            )}
                            {isShop && (
                              <div className="row-actions">
                                <button className="button small subtle" onClick={() => cycleTaskStatus(task.id)}>
                                  {task.status === 'open' ? 'Start' : task.status === 'in_progress' ? 'Mark done' : 'Reopen'}
                                </button>
                                <button className="button small subtle delete-button" onClick={() => deleteTask(task.id)}>Delete</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </article>
          </section>
      )
}