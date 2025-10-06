const postgres = require('postgres');

let sql;

if (!global.sql) {
  global.sql = postgres(process.env.DATABASE_URL, {
    max: 5,
    ssl: { rejectUnauthorized: false },
  });
}

sql = global.sql;

module.exports = sql;
