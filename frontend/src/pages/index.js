import Link from "next/link";

export default function Home() {
  return (
    <div>
      Hello World Alex.{" "}
      <Link href="/about">
        About
      </Link>
    </div>
  );
}
