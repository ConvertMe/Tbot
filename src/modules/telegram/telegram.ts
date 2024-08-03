import { Telegraf } from 'telegraf'
import dotenv from "dotenv"
import TelegramActions from './telegram_actions'
import otherService from '../other/other.service'
import TelegramCommands from './telegram_commands'
import sessionService from './session/session.service'
dotenv.config()

export class TelegramBot {
  private bot: Telegraf

  constructor(token: string) {
    this.bot = new Telegraf(token)


    new TelegramCommands(this.bot).executeComands()
    new TelegramActions(this.bot).executeActions()
    
    this.bot.on("message", async (ctx: any) => await sessionService.toReact(ctx))

  }

  async startPolling() {
    try {
      await this.bot.launch()
    } catch (e) {
      otherService.writelog("error", e)
      console.log("telegram error")
    }
  }
}