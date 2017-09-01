'use strict'; // eslint-disable-line strict

const arsenal = require('arsenal');
const errors = arsenal.errors;
const stringHash = arsenal.stringHash;
const jsutil = arsenal.jsutil;
const storageUtils = arsenal.storage.utils;

const ipfsAPI = require('ipfs-api');
const ipfs = ipfsAPI('localhost', '5001');

const OrbitDB = require('orbit-db');
const orbitdb = new OrbitDB(ipfs);
const SUBLEVEL_SEP = '::';

const werelogs = require('werelogs');
const logger = new werelogs.Logger('Zenko-IPFS');
const logOptions = {
    "logLevel": "debug",
    "dumpLevel": "error"
};

// Metadata

const MetadataFileServer =
          require('arsenal').storage.metadata.MetadataFileServer;

const mdServer = new MetadataFileServer(
    { bindAddress: '0.0.0.0',
      port: 9990,
      path: '/tmp',
      restEnabled: false,
      restPort: 9999,
      recordLog: { enabled: false, recordLogName: 's3-recordlog' },
      versioning: { replicationGroupId: 'RG001' },
      log: logOptions });

class OrbitDBService extends arsenal.network.rpc.BaseService {
    constructor(params) {
    super(params);
    this.addRequestInfoConsumer((dbService, reqParams) => {
            const env = {};
            env.subLevel = reqParams.subLevel;
        return env;
    });
    }
}

var dbs = {};

mdServer.initMetadataService = function ()
{
    const dbService = new OrbitDBService({
    namespace: '/MDFile/metadata',
    logger: logger
    });
    this.services.push(dbService);

    dbService.registerAsyncAPI({
        put: (env, key, value, options, cb) => {
            const dbName = env.subLevel.join(SUBLEVEL_SEP);
            console.log('put', dbName, key, value, options);
            const db = orbitdb.kvstore(dbName);
            db.put(key, value).then(() => cb(null));
        },
        del: (env, key, options, cb) => {
            const dbName = env.subLevel.join(SUBLEVEL_SEP);
            console.log('del', dbName, key, options);
            cb(null);
        },
        get: (env, key, options, cb) => {
            const dbName = env.subLevel.join(SUBLEVEL_SEP);
            console.log('get', dbName, key, options);
            const db = orbitdb.kvstore(dbName)
            db.get(key, (err, value) => {
                if (err) {
                    if (err.notFound) {
                        return cb(arsenal.errors.ObjNotFound);
                    }
                    return cb(arsenal.errors.InternalError);
                }
                console.log(key, value);
                cb(null, value);
            });
        },
        getDiskUsage: (env, cb) => {
            console.log('getDiskUsage',env);
        },
    });

    // dbService.registerSyncAPI({
    //     createReadStream: (env, options) => {
    //         const dbName = env.subLevel.join(SUBLEVEL_SEP);
    //         console.log('createReadStream', dbName, options);
    //         if (dbs[dbName] === undefined) {
    //             dbs[dbName] = levelup('/tmp/' + dbName + '.json', { db: jsondown });
    //         }
    //     return dbs[dbName].createReadStream();
    //     },
    //     getUUID: () => this.readUUID(),
    // });
    
    console.log('Hooks installed');
};

mdServer.startServer();

// data

function hexEncode(str){
    var hex, i;

    var result = "";
    for (i=0; i<str.length; i++) {
        hex = str.charCodeAt(i).toString(16);
        result += ("000"+hex).slice(-4);
    }

    return result;
}

function hexDecode(hex){
    var j;
    var hexes = hex.match(/.{1,4}/g) || [];
    var back = "";
    for(j = 0; j<hexes.length; j++) {
        back += String.fromCharCode(parseInt(hexes[j], 16));
    }

    return back;
}

class IPFSFileStore extends arsenal.storage.data.file.DataFileStore {
    constructor(dataConfig, logApi) {
        super(dataConfig, logApi);
        console.log('filestore constructor');
    }

    setup(cb) {
        console.log('data setup');
        cb(null);
    }

    put(dataStream, size, log, callback) {
        console.log('data put');
        const files = [
            {
                path: 'file',
                content: dataStream
            }
        ];

        ipfs.files.add(files, function (err, files) {
            const cbOnce = jsutil.once(callback);
            if (err) {
                log.error('error adding to IPFS',
                    { method: 'put', error: err });
                cbOnce(errors.InternalError.customizeDescription(
                    `IPFS error: ipfs.files.add() returned ${err.code}`));
            } else {
                const key = hexEncode(files[0].hash);
                cbOnce(null, key);
            }
        });
    }

    get(key, byteRange, log, callback) {
        console.log('data get');

        const hash = hexDecode(key);
        ipfs.files.get(hash, function (err, stream) {
            if (err) {
                console.log(err);
                callback(err);
            } else {
                stream.on('data', (file) => {
                    callback(null, file.content);
                })
            }
        });
    }

    stat(key, log, callback) {
        console.log('data stat');

        const hash = hexDecode(key);
        ipfs.object.stat(hash, (err, stats) => {
            if (err) {
                console.log(err);
                callback(err);
            } else {
                console.log(stats);
                callback(null, { objectSize: stats.DataSize});
            }
            // Logs:
            // {
            //   Hash: 'QmPTkMuuL6PD8L2SwTwbcs1NPg14U8mRzerB1ZrrBrkSDD',
            //   NumLinks: 0,
            //   BlockSize: 10,
            //   LinksSize: 2,
            //   DataSize: 8,
            //   CumulativeSize: 10
            // }
        });
    }

    getDiskUsage(callback) {
        console.log('data getDiskUsage');
    }
}

const dataServer = new arsenal.network.rest.RESTServer({
    bindAddress: '0.0.0.0',
    port: 9991,
    dataStore: new IPFSFileStore({ 
        dataPath: '/tmp',
        log: logOptions
    }),
    log: logOptions
});

dataServer.setup(err => {
    if (err) {
        logger.error('Error initializing REST data server',
                     { error: err });
        return;
    }
    dataServer.start();
});

console.log('Zenko IPFS Plugin Initialized');
