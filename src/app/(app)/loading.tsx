import { PageSkeleton } from "@/components/page-skeleton";

// First load of any (app) page; each page also has its own Suspense with its exact shape.
export default function Loading() {
  return <PageSkeleton body="split" />;
}
