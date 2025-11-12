import React, { useState } from 'react';
import { BasicInlineEdit } from './BasicInlineEdit';

export function TestBasicInlineEdit() {
  const [textValue, setTextValue] = useState('Click to edit this text');
  const [numberValue, setNumberValue] = useState(42);
  const [textareaValue, setTextareaValue] = useState('This is a textarea\nClick to edit multiple lines');
  const [selectValue, setSelectValue] = useState('option1');

  const handleSaveText = async (value: string | number) => {
    console.log('Saving text:', value);
    setTextValue(value.toString());
  };

  const handleSaveNumber = async (value: string | number) => {
    console.log('Saving number:', value);
    setNumberValue(Number(value));
  };

  const handleSaveTextarea = async (value: string | number) => {
    console.log('Saving textarea:', value);
    setTextareaValue(value.toString());
  };

  const handleSaveSelect = async (value: string | number) => {
    console.log('Saving select:', value);
    setSelectValue(value.toString());
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Test Basic Inline Edit</h1>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Text Field
          </label>
          <BasicInlineEdit
            value={textValue}
            onSave={handleSaveText}
            placeholder="Enter some text"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number Field
          </label>
          <BasicInlineEdit
            value={numberValue}
            onSave={handleSaveNumber}
            type="number"
            placeholder="Enter a number"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Textarea Field
          </label>
          <BasicInlineEdit
            value={textareaValue}
            onSave={handleSaveTextarea}
            type="textarea"
            rows={4}
            placeholder="Enter multiple lines"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Field
          </label>
          <BasicInlineEdit
            value={selectValue}
            onSave={handleSaveSelect}
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

      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">Current Values:</h3>
        <pre className="text-sm text-gray-600">
{JSON.stringify({
  text: textValue,
  number: numberValue,
  textarea: textareaValue,
  select: selectValue
}, null, 2)}
        </pre>
      </div>
    </div>
  );
}
