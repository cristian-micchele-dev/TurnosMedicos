import { useEffect, useState } from 'react';
import { Joyride, STATUS } from 'react-joyride';
import type { EventData, Step } from 'react-joyride';

const STORAGE_KEY = 'turno-onboarding-done';

const steps: Step[] = [
  {
    target: '[data-tour="sidebar-nav"]',
    title: 'Navegación',
    content: 'Desde acá accedés a todas las secciones de Pulso.',
  },
  {
    target: '[data-tour="stats"]',
    title: 'Tu resumen',
    content: 'Acá ves las métricas más importantes de un vistazo.',
  },
  {
    target: '[data-tour="actions"]',
    title: 'Acciones rápidas',
    content: 'Usá estos accesos directos para las tareas más comunes.',
  },
  {
    target: '[data-tour="appointments"]',
    title: 'Próximos turnos',
    content: 'Tu agenda con los turnos pendientes y su estado.',
  },
];

interface OnboardingTourProps {
  run?: boolean;
  onFinish?: () => void;
}

export function OnboardingTour({ run: runProp, onFinish }: OnboardingTourProps) {
  const alreadyDone = localStorage.getItem(STORAGE_KEY) === 'true';
  const [run, setRun] = useState(runProp !== undefined ? runProp : !alreadyDone);

  useEffect(() => {
    if (runProp !== undefined) setRun(runProp);
  }, [runProp]);

  const handleEvent = ({ status }: EventData) => {
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      localStorage.setItem(STORAGE_KEY, 'true');
      setRun(false);
      onFinish?.();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      scrollToFirstStep
      onEvent={handleEvent}
      options={{
        skipBeacon: true,
        showProgress: true,
        buttons: ['back', 'skip', 'primary'],
        backgroundColor: '#0f172a',
        primaryColor: '#38bdf8',
        arrowColor: '#0f172a',
        overlayColor: 'rgba(0, 0, 0, 0.6)',
      }}
      locale={{
        back: 'Anterior',
        close: 'Cerrar',
        last: 'Finalizar',
        next: 'Siguiente',
        skip: 'Saltar',
      }}
      styles={{
        tooltip: {
          color: '#e2e8f0',
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '1.25rem',
        },
        buttonPrimary: {
          backgroundColor: '#38bdf8',
          color: '#0a0f1e',
          borderRadius: 6,
          fontSize: 14,
        },
        buttonBack: {
          color: '#94a3b8',
          fontSize: 14,
        },
        buttonSkip: {
          color: '#64748b',
          fontSize: 13,
        },
      }}
    />
  );
}
