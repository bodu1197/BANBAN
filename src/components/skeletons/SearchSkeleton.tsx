import { Skeleton } from "@/components/ui/skeleton";

export default function SearchSkeleton(): React.ReactElement {
  return (
    <main className="container mx-auto flex flex-1 flex-col px-4 py-6">
      <Skeleton className="h-8 w-32" />
      <div className="mt-4 flex flex-col gap-6">
        <Skeleton className="h-10 w-full" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={`filter-${i.toString()}`} className="h-8 w-16 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={`card-${i.toString()}`} className="aspect-[3/4] w-full rounded-lg" />
          ))}
        </div>
      </div>
    </main>
  );
}
