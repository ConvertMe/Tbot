import { Telegraf } from 'telegraf'
import dotenv from "dotenv"
import telegram_users from './telegram_users'
dotenv.config()

export class TelegramBot {
  private bot: Telegraf

  constructor(token: string) {
    this.bot = new Telegraf(token)

    this.bot.command('start', async (ctx: any) => {
      const username: string = ctx.chat.message.toLowerCase()
      const chatId: string = ctx.chat.message.chat.id
    })


    this.bot.on('new_chat_members', async (ctx) => {

      try {
        await this.cheackAdminForGroup(ctx)
      } catch (e) {
        return ctx.reply(`В этой группе я работать не буду!`)
      }

      for (let i = 0; i < ctx.message.new_chat_members.length; i++) {
          if(ctx.message.new_chat_members[i].username) await telegram_users.createUser({login: ctx.message.new_chat_members[i].username!, phone: null })
          ctx.reply(`Добро пожаловать, ${ctx.message.new_chat_members[i].username}!`)

      }
    })

    this.bot.on('left_chat_member', async (ctx) => {

      try {
        await this.cheackAdminForGroup(ctx)
      } catch (e) {
        return ctx.reply(`В этой группе я работать не буду!`)
      }

      const member = ctx.message.left_chat_member
      if(member.username) {
        await telegram_users.deleteUser(member.username!)
        ctx.reply(`Прощай, ${member.username}! Мы будем скучать!`)
      }
    })

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

  async cheackAdminForGroup(ctx: any) {
    try {
      const chatId = ctx.chat.id
      const admins = await ctx.telegram.getChatAdministrators(chatId)

      if (admins.length > 0) {
        let adminVerify = false
        admins.forEach((admin: any) => {
          if (admin.user.username === process.env.ROOT_TG_USER_LOGIN) return adminVerify = true
        })

        if (!adminVerify) throw new Error()
          ctx.reply("Админ")
      } else {
        throw new Error()
      }
    } catch (error) {
      throw new Error()
    }
  }


}