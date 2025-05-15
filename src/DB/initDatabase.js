import { addRxPlugin, createRxDatabase } from 'rxdb';
import { getRxStoragePouch, addPouchPlugin } from 'rxdb/plugins/pouchdb';
import { replicateRxCollection } from 'rxdb/plugins/replication';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
import PouchdbAdapterIdb from 'pouchdb-adapter-idb';
import PouchDB from 'pouchdb';

addRxPlugin(RxDBDevModePlugin);
addRxPlugin(RxDBLeaderElectionPlugin);
addPouchPlugin(PouchdbAdapterIdb);

// ✅ Business schema
export const businessSchema = {
    title: 'business schema',
    version: 0,
    description: 'Describes a business',
    type: 'object',
    primaryKey: 'id',
    properties: {
        id: {
            type: 'string',
            maxLength: 100,
        },
        name: {
            type: 'string',
        },
    },
    required: ['id', 'name'],
};

// ✅ Article schema
export const articleSchema = {
    title: 'article schema',
    version: 0,
    description: 'Describes an article',
    type: 'object',
    primaryKey: 'id',
    properties: {
        id: {
            type: 'string',
            maxLength: 100,
        },
        name: {
            type: 'string',
        },
        qty: {
            type: 'number',
        },
        selling_price: {
            type: 'number',
        },
        business_id: {
            type: 'string',
        },
    },
    required: ['id', 'name', 'qty', 'selling_price', 'business_id'],
};

let dbPromise = null;

// ✅ Get RxDB database instance
export const getDatabase = async () => {
    if (!dbPromise) {
        dbPromise = createRxDatabase({
            name: 'rxdbbr',
            storage: getRxStoragePouch('idb'),
            ignoreDuplicate: true,
        }).then(async (db) => {
            await db.addCollections({
                businesses: { schema: businessSchema },
                articles: { schema: articleSchema },
            });

            const remoteDbUrl =
                'http://admin:admin@13.50.203.154:5984/rxdbbr';

            // ✅ Replicate businesses
            replicateRxCollection({
                collection: db.businesses,
                replicationIdentifier: 'businesses-sync',
                pull: {
                    async handler(lastCheckpoint, batchSize) {
                        const remoteDb = new PouchDB(remoteDbUrl);
                        const result = await remoteDb.allDocs({
                            include_docs: true,
                        });
                        const docs = result.rows
                            .map((row) => row.doc)
                            .filter((doc) => doc.id?.startsWith('business|'));
                        return { documents: docs, checkpoint: {} };
                    },
                },
                push: {
                    async handler(rows) {
                        const remoteDb = new PouchDB(remoteDbUrl);
                        await remoteDb.bulkDocs(rows);
                        return {};
                    },
                },
                live: true,
                retry: true,
            });

            // ✅ Replicate articles
            replicateRxCollection({
                collection: db.articles,
                replicationIdentifier: 'articles-sync',
                pull: {
                    async handler(lastCheckpoint, batchSize) {
                        const remoteDb = new PouchDB(remoteDbUrl);
                        const result = await remoteDb.allDocs({
                            include_docs: true,
                        });
                        const docs = result.rows
                            .map((row) => row.doc)
                            .filter((doc) => doc.id?.startsWith('article|'));
                        return { documents: docs, checkpoint: {} };
                    },
                },
                push: {
                    async handler(rows) {
                        const remoteDb = new PouchDB(remoteDbUrl);
                        await remoteDb.bulkDocs(rows);
                        return {};
                    },
                },
                live: true,
                retry: true,
            });

            return db;
        });
    }

    return dbPromise;
};
