import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import type { AuthContextValue } from '../../auth/AuthContext.types';
import { ProtectedRoute } from './ProtectedRoute';

// Mock the AuthContext module so we control what useAuth returns per test
vi.mock('../../auth/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../auth/AuthContext';

const mockUseAuth = vi.mocked(useAuth);

function makeAuth(overrides: Partial<AuthContextValue>): AuthContextValue {
  return {
    user: null,
    isLoading: false,
    isAuthenticated: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  };
}

function renderRoute(props?: { roles?: ('ADMIN' | 'DOCTOR' | 'PATIENT')[] }) {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route element={<ProtectedRoute roles={props?.roles} />}>
          <Route path="/protected" element={<div>Protected content</div>} />
        </Route>
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/dashboard" element={<div>Dashboard page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('redirects to /login when not authenticated', () => {
    mockUseAuth.mockReturnValue(makeAuth({ isAuthenticated: false, isLoading: false }));
    renderRoute();
    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('renders Outlet when authenticated with no role restriction', () => {
    mockUseAuth.mockReturnValue(
      makeAuth({
        isAuthenticated: true,
        user: { id: '1', email: 'a@b.com', name: 'Alice', role: 'ADMIN' },
      }),
    );
    renderRoute();
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it("redirects to /dashboard when user's role is not in allowedRoles", () => {
    mockUseAuth.mockReturnValue(
      makeAuth({
        isAuthenticated: true,
        user: { id: '2', email: 'doc@b.com', name: 'Bob', role: 'DOCTOR' },
      }),
    );
    renderRoute({ roles: ['ADMIN'] });
    expect(screen.getByText('Dashboard page')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('renders Outlet when user role matches allowedRoles', () => {
    mockUseAuth.mockReturnValue(
      makeAuth({
        isAuthenticated: true,
        user: { id: '3', email: 'p@b.com', name: 'Carol', role: 'PATIENT' },
      }),
    );
    renderRoute({ roles: ['PATIENT', 'ADMIN'] });
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('shows spinner during loading state', () => {
    mockUseAuth.mockReturnValue(makeAuth({ isLoading: true, isAuthenticated: false }));
    const { container } = renderRoute();
    // The spinner is a div with a rotating border — no text content
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
    // The spinner wrapper is present in the DOM
    expect(container.querySelector('div[style]')).not.toBeNull();
  });
});
