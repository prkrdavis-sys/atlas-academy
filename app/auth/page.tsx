import { AuthScreen } from "@/components/AuthScreen";

type AuthPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const candidate = Array.isArray(params.next) ? params.next[0] : params.next;
  const returnTo = candidate?.startsWith("/invite/") ? candidate : "/profiles";

  return <AuthScreen returnTo={returnTo} />;
}
