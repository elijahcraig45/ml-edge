import { redirect } from "next/navigation";

/** The front door is the curriculum. */
export default function Home() {
  redirect("/learn");
}
