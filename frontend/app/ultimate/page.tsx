import { redirect } from "next/navigation";
import { UltimateSector } from "@/components/ultimate/UltimateSector";

export default function Home() {
  //redirect("/");
  return (
    <>
      <UltimateSector />
    </>
  );
}
