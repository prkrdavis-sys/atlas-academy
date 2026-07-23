import { redirect } from "next/navigation";

type UsaMapRedirectPageProps = {
  searchParams: Promise<{ place?: string }>;
};

export default async function UsaMapRedirectPage({ searchParams }: UsaMapRedirectPageProps) {
  const query = await searchParams;
  const params = new URLSearchParams();
  params.set("view", "usa");
  if (query.place) {
    params.set("place", query.place);
  }
  redirect(`/map?${params.toString()}`);
}
