import React from 'react';

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  error,
  children
}) => {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1"
      >
        {label}
      </label>
      {children}
      {error && (
        <p className="text-[10px] text-error-500 mt-1 font-bold">{error}</p>
      )}
    </div>
  );
};

export default FormField;
