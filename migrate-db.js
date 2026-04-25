const { MongoClient } = require('mongodb');

const SOURCE_URI = 'mongodb+srv://faslam_db_user:QZ62zzmbF64gjn8n@invoicing.sflz9rc.mongodb.net/einvoicing';
const SOURCE_DB = 'einvoicing';

const TARGET_URI = 'mongodb+srv://axTeams:tVztEsSCExTuVQJm@axteams.enqmuuz.mongodb.net/?appName=axTeams';
const TARGET_DB = 'techAnd_e_invoicing_solution';

const BATCH_SIZE = 500;

(async () => {
  const src = new MongoClient(SOURCE_URI);
  const dst = new MongoClient(TARGET_URI);

  try {
    console.log('Connecting to source...');
    await src.connect();
    console.log('Connecting to target...');
    await dst.connect();

    const srcDb = src.db(SOURCE_DB);
    const dstDb = dst.db(TARGET_DB);

    const collections = await srcDb.listCollections().toArray();
    console.log(`Found ${collections.length} collections in source\n`);

    for (const { name, type } of collections) {
      if (type === 'view') {
        console.log(`-> Skipping view: ${name}`);
        continue;
      }

      const srcCol = srcDb.collection(name);
      const dstCol = dstDb.collection(name);

      const total = await srcCol.estimatedDocumentCount();
      console.log(`-> ${name}: ${total} documents`);

      // wipe target collection first to make this idempotent
      await dstCol.deleteMany({});

      // copy indexes (excluding default _id_)
      const indexes = await srcCol.indexes();
      for (const idx of indexes) {
        if (idx.name === '_id_') continue;
        const { key, name: idxName, v, ns, ...options } = idx;
        try {
          await dstCol.createIndex(key, { name: idxName, ...options });
        } catch (e) {
          console.warn(`   ! index ${idxName} failed: ${e.message}`);
        }
      }

      // stream documents in batches
      const cursor = srcCol.find({});
      let buffer = [];
      let copied = 0;
      for await (const doc of cursor) {
        buffer.push(doc);
        if (buffer.length >= BATCH_SIZE) {
          await dstCol.insertMany(buffer, { ordered: false });
          copied += buffer.length;
          buffer = [];
          process.stdout.write(`   ${copied}/${total}\r`);
        }
      }
      if (buffer.length) {
        await dstCol.insertMany(buffer, { ordered: false });
        copied += buffer.length;
      }
      console.log(`   ${copied}/${total} done`);
    }

    console.log('\nMigration complete.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await src.close();
    await dst.close();
  }
})();
