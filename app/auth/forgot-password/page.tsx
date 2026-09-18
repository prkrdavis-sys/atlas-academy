import { redirect } from "next/navigation";
import { ForgotPasswordScreen } from "@/components/ForgotPasswordScreen";
import { isCloudEnabled } from "@/lib/cloud-availability";

type ForgotPasswordPageProps = {
  searchParams: Promise<{ email?: string | string[] }>;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  if (!isCloudEnabled()) redirect("/");

  const params = await searchParams;
  const candidate = Array.isArray(params.email) ? params.email[0] : params.email;
  const initialEmail = candidate?.trim() ?? "";

  return <ForgotPasswordScreen initialEmail={initialEmail} />;
}
