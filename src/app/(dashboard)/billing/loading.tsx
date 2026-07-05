import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function BillingLoading() {
  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="grid gap-2">
          <Skeleton className="h-7 w-56 rounded-lg" />
          <Skeleton className="h-3.5 w-72 rounded-lg" />
        </div>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="grid gap-3">
          <Skeleton className="h-4 w-60" />
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
