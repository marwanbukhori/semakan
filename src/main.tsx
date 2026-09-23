import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { MockApiBanner } from '@/app/MockApiBanner';
import { AppProviders } from '@/app/providers';
import { createRoutes } from '@/app/router';
import '@/shared/i18n';
import './index.css';

async function startMockApi() {
  const { worker } = await import('@/mocks/browser');
  // The mock API is part of the demo, so it runs in production as well.
  await worker.start({ onUnhandledRequest: 'bypass', quiet: import.meta.env.PROD });
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Missing #root element');

const router = createBrowserRouter(createRoutes());

void startMockApi()
  .then(
    () => true,
    (error: unknown) => {
      console.error('Mock API failed to start', error);
      return false;
    },
  )
  .then((mockApiStarted) => {
    createRoot(rootElement).render(
      <StrictMode>
        <AppProviders>
          {/* Keep the app usable (navigation, theme, language) and say why data won't load. */}
          {!mockApiStarted && <MockApiBanner />}
          <RouterProvider router={router} />
        </AppProviders>
      </StrictMode>,
    );
  });
