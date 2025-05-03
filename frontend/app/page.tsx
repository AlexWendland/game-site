import { Button } from "@heroui/button";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <h1>Welcome to my game site!</h1>
      <br />
      <p>You can play the below games!</p>
      <div className="flex">
        <Button>
          <Link href="/ultimate">Ultimate Tic Tac Toe</Link>
        </Button>
      </div>
    </>
  );
}
