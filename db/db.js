const postgres = require('postgres');

const sql = postgres(process.env.DATABASE_URL, {
  max: 10,
  ssl: { rejectUnauthorized: false },
  idle_timeout: 60000,
});

module.exports = sql;
