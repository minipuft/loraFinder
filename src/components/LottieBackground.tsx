import React from 'react';
import styles from '../styles/LottieBackground.module.scss';

const LottieBackground: React.FC = () => {
  return (
    <div className={styles.lottieBackground}>
      <div className={styles.animatedBackground}></div>
    </div>
  );
};

export default LottieBackground;
