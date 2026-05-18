import dotenv from 'dotenv';
dotenv.config();
console.log(process.env.SUPABASE_URL ? 'URL: OK' : 'URL: MISSING');
console.log(process.env.SUPABASE_SERVICE_ROLE_KEY ? 'KEY: OK' : 'KEY: MISSING');
console.log(process.env.DATABASE_URL ? 'DB_URL: OK' : 'DB_URL: MISSING');
console.log(Object.keys(process.env).filter(k => k.toLowerCase().includes('database') || k.toLowerCase().includes('postgres')));
