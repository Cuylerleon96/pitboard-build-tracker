import AppSelect from './AppSelect'

function TeamAdminCard({ authBusy, onPromote, onRefresh, profiles }) {
  return (
    <article className="card">
      <div className="card-toolbar">
        <div className="card-title">Team admin</div>
        <button className="button small subtle" disabled={authBusy} onClick={onRefresh}>Refresh</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Email</th><th>Name</th><th>Role</th><th>Admin</th><th>Tier</th><th /></tr>
          </thead>
          <tbody>
            {profiles.length === 0 ? (
              <tr><td className="empty-cell" colSpan="6">No team accounts found yet.</td></tr>
            ) : profiles.map((teamMember) => (
              <tr key={teamMember.id}>
                <td>{teamMember.email || '-'}</td>
                <td>{teamMember.full_name || '-'}</td>
                <td>{teamMember.role}</td>
                <td>{teamMember.is_admin ? 'Yes' : 'No'}</td>
                <td>
                  <AppSelect
                    disabled={authBusy}
                    value={teamMember.tier || 'free'}
                    onChange={(e) => onPromote(teamMember, { tier: e.target.value })}
                  >
                    <option value="free">free</option>
                    <option value="garage">garage</option>
                    <option value="shop">shop</option>
                  </AppSelect>
                </td>
                <td>
                  <div className="row-actions">
                    <button className="button small subtle" disabled={authBusy || teamMember.role === 'shop'} onClick={() => onPromote(teamMember, { role: 'shop' })}>Make shop</button>
                    <button className="button small subtle" disabled={authBusy || teamMember.role === 'customer'} onClick={() => onPromote(teamMember, { role: 'customer', is_admin: false })}>Make customer</button>
                    <button className="button small subtle" disabled={authBusy || teamMember.is_admin} onClick={() => onPromote(teamMember, { is_admin: true, role: 'shop' })}>Make admin</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  )
}

export default TeamAdminCard
