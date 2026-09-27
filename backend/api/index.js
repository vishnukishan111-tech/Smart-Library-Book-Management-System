const { app } = require('../src/server');
const db = require('../src/db');

let isInitialized = false;

module.exports = async (req, res) => {
  if (!isInitialized) {
    try {
      await db.initializeDatabase();
      isInitialized = true;
    } catch (err) {
      console.error('[SERVERLESS DB INIT ERROR]', err);
    }
  }
  return app(req, res);
};
