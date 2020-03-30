import fs from 'fs'
import https from 'https'
import crypto from 'crypto'
import { GudetamaStoreBackend } from './GudetamaStore'
import { hashFile, hashString } from '../manifest/hash'
import chalk from 'chalk'
import { log } from '../log'

export interface S3Config {
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  region: string
}

export class S3StoreBackend implements GudetamaStoreBackend {
  constructor(public config: S3Config = defaultConfig) {
    if (Object.values(config).some((x) => !x)) {
      log.fail('S3 config vars not found')
    }
  }
  async getObject(key: string, filePath: string) {
    return s3Download({
      objectKey: key,
      filePath,
      s3Config: this.config,
    })
  }
  async putObject(key: string, filePath: string) {
    return s3Upload({
      filePath,
      objectKey: key,
      s3Config: this.config,
    })
  }
}

const defaultConfig: S3Config = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  bucket: process.env.GUDETAMA_S3_BUCKET_NAME || '',
  region: process.env.GUDETAMA_S3_REGION || 'us-east-1',
}

function hmac(key: string, string: string, encoding?: 'hex') {
  return crypto
    .createHmac('sha256', key)
    .update(string, 'utf8')
    .digest(encoding!)
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
  const contentHash = hashFile(filePath)
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

  fs.createReadStream(filePath).pipe(req)

  return new Promise<void>((resolve, reject) => {
    req.on('response', (res) => {
      const bufs: Buffer[] = []
      res.on('data', function (d) {
        bufs.push(d)
      })
      res.on('end', function () {
        if (res.statusCode! !== 200) {
          console.error(
            `aws s3 PUT Request failed with status code ${res.statusCode}: ${res.statusMessage}`
          )

          const buf = Buffer.concat(bufs)
          console.error(`\n${chalk.red(buf.toString())}\n`)

          console.error(
            `aws s3 PUT Request failed with status code ${res.statusCode}: ${res.statusMessage}`
          )
          process.exit(1)
        }
        resolve()
      })
      res.on('error', reject)
    })
  })
}

async function s3Download({
  objectKey,
  s3Config,
  filePath,
}: {
  objectKey: string
  filePath: string
  s3Config: S3Config
}) {
  const now = new Date()
  const dateISO = now.toISOString().replace(/-|:|\.\d+/g, '')
  const date = dateISO.slice(0, 8)
  const scope = `${date}/${s3Config.region}/s3/aws4_request`
  const credential = `${s3Config.accessKeyId}/${scope}`
  const host = `${s3Config.bucket}.s3.amazonaws.com`
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date'
  const canonicalRequest = `GET
/${objectKey}

host:${host}
x-amz-content-sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
x-amz-date:${dateISO}

${signedHeaders}
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
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

  const req = https.request({
    method: 'GET',
    host,
    path: `/${objectKey}`,
    headers: {
      Aceept: 'application/octet-stream',
      Authorization: `AWS4-HMAC-SHA256 Credential=${credential},SignedHeaders=${signedHeaders},Signature=${signature}`,
      'x-amz-content-sha256':
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      'x-amz-date': dateISO,
    },
  })

  return new Promise<boolean>((resolve, reject) => {
    req.on('response', (res) => {
      const fh = fs.openSync(filePath, 'w')
      let totalBytesWritten = 0
      res.on('data', (d: Buffer) => {
        fs.writeSync(fh, d, 0, d.length, totalBytesWritten)
        totalBytesWritten += d.length
      })
      res.on('end', () => {
        fs.closeSync(fh)
        switch (res.statusCode) {
          case 404:
            resolve(false)
            break
          case 200:
            resolve(true)
            break
          default:
            console.error(
              `aws s3 GET Request failed with status code ${res.statusCode}: ${res.statusMessage}`
            )
            console.error(
              `\n${chalk.red(fs.readFileSync(filePath).toString())}\n`
            )
            fs.unlinkSync(filePath)
            console.error(
              `aws s3 GET Request failed with status code ${res.statusCode}: ${res.statusMessage}`
            )
            process.exit(1)
        }
      })
      res.on('error', reject)
    })

    req.end()
  })
}
