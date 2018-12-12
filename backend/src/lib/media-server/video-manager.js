import _ from 'lodash';
import Bluebird from 'bluebird';
import FS from 'fs'; Bluebird.promisifyAll(FS);
import Path from 'path';
import Readline from 'readline';
import ChildProcess from 'child_process';
import Crypto from 'crypto';

import * as CacheFolders from 'media-server/cache-folders';
import * as FileManager from 'media-server/file-manager';
import * as ImageManager from 'media-server/image-manager';

let transcodingJobs = [];
let encodingProfiles = [
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
 * @param  {String} jobID
 *
 * @return {Object|null}
 */
function findTranscodingJob(jobID) {
    return _.find(transcodingJobs, { id: jobID }) || null;
}

/**
 * Start up instances of ffmpeg
 *
 * @param  {String|null} srcPath
 * @param  {String} type
 * @param  {String} jobID
 *
 * @return {Promise<Object>}
 */
async function startTranscodingJob(srcPath, type, jobID) {
    let profiles = _.filter(encodingProfiles, { type });
    let job = {
        id: jobID,
        type: type,
        destination: CacheFolders[type],
        streaming: !srcPath,
        inputFile: { path: srcPath },
        outputFiles: [],
        promise: null,
        progress: 0,
        onProgress: null,
    };
    for (let profile of profiles) {
        // see if the destination file exists already
        let dstPath = `${job.destination}/${job.id}.${profile.name}.${profile.format}`;
        let outputFile = _.clone(profile);
        outputFile.path = dstPath;
        job.outputFiles.push(outputFile);

        try {
            // in case the file exists already
            await FS.lstatAsync(dstPath);
            await probeFile(outputFile);
            if (!outputFile.duration) {
                await FS.unlinkAsync(dstPath);
                throw new Error('Existing file seems to be empty');
            }
        } catch (err) {
            // launch an instance of FFmpeg to create the file
            let ffmpeg = await spawnFFmpeg(srcPath, dstPath, profile);
            outputFile.ffmpeg = ffmpeg;
            outputFile.ffmpegPromise = new Promise((resolve, reject) => {
                ffmpeg.once('exit', (code) => {
                    if (code === 0) {
                        resolve()
                    } else {
                        reject(new Error(`Process exited with error code ${code}`));
                    }
                });
                ffmpeg.once('error', reject);
            });
        }
    }


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
        job.writeStreamPromise = new Promise((resolve, reject) => {
            job.writeStream.once('finish', resolve);
            job.writeStream.once('error', reject);
        });

        // calculate MD5 hash along the way
        job.md5Hash = Crypto.createHash('md5');
        job.md5HashPromise = new Promise((resolve, reject) => {
            job.md5Hash.once('readable', resolve);
        });
    } else {
        // track progress by reading ffmpeg's stderr output
        // we'll need the duration of the source file
        job.totalDuration = 0;
        await probeFile(job.inputFile);
        job.totalDuration = job.inputFile.duration;

        let re = /out_time_ms=(.*)/;
        _.each(job.outputFiles, (outputFile) => {
            if (outputFile.ffmpeg) {
                outputFile.processedDuration = 0;

                let rl = Readline.createInterface({ input: outputFile.ffmpeg.stdout });
                rl.on('line', (line) => {
                    let m = re.exec(line);
                    if (m) {
                        let outTime = parseInt(m[1]);
                        outputFile.processedDuration = outTime / 1000;
                        calculateProgress(job);
                    }
                });
            }
        });
    }

    transcodingJobs.push(job);
    return job;
}

/**
 * Scan files and set their the duration and dimensions
 *
 * @param  {Array<Object>} files
 *
 * @return {Promise}
 */
async function probeFile(file) {
    let info = await probeMediaFile(file.path)
    _.assign(file, info);
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
async function renameFile(file, match, replacement) {
    let tempPath = file.path;
    let permPath = _.replace(tempPath, match, replacement);
    await FileManager.moveFile(tempPath, permPath);
    file.path = permPath;
}


/**
 * Wait for transcoding job to finish
 *
 * @param  {Object} job
 *
 * @return {Promise}
 */
async function awaitTranscodingJob(job) {
    // wait for ffmpeg processes to finish
    for (let outputFile of job.outputFiles) {
        if (outputFile.ffmpegPromise) {
            // wait for ffmpeg to exit
            await outputFile.ffmpegPromise;

            // then get info about the file
            await probeFile(outputFile);
        }
    }

    if (job.streaming) {
        // wait for saving of input file
        await job.writeStreamPromise;

        // wait for MD5 hash
        await job.md5HashPromise;
        let hash = job.md5Hash.read().toString('hex');
        job.inputFile.hash

        // get metadata of the input file, now that we have the whole thing
        await probeFile(job.inputFile);

        // rename all files, using the MD5 hash of the original file
        await renameFile(job.inputFile, job.id, hash);
        for (let outputFile of job.outputFiles) {
            await renameFile(outputFile, job.id, hash);
        }
    }
}

/**
 * Wait for poster generation to finish
 *
 * @param  {Object} job
 *
 * @return {Promise}
 */
async function awaitPosterGeneration(job) {
    let posterFile = job.posterFile;
    if (!posterFile) {
        throw new Error('Poster generation not requested');
    }

    let dstFolder = posterFile.temporaryFolder;
    try {
        // wait for ffmpeg to exit
        await posterFile.ffmpegPromise;

        // scan dstFolder for files
        let names = await FS.readdirAsync(dstFolder);
        let largestFile;
        for (let name of names) {
            let path = `${dstFolder}/${name}`;
            let stat = await FS.statAsync(path);
            if (!largestFile || stat.size > largestFile.size) {
                largestFile = { path, size: stat.size };
            }
        }
        if (largestFile) {
            // obtain metadata nad move file into image cache folder
            let meta = await ImageManager.getImageMetadata(largestFile.path);
            let imagePath = await FileManager.preserveFile(largestFile, null, CacheFolders.image);
            posterFile.path = imagePath;
            posterFile.width = meta.width;
            posterFile.height = meta.height;
        }
    } finally {
        // delete the folder, along with any remaining files
        try {
            let names = await FS.readdirAsync(dstFolder);
            for (let name of names) {
                let path = `${dstFolder}/${name}`;
                await FS.unlinkAsync(path);
            }
            await FS.rmdirAsync(dstFolder);
        } catch (err) {
            console.error(err);
        }
    }
}

/**
 * Add a file to the transcode queue
 *
 * @param  {Object} job
 * @param  {Object} file
 */
function transcodeSegment(job, file) {
    if (!job.closed) {
        let inputStream = FS.createReadStream(file.path);
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
        let inputStream = FS.createReadStream(file.path);
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
            let inputStream;
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
    let inputStream = job.queue.shift();
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
    let inputStream = job.posterQueue.shift();
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
    let progress;
    if (job.streaming) {
        // don't perform calculation when final size isn't known
        if (job.closed) {
            progress = Math.round(job.processedByteCount / job.totalByteCount * 100);
        }
    } else {
        let durations = [];
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
                let now = new Date;
                let elapsed = (job.lastProgressTime) ? now - job.lastProgressTime : Infinity;
                if (elapsed > 5000 || progress === 100) {
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
 * @return {Promise}
 */
async function requestPosterGeneration(job) {
    let srcPath = (job.streaming) ? null : job.inputFile.path;
    let dstPath = `${job.destination}/${job.id}.screencaps/%d.jpg`;
    let dstFolder = Path.dirname(dstPath);

    // create temporary folder for holding thumbnail images
    try {
        FS.mkdirAsync(dstFolder);
    } catch (err) {
        if (err.code !== 'EEXIST') {
            throw err;
        }
    }

    let profile = {
        screenCap: {
            quality: 2,
            count: 3
        }
    };
    let posterFile = {};
    let ffmpeg = spawnFFmpeg(srcPath, dstPath, profile);
    if (ffmpeg.stdin) {
        // we expect ffmpeg to drop the connection as soon as it has enough data
        ffmpeg.stdin.once('error', (err) => {
            posterFile.ffmpeg = null;
        });
    }
    posterFile.temporaryFolder = dstFolder;
    posterFile.ffmpeg = ffmpeg;
    posterFile.ffmpegPromise = new Promise((resolve, reject) => {
        ffmpeg.once('exit', (code) => {
            if (code === 0) {
                resolve()
            } else {
                reject(new Error(`Process exited with error code ${code}`));
            }
        });
        ffmpeg.once('error', reject);
    });

    job.posterQueue = [];
    job.posterFile = posterFile;
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
    let cmd = 'ffmpeg';
    let args = [], arg = Array.prototype.push.bind(args);
    let options = {
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
        let w = profile.maximum.width;
        let h = profile.maximum.height;
        let a = _.round(w / h, 3);
        // if actual aspect ratio is great than w/h, scale = width:-2
        // if actual aspect ratio is less than w/h, scale = -2:height
        //
        // -2 ensures the automatic dimension is divisible by 2
        let scale = `'if(gt(a,${a}),min(iw,${w}),-2)':'if(gt(a,${a}),-2,min(ih,${h}))'`;
        arg('-vf', `scale=${scale}`);
    }
    if (profile.screenCap) {
        let count = profile.screenCap.count || 1;
        let quality = profile.screenCap.quality || 5;
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
async function probeMediaFile(srcPath) {
    let output = await new Promise((resolve, reject) => {
        let cmd = `ffprobe`;
        let args = [], arg = Array.prototype.push.bind(args);
        arg('-print_format', 'json');
        arg('-show_streams');
        arg(srcPath);

        ChildProcess.execFile(cmd, args, (err, stdout, stderr) => {
            resolve(!err ? stdout : null);
        });
    });
    let info = {};
    if (output) {
        let dump = JSON.parse(output);
        let videoStream = _.find(dump.streams, { codec_type: 'video' });
        let audioStream = _.find(dump.streams, { codec_type: 'audio' });
        if (videoStream) {
            let rotation = 0;
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
    }
    return info;
}

// cancel a stream if nothing is received after a while
setInterval(() => {
    _.each(transcodingJobs, (job) => {
        if (job.streaming && !job.closed) {
            let now = new Date;
            let elapsed = now - job.lastSegmentTime;
            if (elapsed > 60 * 60 * 1000) {
                endTranscodingJob(job, true);
            }
        }
    });
}, 30 * 1000);

export {
    startTranscodingJob,
    findTranscodingJob,
    transcodeSegment,
    endTranscodingJob,
    awaitTranscodingJob,
    requestPosterGeneration,
    awaitPosterGeneration,
};
