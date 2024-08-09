import express, {Request, NextFunction, Response } from 'express'
import dotenv from "dotenv"
import filesRoute from "./routes/files.route"
import { TelegramBot } from './modules/telegram/telegram'
import otherService from './modules/other/other.service'
import { join } from 'path'
import ScheduleService from './modules/schedule/schedule.service'
import { pool } from './modules/db/db'

dotenv.config()
const PORT = process.env.PORT || 5000

const app = express()
app.use(express.json({limit: "100mb"}))
app.use('/files', filesRoute)
app.use("*", (req: Request, res: Response, next: NextFunction) => res.sendFile(join(__dirname, "modules", "files", "404.html")))
const start = async () => {
    try {
/*         console.log(await pool.execute(`
CREATE INDEX idx_fileHash ON telegramFiles (fileHash);
 `
)) */
        otherService.createFilesSystemFiles()
        app.listen(PORT, () => console.log('Server started on port: ' + PORT))
        new ScheduleService()
        const bot = new TelegramBot(process.env.TELEGRAM_TOKEN as string)
        await bot.startPolling()

    } catch (e) {
        console.log(e)
    }
}

start()