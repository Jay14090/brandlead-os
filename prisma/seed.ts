import { prisma } from '../src/lib/prisma';
async function main() {
  // Create or update default settings
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      openAIModel: 'gpt-5.5',
      geminiModel: 'gemini-3.1-pro-preview',
      geminiFastModel: 'gemini-3.5-flash',
      strictnessModeDefault: 'Balanced',
      maxLeadsPerSearch: 50,
      maxPagesPerLead: 4,
      requestDelay: 1500,
    },
  });

  console.log('✅ Database seeded with default settings');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
