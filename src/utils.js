/* eslint-disable no-console */
import stream from 'stream';
import { promisify } from 'util';
import got from 'got';
import { spawnSync } from 'child_process';
import fs from 'fs-extra';
import crypto from 'crypto';
import sevenBin from '7zip-bin';
import { extractFull } from 'node-7z';
import path from 'path';


const pathTo7zip = sevenBin.path7za;

const pipeline = promisify(stream.pipeline);

function safeSpawn(exe, args, options) {
  return new Promise((resolve, reject) => {
    try {
      spawnSync(exe, args, options);
      resolve(true);
    } catch (error) {
      reject(error);
    }
  });
}

const downloadFile = async (url, filePath) => {
  console.log(`Downloading ${url}`);
  try {
    const downloadStream = got.stream(url);
    await pipeline(downloadStream, fs.createWriteStream(filePath));
    console.log(`Download completed ${filePath}`);
    return filePath;
  } catch (err) {
    throw new Error(err);
  }
};

const downloadFileIfNotExists = async (url, filePath) => {
  if (fs.existsSync(filePath)) {
    console.log('Cache exists: ', filePath);
    return filePath;
  }

  return downloadFile(url, filePath);
};

const extract7zip = (zipPath, extractedDir) => new Promise((resolve, reject) => {
  console.log(`Extracting ${zipPath}`);
  console.log('Start extracting to ', extractedDir);

  const zipStream = extractFull(zipPath, extractedDir, {
    recursive: true,
    $bin: pathTo7zip,
  });

  zipStream.on('error', (err) => {
    console.log('Error extracting: ', err);
    reject(err);
  });

  zipStream.on('end', () => {
    console.log('Extracting completed\n');
    resolve(extractedDir);
  });
});

const removeExt = (str) => str.replace('.exe', '');

const delay = (ms) => new Promise((res) => {
  setTimeout(() => {
    res();
  }, ms);
});

const computeSHA256 = (filePath) => {
  const fileBuffer = fs.readFileSync(filePath);
  const sum = crypto.createHash('sha256');
  sum.update(fileBuffer);
  const hex = sum.digest('hex');
  return hex;
};

function fileNameFromUrl(url) {
  return path.basename(url);
}

export default {
  downloadFile,
  safeSpawn,
  downloadFileIfNotExists,
  extract7zip,
  removeExt,
  delay,
  computeSHA256,
  fileNameFromUrl,
};
