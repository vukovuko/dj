import pg from 'pg';
import process from 'process';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://djuser:dj_pass_8291@localhost:5432/djcafe'
});

async function enableUnaccent() {
  try {
    await client.connect();
    console.log('✓ Connected to database');

    await client.query('CREATE EXTENSION IF NOT EXISTS unaccent;');
    console.log('✓ unaccent extension enabled');

  } catch (error) {
    console.error('❌ Error enabling unaccent:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

enableUnaccent();
