import { notFound } from "next/navigation";
import { serverApiRequest } from "@/lib/api-client";
import { hubToPageProps } from "@/lib/firestore";
import CityHubPage from "@/components/CityHubPage";

export default async function CityHubRoute({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;
  if (!slug) notFound();

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    notFound();
  }
  try {
    const hub = await serverApiRequest(`/api/hubs/${slug}`);
    const props = hubToPageProps(hub);
    return <CityHubPage {...props} />;
  } catch {
    notFound();
  }
}
