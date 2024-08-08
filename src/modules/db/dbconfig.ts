import dotenv from "dotenv"
dotenv.config()

let config: {
    host: string
    user: string
    password?: string
    database: string,
    port?: number
} = {
    host: process.env.MYSQL_HOST as string,
    port: 3306,
    user: process.env.MYSQL_LOGIN as string,
    password: process.env.MYSQL_PASSWORD as string,
    database: process.env.MYSQL_DB as string,
}

export default config 
