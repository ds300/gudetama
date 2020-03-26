// @ts-check
import S3 from 'aws-sdk/clients/s3'
import aws from 'aws-sdk'
import fs from 'fs'
import https from 'https'
import crypto from 'crypto'
import { CacheBackend } from './Cache'

export interface S3Config {
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  region: string
}

export class S3CacheBackend implements CacheBackend {
  private bucket: string
  private client: S3
  constructor({
    accessKeyId,
    secretAccessKey,
    bucket,
  }: S3Config = defaultConfig) {
    this.bucket = bucket
    this.client = new S3({
      credentials: new aws.Credentials({ accessKeyId, secretAccessKey }),
    })
  }
  async getObject(key: string, filePath: string) {
    const inStream = this.client
      .getObject({
        Bucket: this.bucket,
        Key: key,
      })
      .createReadStream()
    const outStream = fs.createWriteStream(filePath)
    inStream.pipe(outStream)
    return await new Promise<boolean>((resolve, reject) => {
      inStream.on('error', reject).on('end', () => resolve(true))
    }).catch((error) => {
      if (error.code === 'NoSuchKey') {
        return false
      } else {
        throw error
      }
    })
  }
  async putObject(key: string, path: string) {
    const inStream = fs.createReadStream(path)
    return this.client
      .putObject({
        Key: key,
        Bucket: this.bucket,
        Body: inStream,
      })
      .promise()
      .then(console.log)
  }
}

const defaultConfig: S3Config = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  bucket: process.env.GUDETAMA_S3_BUCKET_NAME || '',
  region: process.env.GUDETAMA_S3_REGION || 'us-east-1',
}

import { hash, hashString } from '../manifest/hash'
import chalk from 'chalk'

function hmac(key: string, string: string, encoding?: 'hex') {
  return crypto
    .createHmac("sha256", key)
    .update(string, "utf8")
    .digest(encoding!);
}

function computeSignature({
  date,
  secretAccessKey,
  region,
  stringToSign,
}: {
  date: string
  secretAccessKey: string
  region: string
  stringToSign: string
}) {
  const dateKey = hmac('AWS4' + secretAccessKey, date)
  const dateRegionKey = hmac(dateKey, region)
  const dateRegionServiceKey = hmac(dateRegionKey, 's3')
  const signingKey = hmac(dateRegionServiceKey, 'aws4_request')
  const signature = hmac(signingKey, stringToSign, 'hex')
  return signature
}

async function s3Upload({
  filePath,
  objectKey,
  s3Config,
}: {
  filePath: string
  objectKey: string
  s3Config: S3Config
}) {
  ;`AWS4-HMAC-SHA256
  20200326T122324Z
  20200326/us-east-1/s3/aws4_request
  d50780dd673820a96cac1a74cc56e172440026b4f58dbe9588e9993b1c7b714a`
  const contentHash = hash(filePath)
  const now = new Date()
  const dateISO = now.toISOString().replace(/-|:|\.\d+/g, '')
  const date = dateISO.slice(0, 8)
  const scope = `${date}/${s3Config.region}/s3/aws4_request`
  const credential = `${s3Config.accessKeyId}/${scope}`
  const host = `${s3Config.bucket}.s3.amazonaws.com`
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date'
  const canonicalRequest = `PUT
/${objectKey}

content-type:application/octet-stream
host:${host}
x-amz-content-sha256:${contentHash}
x-amz-date:${dateISO}

${signedHeaders}
${contentHash}`
  // TODO: try with ending newline
  const stringToSign =
    'AWS4-HMAC-SHA256' +
    '\n' +
    dateISO +
    '\n' +
    scope +
    '\n' +
    hashString(canonicalRequest)

  const signature = computeSignature({
    date,
    region: s3Config.region,
    secretAccessKey: s3Config.secretAccessKey,
    stringToSign,
  })

  console.log(chalk.red(canonicalRequest))
  console.log()
  console.log(chalk.red(stringToSign))
  console.log()
  console.log(chalk.red(signature))
  const req = https.request({
    method: 'PUT',
    host,
    path: `/${objectKey}`,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': fs.statSync(filePath).size,
      Authorization: `AWS4-HMAC-SHA256 Credential=${credential},SignedHeaders=${signedHeaders},Signature=${signature}`,
      'x-amz-date': dateISO,
      'x-amz-content-sha256': contentHash,
    },
  })

  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(req)
      .on('finish', resolve)
      .on('error', reject)
  })

  return new Promise<void>((resolve, reject) => {
    req.on('response', (res) => {
      console.log('got response')
      const bufs: Buffer[] = []
      res.on('data', function (d) {
        console.log('got data')
        bufs.push(d)
      })
      res.on('end', function () {
        console.log('got ended', res.statusCode, res.statusMessage)
        const buf = Buffer.concat(bufs)
        console.log(chalk.green(buf.toString()))
        resolve()
      })
      res.on('error', reject)
    })
  })
}

async function run() {
  await s3Upload({
    s3Config: defaultConfig,
    filePath: 'package.json',
    objectKey: 'test-custom-upload',
  })
}

run()
