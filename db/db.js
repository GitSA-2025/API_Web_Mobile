const postgres = require('postgres');

const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString, {
  max: 10,       
  ssl: 'require',
});

module.exports = sql;
