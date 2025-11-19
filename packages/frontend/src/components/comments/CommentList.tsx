import { useMemo, useState } from 'react';
import { ProductComment } from '@invenflow/shared';
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import { CommentForm } from './CommentForm';
import { formatDateWithTime } from '../../utils/formatters';

interface CommentListProps {
  comments: ProductComment[];
  currentUserId?: string | null;
  isLoading?: boolean;
  updatingCommentId?: string | null;
  deletingCommentId?: string | null;
  onEdit?: (commentId: string, content: string) => Promise<void> | void;
  onDelete?: (commentId: string) => Promise<void> | void;
}

export function CommentList({
  comments,
  currentUserId,
  isLoading,
  updatingCommentId,
  deletingCommentId,
  onEdit,
  onDelete,
}: CommentListProps) {
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [initialDraft, setInitialDraft] = useState('');

  const sortedComments = useMemo(
    () =>
      [...comments].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [comments],
  );

  const startEditing = (commentId: string, content: string) => {
    setEditingCommentId(commentId);
    setInitialDraft(content);
  };

  const stopEditing = () => {
    setEditingCommentId(null);
    setInitialDraft('');
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1].map((key) => (
          <div key={key} className="animate-pulse space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gray-200" />
              <div className="space-y-2">
                <div className="h-3 w-32 rounded bg-gray-200" />
                <div className="h-3 w-24 rounded bg-gray-200" />
              </div>
            </div>
            <div className="h-3 w-full rounded bg-gray-200" />
            <div className="h-3 w-5/6 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    );
  }

  if (sortedComments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
        No comments yet. Be the first to share an update.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedComments.map((comment) => {
        const isOwner = comment.userId === currentUserId;
        const isEditing = editingCommentId === comment.id;
        const isUpdating = updatingCommentId === comment.id;
        const isDeleting = deletingCommentId === comment.id;

        return (
          <article
            key={comment.id}
            className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-transform duration-200 hover:border-gray-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-600">
                {comment.user.name
                  .split(' ')
                  .map((chunk) => chunk[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{comment.user.name}</p>
                    <p className="text-xs text-gray-500">{comment.user.email}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{formatDateWithTime(new Date(comment.createdAt))}</span>
                    {new Date(comment.updatedAt).getTime() - new Date(comment.createdAt).getTime() > 1000 && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
                        Edited
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 text-sm text-gray-700">
                  {isEditing ? (
                    <CommentForm
                      initialValue={initialDraft}
                      onSubmit={async (content) => {
                        if (!onEdit) return;
                        await onEdit(comment.id, content);
                        stopEditing();
                      }}
                      onCancel={stopEditing}
                      isSubmitting={isUpdating}
                      submitLabel="Save"
                      resetOnSubmit={false}
                    />
                  ) : (
                    <p>{comment.content}</p>
                  )}
                </div>

                {isOwner && !isEditing && (
                  <div className="mt-3 flex items-center gap-3 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => startEditing(comment.id, comment.content)}
                      className="inline-flex items-center gap-1 text-blue-600 transition hover:text-blue-700"
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete?.(comment.id)}
                      className="inline-flex items-center gap-1 text-red-600 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isDeleting}
                    >
                      <TrashIcon className="h-4 w-4" />
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

