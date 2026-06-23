import { prisma } from '../packages/prisma';

(async () => {
  const user = await prisma.user.findUnique({ where: { email: 'admin@bchatsign.com' } });

  if (!user) {
    console.log('Admin user not found');
    await prisma.$disconnect();
    process.exit(0);
  }

  const logs = await prisma.userSecurityAuditLog.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  console.log(`Found ${logs.length} security log(s) for user ${user.email} (id=${user.id}):`);
  console.log(JSON.stringify(logs, null, 2));

  await prisma.$disconnect();
})();
