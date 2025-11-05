import { ThresholdRule } from '@invenflow/shared';
import {
  BoltIcon,
  ExclamationTriangleIcon,
  FireIcon,
  ChartBarIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const getOperatorLabel = (operator: string): string => {
  const labels: { [key: string]: string } = {
    '>': 'More than',
    '<': 'Less than',
    '=': 'Exactly',
    '>=': 'At least',
    '<=': 'At most',
  };
  return labels[operator] || operator;
};

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  rules: Omit<ThresholdRule, 'id' | 'priority'>[];
  bestFor: string[];
}

const TEMPLATES: Template[] = [
  {
    id: 'fast-track',
    name: '⚡ Fast Track',
    description: 'Perfect for high-velocity workflows where speed is critical',
    icon: <BoltIcon className="w-6 h-6" />,
    iconBg: 'bg-green-100 text-green-600',
    bestFor: ['Quick processing', 'Same-day delivery', 'Express orders'],
    rules: [
      {
        operator: '<',
        value: 1,
        unit: 'hours',
        color: '#10b981',
      },
    ],
  },
  {
    id: 'standard',
    name: '⚠️ Standard Alert',
    description: 'Balanced approach for typical workflows with reasonable timeframes',
    icon: <ExclamationTriangleIcon className="w-6 h-6" />,
    iconBg: 'bg-yellow-100 text-yellow-600',
    bestFor: ['Normal processing', 'Standard delivery', 'Regular orders'],
    rules: [
      {
        operator: '>',
        value: 1,
        unit: 'days',
        color: '#f59e0b',
      },
    ],
  },
  {
    id: 'urgent',
    name: '🚨 Urgent Priority',
    description: 'Critical alerts for products stuck too long',
    icon: <FireIcon className="w-6 h-6" />,
    iconBg: 'bg-red-100 text-red-600',
    bestFor: ['Overdue items', 'Critical delays', 'Emergency tracking'],
    rules: [
      {
        operator: '>',
        value: 3,
        unit: 'days',
        color: '#ef4444',
      },
    ],
  },
  {
    id: 'multi-tier',
    name: '📊 Multi-Tier Progressive',
    description: 'Three-level system with escalating priority levels',
    icon: <ChartBarIcon className="w-6 h-6" />,
    iconBg: 'bg-blue-100 text-blue-600',
    bestFor: ['Complex workflows', 'Graduated responses', 'Detailed tracking'],
    rules: [
      {
        operator: '<',
        value: 4,
        unit: 'hours',
        color: '#10b981',
      },
      {
        operator: '>=',
        value: 4,
        unit: 'hours',
        color: '#f59e0b',
      },
      {
        operator: '>',
        value: 2,
        unit: 'days',
        color: '#ef4444',
      },
    ],
  },
];

interface ThresholdTemplatesProps {
  onSelectTemplate: (rules: Omit<ThresholdRule, 'id' | 'priority'>[]) => void;
  onSkip: () => void;
  onClose: () => void;
}

export function ThresholdTemplates({ onSelectTemplate, onSkip, onClose }: ThresholdTemplatesProps) {
  const handleSelectTemplate = (template: Template) => {
    onSelectTemplate(template.rules);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-screen-sm sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Quick Start Templates</h2>
            <p className="text-sm text-gray-600 mt-1">
              Choose a pre-made template or skip to create your own custom rules
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Templates Grid */}
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => handleSelectTemplate(template)}
              className="p-4 sm:p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all text-left group"
            >
              {/* Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className={`p-3 rounded-lg ${template.iconBg} transition-transform group-hover:scale-110`}>
                  {template.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{template.name}</h3>
                  <p className="text-sm text-gray-600">{template.description}</p>
                </div>
              </div>

              {/* Rules Preview */}
              <div className="mb-4 space-y-2">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                  Rules Included ({template.rules.length})
                </p>
                {template.rules.map((rule, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                  >
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: rule.color }}
                    />
                    <span className="text-sm text-gray-700">
                      {getOperatorLabel(rule.operator)} {rule.value} {rule.unit}
                    </span>
                  </div>
                ))}
              </div>

              {/* Best For */}
              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                  Best For:
                </p>
                <div className="flex flex-wrap gap-2">
                  {template.bestFor.map((item, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* Hover Effect */}
              <div className="mt-4 pt-4 border-t border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-sm font-medium text-blue-600 flex items-center gap-2">
                  <span>Click to use this template</span>
                  <span>→</span>
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-4 py-3 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 sm:justify-between">
          <p className="text-sm text-gray-600">
            💡 Templates can be customized after selection
          </p>
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto"
            >
              Skip & Create Custom
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

