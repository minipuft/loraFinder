import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { AnimationManagerProvider } from './animations/AnimationManager';
import { AnimationControllerProvider } from './contexts/AnimationControllerContext';
import { ColorProvider } from './contexts/ColorContext';
import { ImageProcessingProvider } from './contexts/ImageProcessingContext';
import { queryClient } from './lib/queryClient';
import AppRouter from './routes/AppRouter';
import './styles/globals.scss';

// Add Service Worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/serviceWorker.js')
      .then(registration => {
        console.log('Service Worker registered successfully:', registration.scope);
      })
      .catch(error => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AnimationManagerProvider>
        <AnimationControllerProvider>
          <ColorProvider>
            <ImageProcessingProvider>
              <AppRouter />
            </ImageProcessingProvider>
          </ColorProvider>
        </AnimationControllerProvider>
      </AnimationManagerProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);
