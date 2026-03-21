import type { SessionOptions } from 'express-session'
/* CONSTANTS */
import { MINUTE_IN_MS } from '@common/constants/datetime'

// Session for saving redirect URL
export const sessionOption: SessionOptions = {
    secret: `${process.env.SESSION_SECRET}`,
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 3 * MINUTE_IN_MS,
        sameSite: 'lax',
        secure: false,
    },
}
