import { useEffect, useRef, useState } from 'react'

function AppSelect({ value, onChange, disabled, className, style, onClick, children }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Parse <option> children into {value, label, disabled} objects
  const options = []
  ;(Array.isArray(children) ? children.flat() : [children]).forEach((child) => {
    if (!child || child.type !== 'option') return
    options.push({
      value: child.props.value !== undefined ? child.props.value : child.props.children,
      label: child.props.children,
      disabled: child.props.disabled || false,
    })
  })

  const selectedLabel = options.find((o) => String(o.value) === String(value ?? ''))?.label ?? value ?? ''

  useEffect(() => {
    if (!open) return
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  function handleTrigger(e) {
    if (onClick) onClick(e)
    if (!disabled) setOpen((v) => !v)
  }

  function handlePick(opt, e) {
    e.stopPropagation()
    if (opt.disabled) return
    onChange({ target: { value: opt.value } })
    setOpen(false)
  }

  return (
    <div
      ref={ref}
      className={`app-select${disabled ? ' app-select--disabled' : ''}${open ? ' app-select--open' : ''}${className ? ' ' + className : ''}`}
      style={style}
    >
      <div className="app-select-trigger" onMouseDown={handleTrigger}>
        <span className="app-select-value">{selectedLabel}</span>
        <span className="app-select-arrow">{open ? '▴' : '▾'}</span>
      </div>
      {open && (
        <div className="app-select-menu">
          {options.map((opt, i) => (
            <div
              key={i}
              className={`app-select-option${String(opt.value) === String(value ?? '') ? ' app-select-option--selected' : ''}${opt.disabled ? ' app-select-option--disabled' : ''}`}
              onMouseDown={(e) => handlePick(opt, e)}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AppSelect
