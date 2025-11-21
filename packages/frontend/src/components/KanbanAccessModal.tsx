import { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { KanbanUserRole, User } from "@invenflow/shared";
import { kanbanAccessApi, KanbanUserAssignment, userApi } from "../utils/api";
import { useToast } from "../store/toastStore";

interface KanbanAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  kanbanId: string;
}

export function KanbanAccessModal({
  isOpen,
  onClose,
  kanbanId,
}: KanbanAccessModalProps) {
  const toast = useToast();
  const [assignments, setAssignments] = useState<KanbanUserAssignment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<KanbanUserRole>("viewer");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setSelectedUserId(users[0]?.id ?? "");
    setSelectedRole("viewer");
  };

  const loadAssignments = async () => {
    setIsLoading(true);
    try {
      const [assignmentData, userList] = await Promise.all([
        kanbanAccessApi.list(kanbanId),
        userApi.getAll(),
      ]);

      setAssignments(assignmentData);
      setUsers(userList);
      if (!selectedUserId) {
        setSelectedUserId(userList[0]?.id ?? "");
      }
    } catch (error) {
      console.error("Failed to load kanban access data:", error);
      toast.error("Failed to load kanban access information");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, kanbanId]);

  const handleAssign = async () => {
    if (!selectedUserId) return;
    setIsSubmitting(true);
    try {
      await kanbanAccessApi.save(kanbanId, {
        userId: selectedUserId,
        role: selectedRole,
      });
      toast.success("Access updated");
      await loadAssignments();
    } catch (error) {
      console.error("Failed to assign user:", error);
      toast.error("Failed to update access");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (userId: string) => {
    setIsSubmitting(true);
    try {
      await kanbanAccessApi.remove(kanbanId, userId);
      toast.success("User removed from kanban");
      await loadAssignments();
    } catch (error) {
      console.error("Failed to remove user:", error);
      toast.error("Failed to remove access");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={handleClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-auto">
          <div className="flex items-center justify-between p-5 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Manage Access
              </h3>
              <p className="text-sm text-gray-500">
                Assign users to this kanban and control their roles.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User
                </label>
                <select
                  value={selectedUserId}
                  onChange={(event) => setSelectedUserId(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                >
                  <option value="">Select a user</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(event) =>
                    setSelectedRole(event.target.value as KanbanUserRole)
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
              </div>
              <div className="flex items-end justify-end">
                <button
                  onClick={handleAssign}
                  className="w-full inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={
                    isSubmitting || isLoading || !selectedUserId
                  }
                >
                  {isSubmitting ? "Saving..." : "Assign / Update"}
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Assigned Users
                  </p>
                  <p className="text-xs text-gray-500">
                    {assignments.length} users have access
                  </p>
                </div>
                {isLoading && (
                  <p className="text-xs text-gray-500 italic">Loading...</p>
                )}
              </div>

              <div className="space-y-2">
                {assignments.length === 0 && !isLoading && (
                  <p className="text-sm text-gray-500">
                    No users assigned to this kanban yet.
                  </p>
                )}
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between border border-gray-200 rounded-lg px-4 py-3 gap-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {assignment.user.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {assignment.user.email}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">
                        Role: {assignment.role}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemove(assignment.userId)}
                      className="self-start md:self-auto text-sm text-red-600 hover:underline"
                      disabled={isSubmitting}
                    >
                      Remove access
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 p-4 bg-gray-50 rounded-b-lg">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

