/* eslint-disable no-console */
/**
 * @use yarn package -- auth:1.0.0 sudo
 */
import { exec } from 'node:child_process'
import { subtle, getRandomValues } from 'node:crypto'
import util from 'util'
const execPromise = util.promisify(exec)

// Update submodule
await execPromise(`git submodule update --remote`)

// Version & sudo
const VERSION = process.env.npm_package_version

// Check if Docker image exists
let image = `sujin2f/auth:${VERSION}`
const { stdout } = await execPromise(`docker image ls ${image}`)
if (stdout.includes(image)) {
    console.error(`⛈️ Image ${image} already exists.`)
    process.exit(1)
}

const generateCryptoKey = async () => {
    console.log('🤞 \x1B[32m- Generating key... \x1B[0m')

    const bufferToBase64 = (buffer) => {
        const bytes = new Uint8Array(buffer)

        let binary = ''
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i])
        }
        return btoa(binary)
    }

    // generate crypto key (you can use the same code from @common/utils/crypto)
    const key = await subtle.generateKey(
        {
            name: 'AES-GCM',
            length: 256,
        },
        true,
        ['encrypt', 'decrypt'],
    )
    const exported = await crypto.subtle.exportKey('jwk', key)
    const iv = getRandomValues(new Uint8Array(12))
    const merged = JSON.stringify([exported.k, bufferToBase64(iv.buffer)])
    return btoa(merged)
}
const CRYPTO_KEY = generateCryptoKey()
console.info(`👀 The crypto key is ${CRYPTO_KEY}. Apply this to @next, @graphql, and @wordpress`)

console.log(`🤞 \x1B[32m- Creating Docker image ${image}... \x1B[0m`)
exec(`docker build -t ${image} .`, async (error, stdout, stderr) => {
    if (error) {
        console.error('🤬 \x1B[31m- docker build error: \x1B[0m', error)
        return
    }
    console.log(`👀 stdout: ${stdout}`)
    console.error(`👀 stderr: ${stderr}`)
})
