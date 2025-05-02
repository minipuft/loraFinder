import React from 'react';
import Layout from '../components/Layout';
import MainContent from '../components/MainContent';
import { ViewMode } from '../types/index.js';
import { getHomeDirectory } from '../utils/settings.js';

const Gallery: React.FC = () => {
  // Placeholder content for the Gallery page
  const homeDir = getHomeDirectory() || '';

  return (
    <Layout
      selectedFolder={homeDir}
      onFolderChange={() => {}}
      onSearch={() => {}}
      zoom={1}
      onZoomChange={() => {}}
      isGrouped={false}
      onGroupToggle={() => {}}
      viewMode={ViewMode.GRID}
      onViewModeChange={() => {}}
      mainRef={{ current: null }}
      navbarRef={{ current: null }}
      sidebarRef={{ current: null }}
      contentAreaRef={{ current: null }}
      mainContentSlot={
        <MainContent
          selectedFolder={homeDir}
          searchQuery=""
          zoom={1}
          isGrouped={false}
          viewMode={ViewMode.GRID}
          scrollContainerRef={{ current: null }}
        />
      }
    />
  );
};

export default Gallery;
