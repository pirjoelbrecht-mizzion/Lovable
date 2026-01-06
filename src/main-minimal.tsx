import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

console.log('=== MINIMAL MAIN EXECUTING ===');

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element not found');
}

createRoot(root).render(
  <StrictMode>
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Minimal Test</h1>
      <p>If you see this, React is working.</p>
    </div>
  </StrictMode>
);

console.log('=== MINIMAL RENDER COMPLETE ===');
