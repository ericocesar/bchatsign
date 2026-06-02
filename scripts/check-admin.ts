import { prisma } from '../packages/prisma';

(async () => {
  const u = await prisma.user.findUnique({
    where: { email: 'admin@documenso.com' },
  });

  if (!u) {
    console.log('Admin user not found');
    await prisma.$disconnect();
    process.exit(0);
  }

  console.log(
    JSON.stringify(
      {
        id: u.id,
        email: u.email,
        name: u.name,
        emailVerified: u.emailVerified,
        roles: u.roles,
        disabled: u.disabled,
        passwordHash: u.password,
      },
      null,
      2,
    ),
  );

  await prisma.$disconnect();
})();
