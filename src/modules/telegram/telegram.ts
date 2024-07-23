import { Telegraf } from 'telegraf'


export class TelegramBot {
  private bot: Telegraf

  constructor(token: string) {
    this.bot = new Telegraf(token)

    this.bot.command('start', async (ctx: any) => {
      const username: string = ctx.chat.username.toLowerCase()
      if(!username) return

      //auth logic
    })

    try {
      //logic
    } catch (e) {
      console.log(e)
    }
  
  }

  async startPolling(){
    try {
      await this.bot.launch()
    } catch (e) {
      console.log("telegram error")
    }
  }

  
}