import { getRestaurants } from '@/lib/data';

export default async function Home() {
  const restaurants = await getRestaurants();
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ color: 'var(--accent)' }}>HeartEats</h1>
      <p>{restaurants.length} locales de ejemplo cargados desde los mocks.</p>
    </main>
  );
}
