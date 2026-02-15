'use client';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Abbrechen',
  onConfirm,
  onCancel,
  variant = 'danger',
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: 'bg-loss hover:bg-loss-dark',
    warning: 'bg-yellow-600 hover:bg-yellow-700',
    info: 'bg-accent hover:bg-accent/90',
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-background-card rounded-lg shadow-2xl max-w-md w-full border-2 border-border">
        {/* Header */}
        <div className="px-6 py-4 border-b-2 border-border bg-background-elevated">
          <h2 className="text-xl font-semibold text-text-primary">
            {title}
          </h2>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-text-primary text-base leading-relaxed">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t-2 border-border bg-background-elevated flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-background text-text-primary border-2 border-border rounded-md hover:bg-border transition-colors font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-3 text-white rounded-md transition-colors font-semibold shadow-lg ${variantStyles[variant]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
