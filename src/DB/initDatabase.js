import { addRxPlugin, createRxDatabase } from "rxdb";
import { getRxStoragePouch, addPouchPlugin } from "rxdb/plugins/pouchdb";
import { replicateRxCollection } from "rxdb/plugins/replication";
import { RxDBDevModePlugin } from "rxdb/plugins/dev-mode";
import { RxDBLeaderElectionPlugin } from "rxdb/plugins/leader-election";
import PouchdbAdapterIdb from "pouchdb-adapter-idb";
import PouchDB from "pouchdb";
 
// Add plugins
addRxPlugin(RxDBDevModePlugin);
addRxPlugin(RxDBLeaderElectionPlugin);
addPouchPlugin(PouchdbAdapterIdb);
 
// Schema definitions
export const businessSchema = {
  title: "business schema",
  version: 0,
  description: "Describes a business",
  type: "object",
  primaryKey: "id",
  properties: {
    id: { type: "string", maxLength: 100 },
    name: { type: "string", maxLength: 100 },
  },
  required: ["id", "name"],
  indexes: ["name"],
};
 
export const articleSchema = {
  title: "article schema",
  version: 0,
  description: "Describes an article",
  type: "object",
  primaryKey: "id",
  properties: {
    id: { type: "string", maxLength: 100 },
    name: { type: "string", maxLength: 100 },
    qty: { type: "number" },
    selling_price: { type: "number" },
    business_id: { type: "string", maxLength: 100 },
  },
  required: ["id", "name", "qty", "selling_price", "business_id"],
  indexes: ["name", "business_id"],
};
 
let dbPromise = null;
const remoteDbUrl = "http://admin:admin@13.50.203.154:5984/inobetasolutions";
 
export const getDatabase = async () => {
  if (!dbPromise) {
    dbPromise = createRxDatabase({
      name: "inobetasolutions",
      storage: getRxStoragePouch("idb"),
      ignoreDuplicate: true,
      multiInstance: false,
    })
      .then(async (db) => {
        await db.addCollections({
          businesses: { schema: businessSchema },
          articles: { schema: articleSchema },
        });
 
        const setupReplication = (collection, type) => {
          const replication = replicateRxCollection({
            collection,
            replicationIdentifier: `${type}-sync`,
            pull: {
              async handler(lastCheckpoint) {
                const remoteDb = new PouchDB(remoteDbUrl);
                try {
                  const result = await remoteDb.changes({
                    since: lastCheckpoint?.seq || 0,
                    include_docs: true,
                    filter: (doc) => doc._id?.startsWith(`${type}_`),
                  });
 
                  const docs = result.results
                    .map((change) => change.doc)
                    .filter((doc) => doc && !doc._deleted);
 
                  return {
                    documents: docs,
                    checkpoint: { seq: result.last_seq },
                  };
                } catch (error) {
                  console.error(`Pull replication error (${type}):`, error);
                  throw error;
                }
              },
              batchSize: 50,
              modifier: (doc) => {
                doc.id = doc._id.replace(`${type}_`, "");
                return doc;
              },
            },
            push: {
              async handler(rows) {
                const remoteDb = new PouchDB(remoteDbUrl);
                try {
                  const docs = rows.map((row) => ({
                    ...row.newDocumentState,
                    _id: `${type}_${row.newDocumentState.id}`,
                  }));
 
                  await remoteDb.bulkDocs(docs);
                  return {};
                } catch (error) {
                  console.error(`Push replication error (${type}):`, error);
                  throw error;
                }
              },
              batchSize: 50,
            },
            live: true,
            retry: true,
            autoStart: true,
            conflictHandler: (conflict) => conflict.realMaster,
          });
 
          replication.error$.subscribe((err) => {
            console.error(`${type} replication error:`, err);
          });
 
          return replication;
        };
 
        setupReplication(db.businesses, "business");
        setupReplication(db.articles, "article");
 
        return db;
      })
      .catch((error) => {
        console.error("Database initialization failed:", error);
        throw error;
      });
  }
 
  return dbPromise;
};
 
export const resetDatabase = async () => {
  if (dbPromise) {
    const db = await dbPromise;
    await db.remove();
    dbPromise = null;
  }
};
 