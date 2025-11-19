import { ChatBubbleOvalLeftEllipsisIcon } from '@heroicons/react/24/outline';
import { MouseEvent } from 'react';

type CommentBadgeVariant = 'card' | 'compact' | 'minimal';

interface CommentBadgeProps {
  count: number;
  variant?: CommentBadgeVariant;
  highlight?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement | HTMLSpanElement>) => void;
  className?: string;
  showZero?: boolean;
}

export function CommentBadge({
  count,
  variant = 'card',
  highlight,
  onClick,
  className = '',
  showZero = false,
}: CommentBadgeProps) {
  if (!showZero && count <= 0) {
    return null;
  }

  const baseStyles =
    'inline-flex items-center gap-1 rounded-full text-xs font-medium transition';

  const variantStyles: Record<CommentBadgeVariant, string> = {
    card: 'px-2 py-1 bg-gray-100 text-gray-700',
    compact: 'px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[11px]',
    minimal: 'px-1 py-0.5 bg-transparent text-gray-500',
  };

  const highlightStyles = highlight ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : '';

  const content = (
    <>
      <ChatBubbleOvalLeftEllipsisIcon className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{count}</span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseStyles} ${variantStyles[variant]} ${highlightStyles} hover:bg-blue-50 hover:text-blue-700 ${className}`.trim()}
        aria-label={`View ${count} comments`}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      className={`${baseStyles} ${variantStyles[variant]} ${highlightStyles} ${className}`.trim()}
      aria-label={`${count} comments`}
    >
      {content}
    </span>
  );
}

