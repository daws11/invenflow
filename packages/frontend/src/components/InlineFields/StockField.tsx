import { InlineEditCell } from '../InlineEditCell';
import { CubeIcon } from '@heroicons/react/24/outline';

interface StockFieldProps {
  value: number | null;
  onSave: (value: number) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function StockField({ value, onSave, disabled = false, className = '' }: StockFieldProps) {
  return (
    <InlineEditCell
      value={value || ''}
      onSave={async (value: string | number) => await onSave(Number(value))}
      type="number"
      placeholder="0"
      disabled={disabled}
      className={className}
      displayValue={value !== null ? (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
          <CubeIcon className="h-4 w-4 mr-1" />
          Stock: {value}
        </span>
      ) : undefined}
      validation={(inputValue) => {
        if (inputValue && (isNaN(Number(inputValue)) || Number(inputValue) < 0)) {
          return 'Stock level must be a non-negative number';
        }
        return null;
      }}
    />
  );
}
