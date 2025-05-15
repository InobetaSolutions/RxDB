const nano = require('nano')('http://admin:admin@13.50.203.154:5984');
const { MongoClient } = require('mongodb');

const couchDb = nano.db.use('tododatabase');
// console.log('couchdb', couchDb);
const mongoUri =
    '.mongodb+srv://ashokbhargavp:XF5SLcN91k58AkRX@cluster0.4vrmcig.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const mongoClient = new MongoClient(mongoUri);

const mongoDbName = 'Rxdb-database';
const mongoCollectionName = 'offline-rxdb';

async function sync() {
    try {
        await mongoClient.connect();
        console.log('✅ Connected to MongoDB Atlas');

        const mongoDb = mongoClient.db(mongoDbName);
        const mongoCol = mongoDb.collection(mongoCollectionName);

        const follow = require('follow');
        const feed = new follow.Feed({
            db: 'http://admin:admin@13.50.203.154:5984/tododatabase',
            include_docs: true,
            since: '0',
        });

        feed.on('change', async (change) => {
            console.log('📥 Detected CouchDB change:', change);
            try {
                const doc = change.doc;
                delete doc._rev;
                delete doc._id;

                await mongoCol.updateOne(
                    { id: doc.id },
                    { $set: doc },
                    { upsert: true }
                );

                console.log(
                    `✅ Synced to MongoDB: ID = ${doc.id}, Name = ${doc.name}`
                );
            } catch (err) {
                console.error('❌ Error syncing document:', err);
            }
        });

        feed.on('error', (err) => {
            console.error('❌ Follow error:', err);
        });

        feed.follow();
        console.log('📡 Started syncing CouchDB → MongoDB...');
    } catch (err) {
        console.error('❌ Sync failed:', err);
    }
}

sync();
