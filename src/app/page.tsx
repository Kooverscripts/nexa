import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { AuthScreen } from "@/components/auth-screen";
import { Dashboard } from "@/components/dashboard";

export default async function Home() {
  const userId = await getSessionUserId();
  if (!userId) return <AuthScreen />;
  return <Dashboard />;
}