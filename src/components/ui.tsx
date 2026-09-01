import React from 'react';

export const Card = ({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode; className?: string }) => (
  <div 
    className={`rounded-2xl p-5 border transition-colors shadow-xs ${className}`} 
    style={{
      backgroundColor: 'var(--card-bg, #FFFFFF)',
      borderColor: 'var(--border-main, #E2E8F0)',
      color: 'var(--text-main, #1E293B)',
      ...props.style
    }}
    {...props}
  >
    {children}
  </div>
);

export const Input = ({ label, containerClassName, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string, containerClassName?: string }) => (
  <div className={`flex flex-col gap-1.5 mb-4 ${containerClassName || ''}`}>
    {label && (
      <label 
        className="text-xs uppercase tracking-wider font-semibold opacity-80"
        style={{ color: 'var(--text-muted, #64748B)' }}
      >
        {label}
      </label>
    )}
    <input
      {...props}
      className={`border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 transition-all text-sm shadow-xs ${props.className || ''}`}
      style={{
        backgroundColor: 'var(--input-bg, #FFFFFF)',
        borderColor: 'var(--border-main, #E2E8F0)',
        color: 'var(--text-main, #1E293B)',
        ...props.style
      }}
    />
  </div>
);

export const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) => (
  <div className="flex flex-col gap-1.5 mb-4">
    {props.label && (
      <label 
        className="text-xs uppercase tracking-wider font-semibold opacity-80"
        style={{ color: 'var(--text-muted, #64748B)' }}
      >
        {props.label}
      </label>
    )}
    <textarea
      {...props}
      className={`border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 transition-all text-sm shadow-xs resize-none ${props.className || ''}`}
      style={{
        backgroundColor: 'var(--input-bg, #FFFFFF)',
        borderColor: 'var(--border-main, #E2E8F0)',
        color: 'var(--text-main, #1E293B)',
        ...props.style
      }}
    />
  </div>
);

export const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; options?: {value: string, label: string}[] }) => (
  <div className="flex flex-col gap-1.5 mb-4">
    {props.label && (
      <label 
        className="text-xs uppercase tracking-wider font-semibold opacity-80"
        style={{ color: 'var(--text-muted, #64748B)' }}
      >
        {props.label}
      </label>
    )}
    <div className="relative">
      <select
        {...props}
        className={`w-full appearance-none border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 transition-all text-sm shadow-xs ${props.className || ''}`}
        style={{
          backgroundColor: 'var(--input-bg, #FFFFFF)',
          borderColor: 'var(--border-main, #E2E8F0)',
          color: 'var(--text-main, #1E293B)',
          ...props.style
        }}
      >
        {props.children ? props.children : (
          <>
            <option value="" disabled>Pilih...</option>
            {props.options?.map((opt, i) => (
              <option key={`${opt.value}-${i}`} value={opt.value}>{opt.label}</option>
            ))}
          </>
        )}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 opacity-60" style={{ color: 'var(--text-muted, #64748B)' }}>
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
      </div>
    </div>
  </div>
);

export const Button = ({ children, variant = 'primary', size, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; size?: 'sm' | 'md' | 'lg' | string }) => {
  const isWidthSpecified = className.includes("w-") || className.includes("flex-1");
  const hasPadding = className.includes("p-") || className.includes("px-") || className.includes("py-") || className.includes("h-");
  const sizePadding = size === 'sm' ? 'py-1.5 px-3 text-xs' : size === 'lg' ? 'py-4 px-6 text-base' : 'py-3.5 px-4 text-sm';
  const baseStyle = `${isWidthSpecified ? "" : "w-full"} ${hasPadding ? "" : sizePadding} rounded-xl font-medium transition-all inline-flex items-center justify-center gap-2 active:scale-[0.98] tracking-wide shadow-xs border cursor-pointer`;
  
  const variants = {
    primary: "text-white border-transparent",
    secondary: "hover:opacity-90",
    danger: "bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30",
    ghost: "bg-transparent border-transparent shadow-none hover:bg-black/5 opacity-80 hover:opacity-100"
  };

  const dynamicStyle = variant === 'primary' 
    ? { backgroundColor: 'var(--primary, #2A9D8F)', borderColor: 'var(--primary, #2A9D8F)', color: '#FFFFFF', ...props.style }
    : variant === 'secondary'
    ? { backgroundColor: 'var(--card-bg, #FFFFFF)', borderColor: 'var(--border-main, #E2E8F0)', color: 'var(--text-main, #1E293B)', ...props.style }
    : props.style;

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} style={dynamicStyle} {...props}>
      {children}
    </button>
  );
};
