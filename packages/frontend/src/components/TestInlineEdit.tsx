import { useState } from 'react';
import { SimpleInlineEdit } from './SimpleInlineEdit';

export function TestInlineEdit() {
  const [testValue, setTestValue] = useState('Click me to edit');

  const handleSave = async (value: string | number) => {
    console.log('Saving value:', value);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    setTestValue(value.toString());
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold">Test Inline Edit</h2>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Test Field (Text)
        </label>
        <SimpleInlineEdit
          value={testValue}
          onSave={handleSave}
          placeholder="Enter some text"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Test Field (Textarea)
        </label>
        <SimpleInlineEdit
          value="This is a textarea field\nClick to edit"
          onSave={handleSave}
          type="textarea"
          placeholder="Enter multiple lines"
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Test Field (Select)
        </label>
        <SimpleInlineEdit
          value="option1"
          onSave={handleSave}
          type="select"
          options={[
            { value: 'option1', label: 'Option 1' },
            { value: 'option2', label: 'Option 2' },
            { value: 'option3', label: 'Option 3' },
          ]}
          placeholder="Select an option"
        />
      </div>
    </div>
  );
}
