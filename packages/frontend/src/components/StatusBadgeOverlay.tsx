import { CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

interface StatusBadgeOverlayProps {
  type: 'received' | 'stored';
  className?: string;
}

export function StatusBadgeOverlay({ type, className = '' }: StatusBadgeOverlayProps) {
  const getBadgeStyles = () => {
    switch (type) {
      case 'received':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'stored':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'received':
        return <ClockIcon className="w-3 h-3" />;
      case 'stored':
        return <CheckCircleIcon className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getLabelText = () => {
    switch (type) {
      case 'received':
        return 'Received';
      case 'stored':
        return 'Stored';
      default:
        return '';
    }
  };

  return (
    <div className={`absolute top-2 left-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getBadgeStyles()} ${className}`}>
      {getIcon()}
      <span className="ml-1">{getLabelText()}</span>
    </div>
  );
}