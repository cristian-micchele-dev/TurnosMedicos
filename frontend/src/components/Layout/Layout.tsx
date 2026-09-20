import { useState, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { OnboardingTour } from '../Onboarding/OnboardingTour';
import styles from './Layout.module.css';

function AnimatedPage({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

export function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [tourRun, setTourRun] = useState<boolean | undefined>(undefined);

  return (
    <div className={styles.layout}>
      <OnboardingTour run={tourRun} onFinish={() => setTourRun(false)} />
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onRestartTour={() => setTourRun(true)}
      />
      <div className={styles.main}>
        <Header onMenuToggle={() => setIsMobileMenuOpen((prev) => !prev)} />
        <main className={styles.content}>
          <AnimatedPage>
            <Outlet />
          </AnimatedPage>
        </main>
      </div>
    </div>
  );
}
