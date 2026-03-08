
import React, { useState, useEffect, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// We need to dynamically import App so that if it throws an error on module load,
// we can catch it in React state and pass it to ErrorBoundary or render our own fallback.
const AppLoader = () => {
  const [AppComponent, setAppComponent] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    import('./App')
      .then(module => setAppComponent(() => module.default))
      .catch(err => setError(err));
  }, []);

  if (error) {
    // If there's a module load error, we can either throw it for ErrorBoundary to catch
    // or render something directly. Throwing is better to reuse the component.
    throw error;
  }

  if (!AppComponent) {
    return null; // Loading...
  }

  return <AppComponent />;
};

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppLoader />
    </ErrorBoundary>
  </React.StrictMode>
);
