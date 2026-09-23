import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Missing #root element');

createRoot(rootElement).render(
  <StrictMode>
    <main className="p-6">
      <h1 className="font-heading text-heading-sm">Semakan</h1>
    </main>
  </StrictMode>,
);
