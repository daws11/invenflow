import { DEFAULT_PRIORITIES } from '@invenflow/shared';
import { InlineEditCell } from '../InlineEditCell';

interface PriorityFieldProps {
  value: string | null;
  onSave: (value: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function PriorityField({ value, onSave, disabled = false, className = '' }: PriorityFieldProps) {
  const priorityOptions = DEFAULT_PRIORITIES.map(pri => ({ value: pri, label: pri }));

  const getPriorityColor = (priority: string | null) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <InlineEditCell
      value={value || ''}
      onSave={onSave}
      type="select"
      options={priorityOptions}
      placeholder="Select priority"
      disabled={disabled}
      className={className}
      displayValue={value ? (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(value)}`}>
          {value}
        </span>
      ) : undefined}
    />
  );
}
