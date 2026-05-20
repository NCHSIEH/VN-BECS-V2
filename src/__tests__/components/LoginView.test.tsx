import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { LoginView } from '../../components/LoginView';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

vi.mock('../../lib/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    lang: 'en',
    setLang: vi.fn(),
  })
}));

describe('LoginView', () => {
  it('renders login form with username and password fields', () => {
    const handleLogin = vi.fn();
    render(<LoginView onLogin={handleLogin} />);

    expect(screen.getByPlaceholderText('e.g. admin')).toBeDefined();
    expect(screen.getByPlaceholderText('••••••••')).toBeDefined();
    expect(screen.getByRole('button', { name: /login_btn/i })).toBeDefined();
  });

  it('submits form with entered credentials', async () => {
    const handleLogin = vi.fn();

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        id: 'USR-ADMIN',
        username: 'admin',
        role: 'Admin',
        orgId: 'ORG-HUB-01',
        permittedSystems: ['HUB', 'LIMS', 'MDM', 'HOSPITAL', 'NATIONAL', 'IAM', 'DASHBOARD'],
        isActive: true
      })
    });

    render(<LoginView onLogin={handleLogin} />);

    const usernameInput = screen.getByPlaceholderText('e.g. admin');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const submitButton = screen.getByRole('button', { name: /login_btn/i });

    fireEvent.change(usernameInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: 'admin123' } });

    await act(async () => {
      fireEvent.click(submitButton);
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/v1/login', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    }));

    expect(handleLogin).toHaveBeenCalled();
  });
});
