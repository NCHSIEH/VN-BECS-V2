import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { DonorCenterSimulatorView } from '../components/DonorCenterSimulatorView';
import React from 'react';

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

// Mock i18n
vi.mock('../lib/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    lang: 'en',
    setLang: vi.fn(),
  })
}));

describe('DonorCenterSimulatorView - Frontend Button Calibration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders "Fabricate Components" button and disables it when idmStatus is not CLEARED', async () => {
    // Mock all the fetch endpoints hit by loadData
    const mockDonations = [
      {
        id: 'DONATION-PENDING',
        donorId: 'DONOR-01',
        donorAbo: 'O',
        donorRhd: 'Positive',
        collectedAt: new Date().toISOString(),
        volume: 450,
        idmStatus: 'PENDING', // Not CLEARED -> should be disabled
        componentCount: 0,
      },
      {
        id: 'DONATION-CLEARED',
        donorId: 'DONOR-02',
        donorAbo: 'A',
        donorRhd: 'Positive',
        collectedAt: new Date().toISOString(),
        volume: 350,
        idmStatus: 'CLEARED', // CLEARED -> should be enabled
        componentCount: 0,
      },
      {
        id: 'DONATION-REACTIVE',
        donorId: 'DONOR-03',
        donorAbo: 'B',
        donorRhd: 'Negative',
        collectedAt: new Date().toISOString(),
        volume: 250,
        idmStatus: 'REACTIVE', // REACTIVE -> should render QUARANTINE RESTRICTED badge instead of button
        componentCount: 0,
      }
    ];

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/api/v1/lims/donations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockDonations),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    await act(async () => {
      render(
        <DonorCenterSimulatorView 
          activeTab="PROCESS" 
          user={{ id: 'USR-01', role: 'Processor' }} 
        />
      );
      // Wait for fetch promises to resolve
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // Check that we have buttons or the quarantine badge
    const buttons = screen.getAllByRole('button');
    // i18n: the mocked t() returns the key, so assert against the translation key.
    const fabricateButtons = buttons.filter(b => b.textContent?.trim() === 'lims_proc_fabricate');

    expect(fabricateButtons.length).toBe(2);

    // One button should be for PENDING, which should be disabled
    // The other button should be for CLEARED, which should be enabled
    const pendingButton = fabricateButtons.find(b => {
      return (b as HTMLButtonElement).disabled === true;
    });
    const clearedButton = fabricateButtons.find(b => {
      return (b as HTMLButtonElement).disabled === false;
    });

    expect(pendingButton).toBeDefined();
    expect(clearedButton).toBeDefined();

    // Check that REACTIVE shows the quarantine-restricted badge (i18n key via mocked t()).
    expect(screen.getByText('lims_proc_quarantine_restricted')).toBeDefined();
  });
});
