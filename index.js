'use strict';

const arsenal = require('arsenal');
const { config } = require('./lib/Config.js');
const logger = require('./lib/utilities/logger');

const fs = require('fs');
const crypto = require('crypto');
const async = require('async');
const diskusage = require('diskusage');
const werelogs = require('werelogs');

const errors = arsenal.errors;
const stringHash = arsenal.stringHash;
const jsutil = arsenal.jsutil;
const storageUtils = arsenal.storage.utils;

const ipfsAPI = require('ipfs-api');

const ipfs = ipfsAPI('/ip4/127.0.0.1/tcp/5001');

class IFPFSFileStore extends arsenal.storage.data.file.DataFileStore {
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
}