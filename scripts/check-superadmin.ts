import { prisma } from '../packages/prisma';

(async () => {
  const email = 'ericocesar@webck.com.br';

  const u = await prisma.user.findUnique({
    where: { email },
  });

  if (!u) {
    console.log(`User ${email} not found`);
    await prisma.$disconnect();
    process.exit(1);
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
