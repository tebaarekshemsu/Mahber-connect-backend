const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Querying database...');
  try {
    const usersCount = await prisma.user.count();
    console.log(`Total users in DB: ${usersCount}`);
    
    const users = await prisma.user.findMany({
      take: 5,
      select: { id: true, name: true, phone: true }
    });
    console.log('Sample users in DB:', JSON.stringify(users, null, 2));

    const memberships = await prisma.membership.findMany({
      take: 5
    });
    console.log('Sample memberships in DB:', JSON.stringify(memberships, null, 2));
    
  } catch (err) {
    console.error('Error connecting or querying database:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
