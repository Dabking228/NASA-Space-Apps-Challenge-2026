import { z } from 'zod';
import {
  MissionDaySchema,
  QualityFlagSchema,
  SymptomKindSchema,
} from './vocabulary';

export const ReadingSchema = z.strictObject({
  astronautId: z.string().min(1),
  indicatorId: z.string().min(1),
  day: MissionDaySchema,
  value: z.number(),
  quality: QualityFlagSchema,
});
export type Reading = z.infer<typeof ReadingSchema>;

export const SymptomReportSchema = z.strictObject({
  astronautId: z.string().min(1),
  day: MissionDaySchema,
  kind: SymptomKindSchema,
});
export type SymptomReport = z.infer<typeof SymptomReportSchema>;

export const SafetyFlagSchema = z.strictObject({
  astronautId: z.string().min(1),
  day: MissionDaySchema,
});
export type SafetyFlag = z.infer<typeof SafetyFlagSchema>;

export const AlertReportSchema = z
  .strictObject({
    kind: z.literal('solar-particle-event'),
    startDay: MissionDaySchema,
    endDay: MissionDaySchema,
  })
  .refine((alert) => alert.endDay >= alert.startDay, {
    path: ['endDay'],
    message: 'endDay must be on or after startDay',
  });
export type AlertReport = z.infer<typeof AlertReportSchema>;
