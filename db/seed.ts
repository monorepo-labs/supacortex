import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/postgres-js";
import { bookmarks, tags, bookmarkTags } from "./schema";

const db = drizzle({
  connection: process.env.DATABASE_URL!,
  casing: "snake_case",
});

const USER_ID = "y0x020V0yUFdepBchmoRutO9d4KuvD9d";

async function seed() {
  console.log("Seeding...");

  // Clear existing data (bookmark_tags cascade-deleted with bookmarks)
  await db.delete(bookmarkTags);
  await db.delete(bookmarks);
  await db.delete(tags);

  // Insert tags
  const insertedTags = await db
    .insert(tags)
    .values([
      { name: "AI", color: "#3b82f6", createdBy: USER_ID },
      { name: "Startups", color: "#f59e0b", createdBy: USER_ID },
      { name: "Engineering", color: "#10b981", createdBy: USER_ID },
      { name: "Design", color: "#a855f7", createdBy: USER_ID },
      { name: "Product", color: "#ec4899", createdBy: USER_ID },
      { name: "Writing", color: "#ef4444", createdBy: USER_ID },
    ])
    .returning();

  const tagMap = Object.fromEntries(insertedTags.map((t) => [t.name, t.id]));

  // Insert bookmarks
  const insertedBookmarks = await db
    .insert(bookmarks)
    .values([
      {
        type: "tweet",
        title: "Future of AI agents as computing interface",
        url: "https://x.com/karpathy/status/1893729384726491",
        createdBy: USER_ID,
        content:
          "AI agents are going to change everything. They'll browse the web, write code, manage your calendar. The question isn't if, but when they become the default interface for computing.",
        author: "karpathy",
        mediaUrls: null,
      },
      {
        type: "tweet",
        title: "OpenAI ships open source o3 model",
        url: "https://x.com/sama/status/1893729384726492",
        createdBy: USER_ID,
        content:
          "Just shipped open source o3. The model is incredibly capable at reasoning, coding, and math. Available today on ChatGPT and the API.",
        author: "sama",
        mediaUrls: null,
        isRead: true,
      },
      {
        type: "article",
        title: "Why bootstrapping beats VC every time",
        url: "https://levels.io/bootstrapping-vs-vc",
        createdBy: USER_ID,
        content:
          "After 5 years of building bootstrapped products, here's what I've learned: you don't need permission to build something great. Revenue is the best funding round. Your users are your investors. And the best part? You keep everything you build.",
        author: "levelsio",
        mediaUrls: null,
      },
      {
        type: "link",
        title: "React Server Components explained",
        url: "https://react.dev/blog/rsc-explained",
        createdBy: USER_ID,
        content:
          "RSC is not about performance. It's about letting you choose where your code runs. Server for data, client for interaction. That's the mental model. Once you get it, everything clicks.",
        author: null,
        mediaUrls: null,
      },
      {
        type: "tweet",
        title: "Building products you need yourself",
        url: "https://x.com/paborenstein/status/1893729384726495",
        createdBy: USER_ID,
        content:
          "The best products are built by people who desperately need them. If you're not your own user, you're guessing.",
        author: "paborenstein",
        mediaUrls: null,
        isRead: true,
      },
      {
        type: "tweet",
        title: "Postgres is the only database you need",
        url: "https://x.com/t3dotgg/status/1893729384726496",
        createdBy: USER_ID,
        content:
          "Hot take: Postgres is the only database most startups will ever need. Stop adding Redis, Mongo, and Elasticsearch to your stack. Postgres can do full-text search, JSON, queues, and caching. One database to rule them all.",
        author: "t3dotgg",
        mediaUrls: null,
      },
      {
        type: "article",
        title: "The unreasonable effectiveness of plain text",
        url: "https://www.simplethread.com/plain-text",
        createdBy: USER_ID,
        content:
          "Plain text is the most universal, durable, and flexible format for storing information. It works everywhere, will never be obsolete, and is the foundation of every great tool from Unix pipes to Git.",
        author: null,
        mediaUrls: null,
      },
      {
        type: "tweet",
        title: "Ship fast, iterate faster",
        url: "https://x.com/naval/status/1893729384726498",
        createdBy: USER_ID,
        content:
          "The market doesn't care about your code quality. It cares about whether you solved the problem. Ship the ugly version. Get feedback. Then make it beautiful.",
        author: "naval",
        mediaUrls: null,
      },
      {
        type: "tweet",
        title: "9 Harsh Truths That Will Make You A Better Writer",
        url: "https://x.com/dickiebush/status/2020490408669651439",
        createdBy: USER_ID,
        content: `I can point every good thing in my life over the last 6 years back to a simple, daily practice:

Writing every morning.

But it took me years to get started.

Then I internalized these 9 harsh truths and I haven't stopped since.

If you want to start writing online (so you can build an audience here on X), read this:

**1. You, the writer, are 100% completely & utterly irrelevant.**

The reader does not care:
- How long it took you
- How "qualified" you are

They care about 1 thing: What your writing can do for them.

**2. You are not a perfectionist—your ego is terrified of feedback.**

If you really were a perfectionist, you would be working 10x as hard and talking to 10x as many people trying to improve whatever you're currently procrastinating putting out.

**3. You have impostor syndrome because you are LYING.**

Talking about things you haven't done. Trying to come across as an "expert" in a topic you just started.

The solution? Talk only from personal experience. Stories, lessons, mistakes, and frameworks you've found helpful. This is what works for me.

**4. Just because something is "free" doesn't mean it's valuable.**

In fact, your free content is likely overpriced. The reader is paying with their precious time & attention—and you aren't delivering anything in return.

**5. The writers you look up to are no more special than you.**

Contrary to what you might believe, they didn't start with massive followings or have everything figured out from day one. Instead, they simply committed to writing every day for years, iterating with each piece they published.

**6. You do not need the perfectly optimized note-taking system to start writing.**

I have never met a prolific writer who didn't have a messy, inefficient writing system. All of the hours you're wasting clicking around in Notion? Nothing but procrastination disguised as productivity. Instead, redirect all of those hours back into actually writing.

**7. If you are not growing, it means your writing is no good.**

Newsflash: it's not the algorithm's fault. Social media is designed to show interesting content to as many people as possible—no matter who you are, where you're from, or how big of a following you have. It's a completely level playing field—which means anyone can win.

**8. There will never be a perfect time to start writing.**

"Once I read this book…" "Once work slows down…" "Once my newborn is older…" "Once I figure out my niche…"

These "onces" are never going away. So if you find yourself putting it off, realize now is and always will be the best time.

**9. The topic you write about to start does not matter—as long as you start.**

You need to pick SOMETHING. It can change over time. It doesn't have to be perfect. You don't have to be an expert.

All that matters is you start writing so you can build the skills that come afterward. Then, later down the line, you can reapply those skills to any other topic for the rest of your life. Which means there's no such thing as making a "mistake" in picking a topic—because worst case, you learn along the way.`,
        author: "dickiebush",
        mediaUrls: [
          { type: "avatar", url: "https://pbs.twimg.com/profile_images/1645163605166379011/Wu8UcUGU_400x400.jpg" },
          { type: "image", url: "https://pbs.twimg.com/media/HAhcMDIaIAAwuQr?format=jpg&name=medium" },
        ],
      },
      {
        type: "article",
        title: "The Arc Product-Market Fit Framework",
        url: "https://www.sequoiacap.com/article/pmf-framework",
        createdBy: USER_ID,
        content:
          "Product-market fit isn't binary — it's a spectrum. Level 1: Hair on Fire (solving an urgent problem). Level 2: Hard Fact (inevitable shift). Level 3: Future Vision (creating a new category). Most founders fail because they skip straight to Level 3 without earning Level 1.",
        author: null,
        mediaUrls: null,
      },
      {
        type: "tweet",
        title: "Why small teams win",
        url: "https://x.com/dhh/status/1893729384726501",
        createdBy: USER_ID,
        content:
          "A team of 3 can outship a team of 30. Less communication overhead, faster decisions, more ownership. The best software in the world was built by tiny teams. Stop hiring and start shipping.",
        author: "dhh",
        mediaUrls: null,
      },
      {
        type: "article",
        title: "Taste is the new skill",
        url: "https://www.worksinprogress.co/issue/taste-as-skill",
        createdBy: USER_ID,
        content:
          "In an age where AI can generate anything, the ability to curate and judge quality becomes the most valuable skill. Taste isn't subjective — it's pattern recognition refined over thousands of hours of exposure to great work. The people who win will be the ones who know what good looks like.",
        author: null,
        mediaUrls: null,
      },
      {
        type: "tweet",
        title: "Compounding effects of writing daily",
        url: "https://x.com/sahilbloom/status/1893729384726503",
        createdBy: USER_ID,
        content:
          "Writing is the most underrated skill in business. It clarifies your thinking, builds your reputation, and compounds over time. Write 1 post a day for a year. That's 365 pieces of content working for you while you sleep.",
        author: "sahilbloom",
        mediaUrls: null,
        isRead: true,
      },
      {
        type: "link",
        title: "How Figma builds product",
        url: "https://figma.com/blog/how-we-build-product",
        createdBy: USER_ID,
        content:
          "Small, empowered teams. Weekly design reviews. Tight feedback loops with dogfooding. Ship early betas to power users. The best product process is one that gets out of the way and lets makers make.",
        author: null,
        mediaUrls: null,
      },
      {
        type: "tweet",
        title: "Local-first software is the future",
        url: "https://x.com/schickling/status/1893729384726505",
        createdBy: USER_ID,
        content:
          "Local-first means your data lives on your device. Sync when you want. Work offline always. No loading spinners, no server costs, no vendor lock-in. The cloud was a detour. We're coming back to personal computing.",
        author: "schickling",
        mediaUrls: null,
      },
      {
        type: "article",
        title: "The Grug Brained Developer",
        url: "https://grugbrain.dev",
        createdBy: USER_ID,
        content: `Grug brain developer not so smart but grug brain developer ship mass code. Grug say: complexity very very bad. Given choice between complexity or one more if statement, grug take if statement every time.

**Big brain developer** say "what if we need to change this later?" Grug say: "then we change it later." Big brain developer make mass abstraction. Grug mass mass if statement. Grug code mass simple. Grug ship. Big brain developer mass mass abstraction, mass mass type, mass mass interface. Big brain developer mass mass not ship.

Grug brain developer know mass mass important thing: **working software today mass mass more important than perfect software mass mass later.**`,
        author: null,
        mediaUrls: null,
      },
      {
        type: "tweet",
        title: "Why solo founders should charge from day one",
        url: "https://x.com/marckohlbrugge/status/1893729384726507",
        createdBy: USER_ID,
        content:
          "Free users don't give you real feedback. They give you feature requests. Paying users tell you what's actually broken. Charge from day one, even if it's $5/month. The signal you get is worth 100x the revenue.",
        author: "marckohlbrugge",
        mediaUrls: null,
      },
      {
        type: "link",
        title: "Designing for the margins",
        url: "https://alistapart.com/article/designing-for-margins",
        createdBy: USER_ID,
        content:
          "The best design decisions aren't about pixels — they're about margins. Margin between elements, margin for error, margin for different screen sizes. Give your content room to breathe and your interface will feel 10x more polished.",
        author: null,
        mediaUrls: null,
      },
      {
        type: "tweet",
        title: "The 100-user rule for early-stage startups",
        url: "https://x.com/paulg/status/1893729384726509",
        createdBy: USER_ID,
        content:
          "Do things that don't scale. Talk to your first 100 users individually. Understand their problems deeply. The patterns you find will shape everything you build next. There are no shortcuts in the beginning.",
        author: "paulg",
        mediaUrls: null,
        isRead: true,
      },
    ])
    .returning();

  // Tag some bookmarks
  await db.insert(bookmarkTags).values([
    { bookmarkId: insertedBookmarks[0].id, tagId: tagMap["AI"] },
    { bookmarkId: insertedBookmarks[1].id, tagId: tagMap["AI"] },
    { bookmarkId: insertedBookmarks[2].id, tagId: tagMap["Startups"] },
    { bookmarkId: insertedBookmarks[3].id, tagId: tagMap["Engineering"] },
    { bookmarkId: insertedBookmarks[5].id, tagId: tagMap["Engineering"] },
    { bookmarkId: insertedBookmarks[6].id, tagId: tagMap["Engineering"] },
    { bookmarkId: insertedBookmarks[7].id, tagId: tagMap["Startups"] },
    { bookmarkId: insertedBookmarks[7].id, tagId: tagMap["Product"] },
    { bookmarkId: insertedBookmarks[8].id, tagId: tagMap["Writing"] },
    { bookmarkId: insertedBookmarks[9].id, tagId: tagMap["Startups"] },
    { bookmarkId: insertedBookmarks[9].id, tagId: tagMap["Product"] },
    { bookmarkId: insertedBookmarks[10].id, tagId: tagMap["Startups"] },
    { bookmarkId: insertedBookmarks[11].id, tagId: tagMap["Design"] },
    { bookmarkId: insertedBookmarks[12].id, tagId: tagMap["Writing"] },
    { bookmarkId: insertedBookmarks[13].id, tagId: tagMap["Design"] },
    { bookmarkId: insertedBookmarks[13].id, tagId: tagMap["Product"] },
    { bookmarkId: insertedBookmarks[14].id, tagId: tagMap["Engineering"] },
    { bookmarkId: insertedBookmarks[15].id, tagId: tagMap["Engineering"] },
    { bookmarkId: insertedBookmarks[16].id, tagId: tagMap["Startups"] },
    { bookmarkId: insertedBookmarks[17].id, tagId: tagMap["Design"] },
    { bookmarkId: insertedBookmarks[18].id, tagId: tagMap["Startups"] },
  ]);

  console.log(`Seeded ${insertedBookmarks.length} bookmarks and ${insertedTags.length} tags`);
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
