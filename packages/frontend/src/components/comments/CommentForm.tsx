import { FormEvent, useState } from 'react';
import { COMMENT_CHAR_LIMIT } from '@invenflow/shared';

interface CommentFormProps {
  onSubmit: (content: string) => Promise<void> | void;
  onCancel?: () => void;
  initialValue?: string;
  isSubmitting?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  submitLabel?: string;
  cancelLabel?: string;
  rows?: number;
  resetOnSubmit?: boolean;
}

export function CommentForm({
  onSubmit,
  onCancel,
  initialValue = '',
  isSubmitting,
  autoFocus,
  placeholder = 'Leave a comment...',
  submitLabel = 'Add Comment',
  cancelLabel = 'Cancel',
  rows = 3,
  resetOnSubmit = true,
}: CommentFormProps) {
  const [value, setValue] = useState(initialValue);
  const [isLocalSubmitting, setIsLocalSubmitting] = useState(false);

  const isBusy = isSubmitting ?? isLocalSubmitting;
  const remaining = COMMENT_CHAR_LIMIT - value.length;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || isBusy) {
      return;
    }

    try {
      setIsLocalSubmitting(true);
      await onSubmit(trimmed);
      if (resetOnSubmit) {
        setValue('');
      }
    } finally {
      setIsLocalSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value.slice(0, COMMENT_CHAR_LIMIT))}
        placeholder={placeholder}
        rows={rows}
        autoFocus={autoFocus}
        maxLength={COMMENT_CHAR_LIMIT}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        disabled={isBusy}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-gray-500">{remaining} characters remaining</div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isBusy}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="submit"
            disabled={isBusy || !value.trim()}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isBusy ? 'Saving...' : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}

