import { InlineEditCell } from '../InlineEditCell';

interface NotesFieldProps {
  value: string | null;
  onSave: (value: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  rows?: number;
}

export function NotesField({ 
  value, 
  onSave, 
  disabled = false, 
  className = '',
  placeholder = 'Enter notes...',
  rows = 3
}: NotesFieldProps) {
  return (
    <InlineEditCell
      value={value || ''}
      onSave={async (value: string | number) => await onSave(String(value))}
      type="textarea"
      placeholder={placeholder}
      rows={rows}
      maxLength={1000}
      disabled={disabled}
      className={className}
      displayValue={value ? (
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded whitespace-pre-wrap">
          {value}
        </div>
      ) : undefined}
    />
  );
}
