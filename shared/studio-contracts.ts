import { Type, type Static } from 'typebox';
const opts = { additionalProperties: false } as const;
const text = (max: number) =>
  Type.String({ minLength: 1, maxLength: max, pattern: '\\S' });
export const Uuid = Type.String({
  pattern:
    '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$',
});
export const Slug = Type.String({
  pattern: '^[a-z][a-z0-9-]{0,47}$',
  maxLength: 48,
});
const nullable = <T extends ReturnType<typeof Type.String> | typeof Uuid>(
  schema: T,
) => Type.Union([Type.Null(), schema]);
export const ReadingState = Type.Union([
  Type.Literal('draft'),
  Type.Literal('published'),
  Type.Literal('archived'),
]);
const ReadingFields = {
  type: Type.Union([Type.Literal('tarot'), Type.Literal('astrology')]),
  title: text(120),
  hindiTitle: nullable(text(160)),
  description: text(600),
  features: Type.Array(text(240), { minItems: 1, maxItems: 12 }),
  priceMinor: Type.Union([
    Type.Null(),
    Type.Integer({ minimum: 0, maximum: 1000000000, multipleOf: 100 }),
  ]),
  practitionerId: nullable(Uuid),
  status: ReadingState,
  sortOrder: Type.Integer({ minimum: 0, maximum: 9999 }),
};
export const ReadingCreateSchema = Type.Object(
  { id: Slug, ...ReadingFields },
  opts,
);
export const ReadingUpdateSchema = Type.Object(
  { ...ReadingFields, revision: Type.Integer({ minimum: 1 }) },
  opts,
);
export const StudioReadingSchema = Type.Object(
  {
    id: Slug,
    ...ReadingFields,
    revision: Type.Integer({ minimum: 1 }),
    updatedAt: text(40),
  },
  opts,
);
export const ReadingIdParams = Type.Object({ id: Slug }, opts);
export const ReadingListQuery = Type.Object(
  { after: Type.Optional(Slug), status: Type.Optional(ReadingState) },
  opts,
);
export const StudioReadingPageSchema = Type.Object(
  {
    items: Type.Array(StudioReadingSchema, { maxItems: 50 }),
    nextCursor: nullable(Slug),
  },
  opts,
);
export const PractitionerListSchema = Type.Array(
  Type.Object({ id: Uuid, name: text(100), published: Type.Boolean() }, opts),
  { maxItems: 100 },
);
export const OwnerSessionSchema = Type.Object(
  { userId: Uuid, mfaRequired: Type.Boolean() },
  opts,
);
export const StudioConfigSchema = Type.Object(
  {
    configured: Type.Boolean(),
    localDemo: Type.Boolean(),
    authUrl: nullable(text(512)),
    publishableKey: nullable(text(512)),
  },
  opts,
);
export const AuditListSchema = Type.Array(
  Type.Object(
    {
      id: Uuid,
      action: Type.Union([
        Type.Literal('created'),
        Type.Literal('updated'),
        Type.Literal('deleted'),
      ]),
      revision: Type.Union([Type.Null(), Type.Integer({ minimum: 1 })]),
      occurredAt: text(40),
    },
    opts,
  ),
  { maxItems: 30 },
);
export type ReadingCreate = Static<typeof ReadingCreateSchema>;
export type ReadingUpdate = Static<typeof ReadingUpdateSchema>;
export type StudioReading = Static<typeof StudioReadingSchema>;
export type StudioReadingPage = Static<typeof StudioReadingPageSchema>;
export type ReadingFilters = Static<typeof ReadingListQuery>;
export type StudioSession = Static<typeof OwnerSessionSchema>;
export type StudioConfiguration = Static<typeof StudioConfigSchema>;
export type Practitioners = Static<typeof PractitionerListSchema>;
export type AuditList = Static<typeof AuditListSchema>;
