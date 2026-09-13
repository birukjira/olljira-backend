import { getDb } from "./connection";
import {
  posts,
  projects,
  heroSlides,
  media,
  settings,
  jobs,
  contactSubmissions,
  testimonials,
} from "@db/schema";
import { eq, desc, asc } from "drizzle-orm";

/* ------------------------------ posts ------------------------------ */

export async function listPublishedPosts() {
  return getDb()
    .select()
    .from(posts)
    .where(eq(posts.published, true))
    .orderBy(desc(posts.publishedAt));
}

export async function listAllPosts() {
  return getDb().select().from(posts).orderBy(desc(posts.publishedAt));
}

export async function findPostBySlug(slug: string) {
  return getDb().query.posts.findFirst({ where: eq(posts.slug, slug) });
}

export async function findPostById(id: number) {
  return getDb().query.posts.findFirst({ where: eq(posts.id, id) });
}

/* ----------------------------- projects ----------------------------- */

export async function listPublishedProjects() {
  return getDb()
    .select()
    .from(projects)
    .where(eq(projects.published, true))
    .orderBy(desc(projects.sortOrder));
}

export async function listAllProjects() {
  return getDb().select().from(projects).orderBy(desc(projects.sortOrder));
}

export async function findProjectBySlug(slug: string) {
  return getDb().query.projects.findFirst({ where: eq(projects.slug, slug) });
}

export async function findProjectById(id: number) {
  return getDb().query.projects.findFirst({ where: eq(projects.id, id) });
}

/* ---------------------------- hero slides ---------------------------- */

export async function listActiveHeroSlides() {
  return getDb()
    .select()
    .from(heroSlides)
    .where(eq(heroSlides.active, true))
    .orderBy(asc(heroSlides.sortOrder));
}

export async function listAllHeroSlides() {
  return getDb().select().from(heroSlides).orderBy(asc(heroSlides.sortOrder));
}

/* ------------------------------- media ------------------------------- */

export async function listMedia() {
  return getDb()
    .select({
      id: media.id,
      name: media.name,
      mimeType: media.mimeType,
      createdAt: media.createdAt,
    })
    .from(media)
    .orderBy(desc(media.createdAt));
}

export async function findMediaById(id: number) {
  return getDb().query.media.findFirst({ where: eq(media.id, id) });
}

/* ------------------------------- jobs -------------------------------- */

export async function listPublishedJobs() {
  return getDb()
    .select()
    .from(jobs)
    .where(eq(jobs.published, true))
    .orderBy(desc(jobs.sortOrder), desc(jobs.createdAt));
}

export async function listAllJobs() {
  return getDb().select().from(jobs).orderBy(desc(jobs.sortOrder), desc(jobs.createdAt));
}

export async function findJobBySlug(slug: string) {
  return getDb().query.jobs.findFirst({ where: eq(jobs.slug, slug) });
}

export async function findJobById(id: number) {
  return getDb().query.jobs.findFirst({ where: eq(jobs.id, id) });
}

/* -------------------------- contact submissions -------------------------- */

export async function createContactSubmission(data: {
  fullName: string;
  contact: string;
  service?: string;
  message: string;
}) {
  const [{ id }] = await getDb().insert(contactSubmissions).values(data).$returningId();
  return getDb().query.contactSubmissions.findFirst({
    where: eq(contactSubmissions.id, id),
  });
}

export async function listContactSubmissions() {
  return getDb()
    .select()
    .from(contactSubmissions)
    .orderBy(desc(contactSubmissions.createdAt));
}

export async function countUnreadSubmissions() {
  const rows = await getDb()
    .select({ id: contactSubmissions.id })
    .from(contactSubmissions)
    .where(eq(contactSubmissions.read, false));
  return rows.length;
}

export async function markSubmissionRead(id: number, read: boolean) {
  await getDb()
    .update(contactSubmissions)
    .set({ read })
    .where(eq(contactSubmissions.id, id));
  return getDb().query.contactSubmissions.findFirst({
    where: eq(contactSubmissions.id, id),
  });
}

export async function deleteSubmission(id: number) {
  await getDb().delete(contactSubmissions).where(eq(contactSubmissions.id, id));
  return { ok: true };
}

/* ---------------------------- testimonials ---------------------------- */

export async function listPublishedTestimonials() {
  return getDb()
    .select()
    .from(testimonials)
    .where(eq(testimonials.published, true))
    .orderBy(desc(testimonials.sortOrder), desc(testimonials.createdAt));
}

export async function listAllTestimonials() {
  return getDb()
    .select()
    .from(testimonials)
    .orderBy(desc(testimonials.sortOrder), desc(testimonials.createdAt));
}

export async function findTestimonialById(id: number) {
  return getDb().query.testimonials.findFirst({ where: eq(testimonials.id, id) });
}

/* ------------------------------ settings ------------------------------ */

export async function getSetting(key: string) {
  const row = await getDb().query.settings.findFirst({
    where: eq(settings.key, key),
  });
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  await getDb()
    .insert(settings)
    .values({ key, value })
    .onDuplicateKeyUpdate({ set: { value } });
}
