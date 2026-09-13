import { getDb } from "../api/queries/connection";
import { posts, projects, heroSlides, settings, jobs, testimonials } from "./schema";
import { seedData } from "./seed-data";
import { postContent, projectContent, jobContent } from "./seed-content";

async function seed() {
  const db = getDb();
  console.log("Seeding database...");

  for (const p of seedData.posts) {
    await db
      .insert(posts)
      .values({
        ...p,
        contentHtml: postContent[p.slug] ?? "",
        publishedAt: new Date(p.publishedAt + " UTC"),
      })
      .onDuplicateKeyUpdate({ set: { title: p.title } });
  }

  for (const j of seedData.jobs) {
    const { deadlineAt, ...rest } = j;
    await db
      .insert(jobs)
      .values({
        ...rest,
        contentHtml: jobContent[j.slug] ?? "",
        deadlineAt: new Date(deadlineAt + " UTC"),
      })
      .onDuplicateKeyUpdate({ set: { title: j.title } });
  }

  for (const pr of seedData.projects) {
    await db
      .insert(projects)
      .values({ ...pr, ...(projectContent[pr.slug] ?? {}) })
      .onDuplicateKeyUpdate({ set: { title: pr.title } });
  }

  for (const s of seedData.heroSlides) {
    await db.insert(heroSlides).values(s);
  }

  for (const st of seedData.settings) {
    await db
      .insert(settings)
      .values(st)
      .onDuplicateKeyUpdate({ set: { value: st.value } });
  }

  console.log("Done.");
  process.exit(0);
}

seed();
