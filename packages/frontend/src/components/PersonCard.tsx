import { useState } from 'react';
import { PencilIcon, TrashIcon, UserIcon, BriefcaseIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import type { Person } from '@invenflow/shared';
import { usePersonStore } from '../store/personStore';
import { useToastStore } from '../store/toastStore';
import { useDepartmentStore } from '../store/departmentStore';

interface PersonCardProps {
  person: Person;
  onEdit: (person: Person) => void;
}

export function PersonCard({ person, onEdit }: PersonCardProps) {
  const { deletePerson, fetchPersons } = usePersonStore();
  const { addSuccessToast, addErrorToast } = useToastStore();
  const { departments } = useDepartmentStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deletePerson(person.id);
      addSuccessToast(`${person.name} deleted successfully`);
      await fetchPersons();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete person';
      addErrorToast(errorMessage);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Get department name by ID
  const getDepartmentName = (departmentId: string) => {
    const department = departments.find(d => d.id === departmentId);
    return department ? department.name : 'Unknown Department';
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border-2 transition-all hover:shadow-md ${
      person.isActive ? 'border-gray-200' : 'border-red-200 bg-red-50'
    }`}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-full ${
              person.isActive ? 'bg-blue-100' : 'bg-gray-200'
            }`}>
              <UserIcon className={`w-6 h-6 ${
                person.isActive ? 'text-blue-600' : 'text-gray-500'
              }`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {person.name}
              </h3>
              <div className="flex items-center mt-1 text-sm text-gray-600">
                <BriefcaseIcon className="w-4 h-4 mr-1" />
                {getDepartmentName(person.departmentId)}
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center">
            {person.isActive ? (
              <CheckCircleIcon className="w-5 h-5 text-green-500" title="Active" />
            ) : (
              <XCircleIcon className="w-5 h-5 text-red-500" title="Inactive" />
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="text-xs text-gray-500 mb-4">
          <p>Added: {new Date(person.createdAt).toLocaleDateString()}</p>
          {person.updatedAt !== person.createdAt && (
            <p>Updated: {new Date(person.updatedAt).toLocaleDateString()}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-2 pt-3 border-t border-gray-200">
          <button
            onClick={() => onEdit(person)}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <PencilIcon className="w-4 h-4 mr-2" />
            Edit
          </button>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-lg text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              <TrashIcon className="w-4 h-4 mr-2" />
              Delete
            </button>
          ) : (
            <div className="flex-1 flex space-x-1">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-2 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Confirm'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 px-2 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

