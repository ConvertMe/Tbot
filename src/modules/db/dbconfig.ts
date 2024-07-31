import dotenv from "dotenv"
dotenv.config()

let config: {
    host: string
    user: string
    password?: string
    database: string,
    port?: number
} = {
    host: 'localhost',
    port: 3306,
    user: process.env.MYSQL_LOGIN as string,
    password: process.env.MYSQL_PASSWORD as string,
    database: 'tbot',
}

export default config 
