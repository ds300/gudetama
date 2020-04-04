import fs from 'fs'
import https from 'https'
import { hashFile } from '../manifest/hash'
import { log } from '../log'
import type { CacheBackend } from '@artsy/gudetama'
import { sign } from 'aws4'
import { red } from 'kleur'
import sax from 'sax'
import { encode } from 'querystring'

export interface S3Config {
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  region: string
}

export class S3StoreBackend implements CacheBackend {
  constructor(public config: S3Config = defaultConfig) {
    if (Object.values(config).some((x) => !x)) {
      log.fail('S3 config vars not found')
    }
  }

  signedRequest(props: {
    method: 'GET' | 'PUT'
    path: string
    headers: object
  }) {
    return https.request(
      sign(
        {
          ...props,
          host: `${this.config.bucket}.s3.amazonaws.com`,
          region: this.config.region,
          service: 's3',
        },
        this.config
      )
    )
  }

  async getObject(objectKey: string, destinationPath: string) {
    const req = this.signedRequest({
      method: 'GET',
      path: `/${objectKey}`,
      headers: {
        Aceept: 'application/octet-stream',
        'x-amz-content-sha256':
          'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      },
    })

    return new Promise<boolean>((resolve, reject) => {
      req.on('response', (res) => {
        const fh = fs.openSync(destinationPath, 'w')
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
                `\n${red(fs.readFileSync(destinationPath).toString())}\n`
              )
              fs.unlinkSync(destinationPath)
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
  async putObject(objectKey: string, sourcePath: string) {
    const contentHash = hashFile(sourcePath)

    const req = this.signedRequest({
      method: 'PUT',
      path: `/${objectKey}`,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': fs.statSync(sourcePath).size,
        'x-amz-content-sha256': contentHash,
      },
    })

    fs.createReadStream(sourcePath).pipe(req)

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
            console.error(`\n${red(buf.toString())}\n`)

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

  async listAllObjects(
    continuationToken?: string
  ): Promise<Array<{ key: string; size: number }>> {
    const result: Array<{ key: string; size: number }> = []
    const req = this.signedRequest({
      method: 'GET',
      path:
        `/?list-type=2&` +
        encode({
          'max-keys': 1000,
          ...(continuationToken
            ? { 'continuation-token': continuationToken }
            : {}),
        }),
      headers: {
        'x-amz-request-payer': 'requester',
      },
    })

    let body = ''

    await new Promise((resolve, reject) => {
      req.on('error', reject)
      req.on('response', (res) => {
        res.on('error', reject)

        res.on('data', (buf) => {
          body += buf.toString()
        })
        res.on('end', () => {
          if (res.statusCode !== 200) {
            log.fail('Error listing objects. Http code: ' + res.statusCode, {
              detail: body,
            })
          } else {
            resolve()
          }
        })
      })
      req.end()
    })

    let nextContinuationToken: string | null = null
    await new Promise((resolve, reject) => {
      let state:
        | 'reading continuation token'
        | 'reading object'
        | 'reading size'
        | 'reading key'
        | null = null
      let nextObject: { key?: string; size?: number } = {}

      const parser = sax.parser(false)

      parser.onerror = reject
      parser.ontext = (text) => {
        switch (state) {
          case 'reading object':
            break
          case 'reading continuation token':
            nextContinuationToken = text
            break
          case 'reading key':
            nextObject.key = text
            break
          case 'reading size':
            nextObject.size = Number(text)
            break
        }
      }
      parser.onopentag = (node) => {
        switch (node.name) {
          case 'NEXTCONTINUATIONTOKEN':
            if (state !== null) log.fail('invalid parser state 0')
            state = 'reading continuation token'
            break
          case 'CONTENTS':
            if (state !== null) log.fail('Invalid parser state 1')
            state = 'reading object'
            nextObject = {}
            break
          case 'KEY':
            if (state === 'reading object') {
              state = 'reading key'
            }
            break
          case 'SIZE':
            if (state === 'reading object') {
              state = 'reading size'
            }
            break
        }
      }
      parser.onclosetag = (tagName) => {
        switch (tagName) {
          case 'NEXTCONTINUATIONTOKEN':
            state = null
            break
          case 'CONTENTS':
            state = null
            result.push(nextObject as any)
            break
          case 'KEY':
            state = 'reading object'
            break
          case 'SIZE':
            state = 'reading object'
            break
        }
      }
      parser.onend = resolve

      parser.write(body).close()
    })

    if (nextContinuationToken) {
      return [...result, ...(await this.listAllObjects(nextContinuationToken))]
    }

    return result
  }
}

const defaultConfig: S3Config = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  bucket: process.env.GUDETAMA_S3_BUCKET_NAME || '',
  region: process.env.GUDETAMA_S3_REGION || 'us-east-1',
}
