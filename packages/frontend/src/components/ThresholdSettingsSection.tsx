import { useState } from 'react';
import { ThresholdRule } from '@invenflow/shared';
import { nanoid } from 'nanoid';
import { ThresholdRuleBuilder } from './ThresholdRuleBuilder';
import { ThresholdRuleCard } from './ThresholdRuleCard';
import { PlusIcon, SparklesIcon } from '@heroicons/react/24/outline';

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
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingRule, setEditingRule] = useState<ThresholdRule | null>(null);

  const rules = thresholdRules || [];

  const handleSaveRule = (ruleData: Omit<ThresholdRule, 'id' | 'priority'>) => {
    if (editingRule) {
      // Update existing rule
      const updatedRules = rules.map(r => 
        r.id === editingRule.id 
          ? { ...r, ...ruleData }
          : r
      );
      onChange(updatedRules);
    } else {
      // Add new rule
      const rule: ThresholdRule = {
        id: nanoid(),
        ...ruleData,
        priority: rules.length + 1,
      };
      onChange([...rules, rule]);
    }
    
    setShowBuilder(false);
    setEditingRule(null);
  };

  const handleEditRule = (rule: ThresholdRule) => {
    setEditingRule(rule);
    setShowBuilder(true);
  };

  const handleDeleteRule = (ruleId: string) => {
    const updatedRules = rules
      .filter(r => r.id !== ruleId)
      .map((r, index) => ({ ...r, priority: index + 1 })); // Re-index priorities
    onChange(updatedRules);
  };

  const handleMovePriority = (ruleId: string, direction: 'up' | 'down') => {
    const ruleIndex = rules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) return;

    const newIndex = direction === 'up' ? ruleIndex - 1 : ruleIndex + 1;
    if (newIndex < 0 || newIndex >= rules.length) return;

    const newRules = [...rules];
    [newRules[ruleIndex], newRules[newIndex]] = [newRules[newIndex], newRules[ruleIndex]];
    
    // Update priorities
    const updatedRules = newRules.map((r, index) => ({ ...r, priority: index + 1 }));
    onChange(updatedRules);
  };

  const handleCancelBuilder = () => {
    setShowBuilder(false);
    setEditingRule(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Threshold Alerts</h3>
          <p className="text-sm text-gray-600 mt-1">
            Automatically track products based on how long they stay in columns
          </p>
        </div>
        {!showBuilder && (
          <button
            type="button"
            onClick={() => setShowBuilder(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Add Rule
          </button>
        )}
      </div>

      {/* Rule Builder */}
      {showBuilder && (
        <div className="p-6 bg-white border-2 border-blue-200 rounded-xl shadow-sm">
          <ThresholdRuleBuilder
            onSave={handleSaveRule}
            onCancel={handleCancelBuilder}
            initialRule={editingRule}
            existingRulesCount={rules.length}
          />
        </div>
      )}

      {/* Rules List */}
      {rules.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules
            .sort((a, b) => a.priority - b.priority)
            .map((rule, index) => (
              <ThresholdRuleCard
                key={rule.id}
                rule={rule}
                index={index}
                totalRules={rules.length}
                products={products}
                onEdit={handleEditRule}
                onDelete={handleDeleteRule}
                onMovePriority={handleMovePriority}
              />
            ))}
        </div>
      ) : !showBuilder ? (
        <div className="text-center py-12 px-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
            <SparklesIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">
            No Threshold Rules Yet
          </h4>
          <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
            Create your first rule to automatically track and highlight products based on how long they stay in each column.
          </p>
          <button
            type="button"
            onClick={() => setShowBuilder(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Create First Rule
          </button>
        </div>
      ) : null}
    </div>
  );
}
