import { useEffect } from 'react';
import { usePersonStore } from '../store/personStore';
import type { Person } from '@invenflow/shared';

interface PersonSelectorProps {
  value: string | null;
  onChange: (personId: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  excludePersonId?: string; // Exclude a specific person (e.g., current assignment)
}

export function PersonSelector({
  value,
  onChange,
  placeholder = 'Select a person...',
  className = '',
  disabled = false,
  required = false,
  excludePersonId,
}: PersonSelectorProps) {
  const { persons, fetchPersons } = usePersonStore();

  useEffect(() => {
    fetchPersons({ activeOnly: true });
  }, [fetchPersons]);

  // Group persons by department
  const groupedPersons = persons
    .filter(p => p.id !== excludePersonId)
    .reduce((acc, person) => {
      if (!acc[person.department]) {
        acc[person.department] = [];
      }
      acc[person.department].push(person);
      return acc;
    }, {} as Record<string, Person[]>);

  const departments = Object.keys(groupedPersons).sort();

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={disabled}
      required={required}
      className={`w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all ${className}`}
    >
      <option value="">{placeholder}</option>
      {departments.map((department) => (
        <optgroup key={department} label={department}>
          {groupedPersons[department].map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

