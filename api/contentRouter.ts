import { z } from "zod";
import { eq } from "drizzle-orm";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { sendContactNotification } from "./mail";
import { getDb } from "./queries/connection";
import { posts, projects, heroSlides, media, jobs, testimonials } from "@db/schema";
import {
  listPublishedPosts,
  listAllPosts,
  findPostBySlug,
  findPostById,
  listPublishedProjects,
  listAllProjects,
  findProjectBySlug,
  findProjectById,
  listActiveHeroSlides,
  listAllHeroSlides,
  listPublishedJobs,
  listAllJobs,
  findJobBySlug,
  findJobById,
  createContactSubmission,
  listContactSubmissions,
  countUnreadSubmissions,
  markSubmissionRead,
  deleteSubmission,
  listPublishedTestimonials,
  listAllTestimonials,
  findTestimonialById,
  listMedia,
  getSetting,
  setSetting,
} from "./queries/content";

/**
 * Build a PATCH schema from a create schema: every field becomes optional
 * and — crucially — field defaults are stripped. Zod's .partial() keeps
 * .default() wrappers, so omitted keys were being parsed to their defaults
 * and then written to the DB, wiping existing values on partial updates.
 */
function patchOf<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  const shape = schema.shape;
  const out: Record<string, z.ZodTypeAny> = {};
  for (const key of Object.keys(shape)) {
    let field = shape[key] as unknown as z.ZodTypeAny;
    // Unwrap Default/Optional/Nullable/Readonly/Prefault layers to the base type
    for (;;) {
      const def = (field as z.ZodTypeAny)._def;
      const inner = (def as { innerType?: unknown }).innerType as
        | z.ZodTypeAny
        | undefined;
      if (!inner) break;
      const type = (def as { type?: string }).type;
      if (type === "default" || type === "optional" || type === "nullable" || type === "prefault") {
        field = inner;
      } else {
        break;
      }
    }
    out[key] = field.optional();
  }
  return z.object(out);
}

const postInput = z.object({
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "slug: lowercase letters, numbers, dashes"),
  title: z.string().min(3),
  excerpt: z.string().optional().default(""),
  firstTag: z.string().optional().default(""),
  imageUrl: z.string().optional().default(""),
  contentHtml: z.string().optional().default(""),
  readTimeMinutes: z.number().int().min(1).max(120).default(5),
  published: z.boolean().default(true),
  publishedAt: z.date().optional(),
});

const projectInput = z.object({
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "slug: lowercase letters, numbers, dashes"),
  title: z.string().min(3),
  type: z.enum(["case-study", "software"]),
  firstTag: z.string().optional().default(""),
  clientName: z.string().optional().default(""),
  cardDescription: z.string().optional().default(""),
  featuredImage: z.string().optional().default(""),
  imageCaption: z.string().optional().default(""),
  liveUrl: z.string().optional().default(""),
  tagIds: z.string().optional().default(""),
  overviewHtml: z.string().optional().default(""),
  processHtml: z.string().optional().default(""),
  descriptionHtml: z.string().optional().default(""),
  sortOrder: z.number().int().default(0),
  published: z.boolean().default(true),
});

const jobInput = z.object({
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "slug: lowercase letters, numbers, dashes"),
  title: z.string().min(3),
  excerpt: z.string().optional().default(""),
  department: z.string().optional().default(""),
  location: z.string().optional().default(""),
  workplaceType: z.enum(["ONSITE", "REMOTE", "HYBRID"]).default("ONSITE"),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "TEMP"]).default("FULL_TIME"),
  seniority: z.string().optional().default(""),
  applyEmail: z.string().optional().default(""),
  externalApplyUrl: z.string().optional().default(""),
  deadlineAt: z.date().nullish(),
  canApply: z.boolean().default(true),
  featuredImage: z.string().optional().default(""),
  contentHtml: z.string().optional().default(""),
  published: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const testimonialInput = z.object({
  quote: z.string().min(10),
  authorName: z.string().min(2),
  authorRole: z.string().optional().default(""),
  organization: z.string().optional().default(""),
  published: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const heroSlideInput = z.object({
  title: z.string().min(2),
  kind: z.enum(["image", "mockup"]).default("image"),
  desktopImage: z.string().optional().default(""),
  mobileImage: z.string().optional().default(""),
  sortOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const contentRouter = createRouter({
  /* ------------------------------ public ------------------------------ */
  posts: publicQuery.query(() => listPublishedPosts()),
  postBySlug: publicQuery
    .input(z.object({ slug: z.string() }))
    .query(({ input }) => findPostBySlug(input.slug)),
  projects: publicQuery.query(() => listPublishedProjects()),
  projectBySlug: publicQuery
    .input(z.object({ slug: z.string() }))
    .query(({ input }) => findProjectBySlug(input.slug)),
  heroSlides: publicQuery.query(() => listActiveHeroSlides()),
  jobs: publicQuery.query(() => listPublishedJobs()),
  jobBySlug: publicQuery
    .input(z.object({ slug: z.string() }))
    .query(({ input }) => findJobBySlug(input.slug)),
  submitContact: publicQuery
    .input(
      z.object({
        fullName: z.string().min(2).max(255),
        contact: z.string().min(5).max(255),
        service: z.string().max(255).optional().default(""),
        message: z.string().min(10).max(5000),
      }),
    )
    .mutation(async ({ input }) => {
      const row = await createContactSubmission(input);
      // Fire-and-forget: delivery failures never block the visitor.
      void sendContactNotification(input);
      return row;
    }),
  bookingEmbedUrl: publicQuery.query(() => getSetting("booking_embed_url")),
  testimonials: publicQuery.query(() => listPublishedTestimonials()),

  /* ------------------------------ admin ------------------------------ */
  admin: createRouter({
    posts: adminQuery.query(() => listAllPosts()),
    postById: adminQuery
      .input(z.object({ id: z.number() }))
      .query(({ input }) => findPostById(input.id)),
    createPost: adminQuery.input(postInput).mutation(async ({ input }) => {
      const [{ id }] = await getDb().insert(posts).values(input).$returningId();
      return findPostById(id);
    }),
    updatePost: adminQuery
      .input(z.object({ id: z.number(), data: patchOf(postInput) }))
      .mutation(async ({ input }) => {
        await getDb().update(posts).set(input.data).where(eq(posts.id, input.id));
        return findPostById(input.id);
      }),
    deletePost: adminQuery
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await getDb().delete(posts).where(eq(posts.id, input.id));
        return { ok: true };
      }),

    projects: adminQuery.query(() => listAllProjects()),
    projectById: adminQuery
      .input(z.object({ id: z.number() }))
      .query(({ input }) => findProjectById(input.id)),
    createProject: adminQuery.input(projectInput).mutation(async ({ input }) => {
      const [{ id }] = await getDb().insert(projects).values(input).$returningId();
      return findProjectById(id);
    }),
    updateProject: adminQuery
      .input(z.object({ id: z.number(), data: patchOf(projectInput) }))
      .mutation(async ({ input }) => {
        await getDb()
          .update(projects)
          .set(input.data)
          .where(eq(projects.id, input.id));
        return findProjectById(input.id);
      }),
    deleteProject: adminQuery
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await getDb().delete(projects).where(eq(projects.id, input.id));
        return { ok: true };
      }),

    jobs: adminQuery.query(() => listAllJobs()),
    jobById: adminQuery
      .input(z.object({ id: z.number() }))
      .query(({ input }) => findJobById(input.id)),
    createJob: adminQuery.input(jobInput).mutation(async ({ input }) => {
      const [{ id }] = await getDb().insert(jobs).values(input).$returningId();
      return findJobById(id);
    }),
    updateJob: adminQuery
      .input(z.object({ id: z.number(), data: patchOf(jobInput) }))
      .mutation(async ({ input }) => {
        await getDb().update(jobs).set(input.data).where(eq(jobs.id, input.id));
        return findJobById(input.id);
      }),
    deleteJob: adminQuery
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await getDb().delete(jobs).where(eq(jobs.id, input.id));
        return { ok: true };
      }),

    testimonials: adminQuery.query(() => listAllTestimonials()),
    createTestimonial: adminQuery.input(testimonialInput).mutation(async ({ input }) => {
      const [{ id }] = await getDb().insert(testimonials).values(input).$returningId();
      return findTestimonialById(id);
    }),
    updateTestimonial: adminQuery
      .input(z.object({ id: z.number(), data: patchOf(testimonialInput) }))
      .mutation(async ({ input }) => {
        await getDb()
          .update(testimonials)
          .set(input.data)
          .where(eq(testimonials.id, input.id));
        return findTestimonialById(input.id);
      }),
    deleteTestimonial: adminQuery
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await getDb().delete(testimonials).where(eq(testimonials.id, input.id));
        return { ok: true };
      }),

    heroSlides: adminQuery.query(() => listAllHeroSlides()),
    createHeroSlide: adminQuery.input(heroSlideInput).mutation(async ({ input }) => {
      const [{ id }] = await getDb().insert(heroSlides).values(input).$returningId();
      return { id };
    }),
    updateHeroSlide: adminQuery
      .input(z.object({ id: z.number(), data: patchOf(heroSlideInput) }))
      .mutation(async ({ input }) => {
        await getDb()
          .update(heroSlides)
          .set(input.data)
          .where(eq(heroSlides.id, input.id));
        return { ok: true };
      }),
    deleteHeroSlide: adminQuery
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await getDb().delete(heroSlides).where(eq(heroSlides.id, input.id));
        return { ok: true };
      }),

    submissions: adminQuery.query(() => listContactSubmissions()),
    unreadSubmissions: adminQuery.query(() => countUnreadSubmissions()),
    markSubmissionRead: adminQuery
      .input(z.object({ id: z.number(), read: z.boolean() }))
      .mutation(({ input }) => markSubmissionRead(input.id, input.read)),
    deleteSubmission: adminQuery
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteSubmission(input.id)),

    media: adminQuery.query(() => listMedia()),
    deleteMedia: adminQuery
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await getDb().delete(media).where(eq(media.id, input.id));
        return { ok: true };
      }),

    getSetting: adminQuery
      .input(z.object({ key: z.string() }))
      .query(({ input }) => getSetting(input.key)),
    setSetting: adminQuery
      .input(z.object({ key: z.string().min(1), value: z.string() }))
      .mutation(({ input }) => setSetting(input.key, input.value)),
  }),
});
