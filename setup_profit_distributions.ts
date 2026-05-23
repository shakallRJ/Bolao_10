import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log('DATABASE_URL is missing');
    return;
  }
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    console.log('Connected to DB');

    // 1. Let's query rounds table information to understand round_id type
    const resRounds = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'rounds' AND column_name = 'id'
    `);
    console.log('Rounds ID column specs:', resRounds.rows);

    const roundIdType = resRounds.rows[0]?.data_type || 'BIGINT';
    const isBigint = roundIdType.toUpperCase().includes('INT') || roundIdType.toUpperCase().includes('SERIAL');

    // 2. Create profit_distributions table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS profit_distributions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        round_id ${isBigint ? 'INTEGER' : 'VARCHAR(255)'} NOT NULL,
        total_admin_fee DECIMAL(10,2) NOT NULL,
        paulo_share DECIMAL(10,2) NOT NULL,
        jairo_share DECIMAL(10,2) NOT NULL,
        igor_share DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    console.log('Executing SQL:', createTableSQL);
    await client.query(createTableSQL);
    console.log('Table profit_distributions verified/created successfully.');

    // 3. Check table definition of profit_distributions
    const resProfit = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'profit_distributions'
    `);
    console.log('profit_distributions columns:', resProfit.rows);

  } catch (err) {
    console.error('Migration execution error:', err);
  } finally {
    await client.end();
  }
}

run();
