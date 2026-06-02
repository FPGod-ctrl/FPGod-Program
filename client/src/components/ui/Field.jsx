export function Field({ label, hint, children }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function TextInput({ label, hint, ...props }) {
  return (
    <Field label={label} hint={hint}>
      <input {...props} />
    </Field>
  );
}

export function Select({ label, hint, options, placeholder, ...props }) {
  return (
    <Field label={label} hint={hint}>
      <select {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) =>
          typeof o === 'string'
            ? <option key={o} value={o}>{o}</option>
            : <option key={o.value} value={o.value}>{o.label}</option>
        )}
      </select>
    </Field>
  );
}

export function TextArea({ label, hint, ...props }) {
  return (
    <Field label={label} hint={hint}>
      <textarea {...props} />
    </Field>
  );
}

export default Field;
