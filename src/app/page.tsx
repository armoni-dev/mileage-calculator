import { Suspense } from "react";
import Calculator from "@/components/calculator/calculator";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <Calculator />
    </Suspense>
  );
}
