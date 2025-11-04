import { useState, useEffect } from 'react';
import { ThresholdRule, ThresholdOperator, ThresholdTimeUnit } from '@invenflow/shared';
import { 
  ClockIcon, 
  ChevronRightIcon,
  CheckCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

interface ThresholdRuleBuilderProps {
  onSave: (rule: Omit<ThresholdRule, 'id' | 'priority'>) => void;
  onCancel: () => void;
  initialRule?: ThresholdRule | null;
  existingRulesCount?: number;
}

interface OperatorOption {
  value: ThresholdOperator;
  label: string;
  description: string;
  icon: string;
  example: string;
}

const OPERATOR_OPTIONS: OperatorOption[] = [
  {
    value: '>',
    label: 'More than',
    description: 'Alert when products stay LONGER than specified time',
    icon: '⏱️',
    example: 'Products taking more than 2 hours',
  },
  {
    value: '<',
    label: 'Less than',
    description: 'Alert for products that move FASTER than specified time',
    icon: '⚡',
    example: 'Products processed in less than 1 hour',
  },
  {
    value: '>=',
    label: 'At least',
    description: 'Alert when products stay for AT LEAST the specified time',
    icon: '📊',
    example: 'Products taking at least 1 day',
  },
  {
    value: '<=',
    label: 'At most',
    description: 'Alert when products stay for AT MOST the specified time',
    icon: '⏰',
    example: 'Products done within 3 hours',
  },
  {
    value: '=',
    label: 'Exactly',
    description: 'Alert when products stay for EXACTLY the specified time',
    icon: '🎯',
    example: 'Products taking exactly 2 days',
  },
];

const TIME_UNITS: { value: ThresholdTimeUnit; label: string; singular: string }[] = [
  { value: 'minutes', label: 'Minutes', singular: 'minute' },
  { value: 'hours', label: 'Hours', singular: 'hour' },
  { value: 'days', label: 'Days', singular: 'day' },
];

const PRESET_COLORS = [
  { name: 'Green (Good)', value: '#10b981', emoji: '🟢', description: 'Everything is on track' },
  { name: 'Yellow (Warning)', value: '#f59e0b', emoji: '🟡', description: 'Needs attention soon' },
  { name: 'Orange (Attention)', value: '#f97316', emoji: '🟠', description: 'Action required' },
  { name: 'Red (Urgent)', value: '#ef4444', emoji: '🔴', description: 'Critical priority' },
  { name: 'Blue (Info)', value: '#3b82f6', emoji: '🔵', description: 'Informational' },
  { name: 'Purple (Special)', value: '#8b5cf6', emoji: '🟣', description: 'Special case' },
];

export function ThresholdRuleBuilder({ onSave, onCancel, initialRule, existingRulesCount: _existingRulesCount }: ThresholdRuleBuilderProps) {
  const [operator, setOperator] = useState<ThresholdOperator>(initialRule?.operator || '>');
  const [value, setValue] = useState<number>(initialRule?.value || 2);
  const [unit, setUnit] = useState<ThresholdTimeUnit>(initialRule?.unit || 'hours');
  const [color, setColor] = useState<string>(initialRule?.color || '#f59e0b');
  const [customColor, setCustomColor] = useState<string>('');
  const [step, setStep] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    if (initialRule) {
      setOperator(initialRule.operator);
      setValue(initialRule.value);
      setUnit(initialRule.unit);
      setColor(initialRule.color);
    }
  }, [initialRule]);

  const handleSave = () => {
    const finalColor = customColor || color;
    onSave({
      operator,
      value,
      unit,
      color: finalColor,
    });
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
    return `Show alert when products stay ${getOperatorLabel()} ${value} ${getUnitLabel()} in a column`;
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center flex-1">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${
              step >= s
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-gray-300 text-gray-400'
            }`}>
              {step > s ? (
                <CheckCircleIcon className="w-5 h-5" />
              ) : (
                <span className="text-sm font-medium">{s}</span>
              )}
            </div>
            {s < 3 && (
              <div className={`flex-1 h-0.5 mx-2 transition-all ${
                step > s ? 'bg-blue-600' : 'bg-gray-300'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Choose Condition */}
      {step === 1 && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <SparklesIcon className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">When should the alert trigger?</h3>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            Choose how you want to track time for products in this column
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {OPERATOR_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setOperator(option.value)}
                className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                  operator === option.value
                    ? 'border-blue-600 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{option.icon}</span>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">{option.label}</h4>
                    <p className="text-xs text-gray-600 mb-2">{option.description}</p>
                    <p className="text-xs text-blue-600 italic">e.g., {option.example}</p>
                  </div>
                  {operator === option.value && (
                    <CheckCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-end mt-6">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              Next: Set Time
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Set Time Duration */}
      {step === 2 && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <ClockIcon className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">How long in the column?</h3>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            Set the time duration for the alert condition
          </p>

          {/* Time Input */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={value}
                  onChange={(e) => setValue(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <input
                  type="number"
                  min="1"
                  value={value}
                  onChange={(e) => setValue(parseInt(e.target.value) || 1)}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center font-semibold"
                />
              </div>
            </div>

            {/* Unit Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Unit
              </label>
              <div className="grid grid-cols-3 gap-2">
                {TIME_UNITS.map((u) => (
                  <button
                    key={u.value}
                    type="button"
                    onClick={() => setUnit(u.value)}
                    className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                      unit === u.value
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-700 hover:border-blue-300'
                    }`}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-1">Preview:</p>
              <p className="text-lg font-semibold text-gray-900">
                {value} {getUnitLabel()}
              </p>
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              Next: Choose Color
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Choose Color */}
      {step === 3 && (
        <div className="space-y-4 animate-fade-in">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose alert color</h3>
          <p className="text-sm text-gray-600 mb-6">
            Select a color that represents the severity or meaning of this alert
          </p>

          {/* Preset Colors */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Recommended Colors
            </label>
            <div className="grid grid-cols-2 gap-3">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => {
                    setColor(preset.value);
                    setCustomColor('');
                  }}
                  className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                    color === preset.value && !customColor
                      ? 'border-blue-600 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg border-2 border-gray-200 flex-shrink-0"
                      style={{ backgroundColor: preset.value }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-lg">{preset.emoji}</span>
                        <h4 className="font-semibold text-gray-900 text-sm truncate">{preset.name}</h4>
                      </div>
                      <p className="text-xs text-gray-600">{preset.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or pick a custom color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={customColor || color}
                onChange={(e) => setCustomColor(e.target.value)}
                className="w-16 h-16 rounded-lg border-2 border-gray-300 cursor-pointer"
              />
              <div className="flex-1">
                <input
                  type="text"
                  value={customColor || color}
                  onChange={(e) => setCustomColor(e.target.value)}
                  placeholder="#000000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* Live Preview */}
          <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-4">👁️ Live Preview</p>
            <div
              className="bg-white rounded-lg p-4 border-l-4 shadow-sm"
              style={{
                borderLeftColor: customColor || color,
                backgroundColor: `${customColor || color}10`,
              }}
            >
              <h4 className="font-semibold text-gray-900 mb-2">Sample Product Card</h4>
              <p className="text-sm text-gray-600 mb-3">{getRulePreview()}</p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <ClockIcon className="w-4 h-4" />
                <span>In column for: {value} {getUnitLabel()}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Back
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <CheckCircleIcon className="w-5 h-5" />
                {initialRule ? 'Update Rule' : 'Create Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

