import { redirect } from "next/navigation";
import { AuthScreen } from "@/components/AuthScreen";
import { isCloudEnabled } from "@/lib/cloud-availability";

type AuthPageProps = {
  searchParams: Promise<{ next?: string | string[]; reset?: string | string[] }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  if (!isCloudEnabled()) redirect("/");

  const params = await searchParams;
  const candidate = Array.isArray(params.next) ? params.next[0] : params.next;
  const returnTo = candidate?.startsWith("/invite/") ? candidate : "/profiles";
  const resetParam = Array.isArray(params.reset) ? params.reset[0] : params.reset;
  const passwordResetSuccess = resetParam === "1";

  return <AuthScreen returnTo={returnTo} passwordResetSuccess={passwordResetSuccess} />;
}
