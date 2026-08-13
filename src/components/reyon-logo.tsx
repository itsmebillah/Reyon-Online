import Image from "next/image";

export function ReyonLogo({ priority = false }: { priority?: boolean }) {
  return (
    <span className="reyon-logo" aria-label="REYON">
      <span className="reyon-logo__mark" aria-hidden="true">
        <Image
          className="reyon-logo__mark-source"
          src="/images/reyon-logo-primary.png"
          alt=""
          width={126}
          height={126}
          priority={priority}
        />
      </span>
      <Image
        className="reyon-logo__wordmark"
        src="/images/reyon-wordmark-horizontal.webp"
        alt="REYON Beauty & Care"
        width={640}
        height={246}
        priority={priority}
      />
    </span>
  );
}
