import { useMemo } from 'react';
import { ThresholdRule } from '@invenflow/shared';
import { nanoid } from 'nanoid';
import {
  PlusIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

interface ThresholdSettingsSectionProps {
  thresholdRules: ThresholdRule[] | null | undefined;
  onChange: (rules: ThresholdRule[]) => void;
  kanbanType?: 'order' | 'receive';
  products?: any[];
}

export function ThresholdSettingsSection({ 
  thresholdRules, 
  onChange, 
  kanbanType: _kanbanType = 'order',
  products = []
}: ThresholdSettingsSectionProps) {
  const rawRules = thresholdRules || [];

  const sortedRules = useMemo(() => {
    const unitToMs = (unit: 'minutes' | 'hours' | 'days'): number => {
      switch (unit) {
        case 'minutes':
          return 1000 * 60;
        case 'hours':
          return 1000 * 60 * 60;
        case 'days':
          return 1000 * 60 * 60 * 24;
        default:
          return 0;
      }
    };

    return [...rawRules].sort((a, b) => {
      const aMs = a.value * unitToMs(a.unit as any);
      const bMs = b.value * unitToMs(b.unit as any);
      return aMs - bMs;
    });
  }, [rawRules]);

  const applyRulesUpdate = (rules: ThresholdRule[]) => {
    const unitToMs = (unit: 'minutes' | 'hours' | 'days'): number => {
      switch (unit) {
        case 'minutes':
          return 1000 * 60;
        case 'hours':
          return 1000 * 60 * 60;
        case 'days':
          return 1000 * 60 * 60 * 24;
        default:
          return 0;
      }
    };

    const normalized = rules.map(rule => ({
      ...rule,
      operator: '>' as ThresholdRule['operator'], // enforce "more than" semantics
    }));

    const sortedByTime = [...normalized].sort((a, b) => {
      const aMs = a.value * unitToMs(a.unit as any);
      const bMs = b.value * unitToMs(b.unit as any);
      return aMs - bMs;
    });

    const withPriority = sortedByTime.map((rule, index) => ({
      ...rule,
      priority: index + 1,
    }));

    onChange(withPriority);
  };

  const handleChangeRule = (id: string, updates: Partial<Pick<ThresholdRule, 'value' | 'unit' | 'color'>>) => {
    const updated = sortedRules.map(rule =>
      rule.id === id
        ? {
            ...rule,
            ...updates,
          }
        : rule
    );
    applyRulesUpdate(updated);
  };

  const handleDeleteRule = (id: string) => {
    const updated = sortedRules.filter(rule => rule.id !== id);
    applyRulesUpdate(updated);
  };

  const handleAddRule = () => {
    const last = sortedRules[sortedRules.length - 1];
    const defaultUnit = last?.unit || 'hours';
    const defaultValue = last ? Math.max(1, last.value * 2) : 2;
    const defaultColor = '#ef4444';

    const newRule: ThresholdRule = {
      id: nanoid(),
      operator: '>',
      value: defaultValue,
      unit: defaultUnit,
      color: defaultColor,
      priority: sortedRules.length + 1,
    };

    applyRulesUpdate([...sortedRules, newRule]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-blue-600" />
            Threshold Alert Rules
          </h4>
          <p className="text-sm text-gray-600 mt-1">
            Automatically highlight products based on how long they stay in a column. Each level uses a simple &quot;more than&quot; time condition, and when multiple levels match, the one with the longest time wins.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleAddRule}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center transition-colors shadow-lg shadow-blue-600/30 w-full sm:w-auto"
          >
            <PlusIcon className="w-4 h-4 mr-1" />
            Add Level
          </button>
        </div>
      </div>

      {/* Levels editor */}
      <div className="space-y-4 bg-gray-50 border border-gray-200 rounded-xl p-4 sm:p-5">
        <div>
          <h5 className="text-sm font-semibold text-gray-900 mb-1">
            Time-based Levels
          </h5>
          <p className="text-xs text-gray-600">
            Add one or more levels. Each level means: &quot;If time in column is more than X, color the card with this color.&quot; Longer times override shorter ones.
          </p>
        </div>

        {sortedRules.length === 0 && (
          <div className="text-xs text-gray-500">
            No levels yet. Click &quot;Add Level&quot; to create your first threshold.
          </div>
        )}

        <div className="space-y-3">
          {sortedRules.map((rule) => (
            <div
              key={rule.id}
              className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-white border border-gray-200 rounded-lg p-3"
            >
              {/* Color picker */}
              <div className="sm:col-span-4 flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded-full border border-gray-300"
                  style={{ backgroundColor: rule.color }}
                />
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={rule.color}
                    onChange={(e) => handleChangeRule(rule.id, { color: e.target.value })}
                    className="w-10 h-10 rounded-md border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={rule.color}
                    onChange={(e) => handleChangeRule(rule.id, { color: e.target.value })}
                    className="w-28 px-2 py-1 border border-gray-300 rounded-md text-xs font-mono"
                  />
                </div>
              </div>

              {/* Time value + unit */}
              <div className="sm:col-span-6 flex items-center gap-3">
                <span className="text-xs text-gray-600 whitespace-nowrap">
                  More than
                </span>
                <input
                  type="number"
                  min={1}
                  value={rule.value}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    handleChangeRule(rule.id, { value: Number.isNaN(val) || val <= 0 ? 1 : val });
                  }}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <select
                  value={rule.unit}
                  onChange={(e) =>
                    handleChangeRule(rule.id, {
                      unit: e.target.value as ThresholdRule['unit'],
                    })
                  }
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>

              {/* Delete */}
              <div className="sm:col-span-2 flex justify-start sm:justify-end">
                <button
                  type="button"
                  onClick={() => handleDeleteRule(rule.id)}
                  className="text-xs px-3 py-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

