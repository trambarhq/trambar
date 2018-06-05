var _ = require('lodash');
var Promise = require('bluebird');
var FS = Promise.promisifyAll(require('fs'));
var Path = require('path');
var Readline = require('readline');
var ChildProcess = require('child_process');
var Crypto = require('crypto');

var CacheFolders = require('media-server/cache-folders');
var FileManager = require('media-server/file-manager');
var ImageManager = require('media-server/image-manager');

module.exports = {
    startTranscodingJob,
    findTranscodingJob,
    transcodeSegment,
    endTranscodingJob,
    awaitTranscodingJob,
    requestPosterGeneration,
    awaitPosterGeneration,
};

var transcodingJobs = [];
var encodingProfiles = [
    {
        type: 'video',
        name: '1000kbps',
        videoBitrate: 1000 * 1000,
        audioBitrate: 128 * 1000,
        audioChannels: 2,
        format: 'mp4',
        maximum: {
            width: 896,
            height: 896
        },
    },
    {
        type: 'video',
        name: '500kbps',
        videoBitrate: 500 * 1000,
        audioBitrate: 64 * 1000,
        audioChannels: 1,
        format: 'mp4',
        maximum: {
            width: 640,
            height: 640,
        },
    },
    {
        type: 'audio',
        name: '128kbps',
        audioChannels: 2,
        audioBitrate: 128  * 1000,
        format: 'mp3',
    },
    {
        type: 'audio',
        name: '32kbps',
        audioChannels: 1,
        audioBitrate: 32  * 1000,
        format: 'mp3',
    },
];

/**
 * Find a transcoding job by id
 *
 * @param  {String} jobId
 *
 * @return {Object|null}
 */
function findTranscodingJob(jobId) {
    return _.find(transcodingJobs, { id: jobId }) || null;
}

/**
 * Start up instances of ffmpeg
 *
 * @param  {String|null} srcPath
 * @param  {String} type
 * @param  {String} jobId
 *
 * @return {Promise<Object>}
 */
function startTranscodingJob(srcPath, type, jobId) {
    var profiles = _.filter(encodingProfiles, { type });
    var job = {
        id: jobId,
        type: type,
        destination: CacheFolders[type],
        streaming: !srcPath,
        inputFile: { path: srcPath },
        outputFiles: [],
        promise: null,
        progress: 0,
        onProgress: null,
    };
    return Promise.each(profiles, (profile) => {
        // see if the destination file exists already
        var dstPath = `${job.destination}/${job.id}.${profile.name}.${profile.format}`;
        var outputFile = _.clone(profile);
        outputFile.path = dstPath;
        job.outputFiles.push(outputFile);
        return FS.lstatAsync(dstPath).then(() => {
            // get its duration and dimensions
            return probeFile(outputFile).then(() => {
                if (!outputFile.duration) {
                    throw new Error('Existing file seems to be empty');
                }
            });
        }).catch((err) => {
            // launch an instance of FFmpeg to create the file
            return spawnFFmpeg(srcPath, dstPath, profile);
        }).then((ffmpeg) => {
            outputFile.ffmpeg = ffmpeg;
        });
    }).then(() => {
        // create a promise that fulfills when all instances of ffmpeg have exited
        job.promise = Promise.map(job.outputFiles, (outputFile) => {
            var ffmpeg = outputFile.ffmpeg;
            if (ffmpeg) {
                // wait for ffmpeg to exit
                return waitForExit(ffmpeg).then(() => {
                    // get the generated file's dimensions
                    return probeFile(outputFile);
                });
            }
        });

        if (job.streaming) {
            // add queue and other variables needed for streaming in video
            job.queue = [];
            job.working = false;
            job.closed = false;
            job.aborted = false;
            job.totalByteCount = 0;
            job.processedByteCount = 0;
            job.lastProgressTime = 0;
            job.lastSegmentTime = new Date;

            // create write stream to save original
            job.inputFile.path = `${job.destination}/${job.id}`;
            job.writeStream = FS.createWriteStream(job.inputFile.path);
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

            // wait for processes to finish, then rename the files, using the
            // MD5 hash of the original
            job.promise = job.promise.then(() => {
                return Promise.join(hashPromise, filePromise, (hash) => {
                    job.inputFile.hash = hash;
                    return probeFile(job.inputFile).then(() => {
                        var files = _.concat(job.inputFile, job.outputFiles);
                        return Promise.map(files, (file) => {
                            return renameFile(file, job.id, hash);
                        });
                    });
                });
            });
        } else {
            // track progress by reading ffmpeg's stderr output
            // we'll need the duration of the source file
            job.totalDuration = 0;
            probeFile(job.inputFile).then(() => {
                job.totalDuration = job.inputFile.duration;

                var re = /out_time_ms=(.*)/;
                _.each(job.outputFiles, (outputFile) => {
                    if (outputFile.ffmpeg) {
                        outputFile.processedDuration = 0;

                        var rl = Readline.createInterface({ input: outputFile.ffmpeg.stdout });
                        rl.on('line', (line) => {
                            var m = re.exec(line);
                            if (m) {
                                var outTime = parseInt(m[1]);
                                outputFile.processedDuration = outTime / 1000;
                                calculateProgress(job);
                            }
                        });
                    }
                });
            });
        }

        transcodingJobs.push(job);
        return job;
    });
}

/**
 * Scan files and set their the duration and dimensions
 *
 * @param  {Array<Object>} files
 *
 * @return {Promise}
 */
function probeFile(file) {
    return probeMediaFile(file.path).then((info) => {
        _.assign(file, info);
    });
}

/**
 * Change temporary filename to permanent ones
 *
 * @param  {Object} files
 * @param  {String} match
 * @param  {String} replacement
 *
 * @return {Promise}
 */
function renameFile(file, match, replacement) {
    var tempPath = file.path;
    var permPath = _.replace(tempPath, match, replacement);
    return FileManager.moveFile(tempPath, permPath).then(() => {
        file.path = permPath;
    });
}

/**
 * Wait for transcoding job to finish
 *
 * @param  {Object} job
 *
 * @return {Promise}
 */
function awaitTranscodingJob(job) {
    return job.promise;
}

/**
 * Wait for poster generation to finish
 *
 * @param  {Object} job
 *
 * @return {Promise}
 */
function awaitPosterGeneration(job) {
    if (!job.posterFile) {
        throw new Error('Poster generation not requested');
    }
    return job.posterFile.promise;
}

/**
 * Add a file to the transcode queue
 *
 * @param  {Object} job
 * @param  {Object} file
 */
function transcodeSegment(job, file) {
    if (!job.closed) {
        var inputStream = FS.createReadStream(file.path);
        job.queue.push(inputStream);
        job.totalByteCount += file.size;
        job.lastSegmentTime = new Date;
        if (!job.working) {
            processNextStreamSegment(job);
        }
    }
    if (job.posterFile && job.posterFile.ffmpeg) {
        // handle poster generation in separate quene so process isn't slowed
        // down by back pressure from transcoding
        var inputStream = FS.createReadStream(file.path);
        job.posterQueue.push(inputStream);
        if (!job.workingOnPoster) {
            processNextStreamSegmentForPoster(job);
        }
    }
}

/**
 * Indicate that there will be no more additional files
 *
 * @param  {Object} job
 * @param  {Boolean} abort
 */
function endTranscodingJob(job, abort) {
    job.closed = true;
    job.aborted = abort;
    calculateProgress(job);
    if (!job.working) {
        processNextStreamSegment(job);
    }

    if (job.posterFile && job.posterFile.ffmpeg) {
        if (!job.workingOnPoster) {
            processNextStreamSegmentForPoster(job);
        }
    } else {
        // close the streams that aren't used
        if (job.posterQueue) {
            var inputStream;
            while (inputStream = job.posterQueue.shift()) {
                inputStream.close();
            }
        }
    }
}

/**
 * Get the next stream segment and pipe it to FFmpeg
 *
 * @param  {Object} job
 */
function processNextStreamSegment(job) {
    var inputStream = job.queue.shift();
    if (inputStream && !job.aborted) {
        job.working = true;
        // save contents of the original file
        inputStream.pipe(job.writeStream, { end: false });
        // calculate MD5
        inputStream.pipe(job.md5Hash, { end: false });
        // pipe stream to stdin of FFmpeg, leaving stdin open afterward
        // (so FFmpeg doesn't exit)
        _.each(job.outputFiles, (outputFile) => {
            if (outputFile.ffmpeg) {
                inputStream.pipe(outputFile.ffmpeg.stdin, { end: false });
            }
        });
        // calculate progress based on how much data has been pulled from
        // input stream
        inputStream.on('data', (chunk) => {
            job.processedByteCount += chunk.length;
            calculateProgress(job);
        });
        // once this stream finishes, move on to the next segment
        inputStream.once('end', () => {
            processNextStreamSegment(job);
        });
    } else {
        job.working = false;
        if (job.closed) {
            // there are no more segments
            job.writeStream.end();
            job.md5Hash.end();
            // close stdin of FFmpeg so it'd exit after processing remaining data
            _.each(job.outputFiles, (outputFile) => {
                if (outputFile.ffmpeg) {
                    outputFile.ffmpeg.stdin.end();
                    outputFile.ffmpeg = null;
                }
            });
            calculateProgress(job);
        }
    }
}

/**
 * Get the next stream segment and pipe it to FFmpeg
 *
 * @param  {Object} job
 */
function processNextStreamSegmentForPoster(job) {
    var inputStream = job.posterQueue.shift();
    if (inputStream && !job.aborted) {
        job.workingOnPoster = true;
        inputStream.pipe(job.posterFile.ffmpeg.stdin, { end: false });
        inputStream.once('end', () => {
            processNextStreamSegmentForPoster(job);
        });
    } else {
        job.workingOnPoster = false;
        if (job.closed) {
            job.posterFile.ffmpeg.stdin.end();
            job.posterFile.ffmpeg = null;
        }
    }
}

/**
 * Calculate encoding progress and call onProgress handler
 *
 * @param  {Object} job
 */
function calculateProgress(job) {
    var progress;
    if (job.streaming) {
        // don't perform calculation when final size isn't known
        if (job.closed) {
            progress = Math.round(job.processedByteCount / job.totalByteCount * 100);
        }
    } else {
        var durations = [];
        _.each(job.outputFiles, (outputFile) => {
            if (outputFile.ffmpeg) {
                durations.push(outputFile.processedDuration);
            }
        });
        progress = Math.round(_.min(durations) / job.totalDuration * 100);
    }
    if (progress) {
        if (progress === 100 && job.working) {
            // there's still some work to be done
            progress = 99;
        }
        if (job.progress !== progress) {
            job.progress = progress;
            if (job.onProgress) {
                // don't report that frequently
                var now = new Date;
                var elapsed = (job.lastProgressTime) ? now - job.lastProgressTime : Infinity;
                if (elapsed > 2000 || progress === 100) {
                    job.onProgress({ type: 'progress', target: job });
                    job.lastProgressTime = now;
                }
            }
        }
    }
}

/**
 * Add poster generation to job
 *
 * @param  {Job} job
 *
 * @return {Promise<Object>}
 */
function requestPosterGeneration(job) {
    var srcPath = (job.streaming) ? null : job.inputFile.path;
    var dstPath = `${job.destination}/${job.id}.screencaps/%d.jpg`;
    var dstFolder = Path.dirname(dstPath);
    return FS.mkdirAsync(dstFolder).catch((err) => {
        if (err.code !== 'EEXIST') {
            throw err;
        }
    }).then(() => {
        var profile = {
            screenCap: {
                quality: 2,
                count: 3
            }
        };
        var ffmpeg = spawnFFmpeg(srcPath, dstPath, profile);
        if (ffmpeg.stdin) {
            // we expect ffmpeg to drop the connection as soon as it has enough data
            ffmpeg.stdin.on('error', (err) => {
                job.posterFile.ffmpeg = null;
            });
        }
        job.posterQueue = [];
        job.posterFile = {};
        job.posterFile.ffmpeg = ffmpeg;
        job.posterFile.promise = waitForExit(ffmpeg).then(() => {
            // scan dstFolder for files
            return FS.readdirAsync(dstFolder).then((names) => {
                // find the largest of them (most interesting, hopefully)
                return Promise.reduce(names, (selected, name) => {
                    var path = `${dstFolder}/${name}`;
                    return FS.statAsync(path).then((stat) => {
                        if (!selected || selected.size < stat.size) {
                            return { path, size: stat.size };
                        } else {
                            return selected;
                        }
                    });
                }, null);
            }).then((file) => {
                if (file) {
                    // move file into image cache folder
                    return ImageManager.getImageMetadata(file.path).then((meta) => {
                        return FileManager.preserveFile(file, null, CacheFolders.image).then((imagePath) => {
                            _.assign(job.posterFile, {
                                path: imagePath,
                                width: meta.width,
                                height: meta.height,
                            });
                        });
                    });
                }
            });
        }).finally(() => {
            // delete the folder, along with any remaining files
            return FS.readdirAsync(dstFolder).each((name) => {
                return FS.unlinkAsync(`${dstFolder}/${name}`).catch((err) => {});
            }).then(() => {
                return FS.unlinkAsync(dstFolder).catch((err) => {});
            })
        });
        return null;
    });
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
    var args = [], arg = Array.prototype.push.bind(args);
    var options = {
        stdio: [ 'inherit', 'inherit', 'inherit' ]
    };

    arg('-y');
    arg('-hide_banner');
    arg('-loglevel', 'error');

    if (srcPath) {
        arg('-i', srcPath);
        // receive progress from stdout
        arg('-progress', '-');
        options.stdio[1] = 'pipe';
    } else {
        // get input from stdin
        arg('-i', 'pipe:0');
        options.stdio[0] = 'pipe';
    }

    // add output options
    if (profile.videoBitrate) {
        arg('-b:v', profile.videoBitrate);
    }
    if (profile.audioBitrate) {
        arg('-b:a', profile.audioBitrate);
    }
    if (profile.frameRate) {
        arg('-r', profile.frameRate);
    }
    if (profile.audioChannels) {
        arg('-ac', profile.audioChannels);
    }
    if (profile.maximum) {
        var w = profile.maximum.width;
        var h = profile.maximum.height;
        var a = _.round(w / h, 3);
        // if actual aspect ratio is great than w/h, scale = width:-2
        // if actual aspect ratio is less than w/h, scale = -2:height
        //
        // -2 ensures the automatic dimension is divisible by 2
        var scale = `'if(gt(a,${a}),min(iw,${w}),-2)':'if(gt(a,${a}),-2,min(ih,${h}))'`;
        arg('-vf', `scale=${scale}`);
    }
    if (profile.screenCap) {
        var count = profile.screenCap.count || 1;
        var quality = profile.screenCap.quality || 5;
        arg('-vf', `select='eq(pict_type,I)'`);
        arg('-vsync', 'vfr');
        arg('-vframes', count);
        arg('-qscale:v', quality);
    }
    arg(dstPath);

    return ChildProcess.spawn(cmd, args, options);
}

/**
 * Use ffprobe to obtain the duration and dimension of a file
 *
 * @param  {String} srcPath
 *
 * @return {Object}
 */
function probeMediaFile(srcPath) {
    return new Promise((resolve, reject) => {
        var cmd = `ffprobe`;
        var args = [], arg = Array.prototype.push.bind(args);
        arg('-print_format', 'json');
        arg('-show_streams');
        arg(srcPath);

        ChildProcess.execFile(cmd, args, (err, stdout, stderr) => {
            if (!err) {
                var dump = JSON.parse(stdout);
                var info = {};
                var videoStream = _.find(dump.streams, { codec_type: 'video' });
                var audioStream = _.find(dump.streams, { codec_type: 'audio' });
                if (videoStream) {
                    var rotation = 0;
                    _.each(videoStream.side_data_list, (item) => {
                        if (typeof(item.rotation) === 'number') {
                            rotation = (item.rotation + 360) % 360;
                        }
                    });
                    switch (rotation) {
                        case 90:
                        case 270:
                            info.width = videoStream.height;
                            info.height = videoStream.width;
                            break;
                        default:
                            info.width = videoStream.width;
                            info.height = videoStream.height;
                            break;
                    }
                    info.duration = videoStream.duration * 1000;
                } else if (audioStream) {
                    info.duration = audioStream.duration * 1000;
                }
                resolve(info);
            } else {
                resolve(null);
            }
        });
    });
}

/**
 * Wait for process to exit
 *
 * @param  {Process} childProcess
 *
 * @return {Promise}
 */
function waitForExit(childProcess) {
    return new Promise((resolve, reject) => {
        childProcess.on('exit', (code, signal) => {
            if (code === 0) {
                resolve()
            } else {
                reject(new Error(`Process exited with error code ${code}`));
            }
        });
        childProcess.on('error', (err) => {
            reject(err)
        });
    });
}

// cancel a stream if nothing is received after a while
setInterval(() => {
    _.each(transcodingJobs, (job) => {
        if (job.streaming && !job.closed) {
            var now = new Date;
            var elapsed = now - job.lastSegmentTime;
            if (elapsed > 60 * 60 * 1000) {
                endTranscodingJob(job, true);
            }
        }
    });
}, 30 * 1000);
