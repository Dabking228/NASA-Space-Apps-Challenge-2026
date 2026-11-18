import { MissionDaySchema } from '../schemas/vocabulary';
import type { Completion } from './completion-schema';

/**
 * Inputs shared by every figure. `completions` may hold records of other
 * scenarios and astronauts (the store keeps dormant ones); only the records of
 * `scenarioId` count. `dailyTaskIds` are the ids of the countermeasure tasks
 * with the daily flag.
 */
export interface EngagementScope {
  readonly completions: readonly Completion[];
  readonly dailyTaskIds: readonly string[];
  readonly scenarioId: string;
}

export interface AstronautScope extends EngagementScope {
  readonly astronautId: string;
}

export interface DayInput extends AstronautScope {
  readonly day: number;
}

export interface WeeklyStripInput extends DayInput {
  /** Number of days in the strip, ending on `day`. */
  readonly length: number;
}

export interface CrewGoalInput extends EngagementScope {
  readonly astronautIds: readonly string[];
  readonly day: number;
}

/** One cell of the weekly strip. */
export interface StripDay {
  readonly day: number;
  /** False for a day before Mission_Day 0, which is never complete. */
  readonly inMission: boolean;
  readonly complete: boolean;
}

export interface CrewGoal {
  /** Crew members with a complete day, counted once each. */
  readonly completeMembers: number;
  /** Distinct crew members. */
  readonly memberCount: number;
  /** `completeMembers / memberCount`, or `undefined` for an empty crew. */
  readonly share: number | undefined;
}

function isMissionDay(day: number): boolean {
  return MissionDaySchema.safeParse(day).success;
}

/**
 * Mission_Days on which the astronaut has a completion for every daily task.
 * With no daily task, no day is complete: an empty list must not give a streak.
 */
function completeDays(scope: AstronautScope): ReadonlySet<number> {
  const required = new Set(scope.dailyTaskIds);
  const complete = new Set<number>();
  if (required.size === 0) {
    return complete;
  }

  const doneByDay = new Map<number, Set<string>>();
  for (const completion of scope.completions) {
    if (
      completion.scenarioId !== scope.scenarioId ||
      completion.astronautId !== scope.astronautId ||
      !required.has(completion.taskId)
    ) {
      continue;
    }
    const done = doneByDay.get(completion.day) ?? new Set<string>();
    done.add(completion.taskId);
    doneByDay.set(completion.day, done);
  }

  for (const [day, done] of doneByDay) {
    if (done.size === required.size) {
      complete.add(day);
    }
  }
  return complete;
}

/**
 * Whether every daily task has a completion for the astronaut on the day.
 * A day that is not a Mission_Day (negative or fractional) is not complete.
 */
export function isDayComplete(input: DayInput): boolean {
  if (!isMissionDay(input.day)) {
    return false;
  }
  return completeDays(input).has(input.day);
}

/**
 * Length of the run of complete days that ends on `day`, or on the day before
 * when `day` is not complete. A day that is not a Mission_Day gives 0.
 */
export function currentStreak(input: DayInput): number {
  if (!isMissionDay(input.day)) {
    return 0;
  }
  const complete = completeDays(input);
  let cursor = complete.has(input.day) ? input.day : input.day - 1;
  let run = 0;
  while (cursor >= 0 && complete.has(cursor)) {
    run += 1;
    cursor -= 1;
  }
  return run;
}

/**
 * Length of the longest run of complete days from Mission_Day 0 to `day`
 * inclusive. A day that is not a Mission_Day gives 0.
 */
export function bestStreak(input: DayInput): number {
  if (!isMissionDay(input.day)) {
    return 0;
  }
  const complete = completeDays(input);
  let best = 0;
  let run = 0;
  for (let day = 0; day <= input.day; day += 1) {
    run = complete.has(day) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/**
 * Share of the crew with a complete `day`. Repeated ids count once. An empty
 * crew or a day that is not a Mission_Day gives a share of `undefined`.
 */
export function crewGoalShare(input: CrewGoalInput): CrewGoal {
  const members = [...new Set(input.astronautIds)];
  const memberCount = members.length;
  const completeMembers = members.filter((astronautId) =>
    isDayComplete({
      completions: input.completions,
      dailyTaskIds: input.dailyTaskIds,
      scenarioId: input.scenarioId,
      astronautId,
      day: input.day,
    }),
  ).length;
  return {
    completeMembers,
    memberCount,
    share:
      memberCount === 0 || !isMissionDay(input.day)
        ? undefined
        : completeMembers / memberCount,
  };
}

/**
 * Completion of the last `length` days ending on `day`, oldest first. Always
 * `length` entries. Days before Mission_Day 0 are marked `inMission: false`.
 * A `length` that is not a non-negative integer, or a `day` that is not a
 * Mission_Day, gives an empty strip.
 */
export function weeklyStrip(input: WeeklyStripInput): readonly StripDay[] {
  if (!isMissionDay(input.day) || !isMissionDay(input.length)) {
    return [];
  }
  const complete = completeDays(input);
  const first = input.day - input.length + 1;
  return Array.from({ length: input.length }, (_, index) => {
    const day = first + index;
    return {
      day,
      inMission: day >= 0,
      complete: complete.has(day),
    };
  });
}

/** Whether the share reaches the target. An absent share never meets it. */
export function targetMet(share: number | undefined, target: number): boolean {
  return share !== undefined && share >= target;
}
