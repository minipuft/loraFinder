import { renderToPipeableStream } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import AppRouter from './routes/AppRouter';

// Export a render function that returns the pipeable stream for SSR
export function render(url: string, options: Parameters<typeof renderToPipeableStream>[1]) {
  return renderToPipeableStream(
    <StaticRouter location={url}>
      <AppRouter />
    </StaticRouter>,
    options
  );
}
