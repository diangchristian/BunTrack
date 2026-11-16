import { redirect } from "next/navigation";

// Signed out, the proxy sends "/" to /login before this runs.
export default function HomePage() {
  redirect("/dashboard");
}
