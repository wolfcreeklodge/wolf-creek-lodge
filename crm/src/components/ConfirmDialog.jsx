import React from 'react';
import Modal from './Modal';

export default function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  variant = 'danger',
}) {
  const btnClass =
    variant === 'danger'
      ? 'bg-ember text-white hover:bg-red-700'
      : 'bg-gold text-timber hover:bg-yellow-600';

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} size="sm">
      <div className="flex flex-col items-center text-center gap-4 py-2">
        {/* Warning icon */}
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
            variant === 'danger' ? 'bg-red-100 text-ember' : 'bg-yellow-100 text-gold'
          }`}
        >
          {variant === 'danger' ? '\u26a0' : '\u26a0'}
        </div>

        <p className="text-timber/80 font-body">{message}</p>

        <div className="flex gap-3 w-full mt-2">
          <button
            onClick={onCancel}
            className="flex-1 bg-parchment text-timber border border-wheat hover:bg-wheat rounded-lg px-4 py-2 font-body font-semibold focus:outline-none focus:ring-2 focus:ring-creek"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-lg px-4 py-2 font-body font-semibold focus:outline-none focus:ring-2 focus:ring-creek ${btnClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
