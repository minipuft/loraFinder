import React, { useEffect, useRef } from 'react';
import { useAnimationPipeline } from '../animations/AnimationManager';
import Layout from '../components/Layout';
import MainContent from '../components/MainContent';
import { AppSettingsProvider } from '../contexts';
import { useAnimationController } from '../contexts/AnimationControllerContext';
import { ImageFeedCenterProvider } from '../contexts/ImageFeedCenterContext';

/**
 * Home component - the main page of the application.
 * It sets up the main layout and context provider.
 * @component
 * @returns {JSX.Element} The main application page.
 */
const Home: React.FC = () => {
  const mainScrollRef = useRef<HTMLElement>(null);
  const layoutWrapperRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);

  const homeEnterPipeline = useAnimationPipeline('homePage');
  const { trigger } = useAnimationController();

  useEffect(() => {
    if (
      homeEnterPipeline &&
      layoutWrapperRef.current &&
      sidebarRef.current &&
      contentAreaRef.current
    ) {
      homeEnterPipeline.clear();
      homeEnterPipeline
        .addStep({
          target: layoutWrapperRef.current,
          preset: 'fadeIn',
          vars: { duration: 0.4 },
          position: '+=0.1',
        })
        .addStep({
          target: sidebarRef.current,
          preset: 'fadeIn',
          vars: { duration: 0.4 },
          position: '+=0.2',
        })
        .addStep({
          target: contentAreaRef.current,
          preset: 'fadeIn',
          vars: { duration: 0.5 },
          position: '+=0.3',
        });
      homeEnterPipeline.play().catch(error => {
        console.error('[Home Page] Entrance animation failed:', error);
      });
    }
  }, [homeEnterPipeline]);

  useEffect(() => {
    console.log('[Home Page] Triggering pageEnter event.');
    trigger('pageEnter');
  }, [trigger]);

  return (
    <ImageFeedCenterProvider>
      <AppSettingsProvider>
        <div ref={layoutWrapperRef}>
          <Layout
            mainRef={mainScrollRef}
            sidebarRef={sidebarRef}
            contentAreaRef={contentAreaRef}
            mainContentSlot={<MainContent scrollContainerRef={mainScrollRef} />}
          />
        </div>
      </AppSettingsProvider>
    </ImageFeedCenterProvider>
  );
};

export default Home;
