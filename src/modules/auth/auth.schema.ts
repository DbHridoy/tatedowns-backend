import {z} from 'zod'

export const createUserSchema=z.object({
    fullName:z.string(),
    email:z.email(),
    role:z.enum(['Production Manager','Sales Rep','Admin', 'Painter']),
    password:z.string()
})

export const loginUserSchema=z.object({
    email:z.email(),
    password:z.string()
})

