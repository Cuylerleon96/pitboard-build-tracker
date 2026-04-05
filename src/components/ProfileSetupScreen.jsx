import AppSelect from './AppSelect'
import { roles } from '../constants'

function ProfileSetupScreen({ authBusy, authForm, hasShopAdmin, onChange, onSubmit, userEmail }) {
  // If a shop admin already exists but THIS user has no profile, they may be the
  // original owner signing in on a new session. Allow them to reclaim the shop role.
  const lockedOut = hasShopAdmin && authForm.role !== 'shop'
  return (
    <div className="workspace-shell auth-shell">
      <div className="auth-panel">
        <div className="eyebrow">BuildPortal</div>
        <h1>Finish your account setup.</h1>
        <p>This only takes a moment. Pick whether this account is for the shop or for a customer login, then save it.</p>
        <div className="auth-status">Signed in as {userEmail}</div>
        <form className="stack-form auth-form" onSubmit={onSubmit}>
          <label>
            <span className="field-label">Account type</span>
            <AppSelect onChange={(event) => onChange('role', event.target.value)} value={authForm.role}>
              {roles.map((roleOption) => <option key={roleOption} value={roleOption}>{roleOption}</option>)}
            </AppSelect>
          </label>
          {hasShopAdmin && authForm.role !== 'shop' ? (
            <div className="info-line">
              A shop admin account already exists. If you are the shop owner, switch the type above to <strong>shop</strong>. Otherwise finish as a customer and an admin can promote you.
            </div>
          ) : null}
          <label>
            <span className="field-label">Your name</span>
            <input onChange={(event) => onChange('fullName', event.target.value)} placeholder="Your name" value={authForm.fullName} />
          </label>
          {authForm.role === 'shop' ? (
            <label>
              <span className="field-label">Shop name</span>
              <input onChange={(event) => onChange('shopName', event.target.value)} placeholder="Shop name" value={authForm.shopName} />
            </label>
          ) : null}
          <button className="button primary" disabled={authBusy} type="submit">{authBusy ? 'Saving...' : 'Save account setup'}</button>
        </form>
      </div>
    </div>
  )
}

export default ProfileSetupScreen
