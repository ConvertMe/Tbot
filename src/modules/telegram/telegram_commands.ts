import { Telegraf } from "telegraf"
import sessionService from "./session/session.service"
import otherService from "../other/other.service"
import userService from "./users/users"
import { pool } from "../db/db"
import { DeleteResponseDBT } from "../db/types"

export default class TelegramCommands {

    private bot: Telegraf

    constructor(bot: Telegraf) {
        this.bot = bot
    }

    executeComands() {
        try {
            this.bot.command('start', async (ctx) => await sessionService.toReact(ctx, "start"))
            this.bot.command('stop',  this.exit)
            this.bot.use(async (ctx, next) => {next()})
        } catch (e) {
            otherService.writelog("error", e)
            console.log(e)
        }
    }

    private async exit(ctx: any) {
        try {
            const username = ctx.chat.username

            const isAuth = await userService.isAuth(username)
          
            if(!isAuth) return ctx.reply(`Извините, не нашёл вас в списке пользователей группы Амбассадоров ЖК, обратитесь к администратору группы`)

            await pool.execute('delete from session where userId = ?', [isAuth.id])
            .then((r: DeleteResponseDBT) => {
                if(r[0].affectedRows) return ctx.reply("Сессия завершена, для запуска бота отправь команду /start")
                else return ctx.reply("У вас нет активных сессий, для запуска бота отправь команду /start")
            })
            return
        } catch (e) {
            throw e
        }
    }


}