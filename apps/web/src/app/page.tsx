import HomeClient from "@/app/_components/home/HomeClient";
import { fetchPublicEventsSSR } from "@/lib/api/fetchPublicEvents";

export const dynamic = "force-dynamic"; // skip build-time prerender (avoids webpack SSR issue with Redux imports)
export const revalidate = 60; // ISR once rendered

export default async function HomePage() {
  const { items: initialEvents } = await fetchPublicEventsSSR();

  return <HomeClient initialEvents={initialEvents} />;
}
