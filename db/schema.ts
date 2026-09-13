import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  longtext,
  timestamp,
  int,
  boolean,
  // bigint,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  passwordHash: text("passwordHash"),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/* ============================= CMS content ============================= */

export const posts = mysqlTable("posts", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 500 }).notNull(),
  excerpt: text("excerpt"),
  firstTag: varchar("firstTag", { length: 100 }),
  imageUrl: text("imageUrl"),
  contentHtml: longtext("contentHtml"),
  readTimeMinutes: int("readTimeMinutes").default(5).notNull(),
  published: boolean("published").default(true).notNull(),
  publishedAt: timestamp("publishedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;

export const projects = mysqlTable("projects", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 500 }).notNull(),
  type: mysqlEnum("type", ["case-study", "software"]).notNull(),
  firstTag: varchar("firstTag", { length: 100 }),
  clientName: varchar("clientName", { length: 255 }),
  cardDescription: text("cardDescription"),
  featuredImage: text("featuredImage"),
  imageCaption: varchar("imageCaption", { length: 500 }),
  liveUrl: varchar("liveUrl", { length: 500 }),
  tagIds: varchar("tagIds", { length: 100 }).default("").notNull(),
  overviewHtml: longtext("overviewHtml"),
  processHtml: longtext("processHtml"),
  descriptionHtml: longtext("descriptionHtml"),
  sortOrder: int("sortOrder").default(0).notNull(),
  published: boolean("published").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

export const heroSlides = mysqlTable("hero_slides", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  kind: mysqlEnum("kind", ["image", "mockup"]).default("image").notNull(),
  desktopImage: text("desktopImage"),
  mobileImage: text("mobileImage"),
  sortOrder: int("sortOrder").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HeroSlide = typeof heroSlides.$inferSelect;
export type InsertHeroSlide = typeof heroSlides.$inferInsert;

export const media = mysqlTable("media", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  data: longtext("data").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Media = typeof media.$inferSelect;

export const settings = mysqlTable("settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value"),
});

export type Setting = typeof settings.$inferSelect;

export const jobs = mysqlTable("jobs", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  excerpt: text("excerpt"),
  department: varchar("department", { length: 255 }),
  location: varchar("location", { length: 255 }),
  workplaceType: mysqlEnum("workplaceType", ["ONSITE", "REMOTE", "HYBRID"]).default("ONSITE"),
  employmentType: mysqlEnum("employmentType", [
    "FULL_TIME",
    "PART_TIME",
    "CONTRACT",
    "INTERNSHIP",
    "TEMP",
  ]).default("FULL_TIME"),
  seniority: varchar("seniority", { length: 50 }),
  applyEmail: varchar("applyEmail", { length: 255 }),
  externalApplyUrl: varchar("externalApplyUrl", { length: 500 }),
  deadlineAt: timestamp("deadlineAt"),
  canApply: boolean("canApply").default(true).notNull(),
  featuredImage: text("featuredImage"),
  contentHtml: longtext("contentHtml"),
  published: boolean("published").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;

export const contactSubmissions = mysqlTable("contact_submissions", {
  id: serial("id").primaryKey(),
  fullName: varchar("fullName", { length: 255 }).notNull(),
  contact: varchar("contact", { length: 255 }).notNull(),
  service: varchar("service", { length: 255 }),
  message: text("message").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ContactSubmission = typeof contactSubmissions.$inferSelect;
export type InsertContactSubmission = typeof contactSubmissions.$inferInsert;

export const testimonials = mysqlTable("testimonials", {
  id: serial("id").primaryKey(),
  quote: text("quote").notNull(),
  authorName: varchar("authorName", { length: 255 }).notNull(),
  authorRole: varchar("authorRole", { length: 255 }),
  organization: varchar("organization", { length: 255 }),
  published: boolean("published").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Testimonial = typeof testimonials.$inferSelect;
export type InsertTestimonial = typeof testimonials.$inferInsert;
