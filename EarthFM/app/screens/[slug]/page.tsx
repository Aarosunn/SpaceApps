import { notFound } from "next/navigation";
import { SCREENS, type Slug } from "@/screens";
import { REGISTRY } from "@/screens/registry";

export function generateStaticParams() {
  return SCREENS.map((s) => ({ slug: s.slug }));
}

export const dynamicParams = false;

export default async function ScreenPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const Screen = REGISTRY[slug as Slug];
  if (!Screen) notFound();
  return <Screen />;
}
