import { Telegraf, session } from 'telegraf'
import dotenv from "dotenv"
import usersService from './users/users'
import sessionService from './session/session.service'
import TelegramActions from './telegram_actions'
dotenv.config()

export class TelegramBot {
  private bot: Telegraf

  constructor(token: string) {
    this.bot = new Telegraf(token)

    new TelegramActions(this.bot).executeActions()

    this.bot.command('start', async (ctx: any) => await this.toReact(ctx, "start"))

    this.bot.on("message", async (ctx: any) => await this.toReact(ctx))

  }

  async startPolling() {
    try {
      await this.bot.launch()
    } catch (e) {
      console.log("telegram error")
    }
  }

  private async toReact(ctx: any, type?: "start") {
    try {
      const username: string = ctx.chat.username
      if(!username) return
      if(type === "start") ctx.reply(`Здравствуйте ${username}!\nЯ чат-бот управляющих компаний ГК ТОЧНО`)
      const isAuth = await usersService.isAuth(username)
      
      if(!isAuth) return ctx.reply(`Извините, не нашёл вас в списке пользователей группы Амбассадоров ЖК, обратитесь к администратору группы`)
      
      const session = await sessionService.handler(username, isAuth)
  
      ctx.reply(session.msg)
      return
    } catch (e) {
      console.log(e)
    }
  }




}