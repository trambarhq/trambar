var _ = require('lodash');
var Promise = require('bluebird');
var FS = Promise.promisifyAll(require('fs'));
var ChildProcess = require('child_process');
var Crypto = require('crypto');

var CacheFolders = require('media-server/cache-folders');
var FileManager = require('media-server/file-manager');

exports.createJobId = createJobId;
exports.startTranscodingJob = startTranscodingJob;
exports.findTranscodingJob = findTranscodingJob;
exports.transcodeSegment = transcodeSegment;
exports.endTranscodingJob = endTranscodingJob;
exports.awaitTranscodingJob = awaitTranscodingJob;

/**
 * Create a random job id
 *
 * @return {String}
 */
function createJobId() {
    return new Promise((resolve, reject) => {
        Crypto.randomBytes(16, function(err, buffer) {
            var token = buffer.toString('hex');
            resolve(token);
        });
    });
}

var transcodingJobs = [];

/**
 * Find a transcoding job by id
 *
 * @param  {String} jobId
 *
 * @return {Object|null}
 */
function findTranscodingJob(jobId) {
    return _.find(transcodingJobs, { jobId }) || null;
}

/**
 * Start up instances of ffmpeg
 *
 * @param  {String|null} srcPath
 * @param  {String} type
 * @param  {String|null} streamId
 *
 * @return {Object}
 */
function startTranscodingJob(srcPath, type, jobId) {
    var job = {
        jobId,
        type,
        streaming: !srcPath,
        destination: CacheFolders[type],
    };
    if (type === 'video') {
        job.profiles = {
            '320x240': {
                videoBitrate: 250 * 1000,
                videoScaling: {
                    width: 320,
                    height: 240
                },
                audioBitrate: 64 * 1000,
                audioChannels: 1,
                format: 'mp4',
            },
            '640x480': {
                videoBitrate: 1000 * 1000,
                videoScaling: {
                    width: 640,
                    height: 480,
                },
                audioBitrate: 128 * 1000,
                audioChannels: 2,
                format: 'mp4',
            },
        };
    } else if (type === 'audio') {
        job.profiles = {
            '128kbps': {
                audioBitrate: 128  * 1000,
                format: 'mp3',
            },
        };
    }

    // launch instances of FFmpeg to create files for various profiles
    job.outputFiles = _.mapValues(job.profiles, (profile, name) => {
        return `${job.destination}/${jobId}.${name}.${profile.format}`;
    });
    job.processes = _.mapValues(job.outputFiles, (dstPath, name) => {
        return spawnFFmpeg(srcPath, dstPath, job.profiles[name]);
    });
    // create promises that resolve when FFmpeg exits
    var promises = _.mapValues(job.processes, (childProcess) => {
        return new Promise((resolve, reject) => {
            childProcess.on('exit', (code, signal) => {
                if (code >= 0) {
                    resolve()
                } else {
                    reject(new Error(`Process exited with error code ${code}`));
                }
            });
            childProcess.on('error', (err) => {
                console.error(err);
                reject(err)
            });
        });
    });
    job.promise = Promise.props(promises);

    if (job.streaming) {
        // add queue and other variables needed for streaming in video
        job.queue = [];
        job.working = false;
        job.finished = false;

        // create write stream to save original
        job.originalFile = `${job.destination}/${jobId}`;
        job.writeStream = FS.createWriteStream(job.originalFile);
        var filePromise = new Promise((resolve, reject) => {
            job.writeStream.once('error', reject);
            job.writeStream.once('finish', resolve);
        });

        // calculate MD5 hash along the way
        job.md5Hash = Crypto.createHash('md5');
        var hashPromise = new Promise((resolve, reject) => {
            job.md5Hash.once('readable', () => {
                resolve(job.md5Hash.read().toString('hex'));
            });
        });

        job.promise = job.promise.then(() => {
            // rename the files once we have the MD5 hash
            return Promise.join(hashPromise, filePromise, (hash) => {
                var originalFile = _.replace(job.originalFile, job.jobId, hash);
                var outputFiles = _.mapValues(job.outputFiles, (outputFile) => {
                    return _.replace(outputFile, job.jobId, hash);
                });
                var srcFiles = _.concat(job.originalFile, _.values(job.outputFiles));
                var dstFiles = _.concat(originalFile, _.values(outputFiles));
                return Promise.map(srcFiles, (srcFile, index) => {
                    return FileManager.moveFile(srcFile, dstFiles[index]);
                }).then(() => {
                    job.originalFile = originalFile;
                    job.outputFiles = outputFiles;
                    job.originalHash = hash;
                });
            });
        });
    }

    transcodingJobs.push(job);
    return job;
}

/**
 * Wait for transcoding job to finish
 *
 * @param  {Object} job
 * @return {Promise<Object>}
 */
function awaitTranscodingJob(job) {
    return job.promise.return(job);
}

/**
 * Add a file to the transcode queue
 *
 * @param  {Object} job
 * @param  {ReadableStream} file
 */
function transcodeSegment(job, inputStream) {
    job.queue.push(inputStream);
    if (!job.working) {
        processNextStreamSegment(job);
    }
}

/**
 * Indicate that there will be no more additional files
 *
 * @param  {Object} job
 */
function endTranscodingJob(job) {
    job.finished = true;
    if (!job.working) {
        processNextStreamSegment(job);
    }
}

/**
 * Get the next stream segment and pipe it to FFmpeg
 *
 * @param  {Object} job
 */
function processNextStreamSegment(job) {
    var inputStream = job.queue.shift();
    if (inputStream) {
        job.working = true;
        // save the original
        inputStream.pipe(job.writeStream, { end: false });
        // calculate MD5
        inputStream.pipe(job.md5Hash, { end: false });
        // pipe stream to stdin of FFmpeg, leaving stdin open afterward
        _.each(job.processes, (childProcess) => {
            inputStream.pipe(childProcess.stdin, { end: false });
        });
        inputStream.once('end', () => {
            // done, try processing the next segment
            processNextStreamSegment(job);
        });
    } else {
        job.working = false;
        if (job.finished) {
            // there are no more segments
            job.writeStream.end();
            job.md5Hash.end();
            // close stdin of FFmpeg so it'd exit after processing remaining data
            _.each(job.processes, (childProcess) => {
                childProcess.stdin.end();
            });
        }
    }
}

/**
 * Spawn an instance of FFmpeg
 *
 * @param  {String} srcPath
 * @param  {String} dstPath
 * @param  {Object} profile
 *
 * @return {ChildProcess}
 */
function spawnFFmpeg(srcPath, dstPath, profile) {
    var cmd = 'ffmpeg';
    var inputArgs = [], input = Array.prototype.push.bind(inputArgs);
    var outputArgs = [], output = Array.prototype.push.bind(outputArgs);
    var options = {
        stdio: [ 'inherit', 'inherit', 'inherit' ]
    };

    if (srcPath) {
        input('-i', srcPath);
    } else {
        // get input from stdin
        input('-i', 'pipe:0');
        options.stdio[0] = 'pipe';
    }

    // add output options
    if (profile.videoBitrate) {
        output('-b:v', profile.videoBitrate);
    }
    if (profile.audioBitrate) {
        output('-b:a', profile.audioBitrate);
    }
    if (profile.frameRate) {
        output('-r', profile.frameRate);
    }
    if (profile.audioChannels) {
        output('-ac', profile.audioChannels);
    }
    if (profile.videoScaling) {
        var w = profile.videoScaling.width;
        var h = profile.videoScaling.height;
        // if actual aspect ratio is great than w/h, scale = width:-2
        // if actual aspect ratio is less than w/h, scale = -2:height
        //
        // -2 ensures the automatic dimension is divisible by 2
        var scale = `'if(gt(a,${w}/${h}),${w},-2)':'if(gt(a,${w}/${h}),-2,${h})'`;
        output('-vf', `scale=${scale}`);
    }
    output(dstPath);

    var args = _.concat(inputArgs, outputArgs);
    console.log(args.join(' '));
    return ChildProcess.spawn(cmd, args, options);
}
