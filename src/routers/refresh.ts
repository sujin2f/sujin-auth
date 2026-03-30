import express from 'express'
import axios from 'axios'
/* CONSTANTS */
import { HEADER_TOKEN } from '@common/constants'
/* Models */
import { Logger } from '@common/model/Logger'
/* Utils */
import { createAuthHeader } from '@common/utils/token'

declare module 'express-session' {
    interface SessionData {
        redirect: string
    }
}

const routes = express.Router()

const gqlRefresh = async (token: string): Promise<string> => {
    const endpoint = `${process.env.GQL_BASE_URL}`

    const query = `
        mutation {
            refresh
        }`

    return await axios
        .post(endpoint, { query: query }, createAuthHeader(token.slice(7)))
        .then((response) => response.headers[HEADER_TOKEN].slice(7))
}

routes.get('/', async (req, res) => {
    if (!req.headers.authorization) throw Logger.throw('/refresh called with empty auth header')
    const token = await gqlRefresh(`${req.headers.authorization}`)
    res.send(token)
})

export const refreshRoutes = routes
