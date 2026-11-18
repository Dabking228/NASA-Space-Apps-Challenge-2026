import { z } from 'zod';
import { FindingTierSchema } from '@/domain/schemas/indicator';
import { MissionDaySchema } from '@/domain/schemas/vocabulary';
import { ScenarioEventSchema } from '@/simulation/events/event-schemas';

// SD-12: one named astronaut, any crew member, or every crew member.
export const ExpectationScopeSchema = z.discriminatedUnion('who', [
  z.strictObject({
    who: z.literal('astronaut'),
    astronautId: z.string().min(1),
  }),
  z.strictObject({ who: z.literal('any-crew-member') }),
  z.strictObject({ who: z.literal('every-crew-member') }),
]);
export type ExpectationScope = Readonly<z.infer<typeof ExpectationScopeSchema>>;

export const StorylineExpectationSchema = z.discriminatedUnion('form', [
  z.strictObject({
    form: z.literal('cluster'),
    scope: ExpectationScopeSchema,
    clusterId: z.string().min(1),
    byDay: MissionDaySchema,
  }),
  z.strictObject({
    form: z.literal('indicator'),
    scope: ExpectationScopeSchema,
    indicatorId: z.string().min(1),
    minTier: FindingTierSchema,
    withinEarthReference: z.boolean().optional(),
    byDay: MissionDaySchema,
  }),
]);
export type StorylineExpectation = Readonly<
  z.infer<typeof StorylineExpectationSchema>
>;

export const ScenarioSchema = z.strictObject({
  id: z.string().min(1),
  label: z.string().min(1),
  environmentId: z.string().min(1),
  // Zod 4 `z.int()` accepts safe integers only.
  seed: z.int(),
  // Unique ids and crew order are checked by `validateScenario`.
  crew: z.array(z.string().min(1)).min(1),
  durationDays: z.int().min(1),
  events: z.array(ScenarioEventSchema),
  expectations: z.array(StorylineExpectationSchema),
});
export type Scenario = Readonly<z.infer<typeof ScenarioSchema>>;
