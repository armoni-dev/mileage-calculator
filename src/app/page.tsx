import { Suspense } from "react";
import Calculator from "./calculator";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <Calculator />
    </Suspense>
  );
}
