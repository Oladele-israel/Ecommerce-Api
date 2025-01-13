import pkg from "pg";
const { Pool } = pkg;
import "dotenv/config";

// const pool = new Pool({
//   host: process.env.HOST,
//   port: process.env.DBPORT,
//   database: process.env.DATABASE,
//   user: process.env.USER,
//   password: process.env.PASSWORD,
// });
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export default pool;
