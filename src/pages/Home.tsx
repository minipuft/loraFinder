import React, { useEffect, useRef } from 'react';
import { useAnimationPipeline } from '../animations/AnimationManager';
import Layout from '../components/Layout.js';
import MainContent from '../components/MainContent.js';
import { AppSettingsProvider } from '../contexts';
import { useAnimationController } from '../contexts/AnimationControllerContext';

/**
 * Home component - the main page of the application.
 * It sets up the main layout and context provider.
 * @component
 * @returns {JSX.Element} The main application page.
 */
const Home: React.FC = () => {
  // Refs
  const mainScrollRef = useRef<HTMLElement>(null);
  const layoutWrapperRef = useRef<HTMLDivElement>(null); // Ref for the outer wrapper div
  const sidebarRef = useRef<HTMLDivElement>(null); // Ref for Sidebar
  const navbarRef = useRef<HTMLDivElement>(null); // Ref for Navbar
  const contentAreaRef = useRef<HTMLDivElement>(null); // Ref for MainContent wrapper area

  // --- Animation Setup ---
  const homeEnterPipeline = useAnimationPipeline('homePage');
  const { trigger } = useAnimationController();

  // Configure the entrance animation steps once
  useEffect(() => {
    if (
      homeEnterPipeline &&
      layoutWrapperRef.current &&
      sidebarRef.current &&
      navbarRef.current &&
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
          target: navbarRef.current,
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

  // --- Trigger pageEnter Event on Mount ---
  useEffect(() => {
    console.log('[Home Page] Triggering pageEnter event.');
    trigger('pageEnter');
  }, [trigger]);

  // Render the main layout with removed props
  return (
    // Wrap the entire output in the AppSettingsProvider
    <AppSettingsProvider>
      <div ref={layoutWrapperRef}>
        <Layout
          // Pass only necessary props, like refs
          mainRef={mainScrollRef} // Keep ref for scrolling
          sidebarRef={sidebarRef}
          navbarRef={navbarRef}
          contentAreaRef={contentAreaRef}
          // Pass MainContent explicitly as a prop, remove drilled props from it too
          mainContentSlot={
            <MainContent
              scrollContainerRef={mainScrollRef} // Keep ref
            />
          }
        />
      </div>
    </AppSettingsProvider>
  );
};

export default Home;
