import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createUser() {
  try {
    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Crear o actualizar usuario
    const user = await prisma.user.upsert({
      where: { username: 'admin' },
      update: {
        password: hashedPassword
      },
      create: {
        username: 'admin',
        password: hashedPassword
      }
    });
    
    console.log('✅ Usuario creado/actualizado exitosamente:');
    console.log('   Usuario: admin');
    console.log('   Contraseña: admin123');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createUser();

