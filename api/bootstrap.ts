import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { getDb } from "./queries/connection";
import { env } from "./lib/env";
import { posts, projects, heroSlides, settings, jobs, testimonials, users } from "@db/schema";
import { seedData } from "@db/seed-data";
import { postContent, projectContent, jobContent } from "@db/seed-content";

type PostSeed = (typeof seedData.posts)[number];
type JobSeed = (typeof seedData.jobs)[number];

function postRow(p: PostSeed) {
  return {
    ...p,
    contentHtml: postContent[p.slug] ?? "",
    publishedAt: new Date(p.publishedAt + " UTC"),
  };
}

function jobRow(j: JobSeed) {
  const { deadlineAt, ...rest } = j;
  return {
    ...rest,
    contentHtml: jobContent[j.slug] ?? "",
    deadlineAt: new Date(deadlineAt + " UTC"),
  };
}

/**
 * Ensure the bootstrap admin account exists (ADMIN_EMAIL / ADMIN_PASSWORD
 * env vars). Creates it on first boot; if the account already exists but
 * the password no longer matches ADMIN_PASSWORD, the password is updated
 * and admin role restored. No-op when the env vars are unset.
 */
async function ensureAdminAccount() {
  if (!env.adminEmail || !env.adminPassword) return;
  const db = getDb();
  const passwordHash = await bcrypt.hash(env.adminPassword, 12);
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, env.adminEmail))
    .limit(1);
  const row = existing.at(0);
  if (!row) {
    await db.insert(users).values({
      unionId: `local:${env.adminEmail}`,
      name: "Administrator",
      email: env.adminEmail,
      passwordHash,
      role: "admin",
    });
    console.log(`[bootstrap] admin account created: ${env.adminEmail}`);
    return;
  }
  const passwordMatches = row.passwordHash
    ? await bcrypt.compare(env.adminPassword, row.passwordHash)
    : false;
  if (!passwordMatches || row.role !== "admin") {
    await db
      .update(users)
      .set({ passwordHash, role: "admin" })
      .where(eq(users.id, row.id));
    console.log(`[bootstrap] admin account refreshed: ${env.adminEmail}`);
  }
}

/**
 * Production bootstrap: apply bundled migrations, then seed CMS content
 * if the tables are empty. Safe to run on every boot — migrations are
 * tracked in drizzle's journal table and seeding only fills empty tables.
 * On an already-populated DB, only missing slugs are inserted so new
 * bundled content appears without touching admin edits.
 */
export async function ensureSchemaAndSeed() {
  try {
    await migrate(getDb(), { migrationsFolder: "./db/migrations" });
    console.log("[bootstrap] migrations applied");
  } catch (err) {
    // Non-fatal: tables may already exist from an earlier push. Continue to
    // seed-if-empty so a healthy DB never blocks first-boot content.
    console.error("[bootstrap] migration failed (continuing):", err);
  }

  try {
    await ensureAdminAccount();
  } catch (err) {
    console.error("[bootstrap] admin account setup failed:", err);
  }

  try {
    const db = getDb();
    const existingPosts = await db.select({ id: posts.id }).from(posts).limit(1);
    if (existingPosts.length === 0) {
      for (const p of seedData.posts) {
        await db.insert(posts).values(postRow(p));
      }
      for (const pr of seedData.projects) {
        await db.insert(projects).values({
          ...pr,
          ...(projectContent[pr.slug] ?? {}),
        });
      }
      for (const s of seedData.heroSlides) {
        await db.insert(heroSlides).values(s);
      }
      for (const j of seedData.jobs) {
        await db.insert(jobs).values(jobRow(j));
      }
      for (const t of seedData.testimonials) {
        await db.insert(testimonials).values(t);
      }
      for (const st of seedData.settings) {
        await db
          .insert(settings)
          .values(st)
          .onDuplicateKeyUpdate({ set: { value: st.value } });
      }
      console.log("[bootstrap] CMS content seeded");
      return;
    }

    // Tables already populated: only insert rows whose slugs are missing,
    // so new bundled content appears without touching admin edits.
    const existingPostSlugs = new Set(
      (await db.select({ slug: posts.slug }).from(posts)).map((r) => r.slug),
    );
    for (const p of seedData.posts) {
      if (!existingPostSlugs.has(p.slug)) {
        await db.insert(posts).values(postRow(p));
        console.log(`[bootstrap] added new post: ${p.slug}`);
      }
    }

    const existingJobSlugs = new Set(
      (await db.select({ slug: jobs.slug }).from(jobs)).map((r) => r.slug),
    );
    for (const j of seedData.jobs) {
      if (!existingJobSlugs.has(j.slug)) {
        await db.insert(jobs).values(jobRow(j));
        console.log(`[bootstrap] added new job: ${j.slug}`);
      }
    }

    const existingTestimonials = await db
      .select({ id: testimonials.id })
      .from(testimonials)
      .limit(1);
    if (existingTestimonials.length === 0) {
      for (const t of seedData.testimonials) {
        await db.insert(testimonials).values(t);
      }
      console.log("[bootstrap] added testimonials");
    }
  } catch (err) {
    console.error("[bootstrap] seed failed:", err);
  }
}
