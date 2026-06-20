// Reset to a single ADMIN user.
// Usage: npm run db:reset-users

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SINGLE_USER = {
  email:    'messoudigauf@moniagauf.com',
  password: 'hafid2026',
  fullName: 'Messoudi',
  role:     'ADMIN',
};

async function main() {
  console.log('🧹 Suppression de tous les utilisateurs existants...');
  await prisma.user.deleteMany();

  console.log('👤 Création de l\'utilisateur unique...');
  const hashed = await bcrypt.hash(SINGLE_USER.password, 10);
  const user = await prisma.user.create({
    data: {
      email: SINGLE_USER.email,
      password: hashed,
      fullName: SINGLE_USER.fullName,
      role: SINGLE_USER.role,
      isActive: true,
    },
    select: { id: true, email: true, fullName: true, role: true },
  });

  console.log('');
  console.log('✅ Utilisateur unique créé:');
  console.log(`   Email:    ${user.email}`);
  console.log(`   Mot de passe: ${SINGLE_USER.password}`);
  console.log(`   Nom:      ${user.fullName}`);
  console.log(`   Rôle:     ${user.role}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
