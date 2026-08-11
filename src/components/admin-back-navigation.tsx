"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const trackedFormSelector = [
  ".catalog-admin-form",
  ".inventory-correction-form",
  ".collection-pin-form",
].join(",");

export function AdminBackNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const previousPath = useRef(pathname);
  const dirty = useRef(false);
  const [returnPath, setReturnPath] = useState<string | null>(null);

  useEffect(() => {
    if (previousPath.current !== pathname) {
      setReturnPath(previousPath.current);
      previousPath.current = pathname;
      dirty.current = false;
    }
  }, [pathname]);

  useEffect(() => {
    const main = document.getElementById("main");
    if (!main) return;

    const trackedForm = (target: EventTarget | null) =>
      target instanceof Element
        ? target.closest<HTMLFormElement>(trackedFormSelector)
        : null;
    const markDirty = (event: Event) => {
      if (trackedForm(event.target)) dirty.current = true;
    };
    const markSubmitted = (event: Event) => {
      if (trackedForm(event.target)) dirty.current = false;
    };
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const protectAdminLinks = (event: MouseEvent) => {
      if (!dirty.current || !(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!link) return;
      const destination = new URL(link.href, window.location.href);
      if (
        destination.origin !== window.location.origin ||
        !destination.pathname.startsWith("/admin")
      )
        return;
      if (!window.confirm("Leave this page and discard unsaved changes?")) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      dirty.current = false;
    };

    main.addEventListener("input", markDirty);
    main.addEventListener("change", markDirty);
    main.addEventListener("submit", markSubmitted);
    document.addEventListener("click", protectAdminLinks, true);
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => {
      main.removeEventListener("input", markDirty);
      main.removeEventListener("change", markDirty);
      main.removeEventListener("submit", markSubmitted);
      document.removeEventListener("click", protectAdminLinks, true);
      window.removeEventListener("beforeunload", warnBeforeUnload);
    };
  }, [pathname]);

  if (pathname === "/admin") return null;

  const goBack = () => {
    if (
      dirty.current &&
      !window.confirm("Leave this page and discard unsaved changes?")
    )
      return;
    dirty.current = false;

    if (returnPath?.startsWith("/admin") && returnPath !== pathname) {
      router.push(returnPath);
      return;
    }

    if (document.referrer) {
      const referrer = new URL(document.referrer);
      if (
        referrer.origin === window.location.origin &&
        referrer.pathname.startsWith("/admin")
      ) {
        router.back();
        return;
      }
    }

    router.push("/admin");
  };

  return (
    <nav
      className="admin-context-navigation"
      aria-label="Admin page navigation"
    >
      <button type="button" onClick={goBack}>
        <ArrowLeft size={17} aria-hidden="true" />
        <span>Back</span>
      </button>
    </nav>
  );
}
