import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';

// Conectar a la base de datos SQLite
const db = new sqlite3.Database('./prisma/dev.db');

async function createUser() {
  try {
    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Insertar usuario
    db.run(
      'INSERT OR REPLACE INTO User (id, username, password) VALUES (?, ?, ?)',
      [1, 'admin', hashedPassword],
      function(err) {
        if (err) {
          console.error('Error creando usuario:', err);
        } else {
          console.log('Usuario creado exitosamente:', {
            id: this.lastID,
            username: 'admin',
            password: 'admin123'
          });
        }
        db.close();
      }
    );
  } catch (error) {
    console.error('Error:', error);
    db.close();
  }
}

createUser();
