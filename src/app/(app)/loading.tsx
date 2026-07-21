import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-4 h-8 w-20" />
            <Skeleton className="mt-3 h-3 w-28" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="p-6 lg:col-span-8">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-4 h-[220px] w-full" />
        </Card>
        <Card className="p-6 lg:col-span-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="mx-auto mt-4 size-[180px] rounded-full" />
        </Card>
      </div>
    </div>
  );
}
