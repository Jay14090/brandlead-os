const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const job = await prisma.searchJob.findFirst({
    orderBy: { createdAt: 'desc' },
  });
  console.log(job.status);
  console.log(job.progress);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
