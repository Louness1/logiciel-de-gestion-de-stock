import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, footer, size = 'lg' }) {
  if (!open) return null;
  const widthClass = {
    sm: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    '2xl': 'max-w-3xl',
  }[size] || 'max-w-lg';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className={`w-full ${widthClass} max-h-[90vh] rounded-xl bg-white dark:bg-slate-900 shadow-xl flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — fixe en haut */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-3 flex-shrink-0">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>

        {/* Body — scrollable si trop grand */}
        <div className="p-5 overflow-y-auto flex-1 min-h-0">{children}</div>

        {/* Footer — fixe en bas, toujours visible */}
        {footer && (
          <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 px-5 py-3 flex-shrink-0 bg-white dark:bg-slate-900 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
