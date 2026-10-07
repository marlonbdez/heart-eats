import type { Metadata } from 'next';
import { ProposeForm } from '@/components/ProposeForm';
import { getFoodTags } from '@/lib/data';
import { es } from '@/lib/i18n/es';

export const metadata: Metadata = { title: `${es.propose.title} · HeartEats` };

export default async function ProposePage() {
  const foodTags = await getFoodTags();
  return <ProposeForm foodTags={foodTags} />;
}
