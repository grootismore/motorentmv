import { useRouter } from 'expo-router';

import { Screen } from '../../src/components/Screen';
import { SearchForm, type SearchFormValues } from '../../src/features/discovery/SearchForm';

export default function Explore() {
  const router = useRouter();

  const handleSubmit = (values: SearchFormValues) => {
    router.push({
      pathname: '/search',
      params: {
        location: values.location || undefined,
        startsAt: values.startsAtUtc,
        endsAt: values.endsAtUtc,
      },
    });
  };

  return (
    <Screen
      title="Find a motorcycle"
      description="Pick a location and dates — we'll show you what's actually available."
      scroll
    >
      <SearchForm onSubmit={handleSubmit} submitLabel="Search availability" />
    </Screen>
  );
}
