import express from 'express'
import axios from 'axios'
/* Models */
import { Logger } from '@common/model/Logger'
/* Utils */
import { getTokenSub, generateToken } from '@common/utils/token'
/* T_Types */
import type { T_GoogleUser } from '@common/types'
/* CONSTANTS */
import { HEADER_TOKEN } from '@common/constants'

declare module 'express-session' {
    interface SessionData {
        redirect: string
    }
}

const routes = express.Router()

const INTER_COM_SECRET = `${process.env.INTER_COM_SECRET}`
const CRYPTO_KEY = `${process.env.CRYPTO_KEY}`

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = `${process.env.GOOGLE_CLIENT_SECRET}`
const REDIRECT_URI = `${process.env.GOOGLE_REDIRECT_URI}`
const OAUTH_URL = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=profile email`
const allowed = JSON.parse(`${process.env.AUTH_CORS_ORIGINS}`)

const fetchGoogleUser = async (code: string): Promise<T_GoogleUser> => {
    let profile
    try {
        // Exchange authorization code for access token
        const {
            data: { access_token },
        } = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code',
        })

        // Use access_token or id_token to fetch user profile
        const data = await axios.get('https://www.googleapis.com/oauth2/v1/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` },
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        profile = (data as any).data
    } catch (e) {
        Logger.error('🤬 Fetching Google token has been failed: ', JSON.stringify(e))
        throw new Error('🤬 Fetching Google token has been failed')
    }
    return profile
}

const gqlLogin = async (user: T_GoogleUser): Promise<string> => {
    const endpoint = `${process.env.GQL_BASE_URL}`

    const query = `
        mutation {
            login(email: "${user.email}", name: "${user.name}", picture: "${user.picture}")
        }`

    const token = await generateToken(user, 10, INTER_COM_SECRET, CRYPTO_KEY)
    return await axios
        .post(endpoint, { query: query }, { headers: { Authorization: `Bearer ${token}` } })
        .then((response) => {
            return response.headers[HEADER_TOKEN].slice(7)
        })
}

routes.get('/google/auth', async (req, res) => {
    Logger.info(`🤞 Start user authentication`)
    const { token } = req.query

    const redirect: string = await getTokenSub<string>(`${token}`, CRYPTO_KEY)
        .then(async (redirect) => {
            const url = new URL(redirect)
            if (allowed.indexOf(url.origin) === -1) {
                throw new Error(`🤬 The redirection is not from allowed referer ${url.origin}`)
            }
            return redirect
        })
        .catch((e) => {
            Logger.error(e.message)
            res.status(404).send('You are Sorry.')
            return ''
        })

    req.session.redirect = await generateToken(redirect, 60, INTER_COM_SECRET, CRYPTO_KEY)
    res.redirect(OAUTH_URL)
})

const redirectPath = new URL(REDIRECT_URI).pathname
// Callback URL for handling the Google Login response
routes.get(redirectPath, async (req, res) => {
    Logger.info(`🤞 Finishing user authentication, ${redirectPath}`)

    // validate session from /google/auth
    const redirect: string = await getTokenSub<string>(`${req.session.redirect}`, CRYPTO_KEY)
        .then((redirect) => {
            const url = new URL(redirect)
            if (allowed.indexOf(url.origin) === -1) {
                throw new Error(`🤬 The redirection is not from allowed referer ${redirect}`)
            }
            return redirect
        })
        .catch((e) => {
            Logger.error(e.message)
            res.status(404).send('You are Sorry.')
            return ''
        })

    req.session.destroy(() => {})

    // get Google userinfo
    const { code } = req.query
    const google = await fetchGoogleUser(code as string).catch(() => null)
    if (!google) {
        Logger.error('🤬 Fetching Google has been failed')
        res.redirect(decodeURI(redirect))
        return
    }

    // @graphql
    const token = await gqlLogin(google).catch((e) => {
        Logger.error('🤬 Fetching GQL has been failed: ', JSON.stringify(e))
        res.redirect(decodeURI(redirect))
    })
    if (!token) {
        res.redirect(decodeURI(redirect))
        return
    }

    Logger.info('⭐️ User authentication finished!')
    res.redirect(`${decodeURI(redirect)}?token=${token}`)
})

export const googleRoutes = routes
