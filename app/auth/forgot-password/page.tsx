import { ForgotPasswordScreen } from "@/components/ForgotPasswordScreen";

type ForgotPasswordPageProps = {
  searchParams: Promise<{ email?: string | string[] }>;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = await searchParams;
  const candidate = Array.isArray(params.email) ? params.email[0] : params.email;
  const initialEmail = candidate?.trim() ?? "";

  return <ForgotPasswordScreen initialEmail={initialEmail} />;
}
