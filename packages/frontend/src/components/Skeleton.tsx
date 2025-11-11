export function SkeletonRow() {
  return (
    <div className="animate-pulse px-4 py-3">
      <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
    </div>
  );
}

export function SkeletonColumn() {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-100 px-4 py-3">
        <div className="h-4 bg-gray-200 rounded w-32" />
      </div>
      <div className="divide-y divide-gray-200">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    </div>
  );
}


