const TIER_FEATURES = {
  free: ['Unlimited builds', 'Parts & wiring tracker', 'Tune log import', 'Customer portal', 'Ads shown in app'],
  garage: ['Everything in Free', 'No ads', 'Labor & cost tracking'],
  shop: ['Everything in Garage', 'Full team management', 'Multi-technician labor logs'],
}

const TIER_LABELS = { free: 'Free', garage: 'Garage', shop: 'Shop' }

function BillingCard({ billingBusy, currentTier, onManage, onUpgrade }) {
  return (
    <article className="card">
      <div className="card-title">Plan &amp; billing</div>
      <div className="section-grid three billing-tiers">
        {['free', 'garage', 'shop'].map((tier) => {
          const isActive = currentTier === tier
          return (
            <div key={tier} className={`billing-tier-card${isActive ? ' active' : ''}`}>
              <div className="billing-tier-name">{TIER_LABELS[tier]}{isActive ? <span className="billing-current-badge">current</span> : null}</div>
              <ul className="billing-feature-list">
                {TIER_FEATURES[tier].map((f) => <li key={f}>{f}</li>)}
              </ul>
              {tier === 'free' ? null : isActive ? (
                <button className="button small subtle" disabled={billingBusy} onClick={onManage}>Manage billing</button>
              ) : (
                <button
                  className="button small primary"
                  disabled={billingBusy || (currentTier === 'shop' && tier === 'garage')}
                  onClick={() => onUpgrade(tier)}
                >
                  {currentTier === 'shop' && tier === 'garage' ? 'Downgrade in portal' : `Upgrade to ${TIER_LABELS[tier]}`}
                </button>
              )}
            </div>
          )
        })}
      </div>
      {currentTier !== 'free' ? (
        <div className="settings-copy" style={{ marginTop: '0.75rem' }}>
          <button className="button ghost small" disabled={billingBusy} onClick={onManage}>Manage subscription / invoices</button>
        </div>
      ) : null}
    </article>
  )
}

export default BillingCard
