import { RouterProvider } from '@tanstack/react-router';
import { router } from './app/router';
import { AppProviders } from './app/providers';
import { TimeTravelProvider } from './features/time-travel/TimeTravelContext';
import { TimeTravelBanner } from './features/time-travel/components/TimeTravelBanner';
import { TimeTravelToolbar } from './features/time-travel/components/TimeTravelToolbar';

export function App() {
  return (
    <AppProviders>
      <TimeTravelProvider>
        <TimeTravelBanner />
        <RouterProvider router={router} />
        <TimeTravelToolbar />
      </TimeTravelProvider>
    </AppProviders>
  );
}

export default App;
