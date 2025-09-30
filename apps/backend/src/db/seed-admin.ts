import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from './schema';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env') });

async function seedAdmin() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('DATABASE_URL is not defined');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql, { schema });

  try {
    // Admin user details
    const adminEmail = 'admin@studyteddy.com';
    const adminPassword = 'Block@1559!';
    const adminName = 'Admin User';

    console.log('Creating admin user...');

    // Check if admin user already exists
    const existingUser = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, adminEmail))
      .limit(1);

    if (existingUser.length > 0) {
      console.log('Admin user already exists!');
      await sql.end();
      return;
    }

    // Hash the password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

    // Create the admin user
    const [adminUser] = await db
      .insert(schema.users)
      .values({
        id: uuidv4(),
        email: adminEmail,
        passwordHash,
        name: adminName,
        emailVerified: true,
        authProvider: 'local',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    console.log('Admin user created successfully!');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('User ID:', adminUser.id);

    // Create notification preferences for the admin
    await db.insert(schema.notificationPreferences).values({
      id: uuidv4(),
      userId: adminUser.id,
      emailEnabled: true,
      pushEnabled: true,
      inAppEnabled: true,
      taskReminders: true,
      goalReminders: true,
      achievements: true,
      aiSuggestions: true,
      systemAlerts: true,
      reminderLeadTimeMinutes: 15,
      dailySummaryEnabled: true,
      soundEnabled: true,
      soundVolume: 50,
      quietHoursEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('Admin notification preferences created!');

    // Create a welcome task for the admin
    await db.insert(schema.tasks).values({
      id: uuidv4(),
      userId: adminUser.id,
      title: 'Welcome to Study Teddy!',
      description: 'Explore the features and start organizing your study schedule.',
      priority: 'high',
      status: 'pending',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('Welcome task created for admin!');
    console.log('\n✅ Admin account seeded successfully!');
    console.log('You can now log in with:');
    console.log('Email: admin@studyteddy.com');
    console.log('Password: Block@1559!');
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the seed function
seedAdmin().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
