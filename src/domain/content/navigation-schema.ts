import { z } from 'zod';

export const NavigationItemSchema = z.strictObject({
  route: z.string().startsWith('/'),
  label: z.string().min(1),
  description: z.string().min(1),
  // Name of an icon. The shell maps the name to an icon component.
  iconName: z.string().min(1),
  // False for pages that stay out of the main navigation, such as the director panel.
  inNav: z.boolean(),
});
export type NavigationItem = Readonly<z.infer<typeof NavigationItemSchema>>;

export const NavigationSchema = z.array(NavigationItemSchema).min(1);
export type Navigation = readonly NavigationItem[];
