import express from 'express'
import dotenv from "dotenv"
import { TelegramBot } from './modules/telegram/telegram'
import otherService from './modules/other/other.service'
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

const start = async () => {
    try {
        otherService.createFilesSystemFiles()
        app.listen(PORT, () => console.log('Server started on port: ' + PORT))
        try {
            const bot = new TelegramBot(process.env.TELEGRAM_TOKEN as string)
            await bot.startPolling()
        } catch (e) {
            console.log("error started bot")
        }
    } catch (e) {
        console.log(e)
    }
}

start()