import { useEffect, useRef, useState } from 'react'

function AppSelect({ value, onChange, disabled, className, style, onClick, children }) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const ref = useRef(null)
  const menuRef = useRef(null)
  const optionRefs = useRef([])

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
  const selectedIndex = options.findIndex((o) => String(o.value) === String(value ?? ''))

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        // Don't close if user is clicking a submit button — let the click through
        if (e.target.type === 'submit') return
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  // Scroll active option into view
  useEffect(() => {
    if (open && activeIndex >= 0 && optionRefs.current[activeIndex]) {
      optionRefs.current[activeIndex].scrollIntoView({ block: 'nearest' })
    }
  }, [open, activeIndex])

  function handleTrigger(e) {
    if (onClick) onClick(e)
    if (!disabled) {
      setOpen((v) => {
        if (!v) setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
        return !v
      })
    }
  }

  function handlePick(opt, e) {
    if (e) e.stopPropagation()
    if (opt.disabled) return
    onChange({ target: { value: opt.value } })
    setOpen(false)
  }

  function handleKeyDown(e) {
    if (disabled) return

    switch (e.key) {
      case 'Enter':
      case ' ': {
        e.preventDefault()
        if (open && activeIndex >= 0 && !options[activeIndex]?.disabled) {
          handlePick(options[activeIndex])
        } else if (!open) {
          setOpen(true)
          setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
        }
        break
      }
      case 'ArrowDown': {
        e.preventDefault()
        if (!open) {
          setOpen(true)
          setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
          return
        }
        setActiveIndex((prev) => {
          let next = prev + 1
          while (next < options.length && options[next]?.disabled) next++
          return next < options.length ? next : prev
        })
        break
      }
      case 'ArrowUp': {
        e.preventDefault()
        if (!open) {
          setOpen(true)
          setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
          return
        }
        setActiveIndex((prev) => {
          let next = prev - 1
          while (next >= 0 && options[next]?.disabled) next--
          return next >= 0 ? next : prev
        })
        break
      }
      case 'Home': {
        if (!open) return
        e.preventDefault()
        const first = options.findIndex((o) => !o.disabled)
        if (first >= 0) setActiveIndex(first)
        break
      }
      case 'End': {
        if (!open) return
        e.preventDefault()
        for (let i = options.length - 1; i >= 0; i--) {
          if (!options[i]?.disabled) { setActiveIndex(i); break }
        }
        break
      }
      case 'Escape': {
        if (open) {
          e.preventDefault()
          setOpen(false)
        }
        break
      }
      case 'Tab': {
        setOpen(false)
        break
      }
      default: {
        // Type-ahead: jump to first option starting with typed character
        if (open && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          const char = e.key.toLowerCase()
          const start = activeIndex + 1
          const idx = options.findIndex((o, i) => i >= start && !o.disabled && String(o.label).toLowerCase().startsWith(char))
          if (idx >= 0) {
            setActiveIndex(idx)
          } else {
            // Wrap around
            const wrapIdx = options.findIndex((o, i) => i < start && !o.disabled && String(o.label).toLowerCase().startsWith(char))
            if (wrapIdx >= 0) setActiveIndex(wrapIdx)
          }
        }
        break
      }
    }
  }

  return (
    <div
      ref={ref}
      className={`app-select${disabled ? ' app-select--disabled' : ''}${open ? ' app-select--open' : ''}${className ? ' ' + className : ''}`}
      style={style}
    >
      <div
        className="app-select-trigger"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-activedescendant={open && activeIndex >= 0 ? `app-select-opt-${activeIndex}` : undefined}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onMouseDown={handleTrigger}
        onKeyDown={handleKeyDown}
      >
        <span className="app-select-value">{selectedLabel}</span>
        <span className="app-select-arrow" aria-hidden="true">{open ? '▴' : '▾'}</span>
      </div>
      {open && (
        <div className="app-select-menu" ref={menuRef} role="listbox" aria-label={selectedLabel || 'Options'}>
          {options.map((opt, i) => (
            <div
              key={i}
              ref={(el) => { optionRefs.current[i] = el }}
              id={`app-select-opt-${i}`}
              className={`app-select-option${String(opt.value) === String(value ?? '') ? ' app-select-option--selected' : ''}${opt.disabled ? ' app-select-option--disabled' : ''}${i === activeIndex ? ' app-select-option--active' : ''}`}
              role="option"
              aria-selected={String(opt.value) === String(value ?? '')}
              aria-disabled={opt.disabled || undefined}
              onMouseDown={(e) => { e.stopPropagation(); handlePick(opt, e) }}
              onMouseEnter={() => setActiveIndex(i)}
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
