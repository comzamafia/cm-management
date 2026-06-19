import { PrismaClient, LessonType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.course.count();
  if (existing > 0) {
    console.log(`Already have ${existing} courses — skipping seed.`);
    return;
  }

  const owner = await prisma.user.findFirst({ where: { role: "OWNER" } });
  const mgr = await prisma.user.findFirst({ where: { role: "STORE_MANAGER" } }) ?? owner;
  if (!owner || !mgr) {
    console.log("No owner found — skipping.");
    return;
  }
  const loc = await prisma.location.findFirst();

  await prisma.course.create({
    data: {
      title: "Food Safety Fundamentals",
      description: "Essential food safety knowledge for all team members. Covers handling, storage, temperature control, and hygiene standards.",
      category: "SAFETY",
      createdById: owner.id,
      published: true,
      lessons: {
        create: [
          { title: "Introduction to Food Safety", type: LessonType.ARTICLE, position: 0, duration: 10, content: "Food safety is critical in our operations. Every team member must understand the basics of safe food handling to protect our customers and our business.\n\nKey areas we'll cover:\n• Personal hygiene standards\n• Temperature danger zones\n• Cross-contamination prevention\n• Cleaning and sanitization procedures\n• Allergen awareness" },
          { title: "Temperature Control & Danger Zone", type: LessonType.VIDEO, position: 1, duration: 15, contentUrl: "https://www.youtube.com/watch?v=example-temp", content: "The temperature danger zone is between 4°C and 60°C (40°F - 140°F). Food must not remain in this range for more than 2 hours.\n\nKey rules:\n• Keep cold food below 4°C\n• Keep hot food above 60°C\n• Reheat food to at least 74°C\n• Cool food from 60°C to 20°C within 2 hours" },
          { title: "Handwashing Protocol", type: LessonType.ARTICLE, position: 2, duration: 5, content: "Proper handwashing takes at least 20 seconds:\n\n1. Wet hands with warm running water\n2. Apply soap\n3. Scrub all surfaces including between fingers and under nails\n4. Rinse thoroughly\n5. Dry with single-use towel\n\nWash hands:\n• Before handling food\n• After touching raw meat\n• After using the restroom\n• After touching face/hair\n• After handling garbage" },
          { title: "Cross-Contamination Prevention", type: LessonType.DOCUMENT, position: 3, duration: 8, content: "Cross-contamination occurs when harmful bacteria transfer from one surface to another.\n\nPrevention measures:\n• Use separate cutting boards for raw meat and vegetables\n• Store raw meat on lower shelves\n• Use color-coded equipment\n• Clean and sanitize between tasks\n• Never use the same utensils for raw and cooked food" },
        ],
      },
    },
  });

  await prisma.course.create({
    data: {
      title: "Service Excellence Standards",
      description: "Our approach to delivering exceptional guest experiences. From greeting to farewell, every interaction matters.",
      category: "SERVICE",
      createdById: mgr.id,
      published: true,
      lessons: {
        create: [
          { title: "The Guest Journey", type: LessonType.ARTICLE, position: 0, duration: 12, content: "Every guest interaction follows a journey:\n\n1. Welcome — Greet within 30 seconds of arrival\n2. Engage — Make eye contact, smile, use open body language\n3. Serve — Anticipate needs, be proactive\n4. Check — Follow up to ensure satisfaction\n5. Thank — Express genuine gratitude\n\nRemember: guests don't just come for the product — they come for the experience." },
          { title: "Handling Complaints", type: LessonType.ARTICLE, position: 1, duration: 10, content: "Use the LEARN method:\n\nL — Listen actively without interrupting\nE — Empathize with their frustration\nA — Apologize sincerely\nR — Resolve the issue promptly\nN — Notify a manager if needed\n\nNever argue, blame, or make excuses. Every complaint is an opportunity to create a loyal customer." },
          { title: "Upselling Techniques", type: LessonType.ARTICLE, position: 2, duration: 8, content: "Suggestive selling adds value for the guest and revenue for us:\n\n• Recommend add-ons that complement their order\n• Use descriptive, appetizing language\n• Time your suggestions appropriately\n• Accept 'no' gracefully — never be pushy\n• Know the menu inside out to make genuine recommendations" },
        ],
      },
    },
  });

  await prisma.course.create({
    data: {
      title: "Opening & Closing SOPs",
      description: "Step-by-step procedures for daily opening and closing routines at each location.",
      category: "SOP",
      createdById: mgr.id,
      locationId: loc?.id ?? null,
      published: true,
      lessons: {
        create: [
          { title: "Morning Opening Checklist", type: LessonType.ARTICLE, position: 0, duration: 5, content: "Opening shift starts 30 minutes before doors open:\n\n1. Disarm security system\n2. Turn on all equipment and check temperatures\n3. Check prep list and begin prep work\n4. Verify cash drawer count\n5. Check staff schedule and assign stations\n6. Inspect dining area — tables clean, chairs aligned\n7. Check restrooms — stocked and clean\n8. Review daily specials and 86 list\n9. Brief staff on any updates\n10. Unlock doors at scheduled time" },
          { title: "Evening Closing Procedures", type: LessonType.ARTICLE, position: 1, duration: 5, content: "Closing shift responsibilities:\n\n1. Stop accepting new orders 15 min before close\n2. Begin breaking down stations\n3. Clean and sanitize all food-contact surfaces\n4. Properly store all food items\n5. Record end-of-day temperatures\n6. Count cash drawer, prepare deposit\n7. Take out garbage and recycling\n8. Mop floors, clean restrooms\n9. Check all equipment is off (except refrigeration)\n10. Set security system and lock up" },
        ],
      },
    },
  });

  await prisma.course.create({
    data: {
      title: "Menu Knowledge: Products & Ingredients",
      description: "Comprehensive guide to our menu items, ingredients, allergens, and preparation methods.",
      category: "PRODUCT",
      createdById: owner.id,
      published: true,
      lessons: {
        create: [
          { title: "Core Menu Items", type: LessonType.ARTICLE, position: 0, duration: 15, content: "Every team member must know:\n\n• All menu items and their descriptions\n• Key ingredients in each dish\n• Common allergens present\n• Preparation time for each item\n• Recommended pairings and upsells\n• Items available for customization\n\nStudy the menu card provided at your station. You should be able to describe any item to a guest without hesitation." },
          { title: "Allergen Awareness", type: LessonType.ARTICLE, position: 1, duration: 10, content: "The major food allergens:\n\n1. Peanuts\n2. Tree nuts\n3. Milk/Dairy\n4. Eggs\n5. Wheat/Gluten\n6. Soy\n7. Fish\n8. Shellfish\n9. Sesame\n\nAlways ask guests about allergies. If unsure about an ingredient, CHECK — never guess. Cross-contact is as dangerous as cross-contamination for allergy sufferers." },
        ],
      },
    },
  });

  await prisma.course.create({
    data: {
      title: "Workplace Compliance & Policies",
      description: "Company policies, workplace safety, harassment prevention, and legal requirements.",
      category: "COMPLIANCE",
      createdById: owner.id,
      published: true,
      lessons: {
        create: [
          { title: "Code of Conduct", type: LessonType.ARTICLE, position: 0, duration: 10, content: "Our workplace standards:\n\n• Treat all colleagues and guests with respect\n• Arrive on time, in proper uniform\n• Follow all safety procedures\n• Report incidents and hazards immediately\n• Maintain confidentiality of business information\n• No personal phone use during shifts\n• Zero tolerance for harassment or discrimination\n\nViolations may result in disciplinary action up to and including termination." },
          { title: "Health & Safety Requirements", type: LessonType.DOCUMENT, position: 1, duration: 8, contentUrl: "https://example.com/health-safety-policy.pdf", content: "Key health & safety rules:\n\n• Report all injuries immediately\n• Know the location of first aid kits and fire extinguishers\n• Wear non-slip shoes at all times\n• Use proper lifting technique\n• Keep walkways clear\n• Know evacuation routes" },
        ],
      },
    },
  });

  const counts = {
    courses: await prisma.course.count(),
    lessons: await prisma.lesson.count(),
  };
  console.log("Course seed complete:", counts);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
