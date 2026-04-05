import { useState } from 'react'
import AppSelect from './AppSelect'
import { roles } from '../constants'

function AuthScreen({
  authState,
  authMode,
  authForm,
  authBusy,
  hasShopAdmin,
  onAuthFormChange,
  onGoogleSignIn,
  onModeChange,
  onSubmit,
}) {
  return (
    <div className="workspace-shell auth-shell">
      <div className="auth-panel">
        <div className="eyebrow">BuildPortal</div>
        <h1>Sign in and get into the build.</h1>
        <p>
          Shops and customers can both sign in here. Use email and password right on the page, or continue with Google.
        </p>
        <div className="auth-tabs">
          <button className={`auth-tab ${authMode === 'sign-in' ? 'active' : ''}`} onClick={() => onModeChange('sign-in')} type="button">Sign in</button>
          <button className={`auth-tab ${authMode === 'sign-up' ? 'active' : ''}`} onClick={() => onModeChange('sign-up')} type="button">Create account</button>
        </div>
        <form className="stack-form auth-form" onSubmit={onSubmit}>
          <label>
            <span className="field-label">Email address</span>
            <input onChange={(event) => onAuthFormChange('email', event.target.value)} placeholder="name@example.com" type="email" value={authForm.email} />
          </label>
          <label>
            <span className="field-label">Password</span>
            <input onChange={(event) => onAuthFormChange('password', event.target.value)} placeholder="Enter your password" type="password" value={authForm.password} />
          </label>
          {authMode === 'sign-up' ? (
            <>
              <label>
                <span className="field-label">Account type</span>
                <AppSelect disabled={hasShopAdmin} onChange={(event) => onAuthFormChange('role', event.target.value)} value={hasShopAdmin ? 'customer' : authForm.role}>
                  {roles.map((roleOption) => <option key={roleOption} value={roleOption}>{roleOption}</option>)}
                </AppSelect>
              </label>
              {hasShopAdmin ? (
                <div className="info-line">
                  A shop admin already exists. New self-serve signups start as customer accounts and can be promoted by an admin later.
                </div>
              ) : null}
              <label>
                <span className="field-label">Your name</span>
                <input onChange={(event) => onAuthFormChange('fullName', event.target.value)} placeholder="Your name" value={authForm.fullName} />
              </label>
              {!hasShopAdmin && authForm.role === 'shop' ? (
                <label>
                  <span className="field-label">Shop name</span>
                  <input onChange={(event) => onAuthFormChange('shopName', event.target.value)} placeholder="Shop name" value={authForm.shopName} />
                </label>
              ) : null}
            </>
          ) : null}
          <button className="button primary" disabled={authBusy} type="submit">
            {authBusy ? 'Working...' : authMode === 'sign-up' ? 'Create account' : 'Sign in'}
          </button>
          <button className="button google-button" disabled={authBusy} onClick={onGoogleSignIn} type="button">Continue with Google</button>
        </form>
        <div className="auth-points">
          <div>
            <strong>First-time setup</strong>
            <span>Create the account here, then finish your role setup inside the app if needed.</span>
          </div>
          <div>
            <strong>Shop access</strong>
            <span>Shops can manage builds, parts, wiring, tunes, and settings.</span>
          </div>
          <div>
            <strong>Customer access</strong>
            <span>Customers can use the same sign-in flow and see a simplified workspace.</span>
          </div>
        </div>
        <div className="auth-status">
          {authState.status === 'loading' ? 'Checking session...' : 'Signed out'}
        </div>
      </div>
    </div>
  )
}

export default AuthScreen
