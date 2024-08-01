import { Telegraf } from 'telegraf'
import dotenv from "dotenv"
import usersService from './users/users'
import sessionService from './session/session.service'
import TelegramActions from './telegram_actions'
dotenv.config()

export class TelegramBot {
  private bot: Telegraf

  constructor(token: string) {
    this.bot = new Telegraf(token)

    this.bot.command('start', async (ctx: any) => {

      const username: string = ctx.chat.username
      ctx.reply(`Здравствуйте ${username}!\nЯ чат-бот управляющих компаний ГК ТОЧНО`)
      const isAuth = await usersService.isAuth(username)
      
      if(!isAuth) return ctx.reply(`Извините,  не нашёл вас в списке пользователей группы Амбассадоров ЖК, обратитесь к администратору группы`)
      
      const session = await sessionService.handler(username)

      ctx.reply(session.msg)

      return
    })

    new TelegramActions(this.bot).executeActions()


    try {
      //logic
    } catch (e) {
      console.log(e)
    }

  }

  async startPolling() {
    try {
      await this.bot.launch()
    } catch (e) {
      console.log("telegram error")
    }
  }




}