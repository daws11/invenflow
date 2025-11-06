import { useState, useEffect } from 'react';
import { ThresholdRule, ThresholdOperator, ThresholdTimeUnit } from '@invenflow/shared';
import { ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface ThresholdRuleBuilderProps {
  onSave: (rule: Omit<ThresholdRule, 'id' | 'priority'>) => void;
  onCancel: () => void;
  initialRule?: ThresholdRule | null;
  existingRulesCount?: number;
}

const OPERATOR_OPTIONS: { value: ThresholdOperator; label: string }[] = [
  { value: '>', label: 'More than' },
  { value: '<', label: 'Less than' },
  { value: '>=', label: 'At least' },
  { value: '<=', label: 'At most' },
  { value: '=', label: 'Exactly' },
];

const TIME_UNITS: { value: ThresholdTimeUnit; label: string; singular: string }[] = [
  { value: 'minutes', label: 'Minutes', singular: 'minute' },
  { value: 'hours', label: 'Hours', singular: 'hour' },
  { value: 'days', label: 'Days', singular: 'day' },
];

const PRESET_COLORS = [
  { name: 'Green', value: '#10b981', emoji: '🟢' },
  { name: 'Yellow', value: '#f59e0b', emoji: '🟡' },
  { name: 'Orange', value: '#f97316', emoji: '🟠' },
  { name: 'Red', value: '#ef4444', emoji: '🔴' },
  { name: 'Blue', value: '#3b82f6', emoji: '🔵' },
  { name: 'Purple', value: '#8b5cf6', emoji: '🟣' },
];

export function ThresholdRuleBuilder({ 
  onSave, 
  onCancel, 
  initialRule, 
  existingRulesCount: _existingRulesCount 
}: ThresholdRuleBuilderProps) {
  const [operator, setOperator] = useState<ThresholdOperator>(initialRule?.operator || '>');
  const [value, setValue] = useState<number>(initialRule?.value || 2);
  const [unit, setUnit] = useState<ThresholdTimeUnit>(initialRule?.unit || 'hours');
  const [color, setColor] = useState<string>(initialRule?.color || '#f59e0b');

  useEffect(() => {
    if (initialRule) {
      setOperator(initialRule.operator);
      setValue(initialRule.value);
      setUnit(initialRule.unit);
      setColor(initialRule.color);
    }
  }, [initialRule]);

  const handleSave = () => {
    onSave({ operator, value, unit, color });
  };

  const getOperatorLabel = () => {
    const option = OPERATOR_OPTIONS.find(o => o.value === operator);
    return option?.label.toLowerCase() || operator;
  };

  const getUnitLabel = () => {
    const unitOption = TIME_UNITS.find(u => u.value === unit);
    return value === 1 ? unitOption?.singular : unit;
  };

  const getRulePreview = () => {
    return `Products ${getOperatorLabel()} ${value} ${getUnitLabel()} in column`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <ClockIcon className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          {initialRule ? 'Edit Threshold Rule' : 'Create Threshold Rule'}
        </h3>
      </div>

      {/* Main Form */}
      <div className="space-y-4">
        {/* Condition & Time - Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Operator Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Condition
            </label>
            <select
              value={operator}
              onChange={(e) => setOperator(e.target.value as ThresholdOperator)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {OPERATOR_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Time Value Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                value={value}
                onChange={(e) => setValue(parseInt(e.target.value) || 1)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as ThresholdTimeUnit)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {TIME_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Color Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Alert Color
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setColor(preset.value)}
                className={`relative p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                  color === preset.value
                    ? 'border-blue-600 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                title={preset.name}
              >
                <div
                  className="w-full h-8 rounded"
                  style={{ backgroundColor: preset.value }}
                />
                <span className="absolute top-1 right-1 text-sm">{preset.emoji}</span>
                {color === preset.value && (
                  <CheckCircleIcon className="absolute -top-1 -right-1 w-5 h-5 text-blue-600 bg-white rounded-full" />
                )}
              </button>
            ))}
          </div>
          
          {/* Custom Color Picker */}
          <div className="mt-3 flex items-center gap-3">
            <label className="text-sm text-gray-600">Custom:</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#000000"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
        <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <span>👁️</span>
          <span>Preview</span>
        </p>
        <div
          className="bg-white rounded-lg p-4 border-l-4 shadow-sm"
          style={{
            borderLeftColor: color,
            backgroundColor: `${color}15`,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-3 h-3 rounded-full animate-pulse"
              style={{ backgroundColor: color }}
            />
            <h4 className="font-semibold text-gray-900">Sample Product Card</h4>
          </div>
          <p className="text-sm text-gray-600">{getRulePreview()}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <CheckCircleIcon className="w-5 h-5" />
          {initialRule ? 'Update Rule' : 'Create Rule'}
        </button>
      </div>
    </div>
  );
}
