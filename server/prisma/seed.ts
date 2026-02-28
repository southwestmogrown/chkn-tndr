/**
 * Prisma seed — creates demo users and a group for local development.
 * Run with: npm run db:seed
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱  Seeding database...");

  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      email: "alice@example.com",
      displayName: "Alice",
      passwordHash: await bcrypt.hash("password123", 12),
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: {
      email: "bob@example.com",
      displayName: "Bob",
      passwordHash: await bcrypt.hash("password123", 12),
    },
  });

  const carol = await prisma.user.upsert({
    where: { email: "carol@example.com" },
    update: {},
    create: {
      email: "carol@example.com",
      displayName: "Carol",
      passwordHash: await bcrypt.hash("password123", 12),
    },
  });

  const group = await prisma.group.upsert({
    where: { inviteCode: "DEMO1234" },
    update: {},
    create: {
      name: "Lunch Crew",
      inviteCode: "DEMO1234",
      ownerId: alice.id,
      members: {
        create: [
          { userId: alice.id },
          { userId: bob.id },
          { userId: carol.id },
        ],
      },
    },
  });

  console.log(
    `✅  Created group "${group.name}" (invite: ${group.inviteCode})`,
  );
  console.log(`   alice@example.com / password123`);
  console.log(`   bob@example.com   / password123`);
  console.log(`   carol@example.com / password123`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
