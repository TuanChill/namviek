import { prisma } from "../client.js";
import dotenv from "dotenv";

dotenv.config();


const avatar = (seed: string) =>
    `https://api.dicebear.com/8.x/avataaars/png?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&size=128`;

const USERS = [
    { name: "Alice Martin",    email: "alice@example.com",   avatarUrl: avatar("Alice Martin") },
    { name: "Bob Chen",        email: "bob@example.com",     avatarUrl: avatar("Bob Chen") },
    { name: "Carol Singh",     email: "carol@example.com",   avatarUrl: avatar("Carol Singh") },
    { name: "David Park",      email: "david@example.com",   avatarUrl: avatar("David Park") },
    { name: "Eva Nguyen",      email: "eva@example.com",     avatarUrl: avatar("Eva Nguyen") },
    { name: "Frank Okafor",    email: "frank@example.com",   avatarUrl: avatar("Frank Okafor") },
    { name: "Grace Kim",       email: "grace@example.com",   avatarUrl: avatar("Grace Kim") },
    { name: "Henry Müller",    email: "henry@example.com",   avatarUrl: avatar("Henry Müller") },
    { name: "Isla Torres",     email: "isla@example.com",    avatarUrl: avatar("Isla Torres") },
    { name: "James Osei",      email: "james@example.com",   avatarUrl: avatar("James Osei") },
];


async function main() {
    console.log("🌱 Starting seed...");

    // ── Legacy test data ────────────────────────────────────────────────────────
    await prisma.test.deleteMany();
    const tests = await prisma.test.createMany({
        data: [
            { name: "Unit Test Example",   description: "A sample unit test for testing basic functionality" },
            { name: "Integration Test",    description: "Tests the integration between multiple components" },
            { name: "E2E Test",            description: "End-to-end test covering the entire user flow" },
            { name: "Performance Test",    description: "Measures application performance under load" },
            { name: "Security Test",       description: null },
            { name: "Accessibility Test",  description: "Ensures the application meets accessibility standards" },
        ],
    });
    console.log(`✅ Created ${tests.count} test records`);

    // ── DynUser seed ────────────────────────────────────────────────────────────
    let created = 0;
    let skipped = 0;

    for (const user of USERS) {
        const existing = await prisma.dynUser.findUnique({ where: { email: user.email } });
        if (existing) {
            await prisma.dynUser.update({ where: { email: user.email }, data: { name: user.name, avatarUrl: user.avatarUrl } });
            skipped++;
        } else {
            await prisma.dynUser.create({ data: user });
            created++;
        }
    }

    console.log(`✅ DynUsers: ${created} created, ${skipped} updated`);

    const allUsers = await prisma.dynUser.findMany({ orderBy: { name: "asc" } });
    console.log("\n👥 Users:");
    allUsers.forEach(u => console.log(`  - ${u.name} <${u.email}>`));

    console.log("\n🎉 Seed completed successfully!");
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
