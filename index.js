'use strict'; // eslint-disable-line strict

const arsenal = require('arsenal');
const errors = arsenal.errors;
const stringHash = arsenal.stringHash;
const jsutil = arsenal.jsutil;
const storageUtils = arsenal.storage.utils;

const ipfsAPI = require('ipfs-api');
const ipfs = ipfsAPI('/ip4/127.0.0.1/tcp/5001');

const werelogs = require('werelogs');
const logger = new werelogs.Logger('Zenko-IPFS');
const logOptions = {
    "logLevel": "debug",
    "dumpLevel": "error"
};

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
                const key = files[0].hash;
                cbOnce(null, key);
            }
        });
    }

    get(key, byteRange, log, callback) {
        console.log('data get');

        ipfs.files.get(key, function (err, stream) {
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

        ipfs.object.stat(key, (err, stats) => {
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
