import type {
  MessageStage,
  ScriptedReplyId,
} from '@/domain/content/escalation-schema';
import type { Result } from '@/domain/result';
import type { Tier } from '@/domain/types';
import {
  makeProblem,
  type SimulationProblem,
} from '@/simulation/engine/problem';
import { createSeededRandom } from '@/simulation/engine/seeded-random';
import type { NoiseSettings } from '@/simulation/engine/settings-schema';
import type { OneWayDelayRange } from '@/simulation/environments/environment-schema';

/**
 * The stored facts of one escalation message that decide its stage. A stored message has more
 * fields. Any object with these two fields works.
 */
export interface LinkMessageTiming {
  /** Link-seconds at which transmission began, or null while the message waits in the queue. */
  readonly startedAtLinkSeconds: number | null;
  /** Whole link-seconds from the spacecraft to the ground. The reply takes the same time back. */
  readonly oneWayDelaySeconds: number;
}

export interface ChooseOneWayDelayInput {
  /** Seed of the scenario. Must be a safe integer. */
  readonly scenarioSeed: number;
  /** Id of the message. Part of the random key, so each message gets its own delay. */
  readonly messageId: string;
  /** The environment's one-way delay range in link-seconds, or null where there is no delay figure. */
  readonly range: OneWayDelayRange | null;
  /** Fixed delay used when `range` is null. A positive whole number of link-seconds. */
  readonly demoDelaySeconds: number;
  readonly noise: Pick<NoiseSettings, 'clip' | 'maxDraws'>;
}

function invalidArgument(field: string, message: string): SimulationProblem {
  return makeProblem(
    'invalid-argument',
    'run',
    'escalation-link',
    field,
    message,
  );
}

function rangeProblems(range: OneWayDelayRange): readonly SimulationProblem[] {
  if (
    !Number.isFinite(range.min) ||
    !Number.isFinite(range.max) ||
    range.min < 0
  ) {
    return [
      invalidArgument(
        'range',
        `The delay range ${String(range.min)} to ${String(range.max)} is not made of finite numbers of 0 or more.`,
      ),
    ];
  }
  if (range.min > range.max) {
    return [
      makeProblem(
        'delay-range-order',
        'run',
        'escalation-link',
        'range',
        `The delay range minimum ${String(range.min)} is above its maximum ${String(range.max)}.`,
      ),
    ];
  }
  if (Math.ceil(range.min) > Math.floor(range.max)) {
    return [
      invalidArgument(
        'range',
        `The delay range ${String(range.min)} to ${String(range.max)} holds no whole number of seconds.`,
      ),
    ];
  }
  return [];
}

function argumentProblems(
  input: ChooseOneWayDelayInput,
): readonly SimulationProblem[] {
  const problems: SimulationProblem[] = [];
  if (input.messageId.length === 0) {
    problems.push(invalidArgument('messageId', 'The message id is empty.'));
  }
  if (input.range === null) {
    if (
      !Number.isSafeInteger(input.demoDelaySeconds) ||
      input.demoDelaySeconds < 1
    ) {
      problems.push(
        invalidArgument(
          'demoDelaySeconds',
          `The demo delay ${String(input.demoDelaySeconds)} is not a positive whole number of seconds.`,
        ),
      );
    }
  } else {
    problems.push(...rangeProblems(input.range));
  }
  return problems;
}

/**
 * Picks the one-way delay of a message (Requirement 7.1 to 7.3, FD-11).
 * With a range, the result is a whole number of link-seconds from the range minimum up to the
 * range maximum, both included (a fractional bound is rounded inward). It is
 * `lo + floor(uniform(['escalation-delay', messageId], 0) * (hi - lo + 1))`, so equal inputs give
 * equal delays. Without a range (the ISS) it is `demoDelaySeconds`. Invalid input comes back as
 * problems and nothing is thrown.
 */
export function chooseOneWayDelaySeconds(
  input: ChooseOneWayDelayInput,
): Result<number, readonly SimulationProblem[]> {
  const random = createSeededRandom(input.scenarioSeed, input.noise);
  const problems = [
    ...(random.ok ? [] : random.error),
    ...argumentProblems(input),
  ];
  if (!random.ok || problems.length > 0) {
    return { ok: false, error: problems };
  }
  if (input.range === null) {
    return { ok: true, value: input.demoDelaySeconds };
  }

  const low = Math.ceil(input.range.min);
  const high = Math.floor(input.range.max);
  const draw = random.value.uniform(['escalation-delay', input.messageId], 0);
  const offset = Math.floor(draw * (high - low + 1));
  return { ok: true, value: Math.min(high, low + offset) };
}

/**
 * Converts whole real seconds to whole link-seconds with the time scale of the app defaults
 * (FD-11, 120 link-seconds per real second by default). The scale must be a positive whole
 * number and the real seconds a whole number of 0 or more, so the result is a whole number.
 */
export function realSecondsToLinkSeconds(
  realSeconds: number,
  linkTimeScale: number,
): Result<number, readonly SimulationProblem[]> {
  const problems: SimulationProblem[] = [];
  if (!Number.isSafeInteger(realSeconds) || realSeconds < 0) {
    problems.push(
      invalidArgument(
        'realSeconds',
        `The real time ${String(realSeconds)} is not a whole number of seconds of 0 or more.`,
      ),
    );
  }
  if (!Number.isSafeInteger(linkTimeScale) || linkTimeScale < 1) {
    problems.push(
      invalidArgument(
        'linkTimeScale',
        `The time scale ${String(linkTimeScale)} is not a positive whole number.`,
      ),
    );
  }
  const linkSeconds = realSeconds * linkTimeScale;
  if (problems.length === 0 && !Number.isSafeInteger(linkSeconds)) {
    problems.push(
      invalidArgument(
        'realSeconds',
        `The real time ${String(realSeconds)} at scale ${String(linkTimeScale)} is too large.`,
      ),
    );
  }
  return problems.length > 0
    ? { ok: false, error: problems }
    : { ok: true, value: linkSeconds };
}

/**
 * Link-seconds at which each stage after `queued` begins, in stage order: transmitting at the
 * start, delivered one delay later, reply received two delays after the start. No processing
 * time on the ground is added (Requirement 7.7). Null while the message has not started.
 */
function stageStarts(
  message: LinkMessageTiming,
): readonly [number, number, number] | null {
  const start = message.startedAtLinkSeconds;
  if (start === null) {
    return null;
  }
  const delay = message.oneWayDelaySeconds;
  return [start, start + delay, start + 2 * delay];
}

/**
 * The stage of a message at a link clock value (Requirement 7.4, 7.5). A threshold form: the
 * stage is the last one whose start is at or before the clock, so it never moves back as the
 * clock grows. A message with no start is queued. A clock before the start is queued too.
 * Expects a finite clock and a delay of 0 or more.
 */
export function messageStage(
  message: LinkMessageTiming,
  linkClockSeconds: number,
): MessageStage {
  const starts = stageStarts(message);
  if (starts === null) {
    return 'queued';
  }
  const [transmitting, delivered, replyReceived] = starts;
  if (linkClockSeconds >= replyReceived) {
    return 'reply-received';
  }
  if (linkClockSeconds >= delivered) {
    return 'delivered';
  }
  if (linkClockSeconds >= transmitting) {
    return 'transmitting';
  }
  return 'queued';
}

/**
 * The earliest link clock value above `linkClockSeconds` at which the stage of the message
 * changes, or null when it cannot change: a message with no start waits for the link, and a
 * message past its reply time is finished. Setting the clock to the result gives a later stage
 * (Property 25). The plan listed `nextStageAtSeconds(message)`. The next stage depends on the
 * current clock, so the clock is a second argument.
 */
export function nextStageAtSeconds(
  message: LinkMessageTiming,
  linkClockSeconds: number,
): number | null {
  const starts = stageStarts(message);
  if (starts === null) {
    return null;
  }
  const next = starts.find((startsAt) => startsAt > linkClockSeconds);
  return next === undefined ? null : next;
}

// A full Record over Tier: a new tier fails typecheck until it has a reply (Requirement 7.6).
const REPLY_ID_BY_TIER: Readonly<Record<Tier, ScriptedReplyId>> = {
  green: 'reply-green',
  yellow: 'reply-yellow',
  orange: 'reply-orange',
  red: 'reply-red',
};

/** The scripted reply for the highest tier in a summary. Depends on the tier alone. */
export function replyIdForTier(tier: Tier): ScriptedReplyId {
  return REPLY_ID_BY_TIER[tier];
}
