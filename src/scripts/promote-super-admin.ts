import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  let phoneArg = args.find((arg) => arg.startsWith('--phone='));

  if (!phoneArg) {
    console.error('Please specify a phone number to promote using the --phone argument.');
    console.error('Example: npx ts-node src/scripts/promote-super-admin.ts --phone=+251910169735');
    process.exit(1);
  }

  const phone = phoneArg.split('=')[1].trim();

  if (!phone) {
    console.error('Invalid phone number provided.');
    process.exit(1);
  }

  console.log(`Connecting to database to promote user with phone: ${phone}...`);

  try {
    const user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      console.error(`User with phone ${phone} was not found in the database.`);
      console.log('Available users in DB:');
      const users = await prisma.user.findMany({ select: { name: true, phone: true } });
      console.log(users);
      process.exit(1);
    }

    console.log(`Found user: ${user.name} (ID: ${user.id}).`);
    
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        is_super_admin: true,
        is_suspended: false, // Ensure they are not suspended
      },
    });

    console.log('\n========================================');
    console.log(`SUCCESS: User "${updatedUser.name}" has been promoted to Super Admin!`);
    console.log(`Is Super Admin: ${updatedUser.is_super_admin}`);
    console.log(`Is Suspended: ${updatedUser.is_suspended}`);
    console.log('========================================\n');
  } catch (error) {
    console.error('Failed to promote user due to database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
