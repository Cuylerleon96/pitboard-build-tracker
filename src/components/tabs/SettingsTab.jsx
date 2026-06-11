import { useApp } from '../../context/AppContext'
import { buildStatuses, vehicleTypes, years, getMakeOptions, getModelOptions, getVehicleLabel, portalStatuses } from '../../constants'
import AppSelect from '../AppSelect'
import BillingCard from '../BillingCard'
import TeamAdminCard from '../TeamAdminCard'

export default function SettingsTab() {
  const {
    workspace, activeBuild, isShop, isAdmin, role, currentTier, authState, authForm, authBusy,
    updateAuthForm, persistProfile, handleSignOut, setNotice,
    updateShopField, updateBuildField, updateBuildVehicleField, updateBuildBudget, updateClientField,
    updateActiveBuild,
    billingBusy, handleManageBilling, handleUpgrade,
    promoteProfile, refreshTeamProfiles, teamProfiles,
  } = useApp()

  return (
<section className="page-section">
            <div className="section-grid two">
              <article className="card">
                <div className="card-title">Account and role</div>
                <div className="settings-copy account-screen">
                  <p>The signed-in account below is the one using this workspace. Shop users can edit everything. Customer users get the cleaner read-only portal view.</p>
                  {authState.status === 'cloud' && (
                    <div className="stack-form">
                      <div className="info-line">Signed in as {authState.session.user.email}</div>
                      <div className="info-line">Role: {role}{isAdmin ? ' | shop admin' : ''}</div>
                      <label>
                        <span className="field-label">Your name</span>
                        <input onChange={(event) => updateAuthForm('fullName', event.target.value)} value={authForm.fullName} />
                      </label>
                      {role === 'shop' ? (
                        <label>
                          <span className="field-label">Shop name</span>
                          <input onChange={(event) => updateAuthForm('shopName', event.target.value)} value={authForm.shopName} />
                        </label>
                      ) : null}
                      <div className="info-line">
                        Google sign-in is available from the account screen, and email/password sign-in happens directly in the app instead of through emailed links.
                      </div>
                      <button className="button primary" disabled={authBusy} onClick={() => persistProfile().then((result) => setNotice(result.ok ? 'Account details saved.' : result.message))}>Save account details</button>
                      <button className="button ghost" onClick={handleSignOut}>Sign out</button>
                    </div>
                  )}
                </div>
              </article>

              {isShop ? (
                <article className="card">
                  <div className="card-title">Shop settings</div>
                  <div className="stack-form">
                    <label><span className="field-label">App / shop name</span><input onChange={(event) => updateShopField('name', event.target.value)} value={workspace.shop.name} /></label>
                    <label><span className="field-label">Subtitle</span><input onChange={(event) => updateShopField('subtitle', event.target.value)} value={workspace.shop.subtitle} /></label>
                    <label><span className="field-label">Shop email</span><input onChange={(event) => updateShopField('email', event.target.value)} value={workspace.shop.email} /></label>
                  </div>
                </article>
              ) : (
                <article className="card">
                  <div className="card-title">Customer access</div>
                  <div className="settings-copy">
                    <p>You are in customer mode. This view is meant for progress review, tune history, and shared build updates.</p>
                    <p className="info-line">If you need shop-level editing, switch the role back to `shop` from the role selector above.</p>
                  </div>
                </article>
              )}
            </div>

            {authState.status === 'cloud' ? (
              <BillingCard
                billingBusy={billingBusy}
                currentTier={currentTier}
                onManage={handleManageBilling}
                onUpgrade={handleUpgrade}
              />
            ) : null}

            {isAdmin ? (
              <TeamAdminCard
                authBusy={authBusy}
                onPromote={promoteProfile}
                onRefresh={refreshTeamProfiles}
                profiles={teamProfiles}
              />
            ) : null}

            {isShop ? (
              <article className="card">
                <div className="card-title">Active build details</div>
                <div className="form-grid two">
                  <label><span className="field-label">Build name</span><input onChange={(event) => updateBuildField('name', event.target.value)} value={activeBuild.name} /></label>
                  <label><span className="field-label">Vehicle type</span><AppSelect onChange={(event) => updateActiveBuild((build) => { const vehicleType = event.target.value; const vehicleMake = getMakeOptions(vehicleType)[0]; const vehicleModel = getModelOptions(vehicleMake)[0]; const next = { ...build, vehicleType, vehicleMake, vehicleModel, updatedAt: new Date().toISOString() }; next.vehicle = getVehicleLabel(next); return next })} value={activeBuild.vehicleType || 'Truck'}>{vehicleTypes.map((vehicleType) => <option key={vehicleType} value={vehicleType}>{vehicleType}</option>)}</AppSelect></label>
                  <label><span className="field-label">Vehicle year</span><AppSelect onChange={(event) => updateBuildVehicleField('vehicleYear', event.target.value)} value={activeBuild.vehicleYear || ''}><option value="">Year</option>{years.map((year) => <option key={year} value={year}>{year}</option>)}</AppSelect></label>
                  <label><span className="field-label">Vehicle make</span><AppSelect onChange={(event) => updateActiveBuild((build) => { const vehicleMake = event.target.value; const vehicleModel = getModelOptions(vehicleMake)[0]; const next = { ...build, vehicleMake, vehicleModel, updatedAt: new Date().toISOString() }; next.vehicle = getVehicleLabel(next); return next })} value={activeBuild.vehicleMake || getMakeOptions(activeBuild.vehicleType || 'Truck')[0]}>{getMakeOptions(activeBuild.vehicleType || 'Truck').map((make) => <option key={make} value={make}>{make}</option>)}</AppSelect></label>
                  <label><span className="field-label">Vehicle model</span><AppSelect onChange={(event) => updateBuildVehicleField('vehicleModel', event.target.value)} value={activeBuild.vehicleModel || getModelOptions(activeBuild.vehicleMake || getMakeOptions(activeBuild.vehicleType || 'Truck')[0])[0]}>{getModelOptions(activeBuild.vehicleMake || getMakeOptions(activeBuild.vehicleType || 'Truck')[0]).map((model) => <option key={model} value={model}>{model}</option>)}</AppSelect></label>
                  <label><span className="field-label">Build status</span><AppSelect onChange={(event) => updateBuildField('status', event.target.value)} value={activeBuild.status}>{buildStatuses.map((status) => <option key={status}>{status}</option>)}</AppSelect></label>
                  <label><span className="field-label">Budget target</span><input onChange={(event) => updateBuildBudget(event.target.value)} type="number" value={activeBuild.budget.target} /></label>
                  <label><span className="field-label">Client name</span><input onChange={(event) => updateClientField('name', event.target.value)} value={activeBuild.client.name} /></label>
                  <label><span className="field-label">Client email</span><input onChange={(event) => updateClientField('email', event.target.value)} value={activeBuild.client.email} /></label>
                  <label><span className="field-label">Portal status</span><AppSelect onChange={(event) => updateClientField('portalStatus', event.target.value)} value={activeBuild.client.portalStatus}>{portalStatuses.map((status) => <option key={status}>{status}</option>)}</AppSelect></label>
                  <label className="span-two"><span className="field-label">Build brief</span><textarea onChange={(event) => updateBuildField('brief', event.target.value)} rows="3" value={activeBuild.brief} /></label>
                  <label className="span-two"><span className="field-label">Next milestone</span><textarea onChange={(event) => updateBuildField('nextMilestone', event.target.value)} rows="3" value={activeBuild.nextMilestone} /></label>
                  <label className="span-two"><span className="field-label">Customer portal summary</span><textarea onChange={(event) => updateBuildField('portalSummary', event.target.value)} rows="3" value={activeBuild.portalSummary} /></label>
                </div>
              </article>
            ) : null}
          </section>
  )
}
