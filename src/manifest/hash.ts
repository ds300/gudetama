import crypto from 'crypto'
import fs from 'fs'

const oneMegabyte = 1024 * 1024

export function hashFile(filePath: string) {
  const fileSize = fs.statSync(filePath).size
  if (fileSize < 4 * oneMegabyte) {
    return hashString(fs.readFileSync(filePath))
  }
  const sha = crypto.createHash('sha256')
  const buffer = Buffer.alloc(oneMegabyte)
  const fileDescriptor = fs.openSync(filePath, 'r')
  let totalBytesRead = 0
  while (totalBytesRead < fileSize) {
    const bytesRead = fs.readSync(
      fileDescriptor,
      buffer,
      0,
      Math.min(fileSize - totalBytesRead, oneMegabyte),
      totalBytesRead
    )
    if (bytesRead < oneMegabyte) {
      sha.update(buffer.slice(0, bytesRead))
    } else {
      sha.update(buffer)
    }
    totalBytesRead += bytesRead
  }
  return sha.digest('hex')
}

export function hashString(string: string | Buffer) {
  const sha = crypto.createHash('sha256')
  sha.update(string)
  return sha.digest('hex')
}
