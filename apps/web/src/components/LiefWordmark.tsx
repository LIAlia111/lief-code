import type { SVGProps } from "react";

export function LiefWordmark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <image href="/lief-mark.svg" width={1024} height={1024} />
    </svg>
  );
}
