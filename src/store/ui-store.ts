import { create } from 'zustand';

import type { BodySystem } from '@/domain/schemas/vocabulary';
import type { Tier } from '@/domain/types';

// Transient UI state. Not persisted: it resets on reload by design (FD-7, Requirement 45.1).

export type TrendRange = 'last-7' | 'last-14' | 'whole';

export interface UiData {
  readonly selectedRegion: BodySystem | null;
  readonly trendIndicatorId: string | null;
  readonly trendRange: TrendRange;
  readonly alertTierFilter: Tier | 'all';
  readonly alertSystemFilter: BodySystem | 'all';
  readonly preselectedFindingIds: readonly string[];
  readonly directorOpen: boolean;
  readonly demoSegmentIndex: number | null;
  readonly dismissedNoticeIds: readonly string[];
}

export interface UiActions {
  readonly setSelectedRegion: (region: BodySystem | null) => void;
  readonly setTrendIndicatorId: (indicatorId: string | null) => void;
  readonly setTrendRange: (range: TrendRange) => void;
  readonly setAlertTierFilter: (tier: Tier | 'all') => void;
  readonly setAlertSystemFilter: (system: BodySystem | 'all') => void;
  readonly setPreselectedFindingIds: (ids: readonly string[]) => void;
  readonly setDirectorOpen: (open: boolean) => void;
  readonly setDemoSegmentIndex: (index: number | null) => void;
  readonly dismissNotice: (noticeId: string) => void;
  readonly setDismissedNoticeIds: (ids: readonly string[]) => void;
  /** Restores every field to its start value. Used by "Reset session". */
  readonly resetUi: () => void;
}

export type UiState = UiData & UiActions;

/** Same values on the server and in the browser (Requirement 44.4). */
export const UI_INITIAL_STATE: UiData = {
  selectedRegion: null,
  trendIndicatorId: null,
  trendRange: 'whole',
  alertTierFilter: 'all',
  alertSystemFilter: 'all',
  preselectedFindingIds: [],
  directorOpen: false,
  demoSegmentIndex: null,
  dismissedNoticeIds: [],
};

export const useUiStore = create<UiState>()((set) => ({
  ...UI_INITIAL_STATE,
  setSelectedRegion: (region) => set({ selectedRegion: region }),
  setTrendIndicatorId: (indicatorId) => set({ trendIndicatorId: indicatorId }),
  setTrendRange: (range) => set({ trendRange: range }),
  setAlertTierFilter: (tier) => set({ alertTierFilter: tier }),
  setAlertSystemFilter: (system) => set({ alertSystemFilter: system }),
  setPreselectedFindingIds: (ids) => set({ preselectedFindingIds: [...ids] }),
  setDirectorOpen: (open) => set({ directorOpen: open }),
  setDemoSegmentIndex: (index) => set({ demoSegmentIndex: index }),
  dismissNotice: (noticeId) =>
    set((s) =>
      s.dismissedNoticeIds.includes(noticeId)
        ? s
        : { dismissedNoticeIds: [...s.dismissedNoticeIds, noticeId] },
    ),
  setDismissedNoticeIds: (ids) => set({ dismissedNoticeIds: [...ids] }),
  resetUi: () => set({ ...UI_INITIAL_STATE }),
}));
