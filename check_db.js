import dotenv from 'dotenv';
dotenv.config();
console.log(process.env.DATABASE_URL ? "Has DB URL" : "No DB URL");
