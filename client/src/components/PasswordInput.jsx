import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// Password input with a show/hide visibility toggle.
const PasswordInput = ({ value, onChange, placeholder, required, minLength, disabled, ...rest }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        {...rest}
        type={visible ? 'text' : 'password'}
        className="input-field"
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        disabled={disabled}
        value={value}
        onChange={onChange}
        style={{ width: '100%', paddingRight: '44px' }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        title={visible ? 'Hide password' : 'Show password'}
        style={{
          position: 'absolute',
          right: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          padding: '4px',
        }}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
};

export default PasswordInput;
