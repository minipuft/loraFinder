import { useEffect } from 'react';
import {
  AnimationControllerProvider,
  useAnimationController,
} from './contexts/AnimationControllerContext';
import { ColorProvider } from './contexts/ColorContext';
import { ImageProcessingProvider } from './contexts/ImageProcessingContext';
import Home from './pages/Home.js';
import './styles/views.css';

function AppContent() {
  // Enable global pageEnter trigger
  const { trigger } = useAnimationController();

  // Trigger the 'pageEnter' event once on mount
  useEffect(() => {
    trigger('pageEnter');
  }, [trigger]);

  return (
    <div className="App">
      <Home />
    </div>
  );
}

function App() {
  return (
    <AnimationControllerProvider>
      <ColorProvider>
        <ImageProcessingProvider>
          <AppContent />
        </ImageProcessingProvider>
      </ColorProvider>
    </AnimationControllerProvider>
  );
}

export default App;
