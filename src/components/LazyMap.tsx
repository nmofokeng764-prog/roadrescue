import { lazy, Suspense, type ComponentProps } from "react";
import { ClientOnly } from "@tanstack/react-router";

const MapView = lazy(() => import("./MapView"));

export function LazyMap(props: ComponentProps<typeof MapView>) {
  const fallback = <div style={{ height: props.height ?? 320 }} className="w-full animate-pulse rounded-2xl bg-muted" />;
  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>
        <MapView {...props} />
      </Suspense>
    </ClientOnly>
  );
}
