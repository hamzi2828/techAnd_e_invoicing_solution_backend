const { MongoClient } = require('mongodb');

const URI = 'mongodb+srv://axTeams:tVztEsSCExTuVQJm@axteams.enqmuuz.mongodb.net/?appName=axTeams';
const DB = 'techAnd_e_invoicing_solution';

(async () => {
  const c = new MongoClient(URI);
  try {
    await c.connect();
    const db = c.db(DB);
    const cols = await db.listCollections().toArray();
    console.log(`New DB "${DB}": ${cols.length} collections`);
    for (const { name } of cols) {
      const count = await db.collection(name).estimatedDocumentCount();
      console.log(`  ${name}: ${count} docs`);
    }
  } catch (e) {
    console.error('Connect failed:', e.message);
  } finally {
    await c.close();
  }
})();
