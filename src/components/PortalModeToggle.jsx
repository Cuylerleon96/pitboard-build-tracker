function PortalModeToggle({ mode, onChange, shopAccount }) {
  return (
    <div className="mode-pill-group" role="tablist" aria-label="Portal mode">
      <button className={`mode-pill ${mode === 'shop' ? 'active' : ''}`} disabled={!shopAccount} onClick={() => onChange('shop')} type="button">
        Shop
      </button>
      <button className={`mode-pill ${mode === 'customer' ? 'active' : ''}`} onClick={() => onChange('customer')} type="button">
        Customer
      </button>
    </div>
  )
}

export default PortalModeToggle
