import { useEffect, useRef, useState } from 'react';

export type SelectOption = {
  value: string;
  label: string;
};

type CustomSelectProps = {
  value: string;
  options: SelectOption[];
  placeholder?: string;
  onChange: (value: string) => void;
};

export function CustomSelect({
  value,
  options,
  placeholder = 'Seleccionar...',
  onChange,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = options.find((opt) => opt.value === value);

  return (
    <div className="custom-select-wrap" ref={containerRef}>
      <button
        type="button"
        className={`custom-select-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <span className="custom-select-value">{selected ? selected.label : placeholder}</span>
        <svg
          className={`custom-select-arrow ${open ? 'rotated' : ''}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="custom-select-menu" role="listbox">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`custom-select-option ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                <span>{opt.label}</span>
                {isSelected && <span className="custom-select-check">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
