"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Container } from "./ui";

export function BackNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/") return null;

  const goBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  };

  return (
    <div className="back-navigation" aria-label="Page navigation">
      <Container>
        <button type="button" onClick={goBack} aria-label="Go back">
          <ArrowLeft aria-hidden="true" />
          <span>Back</span>
        </button>
      </Container>
    </div>
  );
}
