'use strict'; // eslint-disable-line strict

const arsenal = require('arsenal');
const werelogs = require('werelogs');

const errors = arsenal.errors;
const stringHash = arsenal.stringHash;
const jsutil = arsenal.jsutil;
const storageUtils = arsenal.storage.utils;

const ipfsAPI = require('ipfs-api');
const ipfs = ipfsAPI('/ip4/127.0.0.1/tcp/5001');

const logger = new werelogs.Logger('Zenko-IPFS');
const logOptions = {
    "logLevel": "debug",
    "dumpLevel": "error"
};

class IPFSFileStore extends arsenal.storage.data.file.DataFileStore {
    put(dataStream, size, log, callback) {

        const files = [
            {
                path: 'file',
                content: dataStream
            }
        ];

        ipfs.files.add(files, function (err, files) {
            if (err) {
                log.error('error adding to IPFS',
                    { method: 'put', error: err });
                return callback(errors.InternalError.customizeDescription(
                    `IPFS error: ipfs.files.add() returned ${err.code}`));
            }
            const cbOnce = jsutil.once(callback);
            const key = files[0].hash;
            function ok() {
                log.debug('finished writing data',
                    { method: 'put', key });
                return cbOnce(null, key);
            }
            return ok();
            //error management
        });
    }

    get(key, byteRange, log, callback) {
        const filePath = this.getFilePath(key);

        const readStreamOptions = {
            flags: 'r',
            encoding: null,
            fd: null,
            autoClose: true,
        };
        if (byteRange) {
            readStreamOptions.start = byteRange[0];
            readStreamOptions.end = byteRange[1];
        }
        log.debug('opening readStream to get data',
                  { method: 'get', key, filePath, byteRange });
        const cbOnce = jsutil.once(callback);
        const rs = fs.createReadStream(filePath, readStreamOptions)
                  .on('error', err => {
                      if (err.code === 'ENOENT') {
                          return cbOnce(errors.ObjNotFound);
                      }
                      log.error('error retrieving file',
                                { method: 'get', key, filePath,
                                  error: err });
                      return cbOnce(
                          errors.InternalError.customizeDescription(
                              `filesystem read error: ${err.code}`));
                  })
                  .on('open', () => { cbOnce(null, rs); });

        ipfs.files.get(key, function (err, stream) {
            stream.on('data', (file) => {
            // write the file's path and contents to standard out
                console.log(file.path);
                file.content.pipe(process.stdout);
                cbOnce(null, stream);
            });
        });
    }

    stat(key, log, callback) {

        ipfs.object.stat(key, (err, stats) => {
            if (err) {
                throw err
            }
            console.log(stats)
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

        const filePath = this.getFilePath(key);
        log.debug('stat file', { key, filePath });
        fs.stat(filePath, (err, stat) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    return callback(errors.ObjNotFound);
                }
                log.error('error on \'stat\' of file',
                          { key, filePath, error: err });
                return callback(errors.InternalError.customizeDescription(
                    `filesystem error: stat() returned ${err.code}`));
            }
            const info = { objectSize: stat.size };
            return callback(null, info);
        });
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
