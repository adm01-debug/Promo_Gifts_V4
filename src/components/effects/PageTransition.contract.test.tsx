import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { type ReactNode } from 'react';
import { FadeInView, PageTransition, StaggerContainer, StaggerItem } from './PageTransition';

vi.mock('framer-motion', () => {
  const MotionDiv = ({ children, className }: { children?: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  );

  return {
    m: {
      div: MotionDiv,
    },
  };
});

vi.mock('@/utils/performance', () => ({
  performanceTracker: {
    mark: vi.fn(),
    measure: vi.fn(),
  },
}));

function PathnameCopy() {
  const location = useLocation();
  return <span data-testid="pathname-copy">{location.pathname}</span>;
}

describe('PageTransition contract', () => {
  it('tracks pathname changes without hiding routed content', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/origem']}>
        <Routes>
          <Route
            path="*"
            element={
              <PageTransition className="page-shell">
                <>
                  <Link to="/destino">ir</Link>
                  <PathnameCopy />
                </>
              </PageTransition>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    let wrapper = screen.getByText('ir').closest('[data-pathname]');
    expect(wrapper).toHaveAttribute('data-pathname', '/origem');
    expect(wrapper).toHaveStyle({ opacity: '1', transition: 'opacity 300ms ease-out' });

    await user.click(screen.getByText('ir'));

    wrapper = screen.getByText('ir').closest('[data-pathname]');
    expect(wrapper).toHaveAttribute('data-pathname', '/destino');
    expect(screen.getByTestId('pathname-copy')).toBeInTheDocument();
  });

  it('preserves utility exports that still rely on motion wrappers', () => {
    render(
      <>
        <StaggerContainer className="stagger-shell">
          <StaggerItem className="stagger-item">item</StaggerItem>
        </StaggerContainer>
        <FadeInView className="fade-shell">fade</FadeInView>
      </>,
    );

    expect(screen.getByText('item')).toBeInTheDocument();
    expect(screen.getByText('fade')).toBeInTheDocument();
    expect(document.querySelector('.stagger-shell')).toBeTruthy();
    expect(document.querySelector('.stagger-item')).toBeTruthy();
    expect(document.querySelector('.fade-shell')).toBeTruthy();
  });
});
